// The triage-drift detector (issue #507): an AI-authored comment can assert a
// triage-label transition ("moved to `ready-for-agent`") that the issue's
// live labels never actually picked up — e.g. issue #325's newest AI comment
// claimed `ready-for-agent` while the issue stayed labeled `ready-for-human`.
// Nothing catches that mismatch today; this script does, as a standalone
// periodic-sweep-style check (recommended option 1 in #507) — wiring it into
// an existing sweep is deliberately deferred to a later step once the tool
// exists.
//
// AI-authorship detection deliberately does NOT use `author_association` or
// the GitHub login: `.agents/skills/auto-triage/SKILL.md` already established
// why that field can't be trusted in this repo — every agent-driven GitHub
// write runs under the human owner's own connection (ADR-0017), so an
// AI-authored comment and the owner's own comment both show
// `author_association: OWNER` under the same login. The only reliable signal
// is the ADR-0017 provenance footer every AI-authored comment carries
// (`Co-Authored-By: ... <noreply@anthropic.com>`) — its *absence* means human,
// matching the existing `auto-triage` convention rather than inventing a
// second one.
//
// The claimed-transition check is deliberately a small, literal phrase list
// (issue #507's own scoping: "lightweight semantic check ... not an NLP
// solution"), not a parser — a real phrasing this list misses just stays
// silent (a false negative), which is the safe failure direction for a
// *detector*. Grow `TRANSITION_VERB_PATTERNS` when a real missed phrasing
// turns up.
//
// Fetch strategy: prefers `gh api` (the same well-exercised path
// `scripts/list-open-issues.ts` uses) when the `gh` binary is present, and
// falls back to a direct authenticated REST call via `curl` (using a
// `GH_TOKEN` / `GITHUB_TOKEN` env var) when it is not — `curl`, not Node's
// built-in `fetch`, for the same proxy-auth reason `poll-guest-tickets.ts`'s
// `curlGetPage` documents (issue #567). That fallback exists because issue
// #505 found `list-open-issues.ts`'s `gh`-only path fragile in `gh`-less
// remote sessions — this script avoids inheriting that same fragile
// assumption where it's cheap to (a self-contained strategy switch, no fix to
// #505 itself, which stays out of scope here).
//
// Usage:  tsx scripts/check-triage-drift.ts [N]
//   Checks up to N open issues (default 50, newest-updated-first) and prints
//   the flagged subset as JSON: { number, title, claimedLabel, liveLabels,
//   commentUrl, commentCreatedAt }.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  decodeHtmlEntities,
  parseNextLink,
  parseOwnerRepo,
  pickFetchStrategy,
  type FetchStrategy,
  type RawIssueApiRecord,
} from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_LIMIT = 50

// ── Types ───────────────────────────────────────────────────────────────────

/** The five canonical triage-label roles (`docs/agents/triage-labels.md`,
 *  single home for the vocabulary itself — mirrored here as a literal list
 *  since matching against it is this script's whole job). */
export const CANONICAL_LABELS = [
  'needs-triage',
  'needs-info',
  'ready-for-agent',
  'ready-for-human',
  'wontfix',
] as const
export type CanonicalLabel = (typeof CANONICAL_LABELS)[number]

/** One raw comment record as read off the GitHub REST issue-comments endpoint
 *  (shape shared by both `gh api` and a direct REST `fetch`). */
export interface RawCommentApiRecord {
  html_url: string
  body: string
  created_at: string
}

/** One open issue, trimmed to what the drift check needs — no body/comments
 *  beyond what's fetched separately, mirroring `list-open-issues.ts`'s
 *  deliberate scope limit. */
export interface DriftCheckIssue {
  number: number
  title: string
  labels: string[]
}

/** One issue flagged for triage-state drift: its most recent AI-authored
 *  comment claims a label transition the issue's live labels contradict. */
