// The list-open-issues helper: turns "what open issues exist right now" —
// today answered via `mcp__github__list_issues`/`search_issues`, which return
// full issue bodies with no compact mode and have overflowed the tool's own
// output-token ceiling four times across a recent 20-session survey window
// (issue #494) — into a direct, compact `gh api` lookup. Mirrors
// `recent-prs.ts`'s fix for the same overflow shape on the PR side (issue
// #319).
//
// Deliberate scope limit: only `number`/`title`/`labels`/`updatedAt` — the
// same allowlist `gh issue list --json number,title,labels,updatedAt` would
// give. No body, no comments, no author (out of scope, same reasoning as
// `recent-prs.ts`).
//
// `gh issue list` itself goes through GitHub's GraphQL API, which this
// environment's proxy can reject for anything outside a pinned PR-review
// operation set; `gh api` against the plain REST `issues` endpoint sidesteps
// that and works everywhere `gh issue list` would. REST's `issues` endpoint
// also returns pull requests mixed in with issues (undocumented by GitHub,
// distinguished only by a `pull_request` key) — filtered out below.
//
// `gh`-absent fallback (issue #505): the `gh` binary is missing in some remote
// sessions, and the old `gh`-only path crashed there with a raw
// `spawnSync gh ENOENT`, forcing the overflow-prone MCP listing this helper
// exists to avoid. So when `gh` is absent but a `GH_TOKEN`/`GITHUB_TOKEN` is in
// the environment, the same compact listing is produced via a direct
// authenticated REST call (`curl`, not Node's built-in `fetch` — see the
// strategy section below and issue #567). Only when neither path is usable does
// the helper exit, and then with an actionable message pointing at the MCP
// fallback rather than a bare ENOENT.
//
// This module is also the single home for the `gh`/`rest` strategy switch's
// pure helpers (`pickFetchStrategy`, `parseNextLink`, `FetchStrategy`), shared
// by the sibling issue-tracker scripts (`check-triage-drift.ts`,
// `poll-guest-tickets.ts`, `guest-intake-scan.ts`) — it is the base module they
// all already import from, so homing them here avoids the import cycle that
// homing them in a sibling would create.
//
// Usage:  tsx scripts/list-open-issues.ts [N]
//   Prints up to N open issues (default 50) as JSON:
//   { number, title, labels, updatedAt }. Newest-updated-first.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_LIMIT = 50

// ── Types ───────────────────────────────────────────────────────────────────

/** One raw record as read off the GitHub REST `issues` list endpoint. */
export interface RawIssueApiRecord {
  number: number
  title: string
  labels: Array<{ name: string } | string>
  updated_at: string
  pull_request?: unknown
}

/** One open issue past the screen — the compact allowlist this helper exists
 *  to provide (no body, no comments, no author — see header). */
export interface OpenIssue {
  number: number
  title: string
  labels: string[]
  updatedAt: string
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** GitHub's REST API HTML-entity-encodes issue text in this repo's
 *  environment (the same quirk `docs/agents/issue-tracker.md` notes for
 *  `issue_read`/`pull_request_read`) — decode the handful of entities GitHub
 *  actually emits so the listing reads as plain text. */
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Turn one raw REST record into an `OpenIssue`, or `null` if it's actually a
 *  pull request (see `RawIssueApiRecord`). */
export function toOpenIssue(raw: RawIssueApiRecord): OpenIssue | null {
  if (raw.pull_request !== undefined) return null
  return {
    number: raw.number,
    title: decodeHtmlEntities(raw.title),
    labels: raw.labels.map((label) => (typeof label === 'string' ? label : label.name)),
    updatedAt: raw.updated_at,
  }
}

/** The `limit` most-recently-updated open issues out of `records`,
 *  newest-first. Pull requests are silently skipped (see `toOpenIssue`);
 *  records are re-sorted by their own `updated_at` rather than trusting API
 *  order, since `gh api --paginate` hands back one page's order after
 *  another rather than a single global sort. */
export function openIssues(records: RawIssueApiRecord[], limit = DEFAULT_LIMIT): OpenIssue[] {
  return records
    .map(toOpenIssue)
    .filter((x): x is OpenIssue => x !== null)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
}

/** Pull `{ owner, repo }` out of a git remote URL. Handles the
 *  `git@host:owner/repo.git`, `https://host/owner/repo.git`, and this
 *  environment's proxied `http://user@host:port/git/owner/repo` shapes
 *  alike — all three end in the same two path segments once `:` and `/` are
 *  both treated as separators. */
export function parseOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const segments = remoteUrl
    .replace(/\.git$/, '')
    .split(/[/:]+/)
    .filter(Boolean)
  if (segments.length < 2) return null
  const repo = segments[segments.length - 1]!
  const owner = segments[segments.length - 2]!
  return { owner, repo }
}

// ── GitHub access strategy (shared single home) ──────────────────────────────

/** Which GitHub-access path a helper script should use. */
export type FetchStrategy = 'gh' | 'rest'

