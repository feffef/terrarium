// The merged-since helper: turns the `frictions-to-fixes` survey's
// already-fixed/regression screening (SKILL.md §2) from manual git-timestamp
// archaeology into a direct comparison. Session logs carry `startedAt` in UTC
// ISO (`...Z`); git commit/merge timestamps come back in the committer's
// local offset (`+02:00`). This helper normalizes both to UTC and lists every
// commit on `origin/main` strictly after a given instant, newest-first, with
// an `isMerge` flag so a PR-merge commit (`Merge pull request #N …`) stands
// out from a direct-to-`main` session/doc commit (ADR-0009).
//
// Usage:  tsx scripts/merged-since.ts <iso-instant> [<iso-instant> ...]
//   With a single instant: prints every origin/main commit strictly after it
//   as JSON — hash, isoCommitTime (UTC, "...Z"), subject, isMerge. Newest-first.
//   Unchanged from before #412.
//   With more than one instant (screening several friction sessions in one
//   call, issue #412): prints the union of commits strictly after *any* given
//   instant, each additionally carrying `afterAll` — the subset of the given
//   instants that commit postdates. One `git log`, bounded by the earliest
//   instant, regardless of how many instants are given.
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { fetchOriginMain } from './git-helpers.ts'

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

/** A `MergedCommit` screened against more than one `since` instant at once
 *  (issue #412): `afterAll` lists the subset of the given instants — each in
 *  its original input string form — this commit is strictly after, so one
 *  call can screen several candidate friction timestamps together instead of
 *  one CLI invocation per timestamp. */
export interface AnnotatedCommit extends MergedCommit {
  afterAll: string[]
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

/** The commits strictly after *any* instant in `sinceUtcIso` (the union, not
 *  the intersection), each normalized to UTC ISO, tagged `isMerge`, and
 *  annotated with `afterAll` — the subset of `sinceUtcIso` it's strictly
 *  after — sorted newest-first. "Strictly after" matches the screening
 *  question exactly: a fix that landed *before* a friction's `startedAt` did
 *  not retire it (that friction is a regression, not fixed). A single-instant
 *  call (`sinceUtcIso.length === 1`) filters/sorts/normalizes identically to
 *  the pre-#412 single-string version — `afterAll` is the only addition. */
export function mergedSince(commits: RawCommit[], sinceUtcIso: string[]): AnnotatedCommit[] {
  const sinceMsList = sinceUtcIso.map((iso) => ({ iso, ms: Date.parse(iso) }))
  return commits
    .map((c) => ({ ...c, ms: Date.parse(c.isoCommitTime) }))
    .filter((c) => sinceMsList.some((s) => c.ms > s.ms))
    .sort((a, b) => b.ms - a.ms)
    .map(({ hash, isoCommitTime, subject, ms }) => ({
      hash,
      isoCommitTime: toUtcIso(isoCommitTime),
      subject,
      isMerge: isMergeSubject(subject),
      afterAll: sinceMsList.filter((s) => ms > s.ms).map((s) => s.iso),
    }))
}

// ── Git shell (thin) ──────────────────────────────────────────────────────────

const FIELD_SEP = '\x1f'

/** `sinceBoundUtcIso`, when given, is passed straight to `git log --since` —
 *  a loose lower bound (the earliest of possibly several instants the caller
 *  will filter against downstream), not the final "strictly after" cutoff, so
 *  it only needs to not exclude anything the caller still wants (issue #412:
 *  one bounded `git log`, not one unbounded call per instant). */
function readCommits(cwd = root, sinceBoundUtcIso?: string): RawCommit[] {
  // See `fetchOriginMain`'s doc comment (./git-helpers.ts) for why this is
  // called before every read, and why a failure here is left fatal.
  fetchOriginMain(cwd)
  const args = ['log', 'origin/main', '--date=iso-strict', `--format=%H${FIELD_SEP}%cd${FIELD_SEP}%s`]
  if (sinceBoundUtcIso) args.push(`--since=${sinceBoundUtcIso}`)
  const raw = execFileSync('git', args, { cwd, encoding: 'utf8' })
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hash = '', isoCommitTime = '', subject = ''] = line.split(FIELD_SEP)
      return { hash, isoCommitTime, subject }
    })
}

// ── Command ─────────────────────────────────────────────────────────────────

export function mergedSinceOnMain(sinceUtcIso: string[], cwd = root): AnnotatedCommit[] {
  const earliest = sinceUtcIso.reduce((min, iso) => (Date.parse(iso) < Date.parse(min) ? iso : min))
  return mergedSince(readCommits(cwd, earliest), sinceUtcIso)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`merged-since: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.length === 0) fail('usage: tsx scripts/merged-since.ts <iso-instant> [<iso-instant> ...]')
  for (const arg of argv) {
    if (Number.isNaN(Date.parse(arg))) fail(`not a valid ISO instant: ${arg}`)
  }
  const results = mergedSinceOnMain(argv)
  // Single-instant callers (the pre-#412 contract) get the pre-#412 shape
  // back — `afterAll` is trivially every result's whole input and adds
  // nothing, so it's dropped rather than sprung on existing consumers.
  const output = argv.length === 1 ? results.map(({ afterAll: _afterAll, ...rest }) => rest) : results
  process.stdout.write(JSON.stringify(output, null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
