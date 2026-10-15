import type { MermaidFont } from '../../app/utils/mermaid.ts'

// The family is theme.css's private name for this woff2 (#1989), so diagrams are
// drawn in the face the page serves (ADR-0024).
export default {
  fontFamily: "'Glass Box Sans', sans-serif",
  fontSize: '16px',
  woff2: 'layers/glassbox/app/assets/fonts/instrument-sans-latin-wght-normal.woff2',
} satisfies MermaidFont
