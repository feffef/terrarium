# Tenant layers: Nuxt-layer authoring conventions

A Tenant is a Nuxt layer under `layers/<tenant>/`; Nuxt auto-extends every
`layers/*`, so there is no `extends` list (ADR-0018). It extends the main app
(CONTEXT.md). The short layer instructions (auto-imports, aliases, adding a
Tenant, what leaks) live in `.claude/rules/tenant-layers.md`; this doc holds
the longer ones.

## 1. Layer-wrapper CSS custom properties inherit into scoped children

The journal Tenant defines its design tokens (`--jd-ground`, `--jd-ink`,
`--jd-accent`, `--jd-line`, `--jd-radius`, `--jd-shadow`, …) once, on the
layer's top-level wrapper element:

```css
/* layers/journal/app/assets/theme.css */
.jd {
  --jd-ground: #f3f5ef;
  --jd-surface: #fbfcf9;
  --jd-ink: #1a2420;
  --jd-accent: #356a4c;
  /* … */
}
```

Every page that mounts a layer view wraps its template in that class (e.g.
`<main class="jd">` in both `[space]/index.vue` and `[space]/[...slug].vue`).
CSS custom properties inherit down the DOM tree, and Vue's `scoped` attribute
selectors block only cross-component selector leakage, not inheritance, so child
components anywhere under `.jd` can read the tokens in their own **scoped**
`<style>` with no re-declaration or prop-drilling:

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
  browser defaults, check whether it's actually mounted under the wrapper
  element (`.jd`) in the render tree — a component rendered outside that
  wrapper (e.g. via `<Teleport>` to `<body>`) won't see the tokens.
- **A Platform-generic component can theme itself from a Tenant without naming
  its tokens, via an opt-in contract.** Mermaid diagrams do this with
  `--diagram-*` (the list is in `app/utils/mermaid.ts`, the why in ADR-0024;
  journal's mapping is in `theme.css`). Map with `var(--jd-…)`, not literals,
  so a dark-mode override flows through.

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
