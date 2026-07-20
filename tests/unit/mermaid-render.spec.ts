// L3 — pure-function coverage for the build-time mermaid pre-render pipeline
// (issue #379, ADR-0024): the content-hash key, the fence extractor, the
// sentinel→CSS-var rewrite, and the drift reconciliation. No fs, no browser.
import { describe, expect, it } from 'vitest'
import { extractMermaidBlocks, mermaidKey, normalizeMermaidSource } from '../../app/utils/mermaid.ts'
import { leftoverSentinels, themeSvg } from '../../scripts/render-mermaid.ts'
import { diffMermaid } from '../../scripts/verify-mermaid.ts'

describe('mermaidKey()', () => {
  it('is deterministic for the same source', () => {
    expect(mermaidKey('graph TB\n  A --> B')).toBe(mermaidKey('graph TB\n  A --> B'))
  })

  it('ignores surrounding whitespace and CRLF (matches normalizeMermaidSource)', () => {
    expect(mermaidKey('  graph TB\n  A --> B\n')).toBe(mermaidKey('graph TB\r\n  A --> B'))
  })

  it('differs when the source differs', () => {
    expect(mermaidKey('graph TB\n  A --> B')).not.toBe(mermaidKey('graph TB\n  A --> C'))
  })

  it('is a filesystem-safe hex string', () => {
    expect(mermaidKey('graph TB')).toMatch(/^[0-9a-f]+$/)
  })
})

describe('normalizeMermaidSource()', () => {
  it('trims and unifies line endings, leaving the interior intact', () => {
    expect(normalizeMermaidSource('\r\n  graph TB\r\n  A --> B  \n')).toBe('graph TB\n  A --> B')
  })
})

describe('extractMermaidBlocks()', () => {
  it('extracts a single fenced block', () => {
    expect(extractMermaidBlocks('# t\n\n```mermaid\ngraph TB\n  A --> B\n```\n')).toEqual(['graph TB\n  A --> B'])
  })

  it('extracts multiple blocks in document order', () => {
    const md = '```mermaid\ngraph TB\nA\n```\n\ntext\n\n```mermaid\ngraph LR\nB\n```\n'
    expect(extractMermaidBlocks(md)).toEqual(['graph TB\nA', 'graph LR\nB'])
  })

  it('ignores non-mermaid fences', () => {
    expect(extractMermaidBlocks('```ts\nconst x = 1\n```\n')).toEqual([])
  })

  it('ignores prose mentioning mermaid', () => {
    expect(extractMermaidBlocks('This is about the mermaid theme.')).toEqual([])
  })
})

describe('themeSvg()', () => {
  // The renderer maps each DIAGRAM_TOKENS colour to a unique sentinel hex, and
  // themeSvg rewrites every sentinel back to a live `var(--diagram-*, fallback)`.
  it('rewrites a token sentinel to its var(--diagram-*) ref, case-insensitively', () => {
    // `#f0a001` is the sentinel for the first token (primaryColor → --diagram-node-bg).
    const out = themeSvg('fill:#f0a001; stroke:#F0A001')
    expect(out).toContain('var(--diagram-node-bg, #ECECFF)')
    expect(leftoverSentinels(out)).toEqual([])
  })

  it('leaves ordinary (author classDef) colours untouched', () => {
    const svg = '<svg><rect fill="#2c6e8f"/></svg>'
    expect(themeSvg(svg)).toBe(svg)
  })

  it('flags an unrewritten sentinel-family hex via leftoverSentinels', () => {
    expect(leftoverSentinels('fill:#f0a901')).toEqual(['#f0a901'])
  })
})

describe('diffMermaid()', () => {
  const live = [
    { file: 'a.md', key: 'aaaa' },
    { file: 'b.md', key: 'bbbb' },
  ]

  it('reports nothing when every source has its SVG and there are no orphans', () => {
    expect(diffMermaid(live, ['aaaa', 'bbbb'])).toEqual({ missing: [], orphaned: [] })
  })

  it('flags a source whose committed SVG is missing', () => {
    expect(diffMermaid(live, ['aaaa'])).toEqual({
      missing: [{ file: 'b.md', key: 'bbbb' }],
      orphaned: [],
    })
  })

  it('flags an orphaned SVG with no live source', () => {
    expect(diffMermaid(live, ['aaaa', 'bbbb', 'cccc'])).toEqual({
      missing: [],
      orphaned: ['cccc'],
    })
  })
})
