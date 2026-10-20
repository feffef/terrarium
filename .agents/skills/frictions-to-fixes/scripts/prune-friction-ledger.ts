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
//   count and latest fix, and the newest of the entry's `notes` (cut short) when
//   it has any. It ends with every friction two clusters share, for
//   the survey to judge.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMap, isSeq, parse as parseYaml, parseDocument } from 'yaml'
import { LEDGER_HORIZON_DAYS, ledgerFixState, ledgerWindowStart } from '../../../../layers/journal/app/utils/ledger.ts'
import { LEDGER_DIR } from '../../../../scripts/session/extract-frictions.ts'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'

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

interface Entry {
  name?: string
  status?: string
  ref?: string
  notes?: string
  fixes?: { pr: number; date: string }[]
  occurrences?: { session?: string; date?: string; severity?: string; description?: string }[]
}

function readEntries(cwd: string): [string, Entry][] {
  const dir = join(cwd, LEDGER_DIR)
  return readdirSync(dir).filter((n) => n.endsWith('.yml')).sort().map((f) => [f, parseYaml(readFileSync(join(dir, f), 'utf8')) ?? {}])
}

export function summarizeLedger(today: string, cwd = root): string[] {
  const start = horizonStart(today)
  const entries = readEntries(cwd)
  const asOf = entries.flatMap(([, e]) => (e.occurrences ?? []).map((o) => String(o.date))).sort().at(-1) ?? ''
  return entries.map(([f, e]) => {
    const occ = (e.occurrences ?? []).filter((o) => String(o.date) >= start)
    const max = Math.max(-1, ...occ.map((o) => SEVERITIES.indexOf(String(o.severity))))
    const last = [...(e.fixes ?? [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    const fixes = last ? `${e.fixes!.length} ${e.fixes!.length === 1 ? 'fix' : 'fixes'}, latest #${last.pr} ${last.date}` : 'no fixes'
    const derived = ledgerFixState(e.status, e.fixes ?? [], (e.occurrences ?? []).map((o) => String(o.date)), asOf)
    const state = derived ? `${derived.state}${derived.since ? ` (${derived.since} since #${last!.pr})` : ''}` : e.status
    const note = String(e.notes ?? '').trim().split('\n').at(-1)
    const cols = [e.name ?? f, state, e.ref ?? '-', `${occ.length} in horizon`, SEVERITIES[max] ?? '-', fixes]
    if (note) cols.push(`note: ${note.length > 80 ? `${note.slice(0, 80)}…` : note}`)
    return cols.join(' | ')
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
  if (process.argv.includes('--summary')) {
    console.log(summarizeLedger(today).join('\n'))
    const shared = sharedFrictions()
    if (shared.length) console.log(`\nfrictions in two clusters (keep only when the text names both causes):\n${shared.join('\n')}`)
    return
  }
  const report = pruneLedger(today)
  console.log(report.length ? report.join('\n') : `prune-friction-ledger: nothing before ${horizonStart(today)}`)
}

runIfMain(import.meta.url, main)
