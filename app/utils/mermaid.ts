// Pure helpers shared by the mermaid render/verify scripts and the runtime
// component (issue #379). Kept fs-free and framework-free so both the
// author-time renderer (`scripts/gate/render-mermaid.ts`), the drift gate
// (`scripts/gate/validate-mermaid-svgs.ts`), and `app/components/MermaidDiagram.vue` can
// import the SAME contract — no forked second copy (single-home, CLAUDE.md).

// The `--diagram-*` theming contract (issue #364): mermaid `themeVariables` name
// → the CSS custom property a Tenant maps its own token to. This is the SINGLE
// home of the contract — the author-time renderer sets each of these to a
// sentinel and rewrites it back to `var(<cssVar>, <fallback>)` so the committed
// SVG re-resolves against the host Tenant's palette (and `prefers-color-scheme:
// dark`) with zero JS. Only COLOUR tokens live here: font family/size feed
// mermaid's `getBBox` text-measurement geometry, which is BAKED into the SVG at
// render time, so they cannot become live CSS vars without corrupting layout
// (ADR-0024). They are rendered at a fixed `MermaidFont` per Tenant instead.
export const DIAGRAM_TOKENS: Record<string, string> = {
  primaryColor: '--diagram-node-bg',
  primaryBorderColor: '--diagram-node-border',
  primaryTextColor: '--diagram-node-text',
  lineColor: '--diagram-line',
  edgeLabelBackground: '--diagram-edge-label-bg',
  clusterBkg: '--diagram-cluster-bg',
  clusterBorder: '--diagram-cluster-border',
}

// Sensible fallbacks (mermaid's own `base`-theme defaults) used when a Tenant
// sets none of the `--diagram-*` tokens — so a bare render still looks correct.
// Keyed by the same mermaid `themeVariables` name as DIAGRAM_TOKENS.
export const DIAGRAM_TOKEN_FALLBACKS: Record<string, string> = {
  primaryColor: '#ECECFF',
  primaryBorderColor: '#9370DB',
  primaryTextColor: '#333333',
  lineColor: '#333333',
  edgeLabelBackground: '#e8e8e8',
  clusterBkg: '#ffffff',
  clusterBorder: '#aaaa33',
}

/** A diagram's render font (ADR-0024). `face`, `weight` and `woff2` (a
 *  repo-relative path) must match the `@font-face` the Tenant's pages serve, so
 *  the font measured when drawing is the font the reader sees. `fontFamily`
 *  is the stack baked into the SVG and leads with `face`. */
export interface MermaidFont {
  face: string
  fontFamily: string
  fontSize: string
  weight: string
  woff2: string
}

// The default, for a Tenant whose layer has no `mermaid-font.ts`. Gelasio is a
// Georgia-metric serif; `Georgia, serif` only covers a woff2 that fails to load
// (issue #379). Its `@font-face` is in MermaidDiagram.vue.
export const MERMAID_RENDER_FONT: MermaidFont = {
  face: 'Gelasio',
  fontFamily: 'Gelasio, Georgia, serif',
  fontSize: '20px',
  weight: '400',
  woff2: 'app/assets/fonts/gelasio-latin-400-normal.woff2',
}

/**
 * A stable, deterministic key for a mermaid source block — the committed SVG's
 * filename (`app/assets/mermaid/<key>.svg`) and the runtime lookup key. Must
 * produce identical output in Node (the render/verify scripts) and in the
 * browser (the component), so it is a plain sync string hash (FNV-1a over the
 * source, and again over its reverse, concatenated) rather than an async
 * SubtleCrypto digest. The source is normalised first so incidental
 * leading/trailing whitespace can't churn the key. Only a non-default font
 * joins the hash, so default-font keys stay stable (ADR-0024).
 */
export function mermaidKey(code: string, font: MermaidFont = MERMAID_RENDER_FONT): string {
  const isDefault =
    font.fontFamily === MERMAID_RENDER_FONT.fontFamily && font.fontSize === MERMAID_RENDER_FONT.fontSize
  const s = (isDefault ? '' : `${font.fontFamily} ${font.fontSize}\n`) + normalizeMermaidSource(code)
  return `${fnv1a(s)}${fnv1a(reverse(s))}`
}

/** Normalise a mermaid source so the render script's raw-markdown extraction and
 *  the component's MDC-delivered `code` prop hash to the same key: unify line
 *  endings and strip surrounding blank space (interior is left byte-identical). */
export function normalizeMermaidSource(code: string): string {
  return code.replace(/\r\n/g, '\n').trim()
}

function reverse(s: string): string {
  return [...s].reverse().join('')
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    // 32-bit FNV prime (16777619) multiply via shift-add, kept in uint32 range.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

// A fenced ```mermaid block (three or more backticks, optional indent/trailing
// space), capturing the source between the fences. Global + multiline so a
// document with several diagrams yields each in order.
const MERMAID_FENCE = /^[ \t]*```+[ \t]*mermaid[ \t]*\n([\s\S]*?)\n[ \t]*```+[ \t]*$/gm

/** Extract every fenced ```mermaid block's source from a Markdown document, in
 *  document order. Pure (no fs) so the render script, the drift gate, and unit
 *  tests share one extractor. */
export function extractMermaidBlocks(markdown: string): string[] {
  const blocks: string[] = []
  for (const m of markdown.matchAll(MERMAID_FENCE)) {
    if (m[1] !== undefined) blocks.push(m[1])
  }
  return blocks
}