export interface FlaggedIssue {
  number: number
  title: string
  claimedLabel: CanonicalLabel
  liveLabels: string[]
  commentUrl: string
  commentCreatedAt: string
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** The ADR-0017 provenance footer every AI-authored comment in this repo
 *  carries — see the header comment above for why this, not
 *  `author_association`, is the authorship signal. Case-insensitive: git
 *  trailers conventionally use `Co-authored-by`, GitHub's own rendering
 *  doesn't normalize case, and neither should this check. */
const PROVENANCE_FOOTER = /co-authored-by:.*noreply@anthropic\.com/i

/** True when `commentBody` carries the ADR-0017 provenance footer. */
export function isAiAuthored(commentBody: string): boolean {
  return PROVENANCE_FOOTER.test(commentBody)
}

/** The phrasings this repo's AI-authored comments actually use to assert a
 *  label transition (e.g. issue #325's "Update: moved to
 *  `ready-for-agent`.", `auto-triage` SKILL.md's own "Stamp `ready-for-agent`"
 *  language). Deliberately small and literal — see the header comment for why
 *  this isn't an NLP parser. */
const TRANSITION_VERB_PATTERNS = [
  'moved to',
  'moving (?:it |this )?to',
  'move (?:it |this )?to',
  'labell?ed(?: as)?',
  'labell?ing(?: as)?',
  'marked(?: as)?',
  'marking(?: as)?',
  'mark(?:ed|ing)? (?:it |this )?as',
  'stamped',
  'stamping',
  'stamp(?: it| this)?',
  'appl(?:y|ied|ying)(?: the)?',
  'set to',
  'setting to',
  'updated to',
  'updating to',
]

/** One phrase match: `label` is the canonical label the phrase claims, `index`
 *  is its character offset in the comment body (used to find the *last*
 *  claim — see `latestClaimedLabel`). */
export interface ClaimedTransitionMatch {
  label: CanonicalLabel
  index: number
}

/** Every claimed-transition phrase match in `commentBody`, in the order they
 *  appear. A comment can legitimately mention more than one canonical label
 *  (e.g. narrating a prior state before the new one) — this returns every hit
 *  so the caller can decide which one is the actual claim. */
export function findClaimedLabelTransitions(commentBody: string): ClaimedTransitionMatch[] {
  const verbs = TRANSITION_VERB_PATTERNS.join('|')
  const out: ClaimedTransitionMatch[] = []
  for (const label of CANONICAL_LABELS) {
    const re = new RegExp(`\\b(?:${verbs})\\s+\`?${label}\`?\\b`, 'gi')
    for (const m of commentBody.matchAll(re)) {
      out.push({ label, index: m.index })
    }
  }
  return out.sort((a, b) => a.index - b.index)
}

/** The label a comment claims as the issue's *current* state — the
 *  rightmost (last) transition match, on the theory that a comment narrating
 *  "was X, now Y" asserts Y as the live state. `null` when the comment makes
 *  no recognizable claim. */
export function latestClaimedLabel(commentBody: string): CanonicalLabel | null {
  const matches = findClaimedLabelTransitions(commentBody)
  if (matches.length === 0) return null
  return matches[matches.length - 1]!.label
}

/** The most recently created AI-authored comment (see `isAiAuthored`), or
 *  `null` if none of `comments` are AI-authored. */
export function mostRecentAiComment(comments: RawCommentApiRecord[]): RawCommentApiRecord | null {
  const aiComments = comments.filter((c) => isAiAuthored(c.body))
  if (aiComments.length === 0) return null
  return aiComments.reduce((latest, c) =>
    Date.parse(c.created_at) > Date.parse(latest.created_at) ? c : latest,
  )
}

/** The drift check for one issue: does its most recent AI-authored comment
 *  claim a triage label its live labels don't carry? Returns `null` when
 *  there's no AI-authored comment, the comment makes no recognizable claim,
 *  or the claim matches the live labels (no drift). */
export function findTriageDrift(
  issue: DriftCheckIssue,
  comments: RawCommentApiRecord[],
): FlaggedIssue | null {
  const comment = mostRecentAiComment(comments)
  if (comment === null) return null
  const claimedLabel = latestClaimedLabel(comment.body)
  if (claimedLabel === null) return null
  if (issue.labels.includes(claimedLabel)) return null
  return {
    number: issue.number,
    title: issue.title,
    claimedLabel,
    liveLabels: issue.labels,
    commentUrl: comment.html_url,
    commentCreatedAt: comment.created_at,
  }
}

/** Turn one raw REST issue record into a `DriftCheckIssue`, or `null` if it's
 *  actually a pull request (the REST `issues` endpoint mixes both in,
 *  distinguished only by a `pull_request` key — same quirk
 *  `list-open-issues.ts` screens for). */
export function toDriftCheckIssue(raw: RawIssueApiRecord): DriftCheckIssue | null {
  if (raw.pull_request !== undefined) return null
  return {
    number: raw.number,
    title: decodeHtmlEntities(raw.title),
    labels: raw.labels.map((label) => (typeof label === 'string' ? label : label.name)),
  }
}

// The `gh`/`rest` strategy switch (`pickFetchStrategy`, `parseNextLink`,
// `FetchStrategy`) is single-homed in `list-open-issues.ts` (issue #505) and
// imported above.

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

function readOpenIssuesViaGh(owner: string, repo: string, cwd: string): RawIssueApiRecord[] {
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
    .map((line) => JSON.parse(line) as RawIssueApiRecord)
}

function readIssueCommentsViaGh(owner: string, repo: string, issueNumber: number, cwd: string): RawCommentApiRecord[] {
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
    .map((line) => JSON.parse(line) as RawCommentApiRecord)
}

// See `poll-guest-tickets.ts`'s `curlGetPage` for why `curl` over `fetch`
// here (issue #567) — mirrored verbatim, down to the header/body temp-file
// split for `Link`-header pagination.
function curlGetPage(url: string, token: string, cwd: string): { status: string; body: string; linkHeader: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'check-triage-drift-'))
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
        'Accept: application/vnd.github+json',
        '-H',
        'User-Agent: terrarium-check-triage-drift',
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

