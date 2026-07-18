// The guest-intake scan helper: turns `guest-intake`'s "scan every open issue,
// check its newest activity for guest authorship" step — today done by
// spawning a subagent that makes ~2 MCP tool calls (`issue_read` get +
// get_comments) per open issue, ~190k tokens for a 25-issue pass that finds
// zero guest activity (see the 2026-07-17 session log) — into a single direct
// REST/`gh api` fetch. Mirrors `list-open-issues.ts` (issue #494) and
// `check-triage-drift.ts` (issue #507)'s same fix for the same MCP-tool-cost
// shape.
//
// Deliberate scope split: this script only *classifies* — it fetches every
// open issue's newest activity and buckets it into a stage per
// `.agents/skills/guest-intake/SKILL.md`'s authorship rules (Public
// `author_association` = guest, Trusted without the ADR-0017 footer = owner
// steering, footer present = this pipeline's own prior reply). It does not
// interview, comment, or label — that judgment (reading a guest's actual
// words, deciding round count, running the ADR-0023 safety screen) stays with
// the calling agent. Only the `guest-activity` and `owner-steering` buckets
// carry full body text in the output; `agent-footer-skip` (the idempotency
// guard — already answered, waiting on the guest) is collapsed to a count, so
// a quiet pass — the common case — returns a handful of bytes instead of
// every issue's full comment history.
//
// Scan cursor (issue #569): a "newest activity only" check can silently skip
// a real OWNER comment that lands between two of the agent's own rapid
// replies — the *overall* newest comment ends up being the agent's own later
// footer reply, which the idempotency guard then treats as "already
// answered," burying the owner comment in between. To catch that, each scan
// persists a per-issue cursor (the newest comment `created_at` this scan
// pass has accounted for, in a local gitignored state file — see "Cursor
// state" below) and surfaces any OWNER-authored, non-footer comment newer
// than that cursor, not just the single newest comment overall.
//
// Fetch strategy: same `gh`-then-REST-fallback split as `check-triage-drift.ts`
// (issue #505's `gh`-less remote-session fragility).
//
// Usage:  tsx scripts/guest-intake-scan.ts [N]
//   Scans up to N open issues (default 100) and prints a `ScanReport` JSON:
//   { scannedCount, counts: {guest-activity, owner-steering,
//   agent-footer-skip, unrecognized-association}, actionable: ScannedIssue[] }
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isAiAuthored, parseNextLink, pickFetchStrategy, type FetchStrategy } from './check-triage-drift.ts'
import { decodeHtmlEntities, parseOwnerRepo } from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_LIMIT = 100

// ── Types ───────────────────────────────────────────────────────────────────

/** One raw issue record off the GitHub REST `issues` list endpoint, trimmed to
 *  the fields this scan needs (a superset of `list-open-issues.ts`'s own
 *  narrower `RawIssueApiRecord` — this script needs `body`/`user`/
 *  `author_association` too, which that one deliberately omits). */
export interface RawIssueRecord {
  number: number
  title: string
  body: string | null
  labels: Array<{ name: string } | string>
  user: { login: string } | null
  author_association: string
  created_at: string
  pull_request?: unknown
}

/** One raw comment record off the GitHub REST issue-comments endpoint. */
export interface RawCommentRecord {
  html_url: string
  body: string
  user: { login: string } | null
  author_association: string
  created_at: string
}

/** The Public `author_association` values — a guest, per ADR-0020 (mirrored
 *  from `docs/agents/issue-tracker.md`'s Trusted/Public split; not imported
 *  since neither existing script exports it). */
export const PUBLIC_ASSOCIATIONS = new Set([
  'NONE',
  'CONTRIBUTOR',
  'FIRST_TIME_CONTRIBUTOR',
  'FIRST_TIMER',
  'MANNEQUIN',
])

/** The Trusted `author_association` values (owner/collaborator). */
export const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])

/** The classification `guest-intake`'s authorship rules reduce every issue's
 *  newest activity to. */
export type Stage = 'guest-activity' | 'owner-steering' | 'agent-footer-skip' | 'unrecognized-association'

