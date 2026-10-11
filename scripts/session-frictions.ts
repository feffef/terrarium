// The session-frictions helper: the deterministic half of the `frictions-to-fixes`
// Skill's survey step. It does ONLY the mechanical gathering — parse every session
// log, sort by `startedAt` (a filename/`ls` sort is not reliably chronological,
// §1 of the Skill), and pick the recency window — and emits each
// session's *triage-essential* fields as compact JSON. Screening, grouping, and
// ranking are judgement calls the Skill's subagent makes from this JSON; keeping
// that judgement out of here is the point (predictable process, low token cost,
// no re-improvised parser each run).
//
// Every record carries the session `id` and the source `file` path, so anything
// dropped at this stage (summary, docsRead, learnings, …) can still be read in
// full later — this is a triage extract, not a replacement for the source log.
//
// Usage:  tsx scripts/session-frictions.ts [--days N | --since ISO] [--compact] [--out PATH]
//   Prints the sessions that ended since the window's start (oldest first)
//   as JSON: id, file, startedAt, goal, outcome, prs, and every friction's
//   description/solution/severity, and reports where the window starts.
//   `--days N` or `--since ISO` sets the start; the default is
//   `defaultWindowStart`.
//
// Output above OUTPUT_FILE_THRESHOLD is written to a file instead of stdout
// (see main()), so a large --days can no longer blow a caller's inline-capture
// cap (issue #976) — no caller-side redirect or --compact is required for safety.
//
// --compact drops the prose fields (goal/outcome/summary/solution and per-doc
// reasons) that make the default output large, keeping id/file/startedAt/prs,
// docsRead paths, subagents and each friction's description/severity, for a
// caller that wants a smaller read regardless (issues #951, #1755).
//
// --out PATH always writes the JSON to PATH instead of the shared tmpdir
// default, regardless of size — for a caller that wants the output at a
// specific location (e.g. its own scratchpad, to avoid colliding with a
// parallel run) rather than the shared default.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isExternalSession } from '../shared/schemas/session.ts'
import type { SubagentRef } from './session-trace.ts'
import { readSessionLogs } from './session-logs.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 48 hours lets a friction too minor for its own ledger entry be seen
 *  recurring across two daily runs; reaching back that far from the ledger's
 *  last commit, not from now, means a missed run loses no logs and covers
 *  sessions that ended while the last run was working. */
export const WINDOW_HOURS = 48
const LEDGER_DIR = 'layers/journal/content/current/frictions'

// ── Types ───────────────────────────────────────────────────────────────────

export interface TriageFriction {
  description: string
  solution: string
  severity: string
}
export interface TriageDocRead {
  path: string
  reason: string
}
/** The fields the frictions-to-fixes survey actually needs from one session log,
 *  including `docsRead`/`subagents` (issue #1178): judging a friction "doc not
 *  opened" vs. "doc opened but ignored" needs both without a second full-file
 *  read per candidate. `id`/`file` are still carried so a candidate can be
 *  traced back to its full log (summary, learnings, …) when more is needed. */
export interface TriageSession {
  id: string
  file: string
  startedAt: string
  endedAt: string
  goal: string
  outcome: string
  summary: string
  trigger: string
  prs: string[]
  docsRead: TriageDocRead[]
  subagents: SubagentRef[]
  frictions: TriageFriction[]
}

export interface CompactFriction {
  description: string
  severity: string
}
/** The `--compact` reduction of a TriageSession: drops the prose fields
 *  (goal/outcome/summary/solution, doc reasons) that make the default output
 *  exceed the Bash tool's inline-capture cap at the default window (issue #951),
 *  but keeps what the survey's doc-read check needs (issue #1755). `id`/`file`
 *  are kept so a candidate can still be traced back to its full log. */
export interface CompactSession {
  id: string
  file: string
  startedAt: string
  prs: string[]
  docsRead: string[]
  subagents: SubagentRef[]
  frictions: CompactFriction[]
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

export function defaultWindowStart(now: number, lastLedgerCommit: number | null): number {
  return (lastLedgerCommit ?? now) - WINDOW_HOURS * 3_600_000
}

/** Sessions that ended at or after `cutoff` (a log lands when its session
 *  ends, so a long session started before the cutoff is still new),
 *  oldest first — the order the Skill reads them in. Ties broken by `id` for a
 *  stable, deterministic order across runs. A filename sort is NOT a
 *  substitute for this: same-day sessions can have an unordered id suffix. */
export function pickRecencyWindow(sessions: TriageSession[], cutoff: number): TriageSession[] {
  return sessions
    .filter((s) => Date.parse(s.endedAt || s.startedAt) >= cutoff)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))
}

const SESSION_LOG_DIR = 'layers/journal/content/current/sessions/'

/** Audit sessions read hundreds of session logs; listing each blows the output
 *  cap, so they collapse into one "N session logs" entry. */
function collapseSessionLogReads(docsRead: Record<string, unknown>[]): TriageDocRead[] {
  const reads = docsRead.map((d) => ({ path: String(d.path ?? ''), reason: String(d.reason ?? '') }))
  const kept = reads.filter((d) => !d.path.startsWith(SESSION_LOG_DIR))
  const n = reads.length - kept.length
  return n ? [...kept, { path: `${n} session logs`, reason: '' }] : kept
}

