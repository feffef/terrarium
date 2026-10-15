import type { MermaidFont } from '../../app/utils/mermaid.ts'

// Mirrors theme.css's 'Glass Box Sans' @font-face (#1989), so diagrams are
// drawn in the face the page serves (ADR-0024).
export default {
  face: 'Glass Box Sans',
  fontFamily: "'Glass Box Sans', sans-serif",
  fontSize: '16px',
  weight: '400 700',
  woff2: 'layers/glassbox/app/assets/fonts/instrument-sans-latin-wght-normal.woff2',
} satisfies MermaidFont