/** An issue's newest activity — its most recent comment, or its own body when
 *  it has no comments — with HTML entities already decoded. */
export interface Activity {
  author: string
  authorAssociation: string
  body: string
  createdAt: string
  isComment: boolean
}

/** One scanned issue: its stage plus enough to act on it without a further
 *  fetch — full newest-activity text, and how many prior comments already
 *  carry the ADR-0017 footer (for the Skill's own "≤3 rounds" count). */
export interface ScannedIssue {
  number: number
  title: string
  labels: string[]
  stage: Stage
  newestActivity: Activity
  priorFooterCommentCount: number
}

/** The scan's full result: a per-stage count (cheap to skim even for a large
 *  queue) plus full detail for only the issues that need a judgment call. */
export interface ScanReport {
  scannedCount: number
  counts: Record<Stage, number>
  actionable: ScannedIssue[]
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** The newest activity on an issue: its most recent comment by `created_at`,
 *  or the issue's own body/author when it has no comments. */
export function newestActivity(issue: RawIssueRecord, comments: RawCommentRecord[]): Activity {
  if (comments.length === 0) {
    return {
      author: issue.user?.login ?? 'unknown',
      authorAssociation: issue.author_association,
      body: issue.body ?? '',
      createdAt: issue.created_at,
      isComment: false,
    }
  }
  const latest = comments.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a))
  return {
    author: latest.user?.login ?? 'unknown',
    authorAssociation: latest.author_association,
    body: latest.body,
    createdAt: latest.created_at,
    isComment: true,
  }
}

/** Classify one activity per `guest-intake`'s rules: the ADR-0017 footer
 *  always wins first (it marks this pipeline's own prior reply, regardless of
 *  the shared-connection `author_association` it lands under — see
 *  `check-triage-drift.ts`'s header for why the footer, not the association,
 *  is the authorship signal); otherwise Public is a guest, Trusted is the
 *  owner steering. */
export function classifyActivity(activity: Activity): Stage {
  if (isAiAuthored(activity.body)) return 'agent-footer-skip'
  if (PUBLIC_ASSOCIATIONS.has(activity.authorAssociation)) return 'guest-activity'
  if (TRUSTED_ASSOCIATIONS.has(activity.authorAssociation)) return 'owner-steering'
  return 'unrecognized-association'
}

/** Every comment strictly newer than `cursor` — or every comment, when there
 *  is no cursor yet (an issue's first-ever scan pass). */
export function commentsSinceCursor(comments: RawCommentRecord[], cursor: string | null): RawCommentRecord[] {
  if (cursor === null) return comments
  return comments.filter((c) => Date.parse(c.created_at) > Date.parse(cursor))
}

/** The newest real OWNER comment (Trusted `author_association`, no ADR-0017
 *  footer — see `classifyActivity`) among the comments newer than `cursor`,
 *  or `null` when none qualify. This is issue #569's fix: it finds an owner
 *  comment even when a still-later comment (e.g. the agent's own next footer
 *  reply) would otherwise make it look like stale, already-handled activity
 *  under a newest-overall-only check. */
export function newestOwnerCommentSince(comments: RawCommentRecord[], cursor: string | null): RawCommentRecord | null {
  const candidates = commentsSinceCursor(comments, cursor).filter(
    (c) => TRUSTED_ASSOCIATIONS.has(c.author_association) && !isAiAuthored(c.body),
  )
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a))
}

/** Turn one raw issue + its comments into a `ScannedIssue`, or `null` if the
 *  record is actually a pull request (the REST `issues` endpoint mixes both
 *  in — same quirk `list-open-issues.ts` screens for). `cursor` is this
 *  issue's persisted scan cursor (`null` on its first scan) — when a real
 *  OWNER comment landed after it, that comment wins over the plain
 *  newest-overall activity (issue #569). */
