// Shared, unit-tested git-log helpers reused across the git-log-based scripts
// (audit-skills, gate:scoped, merged-since, recent-prs) — single-homes guards
// that would otherwise be re-derived, and re-broken, per script (#292, #451).
import { execFileSync } from 'node:child_process'

const FIELD_SEP = '\x1f'
const RECORD_SEP = '\x1e'

/** One raw merge-candidate commit as read off `git log --merges` — subject
 *  and body untouched, timestamp still in whatever offset the committer's
 *  git client used. Not every commit a merge-log reader turns up is a PR
 *  merge (a manually-crafted merge commit can still slip through) — that
 *  filtering is each caller's own job (see `recent-prs.ts`'s `toRecentPr`). */
export interface RawMergeCommit {
  hash: string
  isoCommitTime: string
  subject: string
  body: string
}

/** A parentless commit's empty `%P` — a shallow-clone graft or the true repo
 *  root — diffs against the empty tree, so a `git log --name-only`/parent-diff
 *  reader would misattribute it as touching every path it lists (#292). Only
 *  that kind of reader needs this guard: a `--merges` reader is never handed a
 *  parentless record (a boundary graft has no parents, so it can't be a
 *  merge), and a plain `--format` lister with no `--name-only` never diffs
 *  against a parent at all. Checked as exact-empty, not trimmed: `%P` is
 *  either empty or a space-separated list of hex SHAs, never whitespace. */
export function isParentlessBoundaryCommit(parents: string): boolean {
  return parents === ''
}

/** Bound on a `git fetch origin main` used only to freshen a ref before a
 *  read — never load-bearing for a merge. On proxy latency an unbounded fetch
 *  can hang indefinitely, hanging even a `--dry`/read-only invocation (#451).
 *  Single-homed so every read-only fetch site shares one tuned value instead
 *  of duplicating the number per call site. */
export const FETCH_TIMEOUT_MS = 10_000

/** True when `err` (thrown by a `timeout`-bounded `execFileSync` git call)
 *  was killed for exceeding its timeout, rather than failing some other way
 *  (e.g. offline, no such remote). `execFileSync` (via `spawnSync`) reports a
 *  timeout as `code: 'ETIMEDOUT'` — NOT via a `killed` flag, which stays
 *  `undefined` in practice. Distinguishing the two lets a caller surface a
 *  clear "fetch timed out" message instead of a generic "Command failed" one. */
export function isFetchTimeout(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as NodeJS.ErrnoException).code === 'ETIMEDOUT'
  )
}

/** Bring the local `<remote>/main` ref up to date before it's read. Without
 *  this, a stale local ref silently returns an empty, wrong, or truncated
 *  result that reads identically to "genuinely nothing new" (issue #246) —
 *  every caller here reads `<remote>/main` right after calling this.
 *
 *  Bounded by `timeoutMs` (default `FETCH_TIMEOUT_MS`); on timeout, throws a
 *  clear "fetch timed out" error instead of the generic "Command failed" one
 *  `execFileSync` would raise on its own. What a caller does with that error
 *  is its own call: `merged-since.ts`/`recent-prs.ts` let it propagate as
 *  fatal (a result computed against an unconfirmed-fresh ref is worse than no
 *  result); `gate.ts`'s `changedPaths` and `session-end.ts`'s `mainVersion`
 *  both catch it and degrade to best-effort instead. */
export function fetchOriginMain(
  cwd: string,
  remote = 'origin',
  timeoutMs = FETCH_TIMEOUT_MS,
): void {
  try {
    execFileSync('git', ['fetch', remote, 'main'], {
      cwd,
      stdio: ['ignore', 'ignore', 'inherit'],
      timeout: timeoutMs,
    })
  } catch (err) {
    if (isFetchTimeout(err)) {
      throw new Error(`git fetch ${remote} main timed out after ${timeoutMs}ms`, { cause: err })
    }
    throw err
  }
}

/** The merge commits on `<remote>/main` — single-homed here rather than
 *  duplicated per script (issue #448 code review: `recent-prs.ts` and
 *  `pr-timeline.ts` both need the identical `git log --merges` scan). Calls
 *  `fetchOriginMain` first (see its own doc comment for why), then parses
 *  each merge's hash/timestamp/subject/body out of the `\x1f`/`\x1e`-delimited
 *  format string. Leaves PR-merge-vs-other-merge filtering to the caller. */
export function readMergeCommits(cwd: string, remote = 'origin'): RawMergeCommit[] {
  fetchOriginMain(cwd, remote)
  const raw = execFileSync(
    'git',
    [
      'log',
      `${remote}/main`,
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
