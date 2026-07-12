// L3 — pure-function coverage for the ProsePre.vue mermaid-detection seam
// (issue #364), so the branch is testable without a full Nuxt/@vue/test-utils
// mount (app/components/content/ProsePre.vue).
import { describe, expect, it } from 'vitest'
import { isMermaidLanguage } from '../../app/utils/mermaid.ts'

describe('isMermaidLanguage()', () => {
  it('is true for the mermaid language', () => {
    expect(isMermaidLanguage('mermaid')).toBe(true)
  })

  it('is false for other languages', () => {
    expect(isMermaidLanguage('ts')).toBe(false)
    expect(isMermaidLanguage('js')).toBe(false)
  })

  it('is false for null, undefined, and empty string', () => {
    expect(isMermaidLanguage(null)).toBe(false)
    expect(isMermaidLanguage(undefined)).toBe(false)
    expect(isMermaidLanguage('')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(isMermaidLanguage('Mermaid')).toBe(false)
  })
})