export function scanIssue(rawIssue: RawIssueRecord, rawComments: RawCommentRecord[], cursor: string | null = null): ScannedIssue | null {
  if (rawIssue.pull_request !== undefined) return null
  const comments = rawComments.map((c) => ({ ...c, body: decodeHtmlEntities(c.body) }))
  const issue: RawIssueRecord = {
    ...rawIssue,
    title: decodeHtmlEntities(rawIssue.title),
    body: rawIssue.body === null ? null : decodeHtmlEntities(rawIssue.body),
  }
  const missedOwnerComment = newestOwnerCommentSince(comments, cursor)
  const activity: Activity = missedOwnerComment
    ? {
        author: missedOwnerComment.user?.login ?? 'unknown',
        authorAssociation: missedOwnerComment.author_association,
        body: missedOwnerComment.body,
        createdAt: missedOwnerComment.created_at,
        isComment: true,
      }
    : newestActivity(issue, comments)
  return {
    number: rawIssue.number,
    title: issue.title,
    labels: rawIssue.labels.map((label) => (typeof label === 'string' ? label : label.name)),
    stage: classifyActivity(activity),
    newestActivity: activity,
    priorFooterCommentCount: comments.filter((c) => isAiAuthored(c.body)).length,
  }
}

/** The full report: per-stage counts over every scanned issue, plus full
 *  detail for only the `guest-activity`/`owner-steering` subset — the two
 *  stages that need a judgment call from the calling agent. */
