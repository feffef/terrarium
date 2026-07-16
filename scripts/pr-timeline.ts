// The pr-timeline helper: given a date range, print the PRs merged to
// `origin/main` in that window, oldest-to-newest, as JSON — the shape a
// date-bounded retrospective (a digest, an audit, an ad-hoc "what shipped
// between X and Y") actually wants, where `recent-prs.ts` only answers "the
// last N merges" and `merged-since.ts` only answers "everything after one
// instant" (issue #448).
//
// Reuses `recent-prs.ts`'s subject/title parsing (`parsePrNumber`,
// `extractTitle`, `RawMergeCommit`) and `merged-since.ts`'s UTC normalizer
// (`toUtcIso`) rather than re-deriving them.
//
// Deliberate scope limit: `merged_by` is out of scope here — git can't
// produce it, this environment has no `gh` CLI, and no caller needs it
// (`recent-prs.ts` and `docs/agents/issue-tracker.md:43` already exclude
// author/merged_by on the same grounds; ADR-0017 notes it reads as the human
// owner anyway).
//
// Usage:  tsx scripts/pr-timeline.ts <from> <to>
//   <from>/<to> are each either a `YYYY-MM-DD` date (UTC midnight) or a full
//   ISO instant. Prints the PRs merged in the half-open [from, to) window as
//   JSON: { number, title, mergedAtUtc, sha, commitCount }. Oldest-first.
//
// Note: this repo's clone is shallow — a range predating the clone boundary
// simply yields fewer rows than actually merged; that's an accepted
// limitation, not a bug to auto-deepen around.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { extractTitle, parsePrNumber, type RawMergeCommit } from './recent-prs.ts'
import { toUtcIso } from './merged-since.ts'
import { fetchOriginMain } from './git-helpers.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Types ───────────────────────────────────────────────────────────────────

/** One PR-merge row in the timeline — `recent-prs.ts`'s `RecentPr` plus the
 *  merge commit's own `sha` and its `commitCount` (the number of commits the
 *  merge brought in), both range-agnostic and populated once per commit
 *  regardless of which window it ultimately falls in. */
export interface PrTimelineRow {
  number: number
  title: string
  mergedAtUtc: string
  sha: string
  commitCount: number
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** Parse a range endpoint given on the CLI: either a bare `YYYY-MM-DD` date
 *  (interpreted as UTC midnight, so a caller can pass calendar dates without
 *  reasoning about offsets) or a full ISO instant. Always returns the UTC
 *  `...Z` form; throws on anything `Date.parse` can't make sense of, rather
 *  than silently producing `Invalid Date` and comparing NaNs downstream. */
export function parseRangeArg(s: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : s
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new Error(`not a valid date (YYYY-MM-DD) or ISO instant: ${s}`)
  return new Date(ms).toISOString()
}

/** The rows whose `mergedAtUtc` falls in the half-open `[fromUtcIso,
 *  toUtcIso)` window, oldest-to-newest. Half-open so an adjacent window pair
 *  (e.g. this week / last week) partitions the timeline without double
 *  counting a merge that lands exactly on the shared boundary. Purely a
 *  filter+sort — `commitCount` (and everything else) is already populated by
 *  the git shell before this runs, so this stays trivially testable. */
export function prTimeline(rows: PrTimelineRow[], fromRangeUtc: string, toRangeUtc: string): PrTimelineRow[] {
  const fromMs = Date.parse(fromRangeUtc)
  const toMs = Date.parse(toRangeUtc)
  return rows
    .filter((r) => {
      const ms = Date.parse(r.mergedAtUtc)
      return ms >= fromMs && ms < toMs
    })
    .sort((a, b) => Date.parse(a.mergedAtUtc) - Date.parse(b.mergedAtUtc))
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

/** The number of commits a merge commit `sha` brought in from its
 *  non-mainline side — `git rev-list --count <sha>^1..<sha>`, i.e. everything
 *  reachable from the merge but not from its first parent. */
function commitCountFor(sha: string, cwd: string): number {
  const out = execFileSync('git', ['rev-list', '--count', `${sha}^1..${sha}`], { cwd, encoding: 'utf8' })
  return Number(out.trim())
}

// ── Command ─────────────────────────────────────────────────────────────────

export function prTimelineOnMain(fromRangeUtc: string, toRangeUtc: string, cwd = root): PrTimelineRow[] {
  const rows: PrTimelineRow[] = readMergeCommits(cwd).flatMap((commit) => {
    const number = parsePrNumber(commit.subject)
    if (number === null) return []
    return [
      {
        number,
        title: extractTitle(commit.subject, commit.body),
        mergedAtUtc: toUtcIso(commit.isoCommitTime),
        sha: commit.hash,
        commitCount: commitCountFor(commit.hash, cwd),
      },
    ]
  })
  return prTimeline(rows, fromRangeUtc, toRangeUtc)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`pr-timeline: ${msg}`)
  process.exit(1)
}

function parseArgOrFail(s: string): string {
  try {
    return parseRangeArg(s)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.length !== 2) fail('usage: tsx scripts/pr-timeline.ts <from> <to>')
  const [fromArg, toArg] = argv as [string, string]
  const fromRangeUtc = parseArgOrFail(fromArg)
  const toRangeUtc = parseArgOrFail(toArg)
  process.stdout.write(JSON.stringify(prTimelineOnMain(fromRangeUtc, toRangeUtc), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
