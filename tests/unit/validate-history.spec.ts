import { describe, expect, it } from 'vitest'
import { computeStats, PERIODS, parseSiteDates, type LogFacts, type Stats } from '../../scripts/history/history-stats.ts'
import { historyErrors, pageAsOf } from '../../scripts/gate/validate-history.ts'

const log = (date: string, autonomous: boolean, frictions: number): LogFacts => ({ date, autonomous, frictions })

describe('computeStats', () => {
  const logs = [log('2026-07-04', true, 2), log('2026-07-05', false, 4), log('2026-07-06', false, 3), log('2026-07-09', true, 1), log('2026-12-01', true, 9)]
  const s = computeStats(logs, 10, ['2026-07-07', '2026-07-12'], '2026-11-11')

  it('counts totals and the first period as of the date', () => {
    expect(s).toMatchObject({ commits: 10, sessions: 4, frictions: 10 })
    expect(s.rows[0]).toEqual({ sessionsPerWeek: 4, agentShare: 50, frictionsPerSession: 2.5, newSites: 1 })
  })
})

describe('parseSiteDates', () => {
  it('counts a plain add, skips a fold commit and a delete', () => {
    const log = 'D 2026-07-14\nA\tlayers/a/tenant.config.ts\nD 2026-07-22\nA\tlayers/b/tenant.config.ts\nD\tlayers/a/tenant.config.ts\nD 2026-08-13\nD\tlayers/c/tenant.config.ts\n'
    expect(parseSiteDates(log)).toEqual(['2026-07-14'])
  })
})

describe('history page check', () => {
  const row = { sessionsPerWeek: 7, agentShare: 50, frictionsPerSession: 2.5, newSites: 1 }
  const stats: Stats = { commits: 1234, sessions: 56, frictions: 78, rows: Array(8).fill(row) }
  const page = (share: number) =>
    'Counts are as of 11 November 2026: 1,234 commits, 56 recorded sessions, 78 frictions\n' +
    Array.from({ length: 8 }, (_, i) => `| **[${PERIODS[i]!.name}](#x)** · d | 7 | ${i === 0 ? share : 50}% | 2.5 | 1 |`).join('\n')

  it('fails a doctored header total and a missing header', () => {
    expect(historyErrors(page(50).replace('1,234', '1,235'), stats)).toEqual(['commits: page says 1235, computed 1234'])
    expect(historyErrors('| nothing |', stats)).toHaveLength(2)
  })
  it('reads the as-of date', () => {
    expect(pageAsOf(page(50))).toBe('2026-11-11')
  })
  it('passes the matching page and fails a doctored number', () => {
    expect(historyErrors(page(50), stats)).toEqual([])
    expect(historyErrors(page(51), stats)).toEqual(['Founding, Agent-initiated %: page says 51, computed 50'])
  })
})
