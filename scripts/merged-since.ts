// The merged-since helper: turns the `frictions-to-fixes` survey's
// already-fixed/regression screening (SKILL.md §2) from manual git-timestamp
// archaeology into a direct comparison. Session logs carry `startedAt` in UTC
// ISO (`...Z`); git commit/merge timestamps come back in the committer's
// local offset (`+02:00`). This helper normalizes both to UTC and lists every
// commit on `origin/main` strictly after a given instant, newest-first, with
// an `isMerge` flag so a PR-merge commit (`Merge pull request #N …`) stands
// out from a direct-to-`main` session/doc commit (ADR-0009).
//
// Usage:  tsx scripts/merged-since.ts <iso-instant>
//   Prints every origin/main commit strictly after <iso-instant> as JSON:
//   hash, isoCommitTime (UTC, "...Z"), subject, isMerge. Newest-first.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Types ───────────────────────────────────────────────────────────────────

/** One raw commit record as read off `git log` — timestamp still in whatever
 *  offset the committer's git client used. */
export interface RawCommit {
  hash: string
  isoCommitTime: string
  subject: string
}

/** One commit past the screen: timestamp normalized to UTC ISO, plus the
 *  derived `isMerge` flag the screening join actually needs. */
export interface MergedCommit {
  hash: string
  isoCommitTime: string
  subject: string
  isMerge: boolean
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** A commit subject that names it a merge — a PR merge (`Merge pull request
 *  #N …`) or a direct branch merge (`Merge branch …`) — as opposed to an
 *  ordinary direct-to-`main` commit (ADR-0009 session/doc logs included). */
export function isMergeSubject(subject: string): boolean {
  return /^Merge (pull request|branch)\b/.test(subject)
}

/** Normalize any ISO-8601 instant (any offset) to its UTC `...Z` form. */
export function toUtcIso(iso: string): string {
  return new Date(iso).toISOString()
}

/** The commits strictly after `sinceUtcIso`, each normalized to UTC ISO and
 *  tagged `isMerge`, sorted newest-first. "Strictly after" matches the
 *  screening question exactly: a fix that landed *before* a friction's
 *  `startedAt` did not retire it (that friction is a regression, not fixed). */
export function mergedSince(commits: RawCommit[], sinceUtcIso: string): MergedCommit[] {
  const sinceMs = Date.parse(sinceUtcIso)
  return commits
    .map((c) => ({ ...c, ms: Date.parse(c.isoCommitTime) }))
    .filter((c) => c.ms > sinceMs)
    .sort((a, b) => b.ms - a.ms)
    .map(({ hash, isoCommitTime, subject }) => ({
      hash,
      isoCommitTime: toUtcIso(isoCommitTime),
      subject,
      isMerge: isMergeSubject(subject),
    }))
}

// ── Git shell (thin) ──────────────────────────────────────────────────────────

const FIELD_SEP = '\x1f'

/** Bring the local `origin/main` ref up to date before it's read. Without
 *  this, a stale local ref silently returns an empty (or truncated) result
 *  that reads identically to "genuinely nothing landed" — the exact failure
 *  mode this helper exists to avoid (see issue #246). Errors (e.g. offline)
 *  are intentionally fatal rather than silently swallowed: a result computed
 *  against a ref we couldn't confirm is fresh is worse than no result. */
function fetchOriginMain(cwd = root): void {
  execFileSync('git', ['fetch', 'origin', 'main'], { cwd, stdio: ['ignore', 'ignore', 'inherit'] })
}

function readCommits(cwd = root): RawCommit[] {
  fetchOriginMain(cwd)
  const raw = execFileSync(
    'git',
    ['log', 'origin/main', '--date=iso-strict', `--format=%H${FIELD_SEP}%cd${FIELD_SEP}%s`],
    { cwd, encoding: 'utf8' },
  )
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hash = '', isoCommitTime = '', subject = ''] = line.split(FIELD_SEP)
      return { hash, isoCommitTime, subject }
    })
}

// ── Command ─────────────────────────────────────────────────────────────────

export function mergedSinceOnMain(sinceUtcIso: string, cwd = root): MergedCommit[] {
  return mergedSince(readCommits(cwd), sinceUtcIso)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`merged-since: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const sinceArg = argv[0]
  if (!sinceArg) fail('usage: tsx scripts/merged-since.ts <iso-instant>')
  if (Number.isNaN(Date.parse(sinceArg))) fail(`not a valid ISO instant: ${sinceArg}`)
  process.stdout.write(JSON.stringify(mergedSinceOnMain(sinceArg), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
