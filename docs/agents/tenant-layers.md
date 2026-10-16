# Tenant layers: Nuxt-layer authoring conventions

A Tenant is a Nuxt layer under `layers/<tenant>/`; Nuxt auto-extends every
`layers/*`, so there is no `extends` list (ADR-0018). The short layer instructions (auto-imports, aliases, adding a
Tenant, what leaks) live in `.claude/rules/tenant-layers.md`; this doc holds
the longer ones.

## 1. Layer-wrapper CSS custom properties inherit into scoped children

The journal Tenant defines its design tokens (`--jd-ground`, `--jd-ink`,
`--jd-accent`, `--jd-line`, `--jd-radius`, `--jd-shadow`, …) once, on the
layer's top-level wrapper element:

```css
/* layers/journal/app/assets/theme.css */
.jd {
  --jd-ground: …;
  --jd-surface: …;
  --jd-ink: …;
  --jd-accent: …;
  /* … */
}
```

Every page that mounts a layer view wraps its template in that class (e.g.
`<main class="jd">` in both `[space]/index.vue` and `[space]/[...slug].vue`).
CSS custom properties inherit down the DOM tree, and Vue's `scoped` styles limit
only selector leakage between components, not inheritance. So any child
component under `.jd` can read the tokens in its own **scoped** `<style>`, with
no re-declaration or prop-drilling:

```css
/* layers/journal/app/components/journal/StatTile.vue — scoped, no --jd-* here */
.tile {
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  box-shadow: var(--jd-shadow);
}
```

Practical implications:

- Define a layer's design tokens **once**, on the outermost wrapper the
  layer's pages render (registered globally via the layer's `nuxt.config.ts`
  `css: [...]`), not per component.
- If a new component under the layer looks unstyled or falls back to
  browser defaults, check that it is mounted under the wrapper (`.jd`) in the
  render tree; one rendered outside it (e.g. via `<Teleport>` to `<body>`) won't
  see the tokens.
- **A Platform-generic component can theme itself from a Tenant without naming
  its tokens, via an opt-in contract.** Mermaid diagrams do this with
  `--diagram-*` (the list is in `app/utils/mermaid.ts`, the why in ADR-0024;
  journal's mapping is in `theme.css`). Map with `var(--jd-…)`, not literals,
  so a dark-mode override flows through. The diagram font can't be a token: a
  layer names its own in `mermaid-font.ts` (Glass Box's is the example).

## 2. Content-component overrides (`components/content/`) resolve Platform-wide

A same-named file under any layer's `components/content/` overrides the matching
bundled `@nuxtjs/mdc` prose component. Nuxt flattens every layer's component
registry into one, so this is override *priority*, not per-Tenant scoping; you
can't override a prose component for one Tenant. So
`app/components/content/ProsePre.vue` (Mermaid rendering for
` ```mermaid ` fences, issue #364) lives at the app root: in a layer it would
wrongly imply per-Tenant scoping.

## 3. Verify a routing claim against the layer's actual `pages/` tree, not prose search

Before asserting anywhere that a route exists, check the layer's
`layers/<tenant>/…/pages/` directory (ADR-0016 tenant-root routes), not
Markdown/Vue prose: text search can miss or misreport a route.
