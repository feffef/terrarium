// L3 — pure-function coverage for the mermaid-page discovery seam (issue #469):
// fence detection and file→route mapping, tested without touching the
// filesystem or a Nuxt/browser build. The thin fs-walking shell (`mermaidRoutes`,
// tests/support/mermaid-pages.ts) is exercised for real by the L2 smoke sweep
// itself (tests/e2e/smoke.spec.ts).
import { describe, expect, it } from 'vitest'
import { hasMermaidFence, mermaidPageRoute } from '../support/mermaid-pages.ts'

describe('hasMermaidFence()', () => {
  it('is true for a fenced mermaid block', () => {
    expect(hasMermaidFence('# Title\n\n```mermaid\ngraph TB\n  A --> B\n```\n')).toBe(true)
  })

  it('is false with no mermaid fence', () => {
    expect(hasMermaidFence('# Title\n\n```ts\nconst x = 1\n```\n')).toBe(false)
  })

  it('is false for plain prose mentioning "mermaid"', () => {
    expect(hasMermaidFence('This page is about the mermaid theme, not a diagram.')).toBe(false)
  })

  it('matches a fence anywhere in the document, including after frontmatter', () => {
    const body = '---\ntitle: x\n---\n\nSome text.\n\n```mermaid\ngraph TB\n```\n\nMore text.'
    expect(hasMermaidFence(body)).toBe(true)
  })
})

describe('mermaidPageRoute()', () => {
  it('routes a top-level file to its slug', () => {
    expect(mermaidPageRoute('journal', 'current', 'how-it-works.md')).toBe('/t/journal/current/how-it-works')
  })

  it('routes a nested file to its nested slug', () => {
    expect(mermaidPageRoute('journal', 'current', 'digests/2026-07-04.md')).toBe(
      '/t/journal/current/digests/2026-07-04',
    )
  })

  it('routes a top-level index.md to the Space root', () => {
    expect(mermaidPageRoute('journal', 'current', 'index.md')).toBe('/t/journal/current')
  })

  it('routes a nested index.md to its directory route', () => {
    expect(mermaidPageRoute('journal', 'current', 'digests/index.md')).toBe('/t/journal/current/digests')
  })
})
