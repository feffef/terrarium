# ADR-0024: Mermaid diagrams ship as pre-rendered, committed SVG

Each mermaid diagram is drawn into an SVG file when it is written, in its
Tenant's font, and that file is committed. The site serves the SVG and loads no
mermaid code in the browser. Only that authoring step draws diagrams; the gate
and the production app read the committed SVGs.

## Scope

- **Every page, in every Tenant.** A ```` ```mermaid ```` block shows its
  committed SVG. The browser never downloads mermaid.
- **Rendering needs a browser, so it happens when a diagram is written.** After
  adding or editing a diagram, the author runs the render script and commits
  the SVG changes. The production container has no browser, and the app must
  never need one.
- **The gate checks the SVGs without a browser.** It fails when a diagram has
  no SVG, an SVG is empty or matches no diagram, or an SVG could run code.
- **Colours follow the Tenant and dark mode.** Each colour in the SVG reads a
  `--diagram-*` CSS variable, which a Tenant maps to its own tokens.
- **Fonts and layout are fixed when the diagram is drawn.** Mermaid places
  each node by measuring its text, so font family and size cannot be CSS
  variables. Each Tenant draws in one font, the default unless its layer names
  another: a file the repo bundles and the Tenant's pages serve under the same
  family name, so the font measured is the font the reader sees. A
  non-default font joins the SVG's name, so one source in two fonts is two
  SVGs. Changing a Tenant's font means drawing its diagrams again.
- **The page inserts the SVG as raw HTML.** That is safe only because the file
  is our own and the gate refuses one that could run code.
- **`mermaid` is a development dependency only.**

## Why

Rendering in the page costs hundreds of kilobytes of JavaScript. Mermaid
measures drawn text, so it needs a real browser, and production has none: the
browser must run before the build and leave a static file.

Committing that file keeps CI and production free of the render step, and
lets a reviewer see each diagram change in the PR diff. Drawing is
deterministic, so the same source always gives the same SVG and the gate's
check stays meaningful.

A font per Tenant lets a diagram match the type of the page around it.

## Rejected alternatives

- **Render in the browser at runtime.** It works and re-themes everything, but
  ships the large mermaid bundle to readers.
- **Render during CI or the build** instead of committing SVGs. Every run would
  need a browser, the Floor would lose its browser-free speed, and reviewers
  would not see the output.
- **A browser-free renderer** (jsdom or SVG shims). None can measure text, so
  mermaid's layout breaks. The only truly browser-free option (Graphviz) uses
  a different diagram language.
- **Another rendering package or service** (mermaid-cli, mermaid-isomorphic,
  Kroki). Each adds a dependency or a running service; the renderer reuses the
  browser tooling the repo already has.
- **The font in the Tenant manifest.** The manifest schema is strict and
  needs a human merge to change; a file in the layer keeps the font beside
  the CSS that serves it.

## Consequences

- An environment with no Chromium cannot redraw diagrams, but can still build,
  test and serve the site.

## See

- `app/utils/mermaid.ts`: the `--diagram-*` colours, default font and SVG key.
- `layers/<tenant>/mermaid-font.ts`: a Tenant's own render font, if any.
- `scripts/render-mermaid.ts`: the authoring step and its options.
- `scripts/verify-mermaid.ts`, `app/utils/svg.ts`: the gate check, what is safe.
- `app/components/MermaidDiagram.vue`: how a page shows the SVG.
- `app/assets/fonts/README.md`: the default font.
- `docs/research/mermaid-server-side-rendering.md`: the options compared.
- `.claude/rules/mermaid-lanes.md`: how to group lanes in a diagram.
