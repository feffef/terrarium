// Gate check (issue #3176): the Journal's History page matches
// `scripts/history/history-stats.ts`, pinned to the as-of date the page states.
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
  const h = /([\d,]+) commits, ([\d,]+) recorded sessions, ([\d,]+) frictions/.exec(md)
  if (!h) errors.push('header totals ("N commits, N recorded sessions, N frictions") not found')
  else {
    const want = [s.commits, s.sessions, s.frictions]
    ;['commits', 'sessions', 'frictions'].forEach((k, i) => {
      if (num(h[i + 1]!) !== want[i]) errors.push(`${k}: page says ${h[i + 1]}, computed ${want[i]!.toLocaleString('en-US')}`)
    })
  }
  const rows = [...md.matchAll(/^\| \*\*\[([^\]]+)\].*?\| (\d+) \| (\d+)% \| ([\d.]+) \| (\d+) \|$/gm)]
  if (rows.length !== PERIODS.length) errors.push(`expected ${PERIODS.length} table rows, found ${rows.length}`)
  rows.forEach((m, i) => {
    const r = s.rows[i]
    if (!r) return
    const got = [num(m[2]!), num(m[3]!), num(m[4]!), num(m[5]!)]
    const want = [r.sessionsPerWeek, r.agentShare, r.frictionsPerSession, r.newSites]
    ;['sessions per week', 'Agent-initiated %', 'frictions per session', 'new sites'].forEach((k, j) => {
      if (got[j] !== want[j]) errors.push(`${m[1]}, ${k}: page says ${got[j]}, computed ${want[j]}`)
    })
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
