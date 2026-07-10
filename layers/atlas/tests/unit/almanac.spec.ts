// Unit tests for the Glass-Year almanac math (layers/atlas/app/utils/almanac.ts, #280).
// The dial's correctness lives here: day↔angle inversion, wrap-past-New-Year span
// logic (the annual twin of atlas.ts's activeAt), year-boundary arc splitting, and
// the guarantee that the six invented seasons partition the whole year with no gap
// or overlap — a bug in any of these is invisible in a screenshot, so it's pinned.
import { describe, expect, it } from 'vitest'
import {
  angleToDay,
  arcPath,
  dateToDay,
  dayToAngle,
  GLASS_SEASONS,
  inSpan,
  seasonOf,
  spanLength,
  spanMidpoint,
  unwrapAngle,
  type Span,
} from '../../app/utils/almanac.ts'

// ── Calendar (decision #1: the Glass Year IS the real 365-day calendar) ──────
describe('dateToDay()', () => {
  it('maps New Year to day 0 (days are 0-indexed)', () => {
    expect(dateToDay('2026-01-01')).toBe(0)
  })

  it('maps a known midsummer date (2026-06-20 is the 171st day, so index 170)', () => {
    expect(dateToDay('2026-06-20')).toBe(170)
  })

  it('maps the last day of the year to 364', () => {
    expect(dateToDay('2026-12-31')).toBe(364)
  })

  it('treats a leap day as its neighbour Feb 28 (the fixed 365-day year ignores leap days)', () => {
    expect(dateToDay('2028-02-29')).toBe(dateToDay('2028-02-28'))
    expect(dateToDay('2028-02-28')).toBe(58)
  })

  it('rejects a malformed date string', () => {
    expect(() => dateToDay('June 20th')).toThrow()
    expect(() => dateToDay('2026-13-01')).toThrow()
  })
})

// ── Angles (day 0 at 12 o'clock, clockwise, one year = 360°) ─────────────────
describe('dayToAngle() / angleToDay()', () => {
  it("puts day 0 at 12 o'clock and advances clockwise (half a year = 180°)", () => {
    expect(dayToAngle(0)).toBe(0)
    expect(dayToAngle(182.5)).toBe(180)
    expect(dayToAngle(365)).toBe(360)
  })

  it('inverts dayToAngle for every whole day of the year', () => {
    for (let d = 0; d < 365; d++) {
      expect(angleToDay(dayToAngle(d))).toBe(d)
    }
  })

  it('normalizes angles outside 0..360 onto the dial (a full extra turn changes nothing)', () => {
    expect(angleToDay(dayToAngle(10) + 360)).toBe(10)
    expect(angleToDay(dayToAngle(10) - 360)).toBe(10)
  })

  it('rounds to the nearest whole day, wrapping just-under-360° back to day 0', () => {
    expect(angleToDay(0.4)).toBe(0) // 0.4° ≈ 0.41 days
    expect(angleToDay(0.6)).toBe(1) // 0.6° ≈ 0.61 days
    expect(angleToDay(359.9)).toBe(0) // ≈ day 364.9 — nearest whole day is New Year, not 365
  })
})

describe('unwrapAngle()', () => {
  it("lets a drag cross 12 o'clock forward without snapping back a year", () => {
    expect(unwrapAngle(350, 5)).toBe(365)
  })

  it("lets a drag cross 12 o'clock backward without snapping forward a year", () => {
    expect(unwrapAngle(5, 350)).toBe(-10)
  })

  it("stays in the previous angle's turn when already unwrapped beyond 360", () => {
    expect(unwrapAngle(720, 10)).toBe(730)
  })

  it('leaves an ordinary same-turn move alone', () => {
    expect(unwrapAngle(100, 100)).toBe(100)
    expect(unwrapAngle(180, 190)).toBe(190)
  })
})

// ── Spans (half-open [start, end); may wrap the New Year; [a,a] = full year) ──
describe('inSpan()', () => {
  it('matches a simple mid-year span, start inclusive and end exclusive', () => {
    const span: Span = [141, 233]
    expect(inSpan(141, span)).toBe(true)
    expect(inSpan(150, span)).toBe(true)
    expect(inSpan(233, span)).toBe(false)
    expect(inSpan(140, span)).toBe(false)
  })

  it('handles a span that wraps the New Year — the annual twin of activeAt', () => {
    const span: Span = [300, 45]
    expect(inSpan(320, span)).toBe(true)
    expect(inSpan(0, span)).toBe(true)
    expect(inSpan(10, span)).toBe(true)
    expect(inSpan(45, span)).toBe(false)
    expect(inSpan(150, span)).toBe(false)
  })

  it('treats start === end as the FULL year, not an empty span (pinned semantics)', () => {
    const span: Span = [120, 120]
    expect(inSpan(0, span)).toBe(true)
    expect(inSpan(119, span)).toBe(true)
    expect(inSpan(120, span)).toBe(true)
    expect(inSpan(364, span)).toBe(true)
  })

  it('normalizes an out-of-range day onto the year first', () => {
    expect(inSpan(365, [0, 10])).toBe(true) // day 365 wraps to day 0
    expect(inSpan(-1, [300, 45])).toBe(true) // day -1 wraps to day 364
  })
})

describe('spanLength()', () => {
  it('measures plain, wrapped, and full-year spans', () => {
    expect(spanLength([141, 233])).toBe(92)
    expect(spanLength([300, 45])).toBe(110)
    expect(spanLength([120, 120])).toBe(365)
  })
})

