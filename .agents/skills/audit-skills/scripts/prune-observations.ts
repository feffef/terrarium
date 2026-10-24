// audit-skills step 5 keeps only recent `observations` in each Skill Inventory
// entry; runs did the date maths by hand. "More than 40 days before today"
// means an entry dated exactly 40 days ago is kept: only dates strictly before
// the cutoff (today minus 40 days, UTC) go. An entry whose date can't be read
// is kept and reported, so a typo never silently deletes a note.
//
// Usage: tsx .agents/skills/audit-skills/scripts/prune-observations.ts [--today YYYY-MM-DD]
//   Edits `layers/journal/content/current/skills/*.yml` in place and prints
//   each removed entry. `--today` replays a past run.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMap, isSeq, parseDocument } from 'yaml'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'

export const SKILLS_DIR = 'layers/journal/content/current/skills'
export const WINDOW_DAYS = 40
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export interface Pruned {
  text: string
  removed: { date: string; note: string }[]
  unreadable: string[]
}

export function cutoffFor(today: string): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - WINDOW_DAYS)
  return d.toISOString().slice(0, 10)
}

/** Cuts removed items out of the source text by their parsed ranges, because
 *  re-stringifying the document re-flows every folded (`>-`) note. */
export function pruneObservations(text: string, cutoff: string): Pruned {
  const obs = parseDocument(text).get('observations')
  const result: Pruned = { text, removed: [], unreadable: [] }
  if (!isSeq(obs)) return result
  const cuts: [number, number][] = []
  for (const item of obs.items) {
    const date = isMap(item) ? String(item.get('date')) : ''
    const note = isMap(item) ? String(item.get('note') ?? '') : String(item)
    if (!ISO_DATE.test(date)) result.unreadable.push(note)
    else if (date < cutoff && isMap(item) && item.range) {
      result.removed.push({ date, note })
      cuts.push([text.lastIndexOf('\n', item.range[0]) + 1, item.range[2]])
    }
  }
  for (const [start, end] of cuts.reverse()) result.text = result.text.slice(0, start) + result.text.slice(end)
  if (cuts.length === obs.items.length) result.text = result.text.replace(/^observations:[^\S\n]*$/m, 'observations: []')
  return result
}

export function pruneInventory(today: string, cwd = root): string[] {
  const dir = join(cwd, SKILLS_DIR)
  const cutoff = cutoffFor(today)
  const report: string[] = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.yml')).sort()) {
    const path = join(dir, f)
    const { text, removed, unreadable } = pruneObservations(readFileSync(path, 'utf8'), cutoff)
    if (removed.length) writeFileSync(path, text)
    for (const r of removed) report.push(`${f}  ${r.date}  ${r.note.slice(0, 60)}`)
    for (const n of unreadable) report.push(`${f}  kept, no readable date: ${n.slice(0, 60)}`)
  }
  return report
}

function main(): void {
  const today = flagValue(process.argv.slice(2), '--today') ?? new Date().toISOString().slice(0, 10)
  if (!ISO_DATE.test(today)) fail(`--today must be YYYY-MM-DD, got ${today}`)
  const report = pruneInventory(today)
  console.log(report.length ? report.join('\n') : `prune-observations: nothing older than ${WINDOW_DAYS} days (before ${cutoffFor(today)})`)
}

runIfMain(import.meta.url, main)
