// Content dates are offset strings resolved against the Space's "now"
// (issue #1364).
import { describe, expect, it } from 'vitest'
import { formatTinkerfundCountdown, resolveTinkerfundOffset, tinkerfundCountdown, tinkerfundNow } from '../../app/utils/clock.ts'
import { HOUR, NOW } from './support.ts'

describe('resolveTinkerfundOffset', () => {
  it('resolves day and hour offsets in both directions', () => {
    expect(resolveTinkerfundOffset('-12d', NOW)).toBe(Date.parse('2026-05-20T12:00:00Z'))
    expect(resolveTinkerfundOffset('+36h', NOW)).toBe(Date.parse('2026-06-03T00:00:00Z'))
    expect(resolveTinkerfundOffset('+0h', NOW)).toBe(NOW)
    expect(resolveTinkerfundOffset('-1h', NOW)).toBe(NOW - HOUR)
  })

  it.each(['12d', '+1.5d', '+3w', '-d', '+ 2d', '', '+2D'])('rejects %j', (offset) => {
    expect(() => resolveTinkerfundOffset(offset, NOW)).toThrow(/offset/)
  })
})

describe('tinkerfundNow', () => {
  it('uses the pinned shop.now when the Space has one (qa)', () => {
    expect(tinkerfundNow('2026-06-01T12:00:00Z', 42)).toBe(NOW)
  })

  it('follows real time when the Space pins nothing (prod)', () => {
    expect(tinkerfundNow(undefined, 42)).toBe(42)
  })
})

describe('tinkerfundCountdown', () => {
  it('counts whole days and hours left, rounding down', () => {
    expect(tinkerfundCountdown(NOW, NOW + 36 * HOUR + 59 * 60_000)).toEqual({ days: 1, hours: 12 })
    expect(tinkerfundCountdown(NOW, NOW + 18 * 24 * HOUR)).toEqual({ days: 18, hours: 0 })
  })

  it('stops at zero once the moment has passed', () => {
    expect(tinkerfundCountdown(NOW, NOW - HOUR)).toEqual({ days: 0, hours: 0 })
  })

  it('reads as days and hours', () => {
    expect(formatTinkerfundCountdown({ days: 1, hours: 12 })).toBe('1 day 12 hours')
    expect(formatTinkerfundCountdown({ days: 18, hours: 1 })).toBe('18 days 1 hour')
    expect(formatTinkerfundCountdown({ days: 0, hours: 0 })).toBe('0 days 0 hours')
  })
})