describe('spanMidpoint()', () => {
  it('finds the middle of a plain span', () => {
    expect(spanMidpoint([100, 200])).toBe(150)
  })

  it('finds a wrapped span midpoint near the year boundary, still inside the span', () => {
    const mid = spanMidpoint([300, 45])
    expect(mid).toBe(355)
    expect(inSpan(mid, [300, 45])).toBe(true)
  })

  it('may land on a half day, wrapping past New Year when the middle falls there', () => {
    expect(spanMidpoint([320, 10])).toBe(347.5) // 55 days; middle is before the boundary
    expect(spanMidpoint([350, 40])).toBe(12.5) // 55 days; middle is past the boundary
  })

  it('puts a full-year span midpoint half a year from its start', () => {
    expect(spanMidpoint([120, 120])).toBe(302.5)
  })
})

// ── The Glass Year's six seasons ─────────────────────────────────────────────
describe('GLASS_SEASONS', () => {
  it('partitions the whole year — every day falls in exactly one season', () => {
    for (let d = 0; d < 365; d++) {
      const holders = GLASS_SEASONS.filter((s) => inSpan(d, s.span))
      expect(holders, `day ${d} is claimed by [${holders.map((s) => s.name).join(', ')}]`).toHaveLength(1)
    }
  })

  it('has exactly six seasons whose lengths sum to the year', () => {
    expect(GLASS_SEASONS).toHaveLength(6)
    expect(GLASS_SEASONS.reduce((sum, s) => sum + spanLength(s.span), 0)).toBe(365)
  })

  it('pins the season slugs — authors write them (:season{of="long-damp"})', () => {
    expect(GLASS_SEASONS.map((s) => s.name)).toEqual([
      'radiator-months',
      'lamp-lengthening',
      'great-airing',
      'long-damp',
      'small-dry',
      'settling',
    ])
  })

  it('keeps every slug url-safe and every label and gloss in the quiet register (no exclamation)', () => {
    for (const s of GLASS_SEASONS) {
      expect(s.name).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.label).not.toContain('!')
      expect(s.gloss ?? '').not.toContain('!')
    }
  })
})

describe('seasonOf()', () => {
  it('finds the season a real date falls in (midsummer sits in the Long Damp)', () => {
    expect(seasonOf(dateToDay('2026-06-20')).name).toBe('long-damp')
  })

  it('gives New Year to the season that wraps the boundary', () => {
    expect(seasonOf(0).name).toBe('radiator-months')
    expect(seasonOf(364).name).toBe('radiator-months')
  })

  it('normalizes days outside the year', () => {
    expect(seasonOf(365).name).toBe(seasonOf(0).name)
    expect(seasonOf(-1).name).toBe(seasonOf(364).name)
  })
})

// ── Annular-sector geometry (origin-centred; one path string, wrapped spans
//    split into two closed subpaths at the New Year boundary) ─────────────────

/** All `A` commands' (large-arc, sweep) flag pairs, in path order. */
function arcFlags(d: string): Array<[string, string]> {
  return [...d.matchAll(/A [\d.]+ [\d.]+ 0 ([01]) ([01])/g)].map((m) => [m[1]!, m[2]!])
}

describe('arcPath()', () => {
  it('draws an exact half-year sector (hand-derived: the 180° points are exact)', () => {
    // Days 0→182.5 span 180°: outer arc top (0,-100) → bottom (0,100) clockwise,
    // line in to (0,50), inner arc back to (0,-50), close.
    expect(arcPath([0, 182.5], 50, 100)).toBe('M 0 -100 A 100 100 0 0 1 0 100 L 0 50 A 50 50 0 0 0 0 -50 Z')
  })

  it('emits one closed subpath for a plain span, with small arcs flagged 0', () => {
    const d = arcPath([0, 100], 50, 100) // ≈ 98.6° — a small arc
    expect(d.match(/M /g)).toHaveLength(1)
    expect(d.match(/Z/g)).toHaveLength(1)
    expect(arcFlags(d)).toEqual([
      ['0', '1'], // outer arc, clockwise
      ['0', '0'], // inner arc, back counter-clockwise
    ])
  })

  it('sets the large-arc flag on a span past half the year', () => {
    const d = arcPath([0, 200], 50, 100) // ≈ 197° — a large arc
    expect(arcFlags(d)).toEqual([
      ['1', '1'],
      ['1', '0'],
    ])
  })

  it('splits a wrapped span into two closed subpaths at the New Year boundary', () => {
    const d = arcPath([300, 45], 50, 100)
    expect(d.match(/M /g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
    // The second piece ([0, 45)) starts at the day-0 outer point — 12 o'clock.
    expect(d).toContain('M 0 -100')
  })

  it('flags each piece of a wrapped span independently (only the >180° piece is large)', () => {
    // [200, 190] wraps: piece [200, 365) ≈ 162.7° (small), piece [0, 190) ≈ 187.4° (large).
    const flags = arcFlags(arcPath([200, 190], 50, 100))
    expect(flags).toEqual([
      ['0', '1'],
      ['0', '0'],
      ['1', '1'],
      ['1', '0'],
    ])
  })

  it('draws a full-year span ([a, a]) as a whole annulus in two half-ring subpaths', () => {
    const d = arcPath([120, 120], 50, 100)
    expect(d.match(/M /g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
    // Two exact half-turns — neither is a large arc.
    expect(arcFlags(d).map(([large]) => large)).toEqual(['0', '0', '0', '0'])
  })

  it('drops the empty piece when a wrapped span ends exactly at New Year', () => {
    // [300, 0] is days 300..364 only — no second subpath for the empty [0, 0) piece.
    const d = arcPath([300, 0], 50, 100)
    expect(d.match(/M /g)).toHaveLength(1)
    expect(d.match(/Z/g)).toHaveLength(1)
  })
})
