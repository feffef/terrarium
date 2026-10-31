// Prunes the Friction Ledger to its horizon (`LEDGER_HORIZON_DAYS`): drops
// every occurrence dated before it and deletes an entry left with none, so the
// ledger never carries history git already keeps.
//
// Usage:
//   tsx .agents/skills/frictions-to-fixes/scripts/prune-friction-ledger.ts
//     [--today YYYY-MM-DD]
//   Edits `layers/journal/content/current/frictions/*.yml` in place and prints
//   what it dropped. `--today` defaults to the current UTC date.
//   `--summary` edits nothing and prints one line per entry: name, state (the
//   stored status, or with merged PRs and not `accepted` what the page shows:
//   fix landed, likely fixed, still recurring with the count since the latest
//   PR, issue #2024),
//   ref, in-horizon occurrence count, max severity (issue #1917), the fix
//   count, latest fix and the highest severity since it (`none` if no
//   occurrence came after), and the newest of the entry's `notes` in full when it
//   has any. It ends with every friction two clusters share, for
//   the survey to judge.
//   `--candidates` edits nothing and prints each entry's survey label from the
//   ledger alone (never-fixed, regression, open-already for a `tracked` entry,
//   naming the issue or PR in its `ref` without checking it is open, or drop),
//   max severity, in-horizon count and ref.
//   Both modes count an occurrence on its latest fix's merge day as a
//   regression when its session's `startedAt` is after the PR's merge commit on
//   origin/main (issue #2333); lacking either time they compare dates, and say so.
//   Either mode's output over OUTPUT_FILE_THRESHOLD goes to a tmpdir file, and
//   stdout prints one line naming it; `--out PATH` always writes there.
//   `--move <session> <from> <to>` moves that session's occurrence from entry
//   `<from>` to `<to>` (file names, `.yml` optional) for a re-cluster (issue
//   #2449). It refuses when `<to>` already holds the session, naming a
//   duplicate or the two conflicting texts, and writes nothing unless every
//   occurrence text survives; an emptied `<from>` is deleted.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isMap, isSeq, parse as parseYaml, parseDocument, type YAMLMap } from 'yaml'
import { LEDGER_HORIZON_DAYS, ledgerFixState, ledgerWindowStart } from '../../../../layers/journal/app/utils/ledger.ts'
import { LEDGER_DIR } from '../../../../scripts/session/extract-frictions.ts'
import { fail, flagValue, resolveOutputTarget, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { tryGit } from '../../../../scripts/lib/git.ts'

/** The oldest occurrence date the horizon keeps. */
export function horizonStart(today: string): string {
  return ledgerWindowStart(today, LEDGER_HORIZON_DAYS + 1)
}

/** One ledger file pruned: its new text, or `null` when no occurrence is left.
 *  Edits the parsed document rather than re-serializing the data, so the
 *  entry's comments and scalar styles survive. */
export function pruneEntry(text: string, start: string): { text: string | null; dropped: number } {
  const doc = parseDocument(text)
  const occ = doc.get('occurrences')
  if (!isSeq(occ)) return { text, dropped: 0 }
  const before = occ.items.length
  occ.items = occ.items.filter((item) => isMap(item) && String(item.get('date')) >= start)
  const dropped = before - occ.items.length
  if (occ.items.length === 0) return { text: null, dropped }
  return { text: dropped ? doc.toString({ lineWidth: 0 }) : text, dropped }
}

export function pruneLedger(today: string, cwd = root): string[] {
  const start = horizonStart(today)
  const dir = join(cwd, LEDGER_DIR)
  const report: string[] = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.yml')).sort()) {
    const path = join(dir, f)
    const { text, dropped } = pruneEntry(readFileSync(path, 'utf8'), start)
    if (text === null) {
      rmSync(path)
      report.push(`${f}: deleted (no occurrence since ${start})`)
    } else if (dropped) {
      writeFileSync(path, text)
      report.push(`${f}: dropped ${dropped} occurrence(s) before ${start}`)
    }
  }
  return report
}

