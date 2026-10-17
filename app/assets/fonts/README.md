# Bundled fonts

## `gelasio-latin-400-normal.woff2`

The **default render font for Mermaid diagrams** (ADR-0024, issue #379): every
Tenant whose layer has no `mermaid-font.ts` draws in it. Gelasio is an open serif
that is **metrically compatible with Georgia**, the last named face in the
Journal's serif stack (`layers/journal/app/assets/theme.css`).

Why bundled rather than a stack of system fonts: mermaid bakes node geometry by
measuring rendered text at author time, so the renderer
(`scripts/gate/render-mermaid.ts`, injected as a data: URI) **and** the browser
(`app/components/MermaidDiagram.vue`, via `@font-face`) must use the same face.

- Source: `@fontsource/gelasio@5.3.0` (`files/gelasio-latin-400-normal.woff2`),
  the latin, weight-400, normal subset. Obtained via npm, committed here; the
  package is not a project dependency.
- License: SIL Open Font License 1.1 — see `Gelasio-OFL.txt`. Freely
  redistributable; the license travels with the font, as OFL requires.

Only weight 400 normal is bundled — diagram labels use no bold/italic. Add another
subset only if a diagram needs it, and re-render (`pnpm render:mermaid`).
