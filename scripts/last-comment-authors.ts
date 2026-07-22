// A compact last-comment-authorship report for open issues (issue #637): an
// auto-triage sweep needs to know who commented last on each open issue
// (e.g. to spot a stale agent-authored comment awaiting human reply), but
// doing that via the GitHub MCP tools returns full comment bodies for every
// issue — token-heavy for a full-repo sweep. `check-triage-drift.ts` is
// related but distinct: it fetches comments to check for a specific drift
// condition, not to produce a compact authorship report.
//
// This script fetches the same data `check-triage-drift.ts` does, but emits
// only the compact fields a sweep needs — issue number, the last commenter's
// login, their `author_association`, the comment's timestamp, and whether it
// carries the ADR-0017 provenance footer — never the comment body itself.
//
// Fetch strategy mirrors `check-triage-drift.ts` (issue #637's own
// instruction to reuse it): `gh api` when the `gh` binary is present,
// falling back to a direct authenticated REST call via `curl` when it isn't
// (issue #567). Provenance-footer detection is imported from
// `check-triage-drift.ts`'s `isAiAuthored` rather than re-implemented —
// duplicating that regex would just be a second copy to drift out of sync
// (CLAUDE.md's single-home rule).
//
// Usage:  tsx scripts/last-comment-authors.ts [N]
//   Checks up to N open issues (default 50, newest-updated-first) and prints
//   one compact record per issue that has at least one comment as JSON:
//   { number, lastCommenterLogin, authorAssociation, commentCreatedAt,
//     hasProvenanceFooter, commentUrl }. An issue with no comments is
//   omitted rather than padded with nulls.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isAiAuthored } from './check-triage-drift.ts'
import {
  envToken,
  hasGhBinary,
  parseNextLink,
  parseOwnerRepo,
  pickFetchStrategy,
  type FetchStrategy,
  type RawIssueApiRecord,
} from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_LIMIT = 50

// ── Types ───────────────────────────────────────────────────────────────────

/** One raw comment record as read off the GitHub REST issue-comments
 *  endpoint, trimmed to what this report needs — `body` is only ever passed
 *  through `isAiAuthored()`, never included in this script's own output. */
export interface RawCommentAuthorApiRecord {
  html_url: string
  body: string
  created_at: string
  user: { login: string } | null
  author_association: string
}

/** One open issue's compact last-comment-authorship record — the whole point
 *  of this script: no comment body anywhere in here. */
export interface LastCommentAuthor {
  number: number
  lastCommenterLogin: string
  authorAssociation: string
  commentCreatedAt: string
  hasProvenanceFooter: boolean
  commentUrl: string
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** The compact authorship record for `issueNumber`'s most recent comment, or
 *  `null` when it has no comments at all. */
export function toLastCommentAuthor(
  issueNumber: number,
  comments: RawCommentAuthorApiRecord[],
): LastCommentAuthor | null {
  if (comments.length === 0) return null
  const last = comments.reduce((latest, c) =>
    Date.parse(c.created_at) > Date.parse(latest.created_at) ? c : latest,
  )
  return {
    number: issueNumber,
    lastCommenterLogin: last.user?.login ?? '(unknown)',
    authorAssociation: last.author_association,
    commentCreatedAt: last.created_at,
    hasProvenanceFooter: isAiAuthored(last.body),
    commentUrl: last.html_url,
  }
}

/** The open-issue numbers out of `records`, pull requests filtered out (the
 *  REST `issues` endpoint mixes both in — same quirk `list-open-issues.ts`
 *  and `check-triage-drift.ts` screen for), newest-updated-first. */
export function openIssueNumbers(records: RawIssueApiRecord[], limit = DEFAULT_LIMIT): number[] {
  return records
    .filter((r) => r.pull_request === undefined)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, limit)
    .map((r) => r.number)
}

// The `gh`/`rest` strategy switch (`pickFetchStrategy`, `parseNextLink`,
// `FetchStrategy`, `hasGhBinary`, `envToken`, `parseOwnerRepo`) is
// single-homed in `list-open-issues.ts` (issue #505) and imported above.

// ── GitHub shell (thin) — mirrors check-triage-drift.ts's shell functions ──

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
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

function readIssueCommentsViaGh(
  owner: string,
  repo: string,
  issueNumber: number,
  cwd: string,
): RawCommentAuthorApiRecord[] {
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
    .map((line) => JSON.parse(line) as RawCommentAuthorApiRecord)
}

// See `poll-guest-tickets.ts`'s `curlGetPage` for why `curl` over `fetch`
// here (issue #567) — mirrored verbatim, down to the header/body temp-file
// split for `Link`-header pagination, same as `check-triage-drift.ts`.
function curlGetPage(url: string, token: string, cwd: string): { status: string; body: string; linkHeader: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'last-comment-authors-'))
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
        'User-Agent: terrarium-last-comment-authors',
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
): Promise<RawCommentAuthorApiRecord[]> {
  return fetchAllPagesViaRest<RawCommentAuthorApiRecord>(
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
): Promise<RawCommentAuthorApiRecord[]> {
  if (strategy === 'gh') return readIssueCommentsViaGh(owner, repo, issueNumber, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readIssueCommentsViaRest(owner, repo, issueNumber, token, cwd)
}

// ── Command ──────────────────────────────────────────────────────────────────

export async function lastCommentAuthors(limit = DEFAULT_LIMIT, cwd = root): Promise<LastCommentAuthor[]> {
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
  const numbers = openIssueNumbers(rawIssues, limit)

  const out: LastCommentAuthor[] = []
  for (const number of numbers) {
    const comments = await readIssueComments(strategy, owner, repo, number, cwd)
    const record = toLastCommentAuthor(number, comments)
    if (record !== null) out.push(record)
  }
  return out
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`last-comment-authors: ${msg}`)
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
  const records = await lastCommentAuthors(limit)
  process.stdout.write(JSON.stringify(records, null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
}
