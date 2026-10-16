// Pure ranking for the Friction Ledger page (`frictions.vue`). Same rules as
// dashboard.ts: no Vue, relative type imports, distinctive export names.
import type { FrictionClusterDoc, Severity } from '../types/journal'
import { REPO_URL } from '../../../../app/utils/repo'
import { sessionAnchor } from './dashboard'

const SEVERITY_RANK: Record<Severity, number> = { nit: 0, minor: 1, moderate: 2, major: 3, blocker: 4 }

/** A cluster with merged PRs shows one of these, derived from its `fixes` and
 *  occurrences so nobody has to maintain it; one without shows its stored status. */
export type FixState = 'fix landed' | 'likely fixed' | 'still recurring'
export type LedgerState = FixState | 'open' | 'tracked' | 'on trial'

/** The newest merged PRs the page lists, in the pill and the list alike. */
export const LEDGER_MAX_PRS = 5

/** Days without a new occurrence after the latest PR before it reads "likely fixed". */
export const LEDGER_QUIET_DAYS = 3

/** The fix state of a cluster with merged PRs, or `undefined` without any.
 *  `since` counts occurrences dated after the latest PR; "now" is `asOf`, the
 *  newest occurrence date in the ledger, so the result needs no clock. A date
 *  has day precision: an occurrence on the PR's own day does not count. */
export function ledgerFixState(
  fixes: { date: string }[],
  occurrenceDates: string[],
  asOf: string,
): { state: FixState; since: number } | undefined {
  const latest = fixes.map((f) => f.date).sort().at(-1)
  if (!latest) return undefined
  const since = occurrenceDates.filter((d) => d > latest).length
  if (since) return { state: 'still recurring', since }
  const quietDays = (Date.parse(asOf) - Date.parse(latest)) / 86_400_000
  return { state: quietDays >= LEDGER_QUIET_DAYS ? 'likely fixed' : 'fix landed', since: 0 }
}

export interface LedgerOccurrence {
  date: string
  severity: Severity
  to: string
  goal?: string
}

export interface LedgerEntry {
  name: string
  summary: string
  cause: string
  state: LedgerState
  /** Occurrences dated after the latest PR; only a "still recurring" state has any. */
  since: number
  ref?: string
  /** Newest first. */
  fixes: { pr: number; url: string; date: string; summary: string }[]
  worst: Severity
  worstCount: number
  count: number
  occurrences: LedgerOccurrence[]
  /** What the agents logged and proposed, newest first, one per distinct pair. */
  reports: { description: string; solution: string; date: string; to: string }[]
}


/** The severity levels the `severe` list covers: the highest that exist and the next. */
const SEVERE_LEVELS = 2

/** Every cluster exactly once, in the list where it ranks higher. `severe`
 *  ranks the clusters whose worst severity is one of the two highest that exist
 *  (by worst severity, then how often it hit that, then total); `frequent`
 *  ranks all clusters by total. A tie goes to `severe`. `ownSessions` holds this Space's session ids; an occurrence
 *  missing from it links to `otherSpace`, where archiving moved it. `goals`
 *  maps session ids to their goal line. */
export function ledgerPanels(
  clusters: FrictionClusterDoc[],
  space: string,
  ownSessions: Set<string>,
  otherSpace: string,
  goals: Record<string, string> = {},
): { severe: LedgerEntry[]; frequent: LedgerEntry[] } {
  const asOf = clusters.flatMap((c) => c.occurrences.map((o) => o.date)).sort().at(-1) ?? ''
  const entries = clusters.map((c): LedgerEntry => {
    const worst = c.occurrences.reduce<Severity>((w, o) => (SEVERITY_RANK[o.severity] > SEVERITY_RANK[w] ? o.severity : w), 'nit')
    const occurrences = c.occurrences
      .map((o) => ({
        date: o.date,
        severity: o.severity,
        goal: goals[o.session],
        report: { description: o.description, solution: o.solution },
        to: `/t/journal/${ownSessions.has(o.session) ? space : otherSpace}#${sessionAnchor(o.session)}`,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
    const reports = occurrences
      .map((o) => ({ ...o.report, date: o.date, to: o.to }))
      .filter((r, i, all) => all.findIndex((x) => x.description === r.description && x.solution === r.solution) === i)
    const fixes = [...(c.fixes ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((f) => ({ ...f, url: `${REPO_URL}/pull/${f.pr}` }))
    const derived = ledgerFixState(fixes, c.occurrences.map((o) => o.date), asOf)
    return {
      name: c.name,
      summary: c.summary,
      cause: c.cause,
      ...(derived ? { state: derived.state, since: derived.since } : { state: c.status.replace('-', ' ') as LedgerState, since: 0 }),
      ref: c.ref,
      fixes: fixes.slice(0, LEDGER_MAX_PRS),
      worst,
      worstCount: c.occurrences.filter((o) => o.severity === worst).length,
      count: c.occurrences.length,
      occurrences: occurrences.map(({ report: _report, ...o }) => o),
      reports,
    }
  })
  const bySeverity = (a: LedgerEntry, b: LedgerEntry) =>
    SEVERITY_RANK[b.worst] - SEVERITY_RANK[a.worst] || b.worstCount - a.worstCount || b.count - a.count || a.name.localeCompare(b.name)
  const byCount = (a: LedgerEntry, b: LedgerEntry) =>
    b.count - a.count || SEVERITY_RANK[b.worst] - SEVERITY_RANK[a.worst] || a.name.localeCompare(b.name)
  const topLevels = [...new Set(entries.map((e) => SEVERITY_RANK[e.worst]))].sort((a, b) => b - a).slice(0, SEVERE_LEVELS)
  const bySevere = entries.filter((e) => topLevels.includes(SEVERITY_RANK[e.worst])).sort(bySeverity)
  const byFrequency = [...entries].sort(byCount)
  const severeRank = new Map(bySevere.map((e, i) => [e.name, i]))
  const frequentRank = new Map(byFrequency.map((e, i) => [e.name, i]))
  const isSevere = (e: LedgerEntry) => (severeRank.get(e.name) ?? Infinity) <= frequentRank.get(e.name)!
  return { severe: bySevere.filter(isSevere), frequent: byFrequency.filter((e) => !isSevere(e)) }
}
