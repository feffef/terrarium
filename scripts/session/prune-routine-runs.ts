// Keeps the newest `RUNS_KEPT` runs in each Routine's file, so the cost history
// stays a window git already backs up. `audit-skills` calls it after appending.
//
// Usage: tsx scripts/session/prune-routine-runs.ts [--append <usage.jsonl> --scorecard <scorecard.json>]
//   Edits `layers/journal/content/current/routines/*.yml` in place and prints
//   what it dropped. `--append` first adds each scorecard `routineRuns` run the
//   file lacks, its tokens and cost from a `get_session` `usage` line per session.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMap, isSeq, parseDocument, type YAMLSeq } from 'yaml'
import { fail, flagValue, root, runIfMain } from '../lib/cli.ts'
import type { RoutineRuns } from './audit-skills.ts'

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

/** One line of `get_session`'s `usage`, as the Routine run's caller saves it. */
export interface Usage {
  session: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cost_usd: number
}

/** One Routine file with the scorecard's unlisted runs appended. A run without
 *  usage is skipped, not written with blanks: the schema needs every cost. */
export function appendRuns(
  text: string | undefined,
  routine: string,
  runs: RoutineRuns['runs'],
  usage: ReadonlyMap<string, Usage>,
): { text: string; appended: number; skipped: string[] } {
  const doc = parseDocument(text ?? `name: ${routine}\nruns:\n`)
  if (!isSeq(doc.get('runs'))) doc.set('runs', doc.createNode([]))
  const seq = doc.get('runs') as YAMLSeq
  const listed = new Set(seq.items.map((item) => (isMap(item) ? String(item.get('session')) : '')))
  const skipped: string[] = []
  let appended = 0
  for (const run of runs.filter((r) => !listed.has(r.session))) {
    const u = usage.get(run.session)
    if (!u) {
      skipped.push(run.session)
      continue
    }
    seq.add(doc.createNode({
      ...run,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_tokens,
      cacheWriteTokens: u.cache_write_tokens,
      costUsd: u.cost_usd,
    }))
    appended++
  }
  return { text: appended ? doc.toString({ lineWidth: 0 }) : (text ?? ''), appended, skipped }
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

/** Appends the scorecard's runs to each Routine file, pruning it in the same write. */
export function appendRoutines(usageJsonl: string, scorecardJson: string, cwd = root): string[] {
  const usage = new Map<string, Usage>()
  for (const line of usageJsonl.split('\n').filter((l) => l.trim())) {
    const u = JSON.parse(line) as Usage
    usage.set(u.session, u)
  }
  const { routineRuns } = JSON.parse(scorecardJson) as { routineRuns: RoutineRuns[] }
  return routineRuns.map(({ routine, runs }) => {
    const f = `${routine}.yml`
    const path = join(cwd, ROUTINES_DIR, f)
    const before = existsSync(path) ? readFileSync(path, 'utf8') : undefined
    const { text, appended, skipped } = appendRuns(before, routine, runs, usage)
    const pruned = pruneRuns(text)
    if ((before !== undefined || appended) && pruned.text !== before) writeFileSync(path, pruned.text)
    const missing = skipped.length ? ` (${skipped.join(', ')})` : ''
    return `${f}: appended ${appended}, skipped ${skipped.length} without usage${missing}, dropped ${pruned.dropped}`
  })
}

export function run(argv: string[], cwd = root): string[] {
  if (!argv.includes('--append') && !argv.includes('--scorecard')) return pruneRoutines(cwd)
  const usage = flagValue(argv, '--append')
  const scorecard = flagValue(argv, '--scorecard')
  if (!usage || !scorecard) fail('--append <usage.jsonl> and --scorecard <scorecard.json> go together')
  return [...appendRoutines(readFileSync(usage, 'utf8'), readFileSync(scorecard, 'utf8'), cwd), ...pruneRoutines(cwd)]
}

function main(): void {
  const report = run(process.argv.slice(2))
  console.log(report.length ? report.join('\n') : `prune-routine-runs: nothing beyond ${RUNS_KEPT} runs`)
}

runIfMain(import.meta.url, main)
