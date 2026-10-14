# Tenant layers: Nuxt-layer authoring conventions

A Tenant is a Nuxt layer under `layers/<tenant>/`; Nuxt auto-extends every
`layers/*`, so there is no `extends` list (ADR-0018). It extends the main app
(CONTEXT.md). Read this before editing a layer's `nuxt.config.ts`,
pages, or components: its gotchas get re-discovered most sessions.

## 1. Auto-imports first; aliases resolve to the main app, not the layer

**Reach for Nuxt's auto-imports before writing any import.** A layer's
`app/components/`, `app/composables/`, and `app/utils/` directories are all
auto-imported and layer-aware (mechanism and sources:
`docs/research/nuxt-content-review-grounding.md` §6). Components resolve under their directory-prefixed name
(`layers/atlas/app/components/atlas/SpecimenPlate.vue`
→ `<AtlasSpecimenPlate>`), and utils/composables exports resolve by name in
every SFC and every layer, with no import block at all. The root app's
`useSpace()` composable and each layer's own utils (`personaMeta`,
`biomeMeta`, `sessionCardViews`, …) reach layer pages this way. Two rules keep
the shared namespace safe:

- **The auto-import namespace is global across all layers** — name exports
  distinctively (tenant vocabulary, e.g. `formatBlogDate`, not `fmtDate`), and
  keep truly generic helpers module-private.
- **A local binding must not shadow an auto-imported export's name** — the two
  merge and vue-tsc rejects the ambiguity (TS2774, issue #95). Consuming SFCs
  keep local names distinct (`const sessionCards = computed(() =>
  sessionCardViews(...))`).

Auto-import doesn't cover types outside `app/utils/` and `app/composables/`
(e.g. `app/types/`) or assets, and there the aliases (`~`, `@`, `~~`, `@@`)
resolve against the **main app's** root, not the layer's, so a layer's
`import '~/types/foo'` usually fails.
Two ways layer code deals with this:

- **Layer-local type imports → plain relative paths.** The Space-landing page
  imports the journal Tenant's own types with a relative path, not an alias:

  ```ts
  // layers/journal/app/pages/t/journal/[space]/index.vue
  import type { SessionDoc, SkillDoc } from '../../../../types/journal'
  ```

  The target is `layers/journal/app/types/journal.ts`.

- **Layer-local asset paths in `nuxt.config.ts` → `fileURLToPath` from the
  config's own URL.** An aliased path (e.g. `~/assets/theme.css`) would
  silently miss the layer's file. Instead:

  ```ts
  // layers/journal/nuxt.config.ts
  import { fileURLToPath } from 'node:url'

  export default defineNuxtConfig({
    css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
  })
  ```


A layer page importing a main-app module uses the root aliases:
`#shared/routing` (Nuxt's alias for the root `shared/`) is right because
`shared/routing.ts` lives in the main app. The rule is which app root the target
file lives under, not "avoid aliases in a layer."

## 2. Layer-wrapper CSS custom properties inherit into scoped children

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
  `css: [...]`, per §1), not per component.
- If a new component under the layer looks unstyled or falls back to
  browser defaults, check whether it's actually mounted under the wrapper
  element (`.jd`) in the render tree — a component rendered outside that
  wrapper (e.g. via `<Teleport>` to `<body>`) won't see the tokens.
- **A Platform-generic component can theme itself from a Tenant without naming
  its tokens, via an opt-in contract.** Mermaid diagrams do this with
  `--diagram-*` (the list is in `app/utils/mermaid.ts`, the why in ADR-0024;
  journal's mapping is in `theme.css`). Map with `var(--jd-…)`, not literals,
  so a dark-mode override flows through.

## 3. Adding a Space, Collection or Tenant

- **Space or Collection:** edit the Tenant's `tenant.config.ts`. The keyed
  collections and the routing map follow at build time.
- **Tenant:** add `layers/<name>/` with a manifest, content and its own
  `nuxt.config.ts` (an empty `defineNuxtConfig({})` will do; without it
  `nuxt prepare` warns "Cannot extend config"). Then run `nuxt prepare` (or
  `pnpm install`, which runs it) before `pnpm lint` — a stale `.nuxt` doesn't
  yet know the layer's `app/pages/` directory and mis-fires
  `vue/multi-word-component-names` on the layer's pages.

## 4. Content-component overrides (`components/content/`) resolve Platform-wide

A same-named file under any layer's `components/content/` overrides the matching
bundled `@nuxtjs/mdc` prose component. Nuxt flattens every layer's component
registry into one, so this is override *priority*, not per-Tenant scoping; you
can't override a prose component for one Tenant. So
`app/components/content/ProsePre.vue` (Mermaid rendering for
` ```mermaid ` fences, issue #364) lives at the app root: in a layer it would
wrongly imply per-Tenant scoping.

**Group lanes with `classDef stroke`, not `subgraph`.** In a fenced
` ```mermaid ` diagram, subgraph boundaries **clip** any edge that crosses into
another subgraph, silently hiding cross-lane arrows. Set a shared `stroke`
(and/or `fill`) on the lane's nodes with a `classDef` instead; every cross-lane
edge stays intact and the nodes still read as a group.

## 5. Verify a routing claim against the layer's actual `pages/` tree, not prose search

Before asserting anywhere that a route exists, check the layer's
`layers/<tenant>/…/pages/` directory (ADR-0016 tenant-root routes), not
Markdown/Vue prose: text search can miss or misreport a route.

## 6. What leaks across Tenants

A layer is not a sandbox. Beyond §1 and §4, these reach every Tenant:

- **`css:` in a layer's `nuxt.config.ts`** loads on every page. Scope its
  rules under the Tenant's wrapper class (§2).
- **Plugins and `nuxt.config` flags** apply app-wide. Keep them inert outside
  the Tenant's own opt-in (Tinkerfund's `experimental.viewTransition`, #1376,
  and `view-transitions.client.ts`, #1406).
- **Dependencies**: a `layers/<tenant>/package.json` cannot scope one to a
  Tenant (no pnpm workspace). A new dependency is Platform-wide and escalates
  (ADR-0004).
- **`sessionStorage`/`localStorage`** is one origin shared by every Tenant, and
  Nuxt keeps its chunk-reload guard there. Prefix your keys and delete only
  your own; never call `clear()` (issues #1358, #1359).
