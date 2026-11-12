// Gate check (issue #3176): the History page matches `history-stats.ts`, pinned to the
// as-of date the page states.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PERIODS, statsAsOf, type Stats } from '../history/history-stats.ts'
import { root, runIfMain } from '../lib/cli.ts'

export const PAGE_PATH = 'layers/journal/content/current/pages/history.md'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function pageAsOf(md: string): string | undefined {
  const m = /as of (\d{1,2}) (\w+) (\d{4})/.exec(md)
  const month = m ? MONTHS.indexOf(m[2]!) + 1 : 0
  return m && month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : undefined
}

/** Pure: the page's claims against computed stats; one message per mismatch. */
export function historyErrors(md: string, s: Stats): string[] {
  const errors: string[] = []
  const num = (t: string) => Number(t.replace(/,/g, ''))
  const compare = (label: string, got: number, want: number) => {
    if (got !== want) errors.push(`${label}: page says ${got}, computed ${want}`)
  }
  const h = /([\d,]+) commits, ([\d,]+) recorded sessions, ([\d,]+) frictions/.exec(md)
  if (!h) errors.push('header totals ("N commits, N recorded sessions, N frictions") not found')
  else {
    compare('commits', num(h[1]!), s.commits)
    compare('sessions', num(h[2]!), s.sessions)
    compare('frictions', num(h[3]!), s.frictions)
  }
  const rows = [...md.matchAll(/^\| \*\*\[([^\]]+)\].*?\| (\d+) \| (\d+)% \| ([\d.]+) \| (\d+) \|$/gm)]
  if (rows.length !== PERIODS.length) return [...errors, `expected ${PERIODS.length} table rows, found ${rows.length}`]
  rows.forEach((m, i) => {
    const r = s.rows[i]!
    const at = m[1]!
    if (at !== PERIODS[i]!.name) errors.push(`row ${i + 1}: page says "${at}", expected "${PERIODS[i]!.name}"`)
    compare(`${at}, sessions per week`, num(m[2]!), r.sessionsPerWeek)
    compare(`${at}, Agent-initiated %`, num(m[3]!), r.agentShare)
    compare(`${at}, frictions per session`, num(m[4]!), r.frictionsPerSession)
    compare(`${at}, new sites`, num(m[5]!), r.newSites)
  })
  return errors
}

function main(): void {
  const md = readFileSync(resolve(root, PAGE_PATH), 'utf8')
  const asOf = pageAsOf(md)
  if (!asOf) throw new Error(`${PAGE_PATH}: no "as of <day> <month> <year>" date found`)
  const errors = historyErrors(md, statsAsOf(asOf))
  for (const e of errors) console.error(`  ${e}`)
  console.log(`\nvalidate-history: ${errors.length ? 'FAIL' : 'PASS'}`)
  if (errors.length) process.exit(1)
}

runIfMain(import.meta.url, main)
