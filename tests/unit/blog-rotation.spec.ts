// Unit tests for the blog-rotation helper's pure core — the blog-post
// Skill's A0 rotation gate (`.agents/skills/blog-post/SKILL.md`), reimplemented
// verbatim rather than restated: `last`, the fewer-than-four edge case, the
// all-in-last-four case, and the missing-Persona-collapses-eligible case. The
// fs shell (frontmatter scan) is exercised by running the script directly.
import { describe, expect, it } from 'vitest'
import { eligiblePersonas } from '../../scripts/blog-rotation.ts'

const UNIVERSE = ['david', 'karen', 'kevin']

describe('eligiblePersonas()', () => {
  it('with zero posts: last is null, eligible is every Persona', () => {
    expect(eligiblePersonas([], UNIVERSE)).toEqual({
      last: null,
      starved: [],
      eligible: ['david', 'karen', 'kevin'],
    })
  })

  it('with fewer than four posts: eligible is every Persona except last, starved is empty', () => {
    const posts = [
      { publishedAt: '2026-07-05T00:00:00Z', persona: 'david' },
      { publishedAt: '2026-07-06T00:00:00Z', persona: 'karen' },
    ]
    expect(eligiblePersonas(posts, UNIVERSE)).toEqual({
      last: 'karen',
      starved: [],
      eligible: ['david', 'kevin'],
    })
  })

  it('with all Personas present in the last four: eligible is every Persona except last', () => {
    const posts = [
      { publishedAt: '2026-07-05T00:00:00Z', persona: 'david' },
      { publishedAt: '2026-07-06T00:00:00Z', persona: 'karen' },
      { publishedAt: '2026-07-07T00:00:00Z', persona: 'kevin' },
      { publishedAt: '2026-07-08T00:00:00Z', persona: 'david' },
    ]
    expect(eligiblePersonas(posts, UNIVERSE)).toEqual({
      last: 'david',
      starved: [],
      eligible: ['karen', 'kevin'],
    })
  })

  it('with one Persona missing from the last four: eligible collapses to just that Persona', () => {
    const posts = [
      { publishedAt: '2026-07-05T00:00:00Z', persona: 'david' },
      { publishedAt: '2026-07-06T00:00:00Z', persona: 'karen' },
      { publishedAt: '2026-07-07T00:00:00Z', persona: 'david' },
      { publishedAt: '2026-07-08T00:00:00Z', persona: 'karen' },
    ]
    expect(eligiblePersonas(posts, UNIVERSE)).toEqual({
      last: 'karen',
      starved: ['kevin'],
      eligible: ['kevin'],
    })
  })

  it('sorts posts by publishedAt regardless of input order', () => {
    const posts = [
      { publishedAt: '2026-07-08T00:00:00Z', persona: 'karen' },
      { publishedAt: '2026-07-05T00:00:00Z', persona: 'david' },
      { publishedAt: '2026-07-07T00:00:00Z', persona: 'david' },
      { publishedAt: '2026-07-06T00:00:00Z', persona: 'karen' },
    ]
    expect(eligiblePersonas(posts, UNIVERSE).last).toBe('karen')
  })

  it('the eligible set never contains last unless last is the only Persona in existence', () => {
    const posts = [{ publishedAt: '2026-07-05T00:00:00Z', persona: 'david' }]
    const result = eligiblePersonas(posts, ['david'])
    expect(result).toEqual({ last: 'david', starved: [], eligible: ['david'] })
  })
})
