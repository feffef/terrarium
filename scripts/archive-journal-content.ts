// Moves aged-out Journal content from the `current` Space to `archived`
// (CONTEXT.md's current/archived Space pair) — the `current` Space had grown
// too large. Scoped to exactly the two content kinds that make it large:
// Digests (one page per closed UTC day, ADR-0010) and session logs (one per
// Claude session, ADR-0009) — every other Journal Collection (skills, other
// pages) is untouched.
//
// Retention: the newest `RETAIN_DAYS` UTC calendar dates stay on `current`
// (today inclusive); anything older moves. A Digest is dated by its own
// filename; a session is dated by its `endedAt` field (truncated to its UTC
// calendar date), not its filename — the two can differ when a session
// starts one day and ends the next.
//
// Usage:  tsx scripts/archive-journal-content.ts [--write] [--now <iso>]
//   (no flag) — print a report of what WOULD move, touch nothing
//   --write   — actually `git mv` the aged-out files (preserves history);
//               leaves the moves staged/unstaged for a normal reviewed
//               commit — this is content restructuring, not a session log,
//               so it doesn't qualify for ADR-0009's direct-to-main exception
//   --now     — override "today" (UTC ISO-8601) for a deterministic dry run
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

/** UTC calendar dates kept on `current`, today inclusive. */
export const RETAIN_DAYS = 7

// ── Pure core (unit-tested) ───────────────────────────────────────────────

function toUtcDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The oldest UTC calendar date still kept on `current`: `retainDays` dates
 *  total, `now`'s own date inclusive. e.g. retainDays=7, now=2026-07-24 keeps
 *  2026-07-18..2026-07-24 — cutoff is 2026-07-18. A date `< cutoff` archives. */
export function cutoffDate(now: Date, retainDays: number): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  day.setUTCDate(day.getUTCDate() - (retainDays - 1))
  return toUtcDateString(day)
}

export function isOldEnoughToArchive(date: string, cutoff: string): boolean {
  return date < cutoff
}

export interface ArchivePlanPart {
  keep: string[]
  archive: string[]
}

/** Classify Digest filenames (`YYYY-MM-DD.md`) against the cutoff. Any
 *  filename not in that exact shape means this dir holds something the
 *  script wasn't told about — abort rather than silently mis-sort it. */
export function classifyDigests(files: string[], cutoff: string): ArchivePlanPart {
  const keep: string[] = []
  const archive: string[] = []
  for (const file of files) {
    const m = /^(\d{4}-\d{2}-\d{2})\.md$/.exec(file)
    if (!m) {
      throw new Error(`archive-journal-content: unexpected digest filename "${file}" — aborting`)
    }
    ;(isOldEnoughToArchive(m[1]!, cutoff) ? archive : keep).push(file)
  }
  return { keep, archive }
}

/** A session's archival date is its `endedAt`, not its filename — a session
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

export interface SessionEntry {
  file: string
  endedAtDate: string
}

export function classifySessions(entries: SessionEntry[], cutoff: string): ArchivePlanPart {
  const keep: string[] = []
  const archive: string[] = []
  for (const { file, endedAtDate } of entries) {
    ;(isOldEnoughToArchive(endedAtDate, cutoff) ? archive : keep).push(file)
  }
  return { keep, archive }
}

export interface ArchivePlan {
  cutoff: string
  digests: ArchivePlanPart
  sessions: ArchivePlanPart
}

/** The whole plan from already-read directory listings + session materials —
 *  pure, no fs/git of its own, so it's directly unit-testable. */
export function buildPlan(
  digestFiles: string[],
  sessionEntries: SessionEntry[],
  now: Date,
  retainDays: number = RETAIN_DAYS,
): ArchivePlan {
  const cutoff = cutoffDate(now, retainDays)
  return {
    cutoff,
    digests: classifyDigests(digestFiles, cutoff),
    sessions: classifySessions(sessionEntries, cutoff),
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

/** Read every session file under `dir` and reduce it to what `classifySessions`
 *  needs — the one point where a malformed file aborts the whole run. */
function readSessionEntries(dir: string): SessionEntry[] {
  return listFiles(dir)
    .filter((f) => f.endsWith('.yml'))
    .map((file) => ({ file, endedAtDate: parseSessionEndedDate(readFileSync(join(dir, file), 'utf8'), file) }))
}

export function planArchive(cwd: string, now: Date, retainDays: number = RETAIN_DAYS): ArchivePlan {
  const digestFiles = listFiles(join(cwd, DIGESTS_DIR))
  const sessionEntries = readSessionEntries(join(cwd, SESSIONS_DIR))
  return buildPlan(digestFiles, sessionEntries, now, retainDays)
}

/** `git mv` one file, creating its destination directory first — `git mv`
 *  (like plain `mv`) requires the destination directory to already exist. */
function gitMv(cwd: string, srcRel: string, destRel: string): void {
  mkdirSync(dirname(resolve(cwd, destRel)), { recursive: true })
  execFileSync('git', ['mv', srcRel, destRel], { cwd })
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

function parseArgs(argv: string[]): { write: boolean; now: Date } {
  const write = argv.includes('--write')
  const nowIdx = argv.indexOf('--now')
  const nowArg = nowIdx >= 0 ? argv[nowIdx + 1] : undefined
  const now = nowArg !== undefined ? new Date(nowArg) : new Date()
  if (Number.isNaN(now.getTime())) fail(`--now value "${nowArg}" is not a valid date`)
  return { write, now }
}

function main(): void {
  const { write, now } = parseArgs(process.argv.slice(2))
  const plan = planArchive(root, now)

  console.log(`archive-journal-content: cutoff ${plan.cutoff} (keep newest ${RETAIN_DAYS} UTC days, today ${toUtcDateString(now)})`)
  console.log(`  digests:  ${plan.digests.keep.length} kept, ${plan.digests.archive.length} to archive`)
  for (const f of plan.digests.archive) console.log(`    ${DIGESTS_DIR}/${f} -> ${ARCHIVED_DIGESTS_DIR}/${f}`)
  console.log(`  sessions: ${plan.sessions.keep.length} kept, ${plan.sessions.archive.length} to archive`)
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
