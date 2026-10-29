import { describe, expect, it } from 'vitest'
import { rates, surveyCutoff, type RateSession } from '../../scripts/friction-rates.ts'

const s = (session: string, startedAt: string, endedAt = startedAt, trigger?: string): RateSession => ({
  session,
  startedAt,
  endedAt,
  trigger,
})

describe('surveyCutoff', () => {
  it('takes the newest survey run that started before the last ledger commit', () => {
    const sessions = [
      s('a', '2026-10-27T02:08:00Z', '2026-10-27T02:40:00Z', 'frictions-to-fixes'),
      s('b', '2026-10-28T02:08:00Z', '2026-10-28T02:40:00Z', 'frictions-to-fixes'),
      s('c', '2026-10-28T03:00:00Z', '2026-10-28T03:10:00Z', 'digest'),
    ]
    expect(surveyCutoff(sessions, Date.parse('2026-10-28T05:00:00Z'))).toBe(Date.parse('2026-10-28T02:08:00Z'))
    // b's ledger PR hasn't merged yet: fall back to a.
    expect(surveyCutoff(sessions, Date.parse('2026-10-28T01:00:00Z'))).toBe(Date.parse('2026-10-27T02:08:00Z'))
  })

  it('is null when no survey ran', () => {
    expect(surveyCutoff([s('a', '2026-10-28T02:08:00Z')], Date.now())).toBeNull()
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
