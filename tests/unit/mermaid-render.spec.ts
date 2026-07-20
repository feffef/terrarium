// L3 — pure-function coverage for the build-time mermaid pre-render pipeline
// (issue #379, ADR-0024): the content-hash key, the fence extractor, the
// sentinel→CSS-var rewrite, and the drift reconciliation. No fs, no browser.
import { describe, expect, it } from 'vitest'
import { extractMermaidBlocks, mermaidKey, normalizeMermaidSource } from '../../app/utils/mermaid.ts'
import { leftoverSentinels, SENTINELS, themeSvg } from '../../scripts/render-mermaid.ts'
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

  it('flags an unrewritten theme sentinel via leftoverSentinels', () => {
    // `#f0a001` is the first token's real sentinel (0xa0 base); an unrewritten one is a leak.
    expect(Object.values(SENTINELS)).toContain('#f0a001')
    expect(leftoverSentinels('fill:#f0a001')).toEqual(['#f0a001'])
  })

  it('does not false-flag a non-sentinel hex in the #f0aX01 family', () => {
    // #f0a901 matched the old hand-written regex but is not a live sentinel (only a
    // handful of tokens exist) — detection now keys off SENTINELS, so it's ignored.
    expect(Object.values(SENTINELS)).not.toContain('#f0a901')
    expect(leftoverSentinels('fill:#f0a901')).toEqual([])
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
