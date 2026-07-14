// The recent-prs helper: turns "which PRs merged, in what order, when"
// archaeology from a GitHub MCP `list_pull_requests`/`search_issues` call
// (which returns full bodies and can overflow the tool's own output-token
// ceiling — issue #319 saw ~58,700 chars for the last 20 PRs) into a direct,
// compact, git-only lookup. GitHub's merge-commit convention already carries
// everything the common archaeology need actually wants: the PR number (in
// the subject), the human title (on the body's first line for a "Merge pull
// request" commit made through GitHub's UI/API), and the merge time (the
// commit's own timestamp, normalized to UTC).
//
// Deliberate scope limit: `author`/`merged_by` need the GitHub API and are
// **out of scope** here — this stays a pure git lookup, no new dependency.
// If the title isn't reliably available (an empty body — this repo hasn't
// been observed to produce one, but a squash-merge or a manually-crafted
// merge commit could), the merge subject line itself is used as a fallback.
//
// Usage:  tsx scripts/recent-prs.ts [N]
//   Prints the last N merged PRs (default 20) on `origin/main` as JSON:
//   { number, title, mergedAtUtc }. Newest-first.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fetchOriginMain } from './git-helpers.ts'
import { toUtcIso } from './merged-since.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_LIMIT = 20

// ── Types ───────────────────────────────────────────────────────────────────

/** One raw merge-candidate commit as read off `git log` — subject and body
 *  untouched, timestamp still in whatever offset the committer's git client
 *  used. Not every commit on `main` is a PR merge (this repo also carries
 *  squash and direct-to-`main` commits, ADR-0009) — that filtering happens
 *  in `toRecentPr`. */
export interface RawMergeCommit {
  hash: string
  isoCommitTime: string
  subject: string
  body: string
}

/** One PR-merge record past the screen — the compact allowlist this helper
 *  exists to provide (author/merged_by deliberately excluded, see header). */
export interface RecentPr {
  number: number
  title: string
  mergedAtUtc: string
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** Match GitHub's standard PR-merge subject (`Merge pull request #N from
 *  owner/branch`) and pull out the PR number. `null` for anything else —
 *  a squash-merge or an ordinary direct commit — so the caller can skip it
 *  rather than error (this repo has both, and erroring on them defeats the
 *  point: recent-PR archaeology should degrade gracefully, not crash). */
export function parsePrNumber(subject: string): number | null {
  const m = /^Merge pull request #(\d+) from\b/.exec(subject)
  return m ? Number(m[1]) : null
}

/** The human-readable PR title for a merge commit. GitHub's merge commits
 *  (made through its UI/API) carry the title as the first line of the
 *  commit body; fall back to the merge subject line itself when the body is
 *  empty (observed in this repo: never — but a hand-crafted merge commit
 *  could still lack one). */
export function extractTitle(subject: string, body: string): string {
  const firstBodyLine = body.split('\n')[0]?.trim()
  return firstBodyLine && firstBodyLine.length > 0 ? firstBodyLine : subject
}

/** Turn one raw commit into a `RecentPr`, or `null` if its subject isn't a
 *  GitHub PR-merge commit at all (the skip-don't-error case above). */
export function toRecentPr(commit: RawMergeCommit): RecentPr | null {
  const number = parsePrNumber(commit.subject)
  if (number === null) return null
  return {
    number,
    title: extractTitle(commit.subject, commit.body),
    mergedAtUtc: toUtcIso(commit.isoCommitTime),
  }
}

/** The last `limit` PR merges out of `commits`, newest-first. Non-PR-merge
 *  commits are silently skipped (see `toRecentPr`); commits are re-sorted by
 *  their own timestamp rather than trusting input order, since `git log`'s
 *  ordering can differ once merges/rebases are involved. */
export function recentPrs(commits: RawMergeCommit[], limit = DEFAULT_LIMIT): RecentPr[] {
  return commits
    .map((c) => ({ commit: c, pr: toRecentPr(c) }))
    .filter((x): x is { commit: RawMergeCommit; pr: RecentPr } => x.pr !== null)
    .sort((a, b) => Date.parse(b.pr.mergedAtUtc) - Date.parse(a.pr.mergedAtUtc))
    .slice(0, limit)
    .map((x) => x.pr)
}

// ── Git shell (thin) ──────────────────────────────────────────────────────────

const FIELD_SEP = '\x1f'
const RECORD_SEP = '\x1e'

function readMergeCommits(cwd = root): RawMergeCommit[] {
  // See `fetchOriginMain`'s doc comment (./git-helpers.ts) for why this is
  // called before every read, and why a failure here is left fatal.
  fetchOriginMain(cwd)
  const raw = execFileSync(
    'git',
    [
      'log',
      'origin/main',
      '--merges',
      '--date=iso-strict',
      `--format=%H${FIELD_SEP}%cd${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`,
    ],
    { cwd, encoding: 'utf8' },
  )
  return raw
    .split(RECORD_SEP)
    .map((record) => record.replace(/^\n/, ''))
    .filter((record) => record.length > 0)
    .map((record) => {
      const [hash = '', isoCommitTime = '', subject = '', body = ''] = record.split(FIELD_SEP)
      return { hash, isoCommitTime, subject, body }
    })
}

// ── Command ─────────────────────────────────────────────────────────────────

export function recentPrsOnMain(limit = DEFAULT_LIMIT, cwd = root): RecentPr[] {
  return recentPrs(readMergeCommits(cwd), limit)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`recent-prs: ${msg}`)
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
  process.stdout.write(JSON.stringify(recentPrsOnMain(limit), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
