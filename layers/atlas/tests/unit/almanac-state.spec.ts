// Unit tests for the pure logic under the Almanac's shared state (#282,
// layers/atlas/app/utils/almanacState.ts) — the semantics the dial and the
// dial-driven MDC components (#283) rely on: mark registration (idempotent by
// id, normalized day, deterministic order), the `?day=` param parser's
// strictness, and today-as-a-Glass-day. The reactive shell and provide/inject
// glue (composables/almanac.ts) are exercised by the L2 smoke render.
import { describe, expect, it } from 'vitest'
import {
  findObservationOn,
  glassDayOf,
  parseAlmanacDayParam,
  withAlmanacMark,
  withoutAlmanacMark,
} from '../../app/utils/almanacState.ts'
import type { AlmanacMark, AlmanacObservation } from '../../app/utils/almanacState.ts'

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

describe('findObservationOn()', () => {
  const ledger: AlmanacObservation[] = [
    { date: '2026-06-20', time: 'dusk', specimen: 'lumina-fabulae', note: 'first lamp' },
    { date: '2026-06-20', time: 'noon', specimen: 'folium-mendax', note: 'a leaf, walking' },
    { date: '2026-07-04', time: 'night', note: 'an ambient note, no specimen' },
  ]

  it('prefers the named specimen’s own observation on a shared date', () => {
    expect(findObservationOn(ledger, '2026-06-20', 'folium-mendax')?.note).toBe('a leaf, walking')
    expect(findObservationOn(ledger, '2026-06-20', 'lumina-fabulae')?.note).toBe('first lamp')
  })

  it('falls back to the first in-list entry of that date — any observer’s', () => {
    expect(findObservationOn(ledger, '2026-06-20')?.note).toBe('first lamp')
    expect(findObservationOn(ledger, '2026-06-20', 'umbra-vacans')?.note).toBe('first lamp')
    expect(findObservationOn(ledger, '2026-07-04', 'lumina-fabulae')?.note).toBe(
      'an ambient note, no specimen',
    )
  })

  it('is silent (undefined) when the date has no entry — exact string match only', () => {
    expect(findObservationOn(ledger, '2026-06-21')).toBeUndefined()
    expect(findObservationOn(ledger, '2026-6-20')).toBeUndefined()
    expect(findObservationOn([], '2026-06-20')).toBeUndefined()
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
