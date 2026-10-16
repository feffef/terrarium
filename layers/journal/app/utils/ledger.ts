// Pure ranking for the Friction Ledger page (`frictions.vue`). Same rules as
// dashboard.ts: no Vue, relative type imports, distinctive export names.
import type { FrictionClusterDoc, Severity } from '../types/journal'
import { REPO_URL } from '../../../../app/utils/repo'
import { sessionAnchor } from './dashboard'

const SEVERITY_RANK: Record<Severity, number> = { nit: 0, minor: 1, moderate: 2, major: 3, blocker: 4 }

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
  status: FrictionClusterDoc['status']
  fixedOn?: string
  ref?: string
  /** The PR that merged the fix on `fixedOn`, shown in the status pill. */
  fixedPr?: { number: number; url: string }
  /** Newest first. */
  fixes: { pr: number; url: string; date: string; summary: string }[]
  worst: Severity
  worstCount: number
  count: number
  occurrences: LedgerOccurrence[]
  solutions: { text: string; date: string; to: string }[]
}

/** A cluster stores no link to the exact Friction, so an occurrence's solution
 *  is the session's only Friction of that severity; two or more are ambiguous
 *  and show none. */
function occurrenceSolution(fixes: SessionFixes[string] | undefined, severity: Severity): string | undefined {
  const same = fixes?.filter((f) => f.severity === severity) ?? []
  return same.length === 1 ? same[0]!.solution : undefined
}

/** Each session's Frictions, by session id. */
export type SessionFixes = Record<string, { severity: Severity; solution: string }[]>

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
  sessionFixes: SessionFixes = {},
): { severe: LedgerEntry[]; frequent: LedgerEntry[] } {
  const entries = clusters.map((c): LedgerEntry => {
    const worst = c.occurrences.reduce<Severity>((w, o) => (SEVERITY_RANK[o.severity] > SEVERITY_RANK[w] ? o.severity : w), 'nit')
    const occurrences = c.occurrences
      .map((o) => ({
        date: o.date,
        severity: o.severity,
        goal: goals[o.session],
        solution: occurrenceSolution(sessionFixes[o.session], o.severity),
        to: `/t/journal/${ownSessions.has(o.session) ? space : otherSpace}#${sessionAnchor(o.session)}`,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
    const solutions = occurrences
      .filter((o): o is typeof o & { solution: string } => !!o.solution)
      .filter((o, i, all) => all.findIndex((x) => x.solution === o.solution) === i)
      .map((o) => ({ text: o.solution, date: o.date, to: o.to }))
    const fixes = [...(c.fixes ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((f) => ({ ...f, url: `${REPO_URL}/pull/${f.pr}` }))
    const fixedPr = c.status === 'fixed' ? (fixes.find((f) => f.date === c.fixedOn) ?? fixes[0]) : undefined
    return {
      name: c.name,
      summary: c.summary,
      cause: c.cause,
      status: c.status,
      fixedOn: c.fixedOn,
      ref: c.ref,
      fixedPr: fixedPr && { number: fixedPr.pr, url: fixedPr.url },
      fixes,
      worst,
      worstCount: c.occurrences.filter((o) => o.severity === worst).length,
      count: c.occurrences.length,
      occurrences: occurrences.map(({ solution: _solution, ...o }) => o),
      solutions,
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
