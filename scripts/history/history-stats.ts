// The one home for how the Journal's History page counts (issue #3176): the table
// rows and header totals, from the session logs and git. `scripts/gate/validate-history.ts`
// fails the gate when the page drifts from this output.
// Print: pnpm exec tsx scripts/history/history-stats.ts [--as-of YYYY-MM-DD]
import { execFileSync } from 'node:child_process'
import { readSessionLogs } from '../session/journal-files.ts'
import { flagValue, root, runIfMain } from '../lib/cli.ts'

export const PERIODS: { name: string; from: string; to: string }[] = [
  { name: 'Founding', from: '2026-07-04', to: '2026-07-10' },
  { name: 'Opening up', from: '2026-07-11', to: '2026-07-24' },
  { name: 'Fewer asks', from: '2026-07-25', to: '2026-08-08' },
  { name: 'The floor', from: '2026-08-09', to: '2026-08-25' },
  { name: 'Idling and pruning', from: '2026-08-26', to: '2026-09-24' },
  { name: 'The owner returns', from: '2026-09-25', to: '2026-10-02' },
  { name: 'Simplifying the rules', from: '2026-10-03', to: '2026-10-17' },
  { name: 'Measuring and explaining', from: '2026-10-18', to: '2026-11-11' },
]

/** `date` is the log file's date; `autonomous` is `kind: autonomous` (a delegated
 *  session counts as person-started: the owner's 12 Nov ruling). */
export interface LogFacts { date: string; autonomous: boolean; frictions: number }
export interface Row { sessionsPerWeek: number; agentShare: number; frictionsPerSession: number; newSites: number }
export interface Stats { commits: number; sessions: number; frictions: number; rows: Row[] }

const DAY = 864e5
const inRange = (d: string, from: string, to: string) => d >= from && d <= to

/** Pure. `siteDates` are the dates each site first appeared; `commitCount` is
 *  already limited to `asOf`. Logs after `asOf` are ignored. */
export function computeStats(logs: LogFacts[], commitCount: number, siteDates: string[], asOf: string): Stats {
  const upto = logs.filter((l) => l.date <= asOf)
  const rows = PERIODS.map(({ from, to }) => {
    const s = upto.filter((l) => inRange(l.date, from, to))
    const days = (Date.parse(to) - Date.parse(from)) / DAY + 1
    return {
      sessionsPerWeek: Math.round(s.length / (days / 7)),
      agentShare: Math.round((100 * s.filter((l) => l.autonomous).length) / s.length),
      frictionsPerSession: Math.round((10 * s.reduce((n, l) => n + l.frictions, 0)) / s.length) / 10,
      newSites: siteDates.filter((d) => inRange(d, from, to)).length,
    }
  })
  return { commits: commitCount, sessions: upto.length, frictions: upto.reduce((n, l) => n + l.frictions, 0), rows }
}

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })
}

/** Commit dates on HEAD, which holds origin/main's history (a PR's own commits
 *  postdate any as-of date). Reads full history: the gate unshallows. */
export function gitFacts(asOf: string): { commitCount: number; siteDates: string[] } {
  const commitCount = Number(git('rev-list', '--count', `--until=${asOf}T23:59:59Z`, 'HEAD').trim())
  // A site is a Tenant manifest's first appearance. A commit that also deletes a
  // manifest folds one Tenant into another (Search into Commons): not a new site.
  const out = git('log', '--reverse', '--name-status', '--format=D %cs', '--diff-filter=AD', '--', 'layers/*/tenant.config.ts')
  const siteDates: string[] = []
  let date = ''
  let added = 0
  let deleted = false
  const flush = () => { if (!deleted) for (let i = 0; i < added; i++) siteDates.push(date); added = 0; deleted = false }
  for (const line of out.split('\n')) {
    if (line.startsWith('D 20')) { flush(); date = line.slice(2) }
    else if (line.startsWith('A\t')) added++
    else if (line.startsWith('D\t')) deleted = true
  }
  flush()
  return { commitCount, siteDates }
}

export function readLogFacts(): LogFacts[] {
  return readSessionLogs(root, { archived: true }).map((l) => ({
    date: l.file.split('/').pop()!.slice(0, 10),
    autonomous: l.data.kind === 'autonomous',
    frictions: Array.isArray(l.data.frictions) ? l.data.frictions.length : 0,
  }))
}

export function statsAsOf(asOf: string): Stats {
  const { commitCount, siteDates } = gitFacts(asOf)
  return computeStats(readLogFacts(), commitCount, siteDates, asOf)
}

function main(): void {
  const asOf = flagValue(process.argv, '--as-of') ?? new Date().toISOString().slice(0, 10)
  const s = statsAsOf(asOf)
  console.log(`as of ${asOf}: ${s.commits} commits, ${s.sessions} sessions, ${s.frictions} frictions`)
  s.rows.forEach((r, i) => console.log(`${PERIODS[i]!.name}\t${r.sessionsPerWeek}\t${r.agentShare}%\t${r.frictionsPerSession.toFixed(1)}\t${r.newSites}`))
}

runIfMain(import.meta.url, main)
