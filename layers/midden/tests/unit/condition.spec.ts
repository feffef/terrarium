// Unit tests for the Midden's single-homed condition table (utils/condition.ts).
// The correctness-sensitive parts are invisible in a screenshot, so they're
// pinned here: the LOCKED decay-then-orthogonal order (#523), the lookup's
// safe fallback (#526 — condition is never fabricated), and the one glyph
// distinction the resolution flagged as most-confusable (never-activated vs
// lost, #523 — they must not share a shape).
import { describe, expect, it } from 'vitest'
import {
  CONDITION_GRADES,
  CONDITION_ORDER,
  GLYPHS,
  conditionMeta,
  glyphFor,
  type Grade,
} from '../../app/utils/condition.ts'

describe('CONDITION_GRADES table', () => {
  it('is in the locked decay-then-orthogonal order (#523)', () => {
    expect(CONDITION_ORDER).toEqual([
      'fresh',
      'intact',
      'fragmentary',
      'dissolved',
      'never-activated',
      'lost',
    ])
  })

  it('carries all six grades exactly once', () => {
    expect(CONDITION_GRADES).toHaveLength(6)
    expect(new Set(CONDITION_ORDER).size).toBe(6)
  })

  it('gives every grade a non-empty label and a real one-line definition', () => {
    for (const c of CONDITION_GRADES) {
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.definition.length).toBeGreaterThan(20)
      expect(c.definition).not.toMatch(/\n/) // one line
    }
  })

  it('has definitions that are all distinct (no copy-paste duplication)', () => {
    const defs = CONDITION_GRADES.map((c) => c.definition)
    expect(new Set(defs).size).toBe(defs.length)
  })
})

describe('conditionMeta()', () => {
  it('looks up each grade to its own row', () => {
    expect(conditionMeta('fresh').label).toBe('Fresh')
    expect(conditionMeta('never-activated').glyph).toBe('never-activated')
  })

  it('falls back to `lost` for an unknown grade — claims nothing survived', () => {
    expect(conditionMeta(undefined).grade).toBe('lost')
    expect(conditionMeta('bogus' as Grade).grade).toBe('lost')
  })
})

describe('glyph encoding (#523)', () => {
  it('draws the erosion axis filled and the orthogonal axis as outline', () => {
    expect(GLYPHS.fresh.filled).toBe(true)
    expect(GLYPHS.intact.filled).toBe(true)
    expect(GLYPHS.fragmentary.filled).toBe(true)
    expect(GLYPHS.dissolved.filled).toBe(true)
    expect(GLYPHS['never-activated'].filled).toBe(false)
    expect(GLYPHS.lost.filled).toBe(false)
  })

  it('fades dissolved to a low-opacity boundary, keeps fresh solid', () => {
    expect(GLYPHS.fresh.opacity).toBe(1)
    expect(GLYPHS.dissolved.opacity).toBeLessThan(0.5)
  })

  it('draws lost and never-activated with DISTINCT shapes (the confusable pair)', () => {
    // Both are outline-only; the whole point of #523 is that shape, not fill,
    // separates them — so their path geometry must differ.
    expect(GLYPHS.lost.d).not.toBe(GLYPHS['never-activated'].d)
  })

  it('resolves a grade to its glyph spec via glyphFor()', () => {
    expect(glyphFor('lost')).toBe(GLYPHS.lost)
    expect(glyphFor(undefined)).toBe(GLYPHS.lost) // fallback rides the same lookup
  })
})
