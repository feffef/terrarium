// L3 — pure-function coverage for the root index page's entry-capping logic
// (issue: root index redesign), so the cap/overflow math is testable without a
// full Nuxt/@vue/test-utils mount of HomeShowcase.vue (tests/unit/mermaid.spec.ts
// sets this precedent for ProsePre.vue).
import { describe, expect, it } from 'vitest'
import { listEntries, MAX_LISTED_ENTRIES, type ShowcaseEntry } from '../../app/utils/showcase.ts'

function entry(name: string): ShowcaseEntry {
  return { name, path: `/t/x/${name}`, accent: '#000' }
}

describe('listEntries()', () => {
  it('returns everything with zero overflow when under the cap', () => {
    const entries = [entry('a'), entry('b')]
    expect(listEntries(entries)).toEqual({ listed: entries, overflow: 0 })
  })

  it('returns everything with zero overflow exactly at the cap', () => {
    const entries = Array.from({ length: MAX_LISTED_ENTRIES }, (_, i) => entry(`e${i}`))
    const result = listEntries(entries)
    expect(result.listed).toEqual(entries)
    expect(result.overflow).toBe(0)
  })

  it('caps at MAX_LISTED_ENTRIES and reports the overflow count', () => {
    const entries = Array.from({ length: MAX_LISTED_ENTRIES + 6 }, (_, i) => entry(`e${i}`))
    const result = listEntries(entries)
    expect(result.listed).toEqual(entries.slice(0, MAX_LISTED_ENTRIES))
    expect(result.overflow).toBe(6)
  })

  it('handles an empty list', () => {
    expect(listEntries([])).toEqual({ listed: [], overflow: 0 })
  })

  it('accepts a custom cap', () => {
    const entries = [entry('a'), entry('b'), entry('c')]
    expect(listEntries(entries, 2)).toEqual({ listed: [entry('a'), entry('b')], overflow: 1 })
  })
})
