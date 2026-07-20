# 24. Mermaid diagrams are pre-rendered to committed, theme-adaptive SVG

Date: 2026-07-20

Status: Accepted

## Context

Mermaid diagrams shipped client-side (ADR-precursor #364): a `<ClientOnly>`
`MermaidDiagram.vue` did a dynamic `import('mermaid')` on mount and called
`mermaid.render()` in the browser, theming the result live by reading a
`--diagram-*` CSS-variable contract (the `DIAGRAM_TOKENS` map) off its mounted
element. Correct, and it re-themed for free against the host Tenant's palette and
`prefers-color-scheme: dark` — but any page with a `` ```mermaid `` block pulled
the ~600 KB mermaid renderer as a client chunk (issue #379).

The hard constraint framing the fix: **the production container has no browser.**
So anything needing a headless browser *at prod runtime* is out. And truly
browserless mermaid rendering is not possible — mermaid lays out every node by
measuring rendered text geometry (`getBBox` / `getComputedTextLength`), which
jsdom cannot fake (it implements no layout); the mermaid maintainers confirm a
browser is required (issue #379's research, re-derived in
`docs/research/mermaid-server-side-rendering.md`). That leaves rendering in a
browser **at build/authoring time** and shipping the result as static SVG.

This meets the 3-part ADR test: **hard to reverse** (a new build-time artifact
class committed to the tree, a new gate step, and a dependency reclassification —
undoing it means restoring the client renderer); **surprising without context** (a
committed `.svg` that re-colors via `var(--diagram-*)` and an author-only Chromium
step are not discoverable from reading the component); **a real trade-off** (a
manual re-render step and baked font geometry vs. a fat client chunk).

The owner green-lit adoption (ADR-0003) on 2026-07-20 and locked the two open
design questions (issue #379): render timing = commit-SVGs-plus-drift-gate, and
the injection mechanism is an implementation detail for the agent to resolve.

## Decision

**Pre-render each `` ```mermaid `` block to an inline, theme-adaptive SVG at
authoring time, commit the SVGs, and ship zero mermaid JS.** Only the authoring
step drives a browser; CI and prod read committed files only.

- **`scripts/render-mermaid.ts` (author-time, the only browser step).** Scans the
  content tree for `` ```mermaid `` fences, drives the pre-installed Chromium via
  `playwright-core` + `resolveChromiumPath()` (no new dependency), and renders
  each block with `theme: 'base'`. Theming survives the static render via a
  **sentinel rewrite**: each colour token in `DIAGRAM_TOKENS` is rendered as a
  unique sentinel hex, then post-processed to `var(--diagram-*, <fallback>)`, so
  the committed SVG re-resolves against the Tenant palette and dark mode with no
  JS. SVGs are written to `app/assets/mermaid/<key>.svg`, keyed by a
  content-hash of the source (`mermaidKey`).
- **Only colour tokens become CSS vars.** Font family/size feed mermaid's
  `getBBox` text measurement, so node positions are **baked** into the SVG for a
  specific font. Those two tokens are rendered at fixed values
  (`MERMAID_RENDER_FONT`) and are **not** live-themeable; a font-token change
  requires a re-render.
- **The render font is a pinned, repo-bundled webfont** (`app/assets/fonts/`,
  Gelasio — a Georgia-metric-compatible open serif under the SIL OFL). The
  renderer injects it into Chromium as a data: URI and the app ships it via
  `@font-face` (`MermaidDiagram.vue`), so the font measured at author time is the
  exact font the browser displays. Without this the build container (which
  installs no Palatino/Iowan/Georgia) measured a fallback serif and labels
  clipped for readers whose browser resolved the stack wider (issue #379). See
  `app/assets/fonts/README.md` for provenance.
- **Renders are deterministic.** `handDrawnSeed` is pinned so rough.js's per-node
  outline jitter no longer re-randomises each render; with the font also pinned,
  two renders of the same source are byte-identical, so `verify:mermaid` /
  `render:mermaid --check` is a meaningful drift gate rather than always-red.
- **Node labels degrade gracefully** under any residual font-width variance:
  `relaxNodeLabelOverflow` un-clips each label's `<foreignObject>` and centres
  the overflow (belt-and-suspenders behind the pinned font).
- **`app/utils/mermaid.ts` is the single home** of the token contract
  (`DIAGRAM_TOKENS`, fallbacks, render font), the content-hash key, and the fence
  extractor — imported by the renderer, the drift gate, and the component so none
  can fork a second copy.
- **`MermaidDiagram.vue` renders the baked SVG.** It drops `import('mermaid')`
  and the client render; it looks the committed SVG up by `mermaidKey(props.code)`
  (SVGs bundled via `import.meta.glob(..., { query: '?raw', eager: true })`) and
  injects it with `v-html`. It SSRs (the SVG is static and deterministic, so no
  hydration gap) and degrades to a `<pre>` of the source when no SVG is found.
- **`mermaid` moves `dependencies` → `devDependencies`** — it is now only an
  author-time tool, never shipped to the client.
- **`verify:mermaid` drift gate.** `scripts/verify-mermaid.ts` re-derives each
  diagram's content-hash key and fails when a committed SVG is missing, empty, or
  orphaned. It reads files only — **never launches a browser** — so it is safe in
  CI and prod. It is wired into the always-run gate floor (`package.json` `gate`
  and `scripts/gate.ts` `FLOOR`), alongside `verify:skills-lock`, mirroring that
  drift-check pattern (ADR-0007's lineage).

Render-during-CI was rejected: it would put Chromium in CI and force a
human-only `gate.yml` reorder (ADR-0004's workflow scope) for no benefit over a
committed, reviewable artifact.

## Consequences

- **Zero mermaid JS on the client.** A page with a diagram fetches no mermaid
  chunk; the diagram is present in the initial SSR HTML. An e2e assertion
  (`tests/e2e/smoke.spec.ts`) checks the rendered network trace names no mermaid
  URL and that `.mermaid-diagram svg` still renders, swept automatically across
  every Tenant.
- **Theming is preserved for colours, baked for fonts.** The committed SVG
  carries live `var(--diagram-*)` colour refs (30 on the existing diagram) and
  re-colors under a Tenant palette and dark mode with no JS. Font size/family are
  baked at render time; changing `--diagram-font*` no longer re-flows the diagram
  without a re-render. Accepted: layout geometry cannot be a runtime CSS var.
  - **Baked geometry is now font-exact, with a tolerance net.** The original
    render measured against whatever serif the build container happened to
    install (no Palatino/Iowan/Georgia — a narrower fallback), while a reader's
    browser resolved the stack wider; mermaid sizes each label's
    `<foreignObject>` to the measured width and the browser clips there, so
    labels truncated (`Human prompt` → `Human pron`). Fixed at the root by
    pinning one bundled webfont used at *both* measure and display time (see the
    Decision's render-font bullet), so the measured width is the displayed width.
    `relaxNodeLabelOverflow` stays as a cheap safety net — it un-clips each label
    and centres any residual overflow into the shape's 13-30px of padding —
    covering the rare case the woff2 fails to load or a Chromium version measures
    a sub-pixel differently. Node positions/geometry are untouched (issue #379).
- **A manual author step, guarded by the gate.** Editing a diagram means running
  `pnpm render:mermaid` and committing the new SVG. Forgetting is not silent —
  `verify:mermaid` fails the gate with the exact stale/missing file. The SVGs are
  reviewable in the PR diff.
- **Committed binary-ish artifacts in the tree.** Each diagram is a ~150 KB SVG
  under `app/assets/mermaid/`. This is the cost of shedding the 600 KB runtime;
  net client payload drops sharply, and only pages with a diagram carry the SVG.
- **Merges human-only (ADR-0004).** New build behaviour, a dependency
  reclassification, and this ADR all sit in ADR-0004's human-only-to-merge set.
- **Author-time browser dependency, not a runtime one.** The render step needs a
  Chromium (`resolveChromiumPath()`); an environment without one cannot
  regenerate diagrams, but can still build, test, and serve — the drift gate and
  the app never touch a browser.
