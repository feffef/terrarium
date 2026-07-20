# Bundled fonts

## `gelasio-latin-400-normal.woff2`

The **pinned render/display font for pre-rendered mermaid diagrams** (ADR-0024,
issue #379). Gelasio is an open serif that is **metrically compatible with
Georgia** — the last named face in the journal Tenant's serif stack
(`layers/journal/app/assets/theme.css`), so diagrams harmonise with the Tenant's
type while staying reproducible.

Why bundled rather than a stack of system fonts: mermaid bakes node geometry by
measuring rendered text at author time. The build container installs none of
Palatino/Iowan/Georgia, so it measured a fallback serif and labels clipped for
readers whose browser resolved the stack wider. Pinning one bundled font that the
renderer (`scripts/render-mermaid.ts`, injected as a data: URI) **and** the
browser (`app/components/MermaidDiagram.vue`, via `@font-face`) both use makes
measure-font == display-font, so baked geometry is correct everywhere.

- Source: `@fontsource/gelasio@5.3.0` (`files/gelasio-latin-400-normal.woff2`),
  the latin, weight-400, normal subset. Obtained via npm, committed here; the
  package is not a project dependency.
- License: SIL Open Font License 1.1 — see `Gelasio-OFL.txt`. Freely
  redistributable; the license travels with the font, as OFL requires.

Only weight 400 normal is bundled — diagram labels use no bold/italic. Add another
subset only if a diagram needs it, and re-render (`pnpm render:mermaid`).
