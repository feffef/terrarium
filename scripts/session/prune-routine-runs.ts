// Keeps the newest `RUNS_KEPT` runs in each Routine's file, so the cost history
// stays a window git already backs up. `audit-skills` calls it after appending.
//
// Usage: tsx scripts/session/prune-routine-runs.ts
//   Edits `layers/journal/content/current/routines/*.yml` in place and prints
//   what it dropped.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMap, isSeq, parseDocument } from 'yaml'
import { root, runIfMain } from '../lib/cli.ts'

export const ROUTINES_DIR = 'layers/journal/content/current/routines'
export const RUNS_KEPT = 30

/** One Routine file pruned. Edits the parsed document so its scalar styles survive. */
export function pruneRuns(text: string, keep = RUNS_KEPT): { text: string; dropped: number } {
  const doc = parseDocument(text)
  const runs = doc.get('runs')
  if (!isSeq(runs) || runs.items.length <= keep) return { text, dropped: 0 }
  const started = (item: unknown) => (isMap(item) ? String(item.get('startedAt')) : '')
  const newest = [...runs.items].sort((a, b) => started(b).localeCompare(started(a))).slice(0, keep)
  const dropped = runs.items.length - keep
  runs.items = runs.items.filter((item) => newest.includes(item))
  return { text: doc.toString({ lineWidth: 0 }), dropped }
}

export function pruneRoutines(cwd = root): string[] {
  const dir = join(cwd, ROUTINES_DIR)
  const report: string[] = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.yml')).sort()) {
    const path = join(dir, f)
    const { text, dropped } = pruneRuns(readFileSync(path, 'utf8'))
    if (dropped) {
      writeFileSync(path, text)
      report.push(`${f}: dropped ${dropped} run(s) beyond the newest ${RUNS_KEPT}`)
    }
  }
  return report
}

function main(): void {
  const report = pruneRoutines()
  console.log(report.length ? report.join('\n') : `prune-routine-runs: nothing beyond ${RUNS_KEPT} runs`)
}

runIfMain(import.meta.url, main)
