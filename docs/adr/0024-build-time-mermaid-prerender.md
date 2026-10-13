# ADR-0024: Mermaid diagrams ship as pre-rendered, committed SVG

Each mermaid diagram is drawn into an SVG file when it is written, and that
file is committed. The site serves the SVG and loads no mermaid code in the
browser. Only that authoring step runs a browser; CI checks and the production
app read the committed files.

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
  variables. Diagrams use one font that the repo bundles and the site serves,
  so the font measured when drawing is the font the reader sees. Changing that
  font means drawing every diagram again.
- **The page inserts the SVG as raw HTML.** That is safe only because the file
  is our own and the gate refuses one that could run code.
- **`mermaid` is a development dependency only.**

## Why

A client-side renderer made every page with a diagram download hundreds of
kilobytes of JavaScript. Mermaid cannot lay out a diagram without a real
browser, because it measures drawn text, and the production container has
none. So the browser must run before the build, and the result must be a
static file.

Committing that file keeps CI and production free of the render step, and
lets a reviewer see each diagram change in the PR diff. Drawing is
deterministic, so the same source always gives the same SVG and the gate's
check stays meaningful.

## Rejected alternatives

- **Render in the browser at runtime.** It works and re-themes everything, but
  ships the large mermaid bundle to readers.
- **Render during CI or the build** instead of committing SVGs. Every run would
  need a browser, the floor checks that run on every change would lose their
  browser-free speed, and reviewers would not see the output.
- **A browser-free renderer** (jsdom or SVG shims). None can measure text, so
  mermaid's layout breaks. The only truly browser-free option (Graphviz) uses
  a different diagram language.
- **Another rendering package or service** (mermaid-cli, mermaid-isomorphic,
  Kroki). Each adds a dependency or a running service; the renderer reuses the
  browser tooling the repo already has.

## Consequences

- An environment with no Chromium cannot redraw diagrams, but can still build,
  test and serve the site.

## See

- `app/utils/mermaid.ts`: the `--diagram-*` colour list, the render font and
  the key that matches a diagram to its SVG.
- `scripts/render-mermaid.ts`: the authoring step and its options.
- `scripts/verify-mermaid.ts` and `app/utils/svg.ts`: the gate check and what
  counts as safe.
- `app/components/MermaidDiagram.vue`: how a page shows the SVG, or the
  source when the SVG is missing.
- `app/assets/fonts/README.md`: the bundled font.
- `docs/research/mermaid-server-side-rendering.md`: the options compared, and
  how to group lanes in a diagram.