export function buildReport(scanned: ScannedIssue[]): ScanReport {
  const counts: Record<Stage, number> = {
    'guest-activity': 0,
    'owner-steering': 0,
    'agent-footer-skip': 0,
    'unrecognized-association': 0,
  }
  for (const issue of scanned) counts[issue.stage]++
  return {
    scannedCount: scanned.length,
    counts,
    actionable: scanned.filter((issue) => issue.stage === 'guest-activity' || issue.stage === 'owner-steering'),
  }
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

function readOpenIssuesViaGh(owner: string, repo: string, cwd: string): RawIssueRecord[] {
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
    .map((line) => JSON.parse(line) as RawIssueRecord)
}

function readIssueCommentsViaGh(owner: string, repo: string, issueNumber: number, cwd: string): RawCommentRecord[] {
  const raw = execFileSync(
    'gh',
    [
      'api',
      '--method',
      'GET',
      `repos/${owner}/${repo}/issues/${issueNumber}/comments`,
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
    .map((line) => JSON.parse(line) as RawCommentRecord)
}

/** One `curl` GET through this environment's proxy, returning the response
 *  body text plus the *last* header block's status line and `Link` header.
 *
 *  Deliberately shells out to `curl` rather than using Node's global `fetch`:
 *  this environment routes outbound HTTPS through a pre-configured proxy via
 *  `HTTPS_PROXY`, which `curl` honors automatically but undici's `fetch` does
 *  not (it needs `NODE_USE_ENV_PROXY=1` set at process *startup*, which a
 *  script can't retroactively set on itself) — a plain `fetch()` here silently
 *  bypasses the proxy and gets an unauthenticated 401 straight from
 *  `api.github.com`, confirmed while building this script. `curl` sidesteps
 *  that gap with no new dependency.
 *
 *  Through an HTTPS-over-proxy `CONNECT` tunnel, `curl -D` captures *two*
 *  header blocks — the proxy's own `200 Connection Established` first, then
 *  GitHub's real response — separated by a blank line; only the last block is
 *  the actual API response. */
function curlGet(url: string, token: string): { body: string; status: number; linkHeader: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'guest-intake-scan-'))
  const headerFile = join(dir, 'headers.txt')
  try {
    const body = execFileSync(
      'curl',
      [
        '-sS',
        '-D',
        headerFile,
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        'Accept: application/vnd.github+json',
        '-H',
        'User-Agent: terrarium-guest-intake-scan',
        url,
      ],
      { encoding: 'utf8' },
    )
    const blocks = readFileSync(headerFile, 'utf8')
      .split(/\r?\n\r?\n/)
      .filter((block) => block.trim().length > 0)
    const lastBlock = blocks[blocks.length - 1] ?? ''
    const lines = lastBlock.split(/\r?\n/)
    const statusMatch = (lines[0] ?? '').match(/^HTTP\/[\d.]+\s+(\d+)/)
    const status = statusMatch ? Number(statusMatch[1]) : 0
    const linkLine = lines.find((line) => /^link:/i.test(line))
    const linkHeader = linkLine ? linkLine.slice(linkLine.indexOf(':') + 1).trim() : null
    return { body, status, linkHeader }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function fetchAllPagesViaRest<T>(initialUrl: string, token: string): T[] {
  const out: T[] = []
  let url: string | null = initialUrl
  while (url) {
    const { body, status, linkHeader } = curlGet(url, token)
    if (status < 200 || status >= 300) {
      throw new Error(`GitHub REST API request to ${url} failed: ${status}\n${body}`)
    }
    out.push(...(JSON.parse(body) as T[]))
    url = parseNextLink(linkHeader)
  }
  return out
}

function readOpenIssuesViaRest(owner: string, repo: string, token: string): RawIssueRecord[] {
  return fetchAllPagesViaRest<RawIssueRecord>(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`,
    token,
  )
}

function readIssueCommentsViaRest(owner: string, repo: string, issueNumber: number, token: string): RawCommentRecord[] {
  return fetchAllPagesViaRest<RawCommentRecord>(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
    token,
  )
}

function readOpenIssues(strategy: FetchStrategy, owner: string, repo: string, cwd: string): RawIssueRecord[] {
  if (strategy === 'gh') return readOpenIssuesViaGh(owner, repo, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readOpenIssuesViaRest(owner, repo, token)
}

function readIssueComments(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  issueNumber: number,
  cwd: string,
): RawCommentRecord[] {
  if (strategy === 'gh') return readIssueCommentsViaGh(owner, repo, issueNumber, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readIssueCommentsViaRest(owner, repo, issueNumber, token)
}

// ── Cursor state (persisted between scan passes) ────────────────────────────

/** Per-issue scan cursors: for each open issue (keyed by its number as a
 *  string, since JSON object keys are always strings), the newest comment
 *  `created_at` the last scan pass accounted for. Local and gitignored — see
 *  the header comment for why this fixes issue #569. */
export type ScanCursorState = Record<string, string>

const CURSOR_STATE_FILENAME = '.guest-intake-scan-state.json'

/** The persisted cursor state at `path`, or `{}` when the file doesn't exist
 *  yet (an issue's first-ever scan) or is unreadable/corrupt — a missing
 *  cursor degrades to "check everything," never to a crash. */
export function readCursorState(path: string): ScanCursorState {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ScanCursorState
  } catch {
    return {}
  }
}

/** Persist `state` to `path` as the cursor for the next scan pass. */
export function writeCursorState(state: ScanCursorState, path: string): void {
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n')
}

// ── Command ──────────────────────────────────────────────────────────────────

export function guestIntakeScan(limit = DEFAULT_LIMIT, cwd = root): ScanReport {
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
  const rawIssues = readOpenIssues(strategy, owner, repo, cwd)
    .filter((issue) => issue.pull_request === undefined)
    .slice(0, limit)

  const cursorStatePath = join(cwd, CURSOR_STATE_FILENAME)
  const cursorState = readCursorState(cursorStatePath)
  const nextCursorState: ScanCursorState = { ...cursorState }

  const scanned: ScannedIssue[] = []
  for (const raw of rawIssues) {
    const comments = readIssueComments(strategy, owner, repo, raw.number, cwd)
    const cursor = cursorState[String(raw.number)] ?? null
    const result = scanIssue(raw, comments, cursor)
    if (result) scanned.push(result)
    nextCursorState[String(raw.number)] = newestActivity(raw, comments).createdAt
  }
  writeCursorState(nextCursorState, cursorStatePath)
  return buildReport(scanned)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`guest-intake-scan: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const limitArg = argv[0]
  let limit = DEFAULT_LIMIT
  if (limitArg !== undefined) {
    limit = Number(limitArg)
    if (!Number.isInteger(limit) || limit <= 0) fail(`not a positive integer: ${limitArg}`)
  }
  const report = guestIntakeScan(limit)
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