/** Reduce one parsed session-log record to its triage-essential fields. */
export function toTriageSession(raw: Record<string, unknown>, file: string): TriageSession {
  const frictions = Array.isArray(raw.frictions) ? raw.frictions : []
  const prs = Array.isArray(raw.prs) ? raw.prs : []
  const docsRead = Array.isArray(raw.docsRead) ? raw.docsRead : []
  const subagents = Array.isArray(raw.subagents) ? raw.subagents : []
  return {
    id: String(raw.session ?? ''),
    file,
    startedAt: String(raw.startedAt ?? ''),
    endedAt: String(raw.endedAt ?? ''),
    goal: String(raw.goal ?? ''),
    outcome: String(raw.outcome ?? ''),
    summary: String(raw.summary ?? ''),
    trigger: String(raw.trigger ?? ''),
    prs: prs.map((p) => String(p)),
    docsRead: collapseSessionLogReads(docsRead),
    subagents: subagents.map((s: Record<string, unknown>) => {
      const ref: SubagentRef = {}
      if (typeof s.type === 'string') ref.type = s.type
      if (typeof s.task === 'string') ref.task = s.task
      if (typeof s.model === 'string') ref.model = s.model
      return ref
    }),
    frictions: frictions.map((fr: Record<string, unknown>) => ({
      description: String(fr.description ?? '').replace(/\s+/g, ' ').trim(),
      solution: String(fr.solution ?? '').replace(/\s+/g, ' ').trim(),
      severity: String(fr.severity ?? ''),
    })),
  }
}

/** Reduce a TriageSession to its `--compact` fields (see CompactSession). */
export function toCompactSession(s: TriageSession): CompactSession {
  return {
    id: s.id,
    file: s.file,
    startedAt: s.startedAt,
    prs: s.prs,
    docsRead: s.docsRead.map((d) => d.path),
    subagents: s.subagents,
    frictions: s.frictions.map((fr) => ({ description: fr.description, severity: fr.severity })),
  }
}

// ── FS IO (thin shell) ────────────────────────────────────────────────────────

function readSessions(cwd = root): TriageSession[] {
  // An EXTERNAL log (ADR-0009 amendment) is excluded from the frictions-to-fixes
  // corpus entirely: its frictions reflect a different harness/toolchain that our
  // fixes don't touch, so mining them would chase non-generalizing signal.
  // Archived logs too: a window reaching back to an old ledger commit can
  // predate what `current` retains.
  return readSessionLogs(cwd, { archived: true })
    .filter(({ data }) => !isExternalSession(data))
    .map(({ file, data }) => toTriageSession(data, file))
}

/** `null` when no commit is visible (none yet, a shallow clone, no git):
 *  the window then falls back to `WINDOW_HOURS` before now. */
function lastLedgerCommit(cwd: string): number | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', LEDGER_DIR], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    return out ? Date.parse(out) : null
  } catch {
    return null
  }
}

// ── Command ─────────────────────────────────────────────────────────────────

export function survey(start?: number, cwd = root, now = Date.now()): { since: number; sessions: TriageSession[] } {
  const since = start ?? defaultWindowStart(now, lastLedgerCommit(cwd))
  return { since, sessions: pickRecencyWindow(readSessions(cwd), since) }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

// Below common inline-capture caps (issue #976 cites ~30KB overflows), with
// margin for the cap varying by caller.
export const OUTPUT_FILE_THRESHOLD = 20_000
export const OUTPUT_FILE_PATH = join(tmpdir(), 'session-frictions-output.json')

/** Where to send the JSON output: `--out PATH` always writes there, letting a
 *  caller pick its own location instead of the shared tmpdir default (a
 *  recurring session friction); otherwise falls back to the default only
 *  once `jsonLength` exceeds the inline-capture threshold, unchanged from
 *  prior behavior. `null` means stdout. */
export function resolveOutputTarget(argv: string[], jsonLength: number): string | null {
  const idx = argv.indexOf('--out')
  const out = idx >= 0 ? argv[idx + 1] : undefined
  if (out) return out
  return jsonLength > OUTPUT_FILE_THRESHOLD ? OUTPUT_FILE_PATH : null
}

function fail(msg: string): never {
  console.error(`session-frictions: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const dIdx = argv.indexOf('--days')
  const sIdx = argv.indexOf('--since')
  let start: number | undefined
  if (dIdx >= 0) {
    const days = Number(argv[dIdx + 1])
    if (!(days > 0)) fail('--days must be a positive number')
    start = Date.now() - days * 86_400_000
  } else if (sIdx >= 0) {
    start = Date.parse(argv[sIdx + 1] ?? '')
    if (Number.isNaN(start)) fail('--since must be an ISO timestamp')
  }
  const { since: startMs, sessions } = survey(start)
  const since = new Date(startMs).toISOString()
  const output = argv.includes('--compact') ? sessions.map(toCompactSession) : sessions
  const json = JSON.stringify(output, null, 2)
  const target = resolveOutputTarget(argv, json.length)
  if (target) {
    writeFileSync(target, json + '\n')
    process.stdout.write(`session-frictions: ${sessions.length} sessions since ${since}, ${json.length} bytes, written to ${target}\n`)
  } else {
    console.error(`session-frictions: window starts ${since}`)
    process.stdout.write(json + '\n')
  }
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
