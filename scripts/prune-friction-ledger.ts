// Prunes the Friction Ledger to its horizon (`frictions-to-fixes` §1): drops
// every occurrence dated before it and deletes an entry left with none, so the
// ledger never carries history git already keeps.
//
// Usage:  tsx scripts/prune-friction-ledger.ts [--today YYYY-MM-DD]
//   Edits `layers/journal/content/current/frictions/*.yml` in place and prints
//   what it dropped. `--today` defaults to the current UTC date.
//   `--summary` edits nothing and prints one line per entry: name, status,
//   ref, in-horizon occurrence count, max severity (issue #1917).
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isMap, isSeq, parse as parseYaml, parseDocument } from 'yaml'
import { LEDGER_DIR } from './session-frictions.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HORIZON_DAYS = 14

/** The oldest occurrence date the horizon keeps. */
export function horizonStart(today: string): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - HORIZON_DAYS * 86_400_000).toISOString().slice(0, 10)
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

export function summarizeLedger(today: string, cwd = root): string[] {
  const start = horizonStart(today)
  const dir = join(cwd, LEDGER_DIR)
  return readdirSync(dir).filter((n) => n.endsWith('.yml')).sort().map((f) => {
    const e = parseYaml(readFileSync(join(dir, f), 'utf8')) ?? {}
    const occ = (Array.isArray(e.occurrences) ? e.occurrences : []).filter((o: { date?: unknown }) => String(o?.date) >= start)
    const max = Math.max(-1, ...occ.map((o: { severity?: string }) => SEVERITIES.indexOf(String(o?.severity))))
    return [e.name ?? f, e.status, e.ref ?? '-', `${occ.length} in horizon`, SEVERITIES[max] ?? '-'].join(' | ')
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--today')
  const today = i >= 0 ? process.argv[i + 1] ?? '' : new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    console.error('prune-friction-ledger: --today must be YYYY-MM-DD')
    process.exit(1)
  }
  if (process.argv.includes('--summary')) {
    console.log(summarizeLedger(today).join('\n'))
    process.exit(0)
  }
  const report = pruneLedger(today)
  console.log(report.length ? report.join('\n') : `prune-friction-ledger: nothing before ${horizonStart(today)}`)
}
