// The guest-build pre-filter (issue: token cost of firing the full
// `guest-build` procedure — see `.agents/skills/guest-build/SKILL.md` and
// ADR-0023 — on every `/loop` tick even when there is nothing new to build).
// `guest-build` itself is model-invoked and spends real tokens per tick
// scanning `ready-for-agent`, screening authorship, and checking for an
// already-open PR. This script does the same "is there anything to do at
// all" check as a plain, non-LLM `gh api`/REST call, so a tight polling
// interval only wakes the model when there's an actual guest-authored
// candidate.
//
// Guest vs. Trusted is the Public/Trusted split ADR-0020 already draws on
// `authorAssociation` (`OWNER`/`MEMBER`/`COLLABORATOR` are Trusted; everything
// else — `CONTRIBUTOR`/`FIRST_TIME_CONTRIBUTOR`/`FIRST_TIMER`/`MANNEQUIN`/`NONE`
// — is Public) — mirrored here rather than re-derived, since this script's
// whole job is to apply that same line before anything reaches the model.
//
// "Already has a linked PR" is checked via the issue's timeline
// (`cross-referenced` events whose source is a PR that's still open or was
// merged) rather than a local state file — stateless and correct across
// session restarts, at the cost of one extra API call per *candidate* (never
// per issue: only guest-authored `ready-for-agent` issues reach this check,
// which should be rare outside an active guest demo).
//
// Fetch strategy mirrors `check-triage-drift.ts`: prefer `gh` when present,
// fall back to `curl` (see the REST shell section below for why `curl`, not
// `fetch`) keyed off `GH_TOKEN`/`GITHUB_TOKEN`.
//
// Usage:  tsx scripts/poll-guest-tickets.ts
//   Prints the guest-authored, not-yet-linked `ready-for-agent` issues as
//   compact JSON: [{ number, title, authorAssociation, htmlUrl }, ...].
//   Empty array when there's nothing for guest-build to do.
//
// Also skips an issue already carrying the `guest-in-flight` marker
// (issue #570) — another session may be actively negotiating/building it.
// See `scripts/guest-marker.ts` for the label name, staleness window, and
// staleness check (single home, shared with `guest-intake-scan.ts`); the
// timeline fetch below already covers this for free — the Timeline API's
// `labeled` events carry the same `created_at`/`label` shape the marker
// check needs, so no second API call is added for it.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { decodeHtmlEntities, parseOwnerRepo, type RawIssueApiRecord } from './list-open-issues.ts'
import { parseNextLink, pickFetchStrategy, type FetchStrategy } from './check-triage-drift.ts'
import { hasMarker, isMarkerFresh } from './guest-marker.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const READY_FOR_AGENT_LABEL = 'ready-for-agent'

// ── Types ───────────────────────────────────────────────────────────────────

/** The five Public `authorAssociation` values (ADR-0020) — everyone who is
 *  not `OWNER`/`MEMBER`/`COLLABORATOR`. */
const PUBLIC_AUTHOR_ASSOCIATIONS = new Set([
  'CONTRIBUTOR',
  'FIRST_TIME_CONTRIBUTOR',
  'FIRST_TIMER',
  'MANNEQUIN',
  'NONE',
])

/** One raw issue record, extended with the `author_association` field the
 *  plain `list-open-issues.ts` shape doesn't need. */
export interface RawReadyIssueApiRecord extends RawIssueApiRecord {
  author_association: string
  html_url: string
}

/** One `ready-for-agent` issue, screened down to what the guest-build
 *  pre-filter needs: enough to decide whether to wake the model, nothing
 *  more (no body, no comments — same deliberate scope limit as
 *  `list-open-issues.ts`). */
export interface GuestReadyIssue {
  number: number
  title: string
  authorAssociation: string
  htmlUrl: string
}

/** One raw timeline-event record, trimmed to the `cross-referenced` shape
 *  the linked-PR check needs, plus the `created_at`/`label` fields the
 *  `guest-in-flight` marker-staleness check (`scripts/guest-marker.ts`)
 *  needs from the same fetch. */
