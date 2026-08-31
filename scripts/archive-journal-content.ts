// Moves aged-out Journal content from the `current` Space to `archived`
// (CONTEXT.md's current/archived Space pair) — the `current` Space had grown
// too large. Scoped to exactly the two content kinds that make it large:
// Digests (one page per closed UTC day, ADR-0010) and session logs (one per
// Claude session, ADR-0009) — every other Journal Collection (skills, other
// pages) is untouched.
//
// Retention is a count of what *survives*, per kind: after a sweep, `current`
// holds the newest `RETAIN_DATES` Digests and the session logs of the newest
// `RETAIN_DATES` session dates. It counts the dates that actually exist rather
// than walking back a calendar window, so a date carrying no content never
// spends a slot — the reason a window measured from today used to leave only
// six Digests, since a Digest covers a *closed* UTC day and today's therefore
// cannot exist yet (see the `digest` Skill's "Today is never listed").
//
// A Digest is dated by its own filename; a session by its `endedAt` field
// (truncated to its UTC calendar date), not its filename — the two can differ
// when a session starts one day and ends the next.
//
// Usage:  tsx scripts/archive-journal-content.ts [--write]
//   (no flag) — print a report of what WOULD move, touch nothing
//   --write   — actually `git mv` the aged-out files (preserves history);
//               leaves the moves staged/unstaged for a normal reviewed
//               commit — this is content restructuring, not a session log,
//               so it doesn't qualify for ADR-0009's direct-to-main exception
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { ARCHIVED_SESSIONS_DIR, SESSIONS_DIR } from './audit-skills.ts'
import { DIGESTS_DIR } from './digest.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The other half of `DIGESTS_DIR` (digest.ts only names the `current` side —
 *  it never reads archived content, so it had no reason to define this). */
export const ARCHIVED_DIGESTS_DIR = 'layers/journal/content/archived/pages/digests'

/** How many dates' worth of each kind stay on `current` after a sweep — 7
 *  Digests, and every session log belonging to the newest 7 session dates. */
export const RETAIN_DATES = 7

// ── Pure core (unit-tested) ───────────────────────────────────────────────

/** A file paired with the UTC calendar date retention judges it by. */
export interface DatedFile {
  file: string
  date: string
}

function toUtcDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The newest `retainDates` of the distinct dates present. Anything dated
 *  outside this set archives; fewer dates present than the budget means the
 *  set is everything and nothing archives. */
export function datesToRetain(dates: string[], retainDates: number): Set<string> {
  if (retainDates <= 0) return new Set()
  return new Set([...new Set(dates)].sort().slice(-retainDates))
}

/** `YYYY-MM-DD.md` → its date. Any other filename means this directory holds
 *  something the script wasn't told about — abort rather than mis-sort it. */
export function digestDate(file: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})\.md$/.exec(file)
  if (!m) {
    throw new Error(`archive-journal-content: unexpected digest filename "${file}" — aborting`)
  }
  return m[1]!
}

/** A session's retention date is its `endedAt`, not its filename — a session
 *  can start one UTC day and end the next. Throws on anything unparseable
 *  rather than guessing or silently skipping (drift here should be loud). */
export function parseSessionEndedDate(raw: string, file: string): string {
  let parsed: unknown
  try {
    parsed = parseYaml(raw)
  } catch (err) {
    throw new Error(`archive-journal-content: ${file} is not valid YAML — aborting`, { cause: err })
  }
  const endedAt = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).endedAt : undefined
  if (typeof endedAt !== 'string') {
    throw new Error(`archive-journal-content: ${file} has no valid endedAt — aborting`)
  }
  const d = new Date(endedAt)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`archive-journal-content: ${file} has an unparseable endedAt "${endedAt}" — aborting`)
  }
  return toUtcDateString(d)
}

export interface ArchivePlanPart {
  /** The dates surviving on `current`, oldest first — at most `retainDates`. */
  retained: string[]
  keep: string[]
  archive: string[]
}

/** Split one kind's files by whether their date survives the retention budget. */
export function planPart(entries: DatedFile[], retainDates: number): ArchivePlanPart {
  const retained = datesToRetain(entries.map((e) => e.date), retainDates)
  const keep: string[] = []
  const archive: string[] = []
  for (const { file, date } of entries) {
    ;(retained.has(date) ? keep : archive).push(file)
  }
  return { retained: [...retained].sort(), keep, archive }
}

