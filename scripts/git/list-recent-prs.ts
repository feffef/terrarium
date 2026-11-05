// The list-recent-prs helper: turns "which PRs merged, in what order, when"
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
// Usage:  tsx scripts/git/list-recent-prs.ts [N]
//         tsx scripts/git/list-recent-prs.ts --since <ISO date or datetime>
//   Prints the last N merged PRs (default 20) on `origin/main` as JSON:
//   { number, title, mergedAtUtc }. Newest-first. With --since, prints every
//   PR merged at or after that time instead (a bare date is midnight UTC).
//   Add --diff to either form to also print each PR's touched files (renames
//   as delete + add) and the first lines of its diff, so a draft starts from
//   the change, not the title (#2854): { number, title, mergedAtUtc, files, diff }.
import { git, readMergeCommits, type RawMergeCommit } from '../lib/git.ts'
import { toUtcIso } from './list-merges-since.ts'
import { root, fail, runIfMain } from '../lib/cli.ts'

const DEFAULT_LIMIT = 20
const MAX_FILES = 30
const MAX_DIFF_LINES = 15

// ── Types ───────────────────────────────────────────────────────────────────

/** One PR-merge record past the screen — the compact allowlist this helper
 *  exists to provide (author/merged_by deliberately excluded, see header). */
export interface RecentPr {
  number: number
  /** Merge commit, so --diff can read the change without re-parsing subjects. */
  hash: string
  title: string
  mergedAtUtc: string
  /** Only with --diff. */
  files?: string[]
  diff?: string[]
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
    hash: commit.hash,
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

/** Every PR merge at or after `since` (an ISO date or datetime), newest-first,
 *  with no count cap — a story window must not silently drop PRs. */
export function prsSince(commits: RawMergeCommit[], since: string): RecentPr[] {
  const sinceMs = Date.parse(since)
  if (Number.isNaN(sinceMs)) throw new Error(`not an ISO date or datetime: ${since}`)
  return recentPrs(commits, Infinity).filter((pr) => Date.parse(pr.mergedAtUtc) >= sinceMs)
}

/** Attach a PR's touched files and the first changed lines of its diff
 *  (hunk headers and +/- lines, no file headers). Both are capped so a wide PR
 *  cannot flood the output. */
export function withChange(pr: RecentPr, nameOnly: string, patch: string): RecentPr {
  const files = nameOnly.split('\n').filter(Boolean)
  let inHeader = false // file headers sit between `diff --git` and the first `@@`
  const diff = patch
    .split('\n')
    .filter((l) => {
      if (l.startsWith('diff --git')) inHeader = true
      else if (l.startsWith('@@')) inHeader = false
      return !inHeader && /^(@@|[+-])/.test(l)
    })
    .slice(0, MAX_DIFF_LINES)
  return { ...pr, files: files.slice(0, MAX_FILES), diff }
}

function describeChanges(prs: RecentPr[]): RecentPr[] {
  return prs.map((pr) => {
    const run = (flag: string) => git(['diff', '--no-renames', flag, '--no-color', `${pr.hash}^1`, pr.hash], root)
    return withChange(pr, run('--name-only'), run('-U0'))
  })
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function main(): void {
  const raw = process.argv.slice(2)
  const argv = raw.filter((a) => a !== '--diff')
  // `hash` only feeds --diff; keep it out of the printed shape.
  const print = (prs: RecentPr[]) =>
    process.stdout.write(
      JSON.stringify(raw.includes('--diff') ? describeChanges(prs) : prs, (k, v) => (k === 'hash' ? undefined : v), 2) + '\n',
    )
  if (argv[0] === '--since') {
    const since = argv[1]
    if (since === undefined) fail('--since needs an ISO date or datetime')
    try {
      print(prsSince(readMergeCommits(root), since))
    } catch (e) {
      fail((e as Error).message)
    }
    return
  }
  const limitArg = argv[0]
  let limit = DEFAULT_LIMIT
  if (limitArg !== undefined) {
    limit = Number(limitArg)
    if (!Number.isInteger(limit) || limit <= 0) fail(`not a positive integer: ${limitArg}`)
  }
  print(recentPrs(readMergeCommits(root), limit))
}

runIfMain(import.meta.url, main)