export interface RawTimelineEventRecord {
  event: string
  created_at?: string
  label?: { name: string }
  source?: {
    issue?: {
      pull_request?: { merged_at: string | null }
      state?: string
    }
  }
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** True when `authorAssociation` is one of ADR-0020's Public values. */
export function isPublicAuthor(authorAssociation: string): boolean {
  return PUBLIC_AUTHOR_ASSOCIATIONS.has(authorAssociation)
}

/** Turn one raw REST record into a `GuestReadyIssue`, or `null` if it's
 *  actually a pull request (same `pull_request`-key quirk `list-open-issues.ts`
 *  screens for) or not Public-authored. */
export function toGuestReadyIssue(raw: RawReadyIssueApiRecord): GuestReadyIssue | null {
  if (raw.pull_request !== undefined) return null
  if (!isPublicAuthor(raw.author_association)) return null
  return {
    number: raw.number,
    title: decodeHtmlEntities(raw.title),
    authorAssociation: raw.author_association,
    htmlUrl: raw.html_url,
  }
}

/** True when `events` contains a `cross-referenced` event pointing at a pull
 *  request that is still open, or was merged — the "already has an open or
 *  merged linked PR" skip condition `guest-build`'s own procedure names. A
 *  cross-reference to a *closed, unmerged* PR doesn't count: that PR was
 *  abandoned, so the issue is still fair game. */
export function hasOpenOrMergedLinkedPr(events: RawTimelineEventRecord[]): boolean {
  return events.some((e) => {
    if (e.event !== 'cross-referenced') return false
    const pr = e.source?.issue?.pull_request
    if (!pr) return false
    return e.source?.issue?.state === 'open' || pr.merged_at !== null
  })
}

// ── GitHub shell (thin) ──────────────────────────────────────────────────────

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

function hasGhBinary(cwd: string): boolean {
  try {
    execFileSync('gh', ['--version'], { cwd, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function envToken(): string | undefined {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN
}

function readReadyIssuesViaGh(owner: string, repo: string, cwd: string): RawReadyIssueApiRecord[] {
  const raw = execFileSync(
    'gh',
    [
      'api',
      '--method',
      'GET',
      `repos/${owner}/${repo}/issues`,
      '-f',
      'state=open',
      '-f',
      `labels=${READY_FOR_AGENT_LABEL}`,
      '-f',
      'per_page=100',
      '--paginate',
      '--jq',
      '.[]',
    ],
    { cwd, encoding: 'utf8' },
  )
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RawReadyIssueApiRecord)
}

function readTimelineViaGh(owner: string, repo: string, issueNumber: number, cwd: string): RawTimelineEventRecord[] {
  const raw = execFileSync(
    'gh',
    [
      'api',
      '--method',
      'GET',
      `repos/${owner}/${repo}/issues/${issueNumber}/timeline`,
      '-H',
      'Accept: application/vnd.github.mockingbird-preview+json',
      '-f',
      'per_page=100',
      '--paginate',
      '--jq',
      '.[]',
    ],
    { cwd, encoding: 'utf8' },
  )
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RawTimelineEventRecord)
}

// `curl`, not Node's built-in `fetch`: this environment's outbound HTTPS goes
// through an agent proxy that Node's `fetch` (undici) only honors with
// `NODE_USE_ENV_PROXY=1` set *before the process starts* (too late to set
// from inside the running script — confirmed by testing), whereas `curl`
// already respects `HTTPS_PROXY`/the pre-installed CA bundle with no special
// flags (see /root/.ccr/README.md). `-D`/`-w '%{http_code}'` split the
// response into a header file (for `Link` pagination) and a status code on
// stdout; the body goes to its own temp file.
function curlGetPage(url: string, token: string, cwd: string): { status: string; body: string; linkHeader: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'poll-guest-tickets-'))
  const headerFile = join(dir, 'headers')
  const bodyFile = join(dir, 'body')
  try {
    const status = execFileSync(
      'curl',
      [
        '-sS',
        '-o',
        bodyFile,
        '-D',
        headerFile,
        '-w',
        '%{http_code}',
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        'Accept: application/vnd.github.mockingbird-preview+json',
        '-H',
        'User-Agent: terrarium-poll-guest-tickets',
        url,
      ],
      { cwd, encoding: 'utf8' },
    ).trim()
    const body = readFileSync(bodyFile, 'utf8')
    const headers = readFileSync(headerFile, 'utf8')
    const linkLine = headers.split(/\r?\n/).find((l) => /^link:/i.test(l))
    return { status, body, linkHeader: linkLine ? linkLine.slice(linkLine.indexOf(':') + 1).trim() : null }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function fetchAllPagesViaRest<T>(initialUrl: string, token: string, cwd: string): T[] {
  const out: T[] = []
  let url: string | null = initialUrl
  while (url) {
    const { status, body, linkHeader } = curlGetPage(url, token, cwd)
    if (status[0] !== '2') {
      throw new Error(`GitHub REST API request to ${url} failed: HTTP ${status}`)
    }
    out.push(...(JSON.parse(body) as T[]))
    url = parseNextLink(linkHeader)
  }
  return out
}

function readReadyIssuesViaRest(owner: string, repo: string, token: string, cwd: string): RawReadyIssueApiRecord[] {
  return fetchAllPagesViaRest<RawReadyIssueApiRecord>(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=${READY_FOR_AGENT_LABEL}&per_page=100`,
    token,
    cwd,
  )
}

function readTimelineViaRest(
  owner: string,
  repo: string,
  issueNumber: number,
  token: string,
  cwd: string,
): RawTimelineEventRecord[] {
  return fetchAllPagesViaRest<RawTimelineEventRecord>(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/timeline?per_page=100`,
    token,
    cwd,
  )
}

async function readReadyIssues(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  cwd: string,
): Promise<RawReadyIssueApiRecord[]> {
  if (strategy === 'gh') return readReadyIssuesViaGh(owner, repo, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readReadyIssuesViaRest(owner, repo, token, cwd)
}

async function readTimeline(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  issueNumber: number,
  cwd: string,
): Promise<RawTimelineEventRecord[]> {
  if (strategy === 'gh') return readTimelineViaGh(owner, repo, issueNumber, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readTimelineViaRest(owner, repo, issueNumber, token, cwd)
}

// ── Command ──────────────────────────────────────────────────────────────────

export async function pollGuestTickets(cwd = root): Promise<GuestReadyIssue[]> {
  const originUrl = readOriginUrl(cwd)
  const ownerRepo = parseOwnerRepo(originUrl)
  if (ownerRepo === null) {
    throw new Error(`could not parse owner/repo from origin remote: ${originUrl}`)
  }
  const strategy = pickFetchStrategy(hasGhBinary(cwd), Boolean(envToken()))
  if (strategy === null) {
    throw new Error(
      'no GitHub access path available: `gh` is not installed and neither GH_TOKEN nor GITHUB_TOKEN is set',
    )
  }
  const { owner, repo } = ownerRepo
  const rawIssues = await readReadyIssues(strategy, owner, repo, cwd)
  const guestIssues = rawIssues.map(toGuestReadyIssue).filter((x): x is GuestReadyIssue => x !== null)
  const rawLabelsByNumber = new Map(
    rawIssues.map((raw) => [raw.number, raw.labels.map((label) => (typeof label === 'string' ? label : label.name))]),
  )

  const candidates: GuestReadyIssue[] = []
  for (const issue of guestIssues) {
    const events = await readTimeline(strategy, owner, repo, issue.number, cwd)
    if (hasOpenOrMergedLinkedPr(events)) continue
    const labels = rawLabelsByNumber.get(issue.number) ?? []
    if (hasMarker(labels) && isMarkerFresh(events)) continue
    candidates.push(issue)
  }
  return candidates
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`poll-guest-tickets: ${msg}`)
  process.exit(1)
}

async function main(): Promise<void> {
  const candidates = await pollGuestTickets()
  process.stdout.write(JSON.stringify(candidates) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
}
