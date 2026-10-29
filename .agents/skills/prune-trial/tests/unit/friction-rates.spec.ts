import { describe, expect, it } from 'vitest'
import { rates, surveyCutoff, type RateSession } from '../../scripts/friction-rates.ts'

const s = (id: string, startedAt: string, endedAt = startedAt, trigger = '', prs: string[] = []): RateSession => ({
  id,
  startedAt,
  endedAt,
  trigger,
  prs,
})

describe('surveyCutoff', () => {
  const sessions = [
    s('a', '2026-10-27T02:08:00Z', '2026-10-27T02:40:00Z', 'frictions-to-fixes', ['10', '11']),
    s('b', '2026-10-28T02:08:00Z', '2026-10-28T02:40:00Z', 'frictions-to-fixes', ['20']),
    s('c', '2026-10-28T03:00:00Z', '2026-10-28T03:10:00Z', 'digest', ['30']),
  ]

  it('takes the newest survey run whose ledger PR merged', () => {
    expect(surveyCutoff(sessions, new Set(['11', '20', '30']))).toBe(Date.parse('2026-10-28T02:08:00Z'))
  })

  it('skips a survey whose ledger PR has not merged, whatever else touched the ledger', () => {
    expect(surveyCutoff(sessions, new Set(['11', '30']))).toBe(Date.parse('2026-10-27T02:08:00Z'))
  })

  it('is null when no survey reached main', () => {
    expect(surveyCutoff(sessions, new Set(['30']))).toBeNull()
  })
})

describe('rates', () => {
  const w = {
    beforeStart: Date.parse('2026-10-15T00:00:00Z'),
    landed: Date.parse('2026-10-25T12:00:00Z'),
    surveyCutoff: Date.parse('2026-10-28T02:08:00Z'),
  }

  it('splits sessions at the landing and counts each hit once', () => {
    const sessions = [
      s('old', '2026-10-14T23:00:00Z'), // before the horizon
      s('b1', '2026-10-16T10:00:00Z'),
      s('b2', '2026-10-20T10:00:00Z'),
      s('a1', '2026-10-26T10:00:00Z'),
      s('a2', '2026-10-27T10:00:00Z'),
      s('late', '2026-10-28T01:00:00Z', '2026-10-28T03:00:00Z'), // ended after the survey began
    ]
    const r = rates(sessions, new Set(['old', 'b1', 'a1', 'a2', 'late']), w)
    expect(r.before).toEqual({ hits: 1, sessions: 2 })
    expect(r.after).toEqual({ hits: 2, sessions: 2 })
  })
})
