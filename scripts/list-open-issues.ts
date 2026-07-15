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
// Usage:  tsx scripts/list-open-issues.ts [N]
//   Prints up to N open issues (default 50) as JSON:
//   { number, title, labels, updatedAt }. Newest-updated-first.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
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

// ── GitHub shell (thin) ──────────────────────────────────────────────────────

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

function readOpenIssueRecords(owner: string, repo: string, cwd: string): RawIssueApiRecord[] {
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
