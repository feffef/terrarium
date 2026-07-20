# Server-/build-side Mermaid rendering: what's possible, and why we pre-render

Grounding note for issue #379 / ADR-0024. Re-derived 2026-07-20 (the original
lived on the abandoned exploration branch `claude/server-side-mermaid-diagrams-24dse5`
and was lost; this restates the findings and adds what the implementation
confirmed). This is a one-off reference note, not a living convention — the
decision itself is single-homed in ADR-0024.

## The question

Can we render Mermaid diagrams **without a browser at runtime**? The production
container ships no Chromium/Chrome, so any approach that needs a headless browser
*when a page is served* is disqualified up front.

## Key finding: truly browserless Mermaid rendering is not possible

Verified empirically and against primary sources:

- Plain Node `mermaid.render()` throws `document is not defined`.
- With jsdom shims it gets further, then dies on `text2.getBBox is not a function`.
  Mermaid lays out **every** node by *measuring rendered text* — `getBBox` and
  `getComputedTextLength` — to size boxes and route edges. Installed mermaid
  11.16.0 references `.getBBox` heavily across its `dist/`.
- jsdom's own README states it implements **no layout or rendering** (even
  `pretendToBeVisual` is "just pretending"), so those measurement methods cannot
  return real geometry. `svgdom`/`@resvg/resvg-js` don't help: resvg only
  *rasterises* an already-laid-out SVG; it does no text metrics for layout.
- Mermaid maintainers confirm a real browser is required to precompute sizes
  (mermaid-js/mermaid issues #3650 and #559).

So "no browser at runtime" can only be satisfied by:

- **(a)** rendering in a browser **at build/authoring time** and shipping static
  SVG (prod needs no browser); or
- **(b)** abandoning mermaid's renderer for a layout-capable, genuinely
  browserless one — practically `@viz-js/viz` (Graphviz WASM), which is **DOT-only**,
  changes the authoring syntax, and drops most mermaid diagram types.

We keep mermaid syntax, so **(a)**.

## Why commit the SVGs (not render during CI)

Rendering during every CI build would drag Chromium into CI and require a
human-only `gate.yml` reorder (agents can't push workflow files — ADR-0004).
Committing the rendered SVGs and drift-checking them instead:

- keeps the browser out of CI **and** prod — only the author's machine renders;
- makes each diagram **reviewable in the PR diff**;
- mirrors the repo's existing `verify:skills-lock` drift-check pattern (a
  committed artifact + a gate step that fails on staleness).

## How theming survives as a static SVG

The client renderer themed diagrams live by feeding mermaid a `--diagram-*`
CSS-variable contract (`DIAGRAM_TOKENS`) read off the mounted element, so the
diagram re-resolved against the Tenant palette and `prefers-color-scheme: dark`.
A static SVG has no JS to do that — but the theming can be **baked as CSS-var
references** rather than concrete colours:

1. Render with `theme: 'base'` and each colour token set to a **unique sentinel
   hex** (`#f0a001`, `#f0a101`, …), far from any palette or author `classDef`
   colour.
2. Post-process the rendered SVG, rewriting each sentinel → `var(--diagram-*,
   <fallback>)`.

The result re-resolves against whatever `--diagram-*` tokens the host Tenant sets
(and their dark-mode overrides) with **zero JS**. On the one existing diagram
(`layers/journal/.../how-it-works.md`) this yields **30 live `var(--diagram-*)`
refs and no leftover baked theme colours** — the fallbacks inside each `var()`,
the author's own `classDef` stroke colours, and cosmetic drop-shadow flood-colours
are the only literal hexes that remain, all intentional.

### The one thing that cannot be a CSS var: font geometry

`fontFamily` / `fontSize` feed the `getBBox` measurements that decide node
positions and sizes. Those positions are **baked into the SVG at render time**,
so the font must be a concrete value during render, not a runtime variable — a
different runtime font would leave the text mismatched to a layout computed for
another font. The renderer therefore bakes both at fixed values
(`MERMAID_RENDER_FONT`, matching the journal Tenant's `--diagram-font*`); only the
seven **colour** tokens become live `var()` refs. A font-token change needs a
re-render (the drift gate does not catch a CSS-token change, only a source
change — an accepted limitation).

### Arrowheads re-theme; a legacy class does not (harmless)

The actual flowchart-v2 arrow markers fill from `.marker{fill:var(--diagram-line,
…)}`, so they re-color correctly. Mermaid also emits an unused legacy
`.arrowheadPath{fill:#0b0b0b}` and a `.state-start{fill:#000000}` (state diagrams)
plus black drop-shadow `flood-color`s — none referenced by the rendered
flowchart, so their baked colours are harmless.

## Alternatives considered (all inferior here)

| Option | New dep | Notes |
| --- | --- | --- |
| **Build-time render via existing `playwright-core` + pre-installed Chromium** | **none** | Chosen. `resolveChromiumPath()` already resolves the browser. |
| `mermaid-isomorphic` (build-time) | `playwright` | Same idea, heavier dep than rolling it. |
| `@mermaid-js/mermaid-cli` (`mmdc`) | `puppeteer` | Official, but adds Puppeteer + a subprocess. |
| Kroki (self-host / public) | a running service | Relocates the browser into another container; more infra. |
| `@viz-js/viz` (Graphviz WASM) | `@viz-js/viz` | The only truly browserless renderer, but **DOT-only** — changes authoring syntax, drops diagram types. |
| jsdom / `svgdom` shims, `@resvg/resvg-js` | — | Not viable for mermaid: no real text layout; resvg only rasterises. |

## Implementation shape (as shipped — see ADR-0024)

- `scripts/render-mermaid.ts` — author-time; the only browser step.
- `scripts/verify-mermaid.ts` — drift gate; reads files only, wired into the gate
  floor.
- `app/utils/mermaid.ts` — the single home of the token contract, content-hash
  key, and fence extractor.
- `app/components/MermaidDiagram.vue` — looks the committed SVG up by content-hash
  and injects it via `v-html`; SSR-rendered; `<pre>` fallback on a miss.
- `mermaid` moved to `devDependencies` (author-time tool only).