async function fetchAllPagesViaRest<T>(initialUrl: string, token: string, cwd: string): Promise<T[]> {
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

async function readOpenIssuesViaRest(
  owner: string,
  repo: string,
  token: string,
  cwd: string,
): Promise<RawIssueApiRecord[]> {
  return fetchAllPagesViaRest<RawIssueApiRecord>(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`,
    token,
    cwd,
  )
}

async function readIssueCommentsViaRest(
  owner: string,
  repo: string,
  issueNumber: number,
  token: string,
  cwd: string,
): Promise<RawCommentApiRecord[]> {
  return fetchAllPagesViaRest<RawCommentApiRecord>(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
    token,
    cwd,
  )
}

async function readOpenIssues(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  cwd: string,
): Promise<RawIssueApiRecord[]> {
  if (strategy === 'gh') return readOpenIssuesViaGh(owner, repo, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readOpenIssuesViaRest(owner, repo, token, cwd)
}

async function readIssueComments(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  issueNumber: number,
  cwd: string,
): Promise<RawCommentApiRecord[]> {
  if (strategy === 'gh') return readIssueCommentsViaGh(owner, repo, issueNumber, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readIssueCommentsViaRest(owner, repo, issueNumber, token, cwd)
}

// ── Command ──────────────────────────────────────────────────────────────────

export async function checkTriageDrift(limit = DEFAULT_LIMIT, cwd = root): Promise<FlaggedIssue[]> {
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
  const rawIssues = await readOpenIssues(strategy, owner, repo, cwd)
  const issues = rawIssues
    .map(toDriftCheckIssue)
    .filter((x): x is DriftCheckIssue => x !== null)
    .slice(0, limit)

  const flagged: FlaggedIssue[] = []
  for (const issue of issues) {
    const comments = await readIssueComments(strategy, owner, repo, issue.number, cwd)
    const drift = findTriageDrift(issue, comments)
    if (drift !== null) flagged.push(drift)
  }
  return flagged
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`check-triage-drift: ${msg}`)
  process.exit(1)
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const limitArg = argv[0]
  let limit = DEFAULT_LIMIT
  if (limitArg !== undefined) {
    limit = Number(limitArg)
    if (!Number.isInteger(limit) || limit <= 0) fail(`not a positive integer: ${limitArg}`)
  }
  const flagged = await checkTriageDrift(limit)
  process.stdout.write(JSON.stringify(flagged, null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
}
