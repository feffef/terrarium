// Unit tests for the dig-season list (layers/midden/app/utils/strata.ts, #519).
// Pins the invariants the stratigraphy sidebar (#524) and the trench-index
// legend (#528) both depend on: oldest-to-newest order, exactly one open-ended
// season and it's the last one, no duplicate slugs, and the lookup helper.
import { describe, expect, it } from 'vitest'
import { DIG_SEASON_SLUGS, DIG_SEASONS, digSeasonOf } from '../../app/utils/strata.ts'

describe('DIG_SEASONS', () => {
  it('is non-empty', () => {
    expect(DIG_SEASONS.length).toBeGreaterThan(0)
  })

  it('is ordered oldest-to-newest by start date', () => {
    for (let i = 1; i < DIG_SEASONS.length; i++) {
      expect(DIG_SEASONS[i]!.start >= DIG_SEASONS[i - 1]!.start).toBe(true)
    }
  })

  it('has exactly one open-ended (end: null) season, and it is the last entry', () => {
    const openEnded = DIG_SEASONS.filter((s) => s.end === null)
    expect(openEnded).toHaveLength(1)
    expect(DIG_SEASONS.at(-1)!.end).toBeNull()
  })

  it('has no duplicate slugs', () => {
    const slugs = DIG_SEASONS.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('keeps every slug url-safe and every label non-empty', () => {
    for (const s of DIG_SEASONS) {
      expect(s.slug).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
      expect(s.label.length).toBeGreaterThan(0)
    }
  })

  it('gives every date a YYYY-MM-DD shape', () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/
    for (const s of DIG_SEASONS) {
      expect(s.start).toMatch(iso)
      if (s.end !== null) expect(s.end).toMatch(iso)
    }
  })
})

describe('DIG_SEASON_SLUGS', () => {
  it('mirrors DIG_SEASONS order exactly', () => {
    expect(DIG_SEASON_SLUGS).toEqual(DIG_SEASONS.map((s) => s.slug))
  })
})

describe('digSeasonOf()', () => {
  it('finds a known season by slug', () => {
    const first = DIG_SEASONS[0]!
    expect(digSeasonOf(first.slug)).toEqual(first)
  })

  it('returns undefined for an unknown slug', () => {
    expect(digSeasonOf('not-a-real-season')).toBeUndefined()
  })
})
