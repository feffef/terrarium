// Unit tests for the pure logic under the Almanac's shared state (#282,
// layers/atlas/app/utils/almanacState.ts) — the semantics the dial and the
// dial-driven MDC components (#283) rely on: mark registration (idempotent by
// id, normalized day, deterministic order), the `?day=` param parser's
// strictness, and today-as-a-Glass-day. The reactive shell and provide/inject
// glue (composables/almanac.ts) are exercised by the L2 smoke render.
import { describe, expect, it } from 'vitest'
import {
  glassDayOf,
  parseAlmanacDayParam,
  withAlmanacMark,
  withoutAlmanacMark,
} from '../../app/utils/almanacState.ts'
import type { AlmanacMark } from '../../app/utils/almanacState.ts'

describe('withAlmanacMark()', () => {
  it('registers, normalizes the day, and sorts by day then id', () => {
    let marks: AlmanacMark[] = []
    marks = withAlmanacMark(marks, { id: 'b', day: 300 })
    marks = withAlmanacMark(marks, { id: 'a', day: -1 }) // → 364
    marks = withAlmanacMark(marks, { id: 'c', day: 300 })
    expect(marks.map((m) => [m.id, m.day])).toEqual([
      ['b', 300],
      ['c', 300],
      ['a', 364],
    ])
  })

  it('re-registering the same id replaces, never duplicates', () => {
    let marks: AlmanacMark[] = []
    marks = withAlmanacMark(marks, { id: 'x', day: 5 })
    marks = withAlmanacMark(marks, { id: 'x', day: 9, kind: 'sighting' })
    expect(marks).toEqual([{ id: 'x', day: 9, kind: 'sighting' }])
  })

  it('is pure — the input list is untouched', () => {
    const marks: AlmanacMark[] = [{ id: 'x', day: 5 }]
    withAlmanacMark(marks, { id: 'y', day: 1 })
    expect(marks).toEqual([{ id: 'x', day: 5 }])
  })
})

describe('withoutAlmanacMark()', () => {
  it('removes by id and ignores unknown ids', () => {
    const marks: AlmanacMark[] = [{ id: 'x', day: 5 }]
    expect(withoutAlmanacMark(marks, 'nope')).toEqual(marks)
    expect(withoutAlmanacMark(marks, 'x')).toEqual([])
  })
})

describe('parseAlmanacDayParam()', () => {
  it('accepts whole days 0..364 (as vue-router hands them over)', () => {
    expect(parseAlmanacDayParam('0')).toBe(0)
    expect(parseAlmanacDayParam('190')).toBe(190)
    expect(parseAlmanacDayParam('364')).toBe(364)
    expect(parseAlmanacDayParam(['42', '99'])).toBe(42) // repeated param: first wins
    expect(parseAlmanacDayParam('007')).toBe(7)
  })

  it('rejects everything else with null (fall back to today, not a guess)', () => {
    expect(parseAlmanacDayParam('365')).toBeNull()
    expect(parseAlmanacDayParam('-1')).toBeNull()
    expect(parseAlmanacDayParam('12.5')).toBeNull()
    expect(parseAlmanacDayParam('abc')).toBeNull()
    expect(parseAlmanacDayParam('')).toBeNull()
    expect(parseAlmanacDayParam(undefined)).toBeNull()
    expect(parseAlmanacDayParam(null)).toBeNull()
    expect(parseAlmanacDayParam([])).toBeNull()
  })
})

describe('glassDayOf()', () => {
  it('maps local dates onto the Glass Year (day 0 = 1 January)', () => {
    expect(glassDayOf(new Date(2026, 0, 1))).toBe(0)
    expect(glassDayOf(new Date(2026, 6, 10))).toBe(190)
    expect(glassDayOf(new Date(2026, 11, 31))).toBe(364)
  })

  it('clamps a real leap day onto day 58, like dateToDay', () => {
    expect(glassDayOf(new Date(2024, 1, 29))).toBe(58)
    expect(glassDayOf(new Date(2024, 1, 28))).toBe(58)
  })
})
