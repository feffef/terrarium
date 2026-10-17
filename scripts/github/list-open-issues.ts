// The list-open-issues helper: turns "what open issues exist right now" —
// today answered via `mcp__github__list_issues`/`search_issues`, which return
// full issue bodies with no compact mode and have overflowed the tool's own
// output-token ceiling four times across a recent 20-session survey window
// (issue #494) — into a direct, compact `gh api` lookup. Mirrors
// `list-recent-prs.ts`'s fix for the same overflow shape on the PR side (issue
// #319).
//
// Deliberate scope limit: only `number`/`title`/`labels`/`updatedAt` — the
// same allowlist `gh issue list --json number,title,labels,updatedAt` would
// give. No body, no comments, no author (out of scope, same reasoning as
// `list-recent-prs.ts`).
//
// `gh issue list` itself goes through GitHub's GraphQL API, which this
// environment's proxy can reject for anything outside a pinned PR-review
// operation set; `gh api` against the plain REST `issues` endpoint sidesteps
// that and works everywhere `gh issue list` would. REST's `issues` endpoint
// also returns pull requests mixed in with issues (undocumented by GitHub,
// distinguished only by a `pull_request` key) — filtered out below.
//
// `gh`-absent fallback (issue #505): the `gh` binary is missing in some remote
// sessions, so with a `GH_TOKEN`/`GITHUB_TOKEN` the same listing is produced
// via `curl` (see `lib/github-client.ts`). Only when neither path is usable
// does the helper exit, with an actionable message pointing at the MCP
// fallback rather than a bare ENOENT.
//
// Usage:  tsx scripts/github/list-open-issues.ts [N]
//   Prints up to N open issues (default 50) as JSON:
//   { number, title, labels, updatedAt }. Newest-updated-first.
import { fail, root, runIfMain } from '../lib/cli.ts'
import { decodeHtmlEntities, listAll, NO_ACCESS_MESSAGE, resolveAccess, type Access } from '../lib/github-client.ts'

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
 *  order, since pages arrive one after another rather than as a single global
 *  sort. */
export function openIssues(records: RawIssueApiRecord[], limit = DEFAULT_LIMIT): OpenIssue[] {
  return records
    .map(toOpenIssue)
    .filter((x): x is OpenIssue => x !== null)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
}

// ── Command ──────────────────────────────────────────────────────────────────

// Every `gh`-absent failure mode ends with this caveat instead of a raw
// ENOENT/HTTP error — the whole point of the helper is to keep an agent off the
// overflow-prone MCP listing, so when it can't, it says exactly how to use that
// path safely (issue #505, closing the loop on #494/#131/#143).
const MCP_FALLBACK_CAVEAT =
  'Fall back to the GitHub MCP tools mcp__github__search_issues / ' +
  'mcp__github__list_issues with minimal_output:true and a narrow query ' +
  '(labels/state) to avoid the tool-result overflow this helper exists to ' +
  'prevent (issues #494/#131/#143).'

const withCaveat = (err: unknown): Error => {
  const msg = err instanceof Error ? err.message : String(err)
  return new Error(`${msg}. ${MCP_FALLBACK_CAVEAT}`, { cause: err })
}

export function listOpenIssues(limit = DEFAULT_LIMIT, cwd = root): OpenIssue[] {
  let access: Access
  try {
    access = resolveAccess(cwd)
  } catch (err) {
    throw err instanceof Error && err.message === NO_ACCESS_MESSAGE ? withCaveat(err) : err
  }
  const list = () => openIssues(listAll<RawIssueApiRecord>(access, 'issues', { state: 'open' }), limit)
  if (access.strategy === 'gh') return list()
  try {
    return list()
  } catch (err) {
    throw withCaveat(err) // any REST-path failure, so every `gh`-absent mode steers to the safe MCP path
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

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

runIfMain(import.meta.url, main)