export interface ArchivePlan {
  digests: ArchivePlanPart
  sessions: ArchivePlanPart
}

/** The whole plan from already-read directory listings + session materials —
 *  pure, no fs/git of its own, so it's directly unit-testable. */
export function buildPlan(
  digestFiles: string[],
  sessionEntries: DatedFile[],
  retainDates: number = RETAIN_DATES,
): ArchivePlan {
  return {
    digests: planPart(digestFiles.map((file) => ({ file, date: digestDate(file) })), retainDates),
    sessions: planPart(sessionEntries, retainDates),
  }
}

// ── fs/git shell (thin) ─────────────────────────────────────────────────────

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort()
}

/** Read every session file under `dir` and reduce it to what `planPart` needs
 *  — the one point where a malformed file aborts the whole run. */
function readSessionEntries(dir: string): DatedFile[] {
  return listFiles(dir)
    .filter((f) => f.endsWith('.yml'))
    .map((file) => ({ file, date: parseSessionEndedDate(readFileSync(join(dir, file), 'utf8'), file) }))
}

export function planArchive(cwd: string, retainDates: number = RETAIN_DATES): ArchivePlan {
  const digestFiles = listFiles(join(cwd, DIGESTS_DIR))
  const sessionEntries = readSessionEntries(join(cwd, SESSIONS_DIR))
  return buildPlan(digestFiles, sessionEntries, retainDates)
}

/** `git mv` one file, creating its destination directory first — `git mv`
 *  (like plain `mv`) requires the destination directory to already exist.
 *  Forces the move because a session log can be archived once, then amended
 *  by `log-session` back into `current` under the same filename — the next
 *  sweep must overwrite the stale archived copy rather than fatal-erroring
 *  on the collision (issue #1093); the `current` copy is always the
 *  authoritative one. */
function gitMv(cwd: string, srcRel: string, destRel: string): void {
  mkdirSync(dirname(resolve(cwd, destRel)), { recursive: true })
  if (existsSync(resolve(cwd, destRel))) {
    console.log(
      `archive-journal-content: ${destRel} already exists from an earlier archive pass — overwriting with the current (amended) copy`,
    )
  }
  execFileSync('git', ['mv', '--force', srcRel, destRel], { cwd })
}

/** Apply a plan's archive lists via `git mv`. Leaves the moves staged for a
 *  normal reviewed commit — this script never commits. */
export function applyArchive(cwd: string, plan: ArchivePlan): void {
  for (const file of plan.digests.archive) {
    gitMv(cwd, join(DIGESTS_DIR, file), join(ARCHIVED_DIGESTS_DIR, file))
  }
  for (const file of plan.sessions.archive) {
    gitMv(cwd, join(SESSIONS_DIR, file), join(ARCHIVED_SESSIONS_DIR, file))
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`archive-journal-content: ${msg}`)
  process.exit(1)
}

function describePart(label: string, part: ArchivePlanPart): string {
  const { retained, keep, archive } = part
  const span = retained.length === 0 ? 'none' : `${retained[0]!}..${retained.at(-1)!}`
  return `  ${`${label}:`.padEnd(10)}${keep.length} file(s) over ${retained.length} date(s) (${span}) kept, ${archive.length} to archive`
}

function main(): void {
  const write = process.argv.slice(2).includes('--write')
  const plan = planArchive(root)

  console.log(`archive-journal-content: retaining the newest ${RETAIN_DATES} dates of each kind`)
  console.log(describePart('digests', plan.digests))
  for (const f of plan.digests.archive) console.log(`    ${DIGESTS_DIR}/${f} -> ${ARCHIVED_DIGESTS_DIR}/${f}`)
  console.log(describePart('sessions', plan.sessions))
  for (const f of plan.sessions.archive) console.log(`    ${SESSIONS_DIR}/${f} -> ${ARCHIVED_SESSIONS_DIR}/${f}`)

  if (!write) {
    console.log('(dry run — pass --write to apply)')
    return
  }
  applyArchive(root, plan)
  console.log(
    `archive-journal-content: moved ${plan.digests.archive.length} digest(s) and ${plan.sessions.archive.length} session(s) to archived (staged via git mv — not committed; review and commit yourself)`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
