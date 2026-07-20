// L3 — pure-function coverage for the build-time mermaid pre-render pipeline
// (issue #379, ADR-0024): the content-hash key, the fence extractor, the
// sentinel→CSS-var rewrite, and the drift reconciliation. No fs, no browser.
import { describe, expect, it } from 'vitest'
import {
  extractMermaidBlocks,
  MERMAID_RENDER_FONT,
  mermaidKey,
  normalizeMermaidSource,
} from '../../app/utils/mermaid.ts'
import {
  leftoverSentinels,
  relaxNodeLabelOverflow,
  SENTINELS,
  themeSvg,
} from '../../scripts/render-mermaid.ts'
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

describe('MERMAID_RENDER_FONT', () => {
  // The render font must lead with the bundled webfont family (Gelasio) that
  // MermaidDiagram.vue ships via @font-face and render-mermaid.ts injects at
  // measure time — if these drift apart, geometry is baked against one font and
  // displayed in another, which is exactly the clip bug this pinning fixes (#379).
  it('pins the bundled Gelasio family so measure-font == display-font', () => {
    expect(MERMAID_RENDER_FONT.fontFamily).toMatch(/^Gelasio\b/)
  })
})

describe('relaxNodeLabelOverflow()', () => {
  // Mermaid emits a node label as a foreignObject fixed to the build-font text
  // width, wrapping a left-anchored `display: table-cell` div. The browser clips
  // at that width, truncating labels under a wider display font (ADR-0024's baked
  // geometry). The transform un-clips it and re-centres the overflow.
  const nodeLabel =
    '<foreignObject width="121.65625" height="30"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>Human prompt</p></span></div></foreignObject>'

  it('adds overflow:visible and a centred flex wrapper to a node label', () => {
    const out = relaxNodeLabelOverflow(nodeLabel)
    expect(out).toContain('<foreignObject width="121.65625" height="30" style="overflow: visible;">')
    expect(out).toContain('display: flex; align-items: center; justify-content: center;')
    expect(out).not.toContain('display: table-cell')
  })

  it('preserves the measured foreignObject width (geometry is untouched)', () => {
    expect(relaxNodeLabelOverflow(nodeLabel)).toContain('width="121.65625"')
  })

  it('leaves an edge label (labelBkg / no nodeLabel span) untouched', () => {
    const edgeLabel =
      '<foreignObject width="48.89" height="30"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="edgeLabel "><p>writes</p></span></div></foreignObject>'
    expect(relaxNodeLabelOverflow(edgeLabel)).toBe(edgeLabel)
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
