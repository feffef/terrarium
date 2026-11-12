// The one home for how the Journal's History page counts (issue #3176): prints the
// header totals as of a date and a ready-to-paste table row for one period, from
// the session logs and git.
// Run: pnpm exec tsx scripts/history/history-stats.ts --name "Founding" --from 2026-07-04 --to 2026-07-10 [--as-of YYYY-MM-DD]
import { execFileSync } from 'node:child_process'
import { readSessionLogs } from '../session/journal-files.ts'
import { flagValue, root, runIfMain } from '../lib/cli.ts'

/** `date` is the log file's date; `autonomous` is `kind: autonomous` (a delegated
 *  session counts as person-started: the owner's 12 Nov ruling). */
export interface LogFacts { date: string; autonomous: boolean; frictions: number }
export interface Period { name: string; from: string; to: string }
export interface Row { sessionsPerWeek: number; agentShare: number; frictionsPerSession: number; newSites: number }
export interface Totals { commits: number; sessions: number; frictions: number }

const DAY = 864e5
const inRange = (d: string, from: string, to: string) => d >= from && d <= to

/** Pure. `siteDates` are the dates each site first appeared. Logs and sites after
 *  `asOf` are ignored. */
export function computeRow(logs: LogFacts[], siteDates: string[], { from, to }: Period, asOf: string): Row {
  const s = logs.filter((l) => l.date <= asOf && inRange(l.date, from, to))
  const days = (Date.parse(to) - Date.parse(from)) / DAY + 1
  return {
    sessionsPerWeek: Math.round(s.length / (days / 7)),
    agentShare: s.length ? Math.round((100 * s.filter((l) => l.autonomous).length) / s.length) : 0,
    frictionsPerSession: s.length ? Math.round((10 * s.reduce((n, l) => n + l.frictions, 0)) / s.length) / 10 : 0,
    newSites: siteDates.filter((d) => d <= asOf && inRange(d, from, to)).length,
  }
}

export function computeTotals(logs: LogFacts[], commits: number, asOf: string): Totals {
  const upto = logs.filter((l) => l.date <= asOf)
  return { commits, sessions: upto.length, frictions: upto.reduce((n, l) => n + l.frictions, 0) }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The row as the page writes it: `**[Name](#anchor)** · 4–10 Jul | …`; the anchor
 *  follows the section heading "Name — 4 to 10 July". */
export function formatRow(p: Period, r: Row): string {
  const [a, b] = [p.from, p.to].map((d) => ({ day: Number(d.slice(8)), month: MONTHS[Number(d.slice(5, 7)) - 1]! }))
  const same = a!.month === b!.month
  const short = (m: string) => m.slice(0, 3)
  const range = same ? `${a!.day}–${b!.day} ${short(b!.month)}` : `${a!.day} ${short(a!.month)}–${b!.day} ${short(b!.month)}`
  const slug = `${p.name}-${a!.day}${same ? '' : `-${a!.month}`}-to-${b!.day}-${b!.month}`.toLowerCase().replace(/ /g, '-')
  return `| **[${p.name}](#${slug})** · ${range} | ${r.sessionsPerWeek} | ${r.agentShare}% | ${r.frictionsPerSession.toFixed(1)} | ${r.newSites} |`
}

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })
}

/** Pure. A site is a Tenant manifest's first appearance; a commit that also
 *  deletes a manifest folds one Tenant into another (Search into Commons), so
 *  its adds are not new sites. Input is `git log --name-status --format='D %cs'`. */
export function parseSiteDates(log: string): string[] {
  const siteDates: string[] = []
  let date = ''
  let added = 0
  let deleted = false
  const flush = () => { if (!deleted) for (let i = 0; i < added; i++) siteDates.push(date); added = 0; deleted = false }
  for (const line of log.split('\n')) {
    if (line.startsWith('D 20')) { flush(); date = line.slice(2) }
    else if (line.startsWith('A\t')) added++
    else if (line.startsWith('D\t')) deleted = true
  }
  flush()
  return siteDates
}

/** Commit dates on HEAD, which holds origin/main's history (a PR's own commits
 *  postdate any as-of date). */
export function gitFacts(asOf: string): { commitCount: number; siteDates: string[] } {
  if (git('rev-parse', '--is-shallow-repository').trim() === 'true') throw new Error('shallow checkout: run `git fetch --unshallow`')
  const commitCount = Number(git('rev-list', '--count', `--until=${asOf}T23:59:59Z`, 'HEAD').trim())
  const log = git('log', '--reverse', '--name-status', '--format=D %cs', '--diff-filter=AD', '--', 'layers/*/tenant.config.ts')
  return { commitCount, siteDates: parseSiteDates(log) }
}

export function readLogFacts(): LogFacts[] {
  return readSessionLogs(root, { archived: true }).map((l) => ({
    date: l.file.split('/').pop()!.slice(0, 10),
    autonomous: l.data.kind === 'autonomous',
    frictions: Array.isArray(l.data.frictions) ? l.data.frictions.length : 0,
  }))
}

function main(): void {
  const arg = (n: string) => flagValue(process.argv, n)
  const [name, from, to] = [arg('--name'), arg('--from'), arg('--to')]
  if (!name || !from || !to) throw new Error('usage: --name <period> --from YYYY-MM-DD --to YYYY-MM-DD [--as-of YYYY-MM-DD]')
  const asOf = arg('--as-of') ?? new Date().toISOString().slice(0, 10)
  const { commitCount, siteDates } = gitFacts(asOf)
  const logs = readLogFacts()
  const t = computeTotals(logs, commitCount, asOf)
  console.log(`as of ${asOf}: ${t.commits.toLocaleString('en-US')} commits, ${t.sessions.toLocaleString('en-US')} recorded sessions, ${t.frictions.toLocaleString('en-US')} frictions`)
  console.log(formatRow({ name, from, to }, computeRow(logs, siteDates, { name, from, to }, asOf)))
}

runIfMain(import.meta.url, main)
