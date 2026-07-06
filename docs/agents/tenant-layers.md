# Tenant layers: Nuxt-layer authoring conventions

A Tenant is implemented as a Nuxt layer (`tenants/<tenant>/`) that extends the
main app (CONTEXT.md, ADR-0001). Nuxt layers have two gotchas that get
re-discovered from scratch most sessions. Read this before editing a layer's
`nuxt.config.ts`, pages, or components.

## 1. Aliases resolve to the main app, not the layer

Inside a layer, the usual Nuxt aliases (`~`, `@`, `~~`, `@@`) resolve relative
to the **main app's** root, not the layer directory the file physically lives
in. A layer file can't `import '~/types/foo'` and expect Nuxt to look inside
the layer for it — it will look in (and usually fail to find it in) the root
app instead.

Two ways layer code deals with this, both used in `tenants/journal/`:

- **Layer-local TS/JS imports → plain relative paths.** The Space-landing page
  imports the journal Tenant's own types with a relative path, not an alias:

  ```ts
  // tenants/journal/app/pages/t/journal/[space]/index.vue
  import type { Friction, Importance, PageDoc, SessionCardView, SessionDoc, Severity, SkillDoc } from '../../../../types/journal'
  ```

  That resolves to `tenants/journal/app/types/journal.ts` — a layer-local file
  — via plain relative traversal, sidestepping alias resolution entirely.

- **Layer-local asset paths in `nuxt.config.ts` → `fileURLToPath` from the
  config's own URL.** Registering the layer's CSS by aliased path (e.g.
  `~/assets/theme.css`) would resolve against the main app and silently miss
  the layer's own file. Instead, resolve it from the config file's own
  location:

  ```ts
  // tenants/journal/nuxt.config.ts
  import { fileURLToPath } from 'node:url'

  export default defineNuxtConfig({
    css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
  })
  ```

  This is unambiguous regardless of how layer aliases resolve, because it
  never goes through the alias system at all.

Note the main app's own routing code, reached from a layer page, still uses
the main-app-rooted alias correctly — e.g. `tenants/journal/app/pages/t/journal/[space]/[...slug].vue`
imports `import { resolveSpaceRoute } from '~~/shared/routing'`, which is
right precisely *because* `shared/routing.ts` lives in the main app, not the
layer. The rule is "which app root does the target file actually live under,"
not "always avoid aliases in a layer."

## 2. Layer-wrapper CSS custom properties inherit into scoped children

The journal Tenant defines its design tokens (`--jd-ground`, `--jd-ink`,
`--jd-accent`, `--jd-line`, `--jd-radius`, `--jd-shadow`, …) once, on the
layer's top-level wrapper element:

```css
/* tenants/journal/app/assets/theme.css */
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
Because CSS custom properties are inherited down the DOM tree — and Vue's
`scoped` attribute selectors don't block inheritance, only cross-component
selector leakage — child components nested anywhere under the `.jd` wrapper
can read those tokens in their own **scoped** `<style>` blocks with no
re-declaration and no prop-drilling:

```css
/* tenants/journal/app/components/journal/StatTile.vue — scoped, no --jd-* here */
.tile {
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  box-shadow: var(--jd-shadow);
}
```

`StatTile.vue` never defines `--jd-surface` or `--jd-line` itself — it just
consumes what cascaded in from the ancestor `.jd` wrapper. Practical
implications:

- Define a layer's design tokens **once**, on the outermost wrapper the
  layer's pages render (registered globally via the layer's `nuxt.config.ts`
  `css: [...]`, per §1 above) — don't re-declare them per component.
  Everything under `.jd` in the DOM inherits them for free.
- If a new component under the layer looks unstyled or falls back to
  browser defaults, check whether it's actually mounted under the wrapper
  element (`.jd`) in the render tree — a component rendered outside that
  wrapper (e.g. via `<Teleport>` to `<body>`) won't see the tokens.

## 3. A new Tenant/layer needs `nuxt prepare` before `pnpm lint`

After adding a new Tenant/layer, run `nuxt prepare` (or `pnpm install`, which
runs it) before `pnpm lint` — a stale `.nuxt` doesn't yet know the layer's
`app/pages/` directory and mis-fires `vue/multi-word-component-names` on the
layer's pages.
