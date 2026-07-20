// Pure helpers shared by the mermaid render/verify scripts and the runtime
// component (issue #379). Kept fs-free and framework-free so both the
// author-time renderer (`scripts/render-mermaid.ts`), the drift gate
// (`scripts/verify-mermaid.ts`), and `app/components/MermaidDiagram.vue` can
// import the SAME contract — no forked second copy (single-home, CLAUDE.md).

/** Seam so ProsePre.vue's mermaid branch is testable as pure TS, without a full
 *  Nuxt/@vue/test-utils mount (issue #364). */
export function isMermaidLanguage(language: string | null | undefined): boolean {
  return language === 'mermaid'
}

// The `--diagram-*` theming contract (issue #364): mermaid `themeVariables` name
// → the CSS custom property a Tenant maps its own token to. This is the SINGLE
// home of the contract — the author-time renderer sets each of these to a
// sentinel and rewrites it back to `var(<cssVar>, <fallback>)` so the committed
// SVG re-resolves against the host Tenant's palette (and `prefers-color-scheme:
// dark`) with zero JS. Only COLOUR tokens live here: font family/size feed
// mermaid's `getBBox` text-measurement geometry, which is BAKED into the SVG at
// render time, so they cannot become live CSS vars without corrupting layout
// (ADR-0024). They are rendered at fixed values (`MERMAID_RENDER_FONT`) instead.
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

// Font geometry is baked into the committed SVG (see DIAGRAM_TOKENS note). These
// are the fixed values the author-time renderer measures against. The family is a
// PINNED, repo-bundled webfont (Gelasio — a Georgia-metric-compatible open serif,
// `app/assets/fonts/`), injected into Chromium at render time AND shipped to the
// browser via `@font-face` in MermaidDiagram.vue. Measuring and displaying against
// the *same* font is what keeps baked geometry correct across machines: a bare
// `serif` stack resolves to whatever each environment installs (the build
// container has no Palatino/Iowan/Georgia — it fell back to a narrower serif and
// labels clipped on wider-serif readers, issue #379). `Georgia, serif` stays as a
// graceful fallback for the rare case the woff2 fails to load. Changing this
// family/size requires re-running `pnpm render:mermaid` (baked, not a live var).
export const MERMAID_RENDER_FONT = {
  fontFamily: 'Gelasio, Georgia, serif',
  fontSize: '20px',
} as const

/**
 * A stable, deterministic key for a mermaid source block — the committed SVG's
 * filename (`app/assets/mermaid/<key>.svg`) and the runtime lookup key. Must
 * produce identical output in Node (the render/verify scripts) and in the
 * browser (the component), so it is a plain sync string hash (FNV-1a over the
 * source, and again over its reverse, concatenated) rather than an async
 * SubtleCrypto digest. The source is normalised first so incidental
 * leading/trailing whitespace can't churn the key.
 */
export function mermaidKey(code: string): string {
  const s = normalizeMermaidSource(code)
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
