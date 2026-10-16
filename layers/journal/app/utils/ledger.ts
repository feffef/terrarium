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
  refLinks: { label: string; url: string }[]
  worst: Severity
  worstCount: number
  count: number
  occurrences: LedgerOccurrence[]
}

/** The first issue and the first PR a cluster's free-text `ref` names: a ref
 *  often cites old PRs before the issue that tracks it now. */
export function ledgerRefLinks(ref: string | undefined): LedgerEntry['refLinks'] {
  const issue = ref?.match(/\bissues? #(\d+)/)?.[1]
  const pr = ref?.match(/\bPRs? #(\d+)/)?.[1]
  return [
    ...(issue ? [{ label: `issue #${issue}`, url: `${REPO_URL}/issues/${issue}` }] : []),
    ...(pr ? [{ label: `PR #${pr}`, url: `${REPO_URL}/pull/${pr}` }] : []),
  ]
}

export const LEDGER_SEVERE_SIZE = 8

/** Every cluster exactly once: the top LEDGER_SEVERE_SIZE by worst severity
 *  (then how often it hit that, then total) go to `severe`, the rest to
 *  `frequent` by total. Relative, so `severe` fills whatever the worst
 *  severity is. `ownSessions` holds this Space's session ids; an occurrence
 *  missing from it links to `otherSpace`, where archiving moved it. `goals`
 *  maps this Space's session ids to their goal line. */
export function ledgerPanels(
  clusters: FrictionClusterDoc[],
  space: string,
  ownSessions: Set<string>,
  otherSpace: string,
  goals: Record<string, string> = {},
): { severe: LedgerEntry[]; frequent: LedgerEntry[] } {
  const entries = clusters.map((c): LedgerEntry => {
    const worst = c.occurrences.reduce<Severity>((w, o) => (SEVERITY_RANK[o.severity] > SEVERITY_RANK[w] ? o.severity : w), 'nit')
    return {
      name: c.name,
      summary: c.summary,
      cause: c.cause,
      status: c.status,
      fixedOn: c.fixedOn,
      ref: c.ref,
      refLinks: ledgerRefLinks(c.ref),
      worst,
      worstCount: c.occurrences.filter((o) => o.severity === worst).length,
      count: c.occurrences.length,
      occurrences: c.occurrences
        .map((o) => ({
          date: o.date,
          severity: o.severity,
          goal: goals[o.session],
          to: `/t/journal/${ownSessions.has(o.session) ? space : otherSpace}#${sessionAnchor(o.session)}`,
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    }
  })
  const bySeverity = (a: LedgerEntry, b: LedgerEntry) =>
    SEVERITY_RANK[b.worst] - SEVERITY_RANK[a.worst] || b.worstCount - a.worstCount || b.count - a.count || a.name.localeCompare(b.name)
  const byCount = (a: LedgerEntry, b: LedgerEntry) =>
    b.count - a.count || SEVERITY_RANK[b.worst] - SEVERITY_RANK[a.worst] || a.name.localeCompare(b.name)
  const ranked = entries.sort(bySeverity)
  return {
    severe: ranked.slice(0, LEDGER_SEVERE_SIZE),
    frequent: ranked.slice(LEDGER_SEVERE_SIZE).sort(byCount),
  }
}
