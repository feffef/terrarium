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
//   count and latest fix, and the newest of the entry's `notes` in full when it
//   has any. It ends with every friction two clusters share, for
//   the survey to judge.
//   `--candidates` edits nothing and prints each entry's survey label from the
//   ledger alone (never-fixed, regression, open-already for a `tracked` entry,
//   naming the issue or PR in its `ref` without checking it is open, or drop),
//   max severity, in-horizon count and ref.
//   Both modes count an occurrence on its latest fix's merge day as a
//   regression when its session's `startedAt` is after the PR's merge commit on
//   origin/main (issue #2333); lacking either time they compare dates, and say so.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMap, isSeq, parse as parseYaml, parseDocument } from 'yaml'
import { LEDGER_HORIZON_DAYS, ledgerFixState, ledgerWindowStart } from '../../../../layers/journal/app/utils/ledger.ts'
import { LEDGER_DIR } from '../../../../scripts/session/extract-frictions.ts'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
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

/** An entry's in-horizon occurrences, max severity, latest fix and the occurrences after it. */
function describeEntry(e: Entry, start: string, check: RegressionCheck) {
  const occ = (e.occurrences ?? []).filter((o) => String(o.date) >= start)
  const max = SEVERITIES[Math.max(-1, ...occ.map((o) => SEVERITIES.indexOf(String(o.severity))))] ?? '-'
  const last = [...(e.fixes ?? [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  const since = last ? (e.occurrences ?? []).filter((o) => check.after(o, last)).length : 0
  return { occ, max, last, since }
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
    const { occ, max, last, since } = describeEntry(e, start, check)
    const fixes = last ? `${e.fixes!.length} ${e.fixes!.length === 1 ? 'fix' : 'fixes'}, latest #${last.pr} ${last.date}` : 'no fixes'
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
    const ref = /#\d+/.exec(e.ref ?? '')?.[0] ?? 'no issue'
    const label = e.status === 'accepted' || e.status === 'on-trial' ? `drop (${e.status})`
      : e.status === 'tracked' ? `open-already? (ref names ${ref}; check it is open)`
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

function main(): void {
  const todayArg = process.argv.includes('--today') ? flagValue(process.argv, '--today') ?? '' : undefined
  const today = todayArg ?? new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) fail('--today must be YYYY-MM-DD')
  const check = regressionCheck()
  if (process.argv.includes('--candidates')) console.log(candidateLabels(today, root, check).join('\n'))
  else if (process.argv.includes('--summary')) {
    console.log(summarizeLedger(today, root, check).join('\n'))
    const shared = sharedFrictions()
    if (shared.length) console.log(`\nfrictions in two clusters (keep only when the text names both causes):\n${shared.join('\n')}`)
  } else {
    const report = pruneLedger(today)
    console.log(report.length ? report.join('\n') : `prune-friction-ledger: nothing before ${horizonStart(today)}`)
    return
  }
  if (check.fallbacks.length) console.log(`\nmerge-day occurrences compared by date (check by hand):\n${check.fallbacks.join('\n')}`)
}

runIfMain(import.meta.url, main)