/** `gh` when the binary is present (the well-exercised path); `rest` when it is
 *  absent but a token is available (issue #505's `gh`-less remote sessions);
 *  `null` when neither is usable — the caller fails with an actionable message
 *  rather than a raw ENOENT/fetch error. */
export function pickFetchStrategy(hasGh: boolean, hasToken: boolean): FetchStrategy | null {
  if (hasGh) return 'gh'
  if (hasToken) return 'rest'
  return null
}

/** GitHub's `Link` response header, parsed for a `rel="next"` URL — the plain
 *  REST pagination mechanism `gh api --paginate` handles for us on the `gh`
 *  path; the REST fallback has to walk it by hand so it doesn't silently
 *  truncate a large open-issue set. */
export function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  for (const part of linkHeader.split(',')) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/)
    if (m) return m[1]!
  }
  return null
}

// ── GitHub shell (thin) ──────────────────────────────────────────────────────

// Every `gh`-absent failure mode ends with this caveat instead of a raw
// ENOENT/HTTP error — the whole point of the helper is to keep an agent off the
// overflow-prone MCP listing, so when it can't, it says exactly how to use that
// path safely (issue #505, closing the loop on #494/#131/#143).
const MCP_FALLBACK_CAVEAT =
  'Fall back to the GitHub MCP tools mcp__github__search_issues / ' +
  'mcp__github__list_issues with minimal_output:true and a narrow query ' +
  '(labels/state) to avoid the tool-result overflow this helper exists to ' +
  'prevent (issues #494/#131/#143).'

/** The actionable message a `gh`-less, token-less session gets instead of a raw
 *  ENOENT (issue #505). */
const NO_ACCESS_PATH_MESSAGE =
  '`gh` is not installed and neither GH_TOKEN nor GITHUB_TOKEN is set. ' +
  MCP_FALLBACK_CAVEAT

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

function readOpenIssueRecordsViaGh(owner: string, repo: string, cwd: string): RawIssueApiRecord[] {
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

// `curl`, not Node's built-in `fetch`: this environment's outbound HTTPS goes
// through an agent proxy that undici's `fetch` only honors with
// `NODE_USE_ENV_PROXY=1` set *before the process starts* (too late from inside a
// running script), whereas `curl` already respects `HTTPS_PROXY`/the
// pre-installed CA bundle with no special flags (see /root/.ccr/README.md and
// issue #567 — the reasoning `poll-guest-tickets.ts`'s `curlGetPage`
// documents). `-D`/`-w '%{http_code}'` split the response into a header file
// (for `Link` pagination) and a status code on stdout; the body goes to its own
// temp file.
function curlGetPage(
  url: string,
  token: string,
  cwd: string,
): { status: string; body: string; linkHeader: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'list-open-issues-'))
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
        'User-Agent: terrarium-list-open-issues',
        url,
      ],
      { cwd, encoding: 'utf8' },
    ).trim()
    const body = readFileSync(bodyFile, 'utf8')
    const headers = readFileSync(headerFile, 'utf8')
    const linkLine = headers.split(/\r?\n/).find((l) => /^link:/i.test(l))
    return {
      status,
      body,
      linkHeader: linkLine ? linkLine.slice(linkLine.indexOf(':') + 1).trim() : null,
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function readOpenIssueRecordsViaRest(owner: string, repo: string, token: string, cwd: string): RawIssueApiRecord[] {
  const out: RawIssueApiRecord[] = []
  let url: string | null = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`
  while (url) {
    const { status, body, linkHeader } = curlGetPage(url, token, cwd)
    if (status[0] !== '2') {
      throw new Error(`GitHub REST API request to ${url} failed: HTTP ${status}. ${MCP_FALLBACK_CAVEAT}`)
    }
    out.push(...(JSON.parse(body) as RawIssueApiRecord[]))
    url = parseNextLink(linkHeader)
  }
  return out
}

function readOpenIssueRecords(owner: string, repo: string, cwd: string): RawIssueApiRecord[] {
  const strategy = pickFetchStrategy(hasGhBinary(cwd), Boolean(envToken()))
  if (strategy === null) throw new Error(NO_ACCESS_PATH_MESSAGE)
  if (strategy === 'gh') return readOpenIssueRecordsViaGh(owner, repo, cwd)
  return readOpenIssueRecordsViaRest(owner, repo, envToken()!, cwd)
}

// ── Command ──────────────────────────────────────────────────────────────────

export function listOpenIssues(limit = DEFAULT_LIMIT, cwd = root): OpenIssue[] {
  const originUrl = readOriginUrl(cwd)
  const ownerRepo = parseOwnerRepo(originUrl)
  if (ownerRepo === null) {
    throw new Error(`could not parse owner/repo from origin remote: ${originUrl}`)
  }
  return openIssues(readOpenIssueRecords(ownerRepo.owner, ownerRepo.repo, cwd), limit)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`list-open-issues: ${msg}`)
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
  process.stdout.write(JSON.stringify(listOpenIssues(limit), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