const SEVERITIES = ['nit', 'minor', 'moderate', 'major', 'blocker']

interface Occurrence { session?: string; date?: string; severity?: string; description?: string }
interface Fix { pr: number; date: string }

interface Entry {
  name?: string
  status?: string
  ref?: string
  notes?: string
  fixes?: Fix[]
  occurrences?: Occurrence[]
}

/** Committer time of each PR's merge commit on origin/main, else of the oldest
 *  commit whose subject ends `(#N)`, as a squash merge's does. */
function prMergeTimes(cwd: string): Map<number, string> {
  const merges = new Map<number, string>()
  const squashes = new Map<number, string>()
  for (const line of tryGit(['log', 'origin/main', '--reverse', '--format=%cI %s'], cwd).out.split('\n')) {
    const m = /^(\S+) (?:Merge pull request #(\d+)|.*\(#(\d+)\)$)/.exec(line)
    if (m?.[2]) merges.set(Number(m[2]), m[1]!)
    else if (m?.[3] && !squashes.has(Number(m[3]))) squashes.set(Number(m[3]), m[1]!)
  }
  return new Map([...squashes, ...merges])
}

function sessionStart(cwd: string, session: string): string | undefined {
  for (const space of ['current', 'archived']) {
    const dir = join(cwd, 'layers/journal/content', space, 'sessions')
    const file = existsSync(dir) ? readdirSync(dir).find((n) => n.endsWith(`-${session}.yml`)) : undefined
    if (file) return /^startedAt: *['"]?([^'"\s]+)/m.exec(readFileSync(join(dir, file), 'utf8'))?.[1]
  }
}

/** Whether an occurrence came after a fix: by date, and on the merge day by
 *  exact times; each merge-day case it decides by date lands in `fallbacks`.
 *  `merges` (PR to merge time) is read from origin/main once a merge day needs it. */
export function regressionCheck(cwd = root, merges?: Map<number, string>) {
  const fallbacks: string[] = []
  return {
    fallbacks,
    after(o: Occurrence, fix: Fix): boolean {
      const date = String(o.date)
      if (date !== fix.date) return date > fix.date
      merges ??= prMergeTimes(cwd)
      const merged = merges.get(fix.pr)
      const started = sessionStart(cwd, String(o.session))
      if (merged && started) return Date.parse(started) > Date.parse(merged)
      const shallow = tryGit(['rev-parse', '--is-shallow-repository'], cwd).out.trim() === 'true' ? ' (shallow history)' : ''
      const missing = [merged ? '' : `no merge commit for #${fix.pr} on origin/main${shallow}`, started ? '' : 'no session log startedAt']
      fallbacks.push(`${o.session} on #${fix.pr}'s merge day: compared by date (${missing.filter(Boolean).join(', ')})`)
      return false
    },
  }
}

type RegressionCheck = ReturnType<typeof regressionCheck>

const maxSeverity = (occs: Entry['occurrences'] & object) => SEVERITIES[Math.max(-1, ...occs.map((o) => SEVERITIES.indexOf(String(o.severity))))]

/** An entry's in-horizon occurrences, max severity, latest fix and the occurrences after it. */
function describeEntry(e: Entry, start: string, check: RegressionCheck) {
  const occ = (e.occurrences ?? []).filter((o) => String(o.date) >= start)
  const max = maxSeverity(occ) ?? '-'
  const last = [...(e.fixes ?? [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  const after = last ? occ.filter((o) => check.after(o, last)) : []
  const sinceMax = maxSeverity(after) ?? 'none'
  return { occ, max, last, since: after.length, sinceMax }
}

function readEntries(cwd: string): [string, Entry][] {
  const dir = join(cwd, LEDGER_DIR)
  return readdirSync(dir).filter((n) => n.endsWith('.yml')).sort().map((f) => [f, parseYaml(readFileSync(join(dir, f), 'utf8')) ?? {}])
}

export function summarizeLedger(today: string, cwd = root, check = regressionCheck(cwd)): string[] {
  const start = horizonStart(today)
  const entries = readEntries(cwd)
  const asOf = entries.flatMap(([, e]) => (e.occurrences ?? []).map((o) => String(o.date))).sort().at(-1) ?? ''
  return entries.map(([f, e]) => {
    const { occ, max, last, since, sinceMax } = describeEntry(e, start, check)
    const fixes = last ? `${e.fixes!.length} ${e.fixes!.length === 1 ? 'fix' : 'fixes'}, latest #${last.pr} ${last.date}, since: ${sinceMax}` : 'no fixes'
    const derived = ledgerFixState(e.status, e.fixes ?? [], (e.occurrences ?? []).map((o) => String(o.date)), asOf)
    const state = derived ? (since ? `still recurring (${since} since #${last!.pr})` : derived.state) : e.status
    const note = String(e.notes ?? '').trim().split('\n').at(-1)
    const cols = [e.name ?? f, state, e.ref ?? '-', `${occ.length} in horizon`, max, fixes]
    if (note) cols.push(`note: ${note}`)
    return cols.join(' | ')
  })
}

/** Each entry's survey label from the ledger alone; the tracker is never asked. */
export function candidateLabels(today: string, cwd = root, check = regressionCheck(cwd)): string[] {
  const start = horizonStart(today)
  return readEntries(cwd).map(([f, e]) => {
    const { occ, max, last, since } = describeEntry(e, start, check)
    const ref = /#\d+/.exec(e.ref ?? '')?.[0]
    const label = e.status === 'accepted' || e.status === 'on-trial' ? `drop (${e.status})`
      : e.status === 'tracked' ? `open-already? (${ref ? `ref names ${ref}; check it is open` : 'ref names no issue'})`
      : since ? `regression of #${last!.pr} (${since} since)`
      : last ? `drop (fixed by #${last.pr}, none since)`
      : 'never-fixed'
    return [e.name ?? f, label, max, `${occ.length} in horizon`, e.ref ?? '-'].join(' | ')
  })
}

/** A friction (session + description) two clusters both hold: right only when
 *  its text names both causes, so the survey re-judges each. */
export function sharedFrictions(cwd = root): string[] {
  const holders = new Map<string, string[]>()
  for (const [f, e] of readEntries(cwd)) {
    for (const o of e.occurrences ?? []) {
      const key = `${o.session} "${o.description}"`
      holders.set(key, [...(holders.get(key) ?? []), e.name ?? f])
    }
  }
  return [...holders].filter(([, names]) => names.length > 1).map(([key, names]) => `${names.join(', ')}: ${key}`)
}

/** Moves `session`'s occurrence block from one entry's text to another's,
 *  keeping both files' comments and styles. Returns `from: null` when the
 *  source is left with no occurrence. */
export function moveOccurrence(session: string, fromText: string, toText: string): { from: string | null; to: string } {
  const from = parseDocument(fromText)
  const to = parseDocument(toText)
  const src = from.get('occurrences')
  const dst = to.get('occurrences')
  if (!isSeq(src) || !isSeq(dst)) throw new Error('both entries need an occurrences list')
  const find = (seq: typeof src) => seq.items.findIndex((item) => isMap(item) && item.get('session') === session)
  const i = find(src)
  if (i < 0) throw new Error(`the source entry holds no occurrence from ${session}`)
  const held = find(dst)
  if (held >= 0) {
    // One occurrence per session per entry (journal tenant.config.ts), so a
    // second block would have to replace or drop one of the texts.
    const text = (seq: typeof src, n: number) => String((seq.items[n] as YAMLMap).get('description'))
    if (text(src, i) === text(dst, held)) throw new Error(`duplicate session: the target already holds ${session} with the same text`)
    throw new Error(`text conflict: the target already holds ${session} (one per entry)\n  moving: "${text(src, i)}"\n  target: "${text(dst, held)}"`)
  }
  dst.items.push(src.items.splice(i, 1)[0]!)
  dst.flow = false
  return { from: src.items.length ? from.toString({ lineWidth: 0 }) : null, to: to.toString({ lineWidth: 0 }) }
}

/** The survival check: each occurrence (session and text) the entry texts held
 *  before that they no longer hold after, counted per copy; `null` is a deleted entry. */
export function lostOccurrences(before: string[], after: (string | null)[]): string[] {
  const keys = (texts: (string | null)[]) => texts.flatMap((t) => (t === null ? [] : ((parseYaml(t) as Entry)?.occurrences ?? []).map((o) => `${o.session} "${o.description}"`)))
  const left = keys(after)
  return keys(before).filter((k) => {
    const i = left.indexOf(k)
    if (i >= 0) left.splice(i, 1)
    return i < 0
  })
}

/** Moves `session`'s occurrence between two ledger entries (file names without
 *  `.yml`), writing only once the survival check holds. */
export function moveInLedger(session: string, from: string, to: string, cwd = root): string[] {
  if (from === to) throw new Error('source and target are the same entry')
  const path = (name: string) => join(cwd, LEDGER_DIR, `${name}.yml`)
  const before = [readFileSync(path(from), 'utf8'), readFileSync(path(to), 'utf8')]
  const moved = moveOccurrence(session, before[0]!, before[1]!)
  const lost = lostOccurrences(before, [moved.from, moved.to])
  if (lost.length) throw new Error(`survival check failed, nothing written; lost:\n${lost.join('\n')}`)
  writeFileSync(path(to), moved.to)
  const report = [`moved ${session} from ${from} to ${to}`]
  if (moved.from === null) {
    rmSync(path(from))
    report.push(`${from}.yml: deleted (no occurrence left; carry its fixes and notes over by hand)`)
  } else writeFileSync(path(from), moved.from)
  return report
}

type ReportMode = 'summary' | 'candidates'

/** The full `--summary` or `--candidates` output, trailing sections included. */
export function ledgerReport(mode: ReportMode, today: string, cwd = root, check = regressionCheck(cwd)): { text: string; entries: number } {
  const lines = mode === 'summary' ? summarizeLedger(today, cwd, check) : candidateLabels(today, cwd, check)
  let text = `${lines.join('\n')}\n`
  const shared = mode === 'summary' ? sharedFrictions(cwd) : []
  if (shared.length) text += `\nfrictions in two clusters (keep only when the text names both causes):\n${shared.join('\n')}\n`
  if (check.fallbacks.length) text += `\nmerge-day occurrences compared by date (check by hand):\n${check.fallbacks.join('\n')}\n`
  return { text, entries: lines.length }
}

/** What stdout gets: the report itself, or a notice once it went to a file (issue #2631). */
export function routeReport(argv: string[], mode: ReportMode, report: { text: string; entries: number }, defaultPath = join(tmpdir(), `prune-friction-ledger-${mode}.txt`)): string {
  const bytes = Buffer.byteLength(report.text)
  const target = resolveOutputTarget(argv, bytes, defaultPath)
  if (!target) return report.text
  writeFileSync(target, report.text)
  return `prune-friction-ledger --${mode}: ${report.entries} entries, ${bytes} bytes, written to ${target}\n`
}

function main(): void {
  if (process.argv.includes('--move')) {
    const [session, from, to] = process.argv.slice(process.argv.indexOf('--move') + 1).map((a) => a.replace(/\.yml$/, ''))
    if (!session || !from || !to) fail('usage: --move <session> <from-entry> <to-entry>')
    try {
      console.log(moveInLedger(session, from, to).join('\n'))
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err))
    }
    return
  }
  const todayArg = process.argv.includes('--today') ? flagValue(process.argv, '--today') ?? '' : undefined
  const today = todayArg ?? new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) fail('--today must be YYYY-MM-DD')
  const mode = process.argv.includes('--candidates') ? 'candidates' : process.argv.includes('--summary') ? 'summary' : undefined
  if (mode) {
    process.stdout.write(routeReport(process.argv, mode, ledgerReport(mode, today)))
    return
  }
  const report = pruneLedger(today)
  console.log(report.length ? report.join('\n') : `prune-friction-ledger: nothing before ${horizonStart(today)}`)
}

runIfMain(import.meta.url, main)
