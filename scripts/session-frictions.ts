// The session-frictions helper: the deterministic half of the `frictions-to-fixes`
// Skill's survey step. It does ONLY the mechanical gathering — parse every session
// log, sort by `startedAt` (a filename/`ls` sort is not reliably chronological,
// §1 of the Skill), and pick the newest-N recency window — and emits each
// session's *triage-essential* fields as compact JSON. Screening, grouping, and
// ranking are judgement calls the Skill's subagent makes from this JSON; keeping
// that judgement out of here is the point (predictable process, low token cost,
// no re-improvised parser each run).
//
// Every record carries the session `id` and the source `file` path, so anything
// dropped at this stage (summary, docsRead, learnings, …) can still be read in
// full later — this is a triage extract, not a replacement for the source log.
//
// Usage:  tsx scripts/session-frictions.ts [--window N]
//   Prints the N most-recent sessions (by startedAt, oldest of the window first)
//   as JSON: id, file, startedAt, goal, outcome, prs, and every friction's
//   description/solution/severity.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The default recency window: the 20 newest session logs — matches the
 *  `frictions-to-fixes` Skill's survey step. */
export const DEFAULT_WINDOW = 20

export const SESSIONS_DIR = 'layers/journal/content/current/sessions'

// ── Types ───────────────────────────────────────────────────────────────────

export interface TriageFriction {
  description: string
  solution: string
  severity: string
}
/** The fields the frictions-to-fixes survey actually needs from one session log.
 *  `id`/`file` are carried on every record so a candidate can be traced back to
 *  its full log (summary, docsRead, learnings, …) when more context is needed. */
export interface TriageSession {
  id: string
  file: string
  startedAt: string
  goal: string
  outcome: string
  prs: string[]
  frictions: TriageFriction[]
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** The newest `n` sessions by `startedAt` (ISO), returned oldest-of-the-window
 *  first — the order the Skill reads them in. Ties broken by `id` for a
 *  stable, deterministic order across runs. A filename sort is NOT a
 *  substitute for this: same-day sessions can have an unordered id suffix. */
export function pickRecencyWindow(sessions: TriageSession[], n: number): TriageSession[] {
  return [...sessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))
    .slice(-n)
}

/** Reduce one parsed session-log record to its triage-essential fields. */
export function toTriageSession(raw: Record<string, unknown>, file: string): TriageSession {
  const frictions = Array.isArray(raw.frictions) ? raw.frictions : []
  const prs = Array.isArray(raw.prs) ? raw.prs : []
  return {
    id: String(raw.session ?? ''),
    file,
    startedAt: String(raw.startedAt ?? ''),
    goal: String(raw.goal ?? ''),
    outcome: String(raw.outcome ?? ''),
    prs: prs.map((p) => String(p)),
    frictions: frictions.map((fr: Record<string, unknown>) => ({
      description: String(fr.description ?? '').replace(/\s+/g, ' ').trim(),
      solution: String(fr.solution ?? '').replace(/\s+/g, ' ').trim(),
      severity: String(fr.severity ?? ''),
    })),
  }
}

// ── FS IO (thin shell) ────────────────────────────────────────────────────────

function readSessions(cwd = root): TriageSession[] {
  const dir = join(cwd, SESSIONS_DIR)
  if (!existsSync(dir)) return []
  const out: TriageSession[] = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    if (!raw || typeof raw !== 'object') continue
    out.push(toTriageSession(raw, `${SESSIONS_DIR}/${f}`))
  }
  return out
}

// ── Command ─────────────────────────────────────────────────────────────────

export function survey(windowSize = DEFAULT_WINDOW, cwd = root): TriageSession[] {
  return pickRecencyWindow(readSessions(cwd), windowSize)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`session-frictions: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const wIdx = argv.indexOf('--window')
  const windowSize = wIdx >= 0 && argv[wIdx + 1] ? Number(argv[wIdx + 1]) : DEFAULT_WINDOW
  if (!Number.isInteger(windowSize) || windowSize <= 0) fail('--window must be a positive integer')
  process.stdout.write(JSON.stringify(survey(windowSize), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
