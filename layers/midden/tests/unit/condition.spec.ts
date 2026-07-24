// Unit tests for the Midden's single-homed condition table (utils/condition.ts).
// The correctness-sensitive parts are invisible in a screenshot, so they're
// pinned here: the LOCKED decay-then-orthogonal order (#523) and the lookup's
// safe fallback (#526 — condition is never fabricated).
//
// Post-MVP simplification (owner-directed, this branch): condition now reads as a
// plain WORD, not a glyph, so the former glyph-geometry assertions (GLYPHS,
// glyphFor, the confusable-pair shape check) are gone with the geometry itself.
import { describe, expect, it } from 'vitest'
import {
  CONDITION_GRADES,
  CONDITION_ORDER,
  conditionMeta,
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
    expect(conditionMeta('never-activated').label).toBe('Never activated')
  })

  it('falls back to `lost` for an unknown grade — claims nothing survived', () => {
    expect(conditionMeta(undefined).grade).toBe('lost')
    expect(conditionMeta('bogus' as Grade).grade).toBe('lost')
  })
})
