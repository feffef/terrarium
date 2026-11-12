import { describe, expect, it } from 'vitest'
import { computeRow, computeTotals, formatRow, parseSiteDates, type LogFacts } from '../../scripts/history/history-stats.ts'

const log = (date: string, autonomous: boolean, frictions: number): LogFacts => ({ date, autonomous, frictions })
const founding = { name: 'Founding', from: '2026-07-04', to: '2026-07-10' }

describe('history stats', () => {
  const logs = [log('2026-07-04', true, 2), log('2026-07-05', false, 4), log('2026-07-06', false, 3), log('2026-07-09', true, 1), log('2026-12-01', true, 9)]

  it('counts a period row, ignoring logs after the as-of date', () => {
    expect(computeRow(logs, ['2026-07-07', '2026-07-12'], founding, '2026-11-11')).toEqual({ sessionsPerWeek: 4, agentShare: 50, frictionsPerSession: 2.5, newSites: 1 })
  })
  it('gives zeros for a period with no logs', () => {
    expect(computeRow(logs, [], { name: 'X', from: '2026-08-01', to: '2026-08-07' }, '2026-11-11')).toEqual({ sessionsPerWeek: 0, agentShare: 0, frictionsPerSession: 0, newSites: 0 })
  })
  it('counts totals as of the date', () => {
    expect(computeTotals(logs, 10, '2026-11-11')).toEqual({ commits: 10, sessions: 4, frictions: 10 })
  })
  it('formats a row as the page writes it', () => {
    const r = { sessionsPerWeek: 116, agentShare: 9, frictionsPerSession: 4, newSites: 3 }
    expect(formatRow(founding, r)).toBe('| **[Founding](#founding-4-to-10-july)** · 4–10 Jul | 116 | 9% | 4.0 | 3 |')
    expect(formatRow({ name: 'Fewer asks', from: '2026-07-25', to: '2026-08-08' }, r)).toContain('(#fewer-asks-25-july-to-8-august)** · 25 Jul–8 Aug')
  })
})

describe('parseSiteDates', () => {
  it('counts a plain add, skips a fold commit and a delete', () => {
    const gitLog = 'D 2026-07-14\nA\tlayers/a/tenant.config.ts\nD 2026-07-22\nA\tlayers/b/tenant.config.ts\nD\tlayers/a/tenant.config.ts\nD 2026-08-13\nD\tlayers/c/tenant.config.ts\n'
    expect(parseSiteDates(gitLog)).toEqual(['2026-07-14'])
  })
})
