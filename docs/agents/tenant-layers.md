# Tenant layers: Nuxt-layer authoring conventions

A Tenant is implemented as a Nuxt layer under `layers/<tenant>/` — Nuxt's
conventional layer directory, so every `layers/*` is auto-extended with no
`extends` list (ADR-0018). It extends the main app (CONTEXT.md, ADR-0001). Nuxt
layers have two gotchas that get re-discovered from scratch most sessions. Read
this before editing a layer's `nuxt.config.ts`, pages, or components.

## 1. Auto-imports first; aliases resolve to the main app, not the layer

**Reach for Nuxt's auto-imports before writing any import.** A layer's
`app/components/`, `app/composables/`, and `app/utils/` directories are all
scanned, layer-aware, and shared app-wide — components resolve under their
directory-prefixed name (`layers/atlas/app/components/atlas/SpecimenPlate.vue`
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

For what auto-import does *not* cover (type-only imports, assets), know the
alias gotcha: inside a layer, the usual Nuxt aliases (`~`, `@`, `~~`, `@@`)
resolve relative to the **main app's** root, not the layer directory the file
physically lives in. A layer file can't `import '~/types/foo'` and expect Nuxt
to look inside the layer for it — it will look in (and usually fail to find it
in) the root app instead. Two ways layer code deals with this:

- **Layer-local type imports → plain relative paths.** The Space-landing page
  imports the journal Tenant's own types with a relative path, not an alias:

  ```ts
  // layers/journal/app/pages/t/journal/[space]/index.vue
  import type { PageDoc, SessionDoc, SkillDoc } from '../../../../types/journal'
  ```

  That resolves to `layers/journal/app/types/journal.ts` — a layer-local file
  — via plain relative traversal, sidestepping alias resolution entirely.
  (Types are *not* auto-imported; only values from the scanned dirs are.)

- **Layer-local asset paths in `nuxt.config.ts` → `fileURLToPath` from the
  config's own URL.** Registering the layer's CSS by aliased path (e.g.
  `~/assets/theme.css`) would resolve against the main app and silently miss
  the layer's own file. Instead, resolve it from the config file's own
  location:

  ```ts
  // layers/journal/nuxt.config.ts
  import { fileURLToPath } from 'node:url'

  export default defineNuxtConfig({
    css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
  })
  ```

  This is unambiguous regardless of how layer aliases resolve, because it
  never goes through the alias system at all.

Main-app modules that a layer page genuinely needs to import (rare now that
`useSpace()` covers routing) use the root aliases correctly — e.g.
`#shared/routing` (Nuxt's own alias for the root `shared/` directory) is right
precisely *because* `shared/routing.ts` lives in the main app, not the layer.
The rule is "which app root does the target file actually live under," not
"always avoid aliases in a layer."

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
Because CSS custom properties are inherited down the DOM tree — and Vue's
`scoped` attribute selectors don't block inheritance, only cross-component
selector leakage — child components nested anywhere under the `.jd` wrapper
can read those tokens in their own **scoped** `<style>` blocks with no
re-declaration and no prop-drilling:

```css
/* layers/journal/app/components/journal/StatTile.vue — scoped, no --jd-* here */
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
- **A Platform-generic component can theme itself from a Tenant this way too,
  without coupling to that Tenant's token names — via an opt-in contract.**
  `app/components/MermaidDiagram.vue` reads a small set of `--diagram-*` custom
  properties off its mounted element and feeds them to mermaid; each Tenant
  opts in by *mapping* its own tokens to that contract on its wrapper (journal
  maps `--jd-*` → `--diagram-*` in `theme.css`). A Tenant that maps none keeps
  the component's default look. Map via `var(--jd-…)` rather than literal
  values so a dark-mode `--jd-*` override flows through the contract for free.

## 3. A new Tenant/layer needs `nuxt prepare` before `pnpm lint`

After adding a new Tenant/layer, run `nuxt prepare` (or `pnpm install`, which
runs it) before `pnpm lint` — a stale `.nuxt` doesn't yet know the layer's
`app/pages/` directory and mis-fires `vue/multi-word-component-names` on the
layer's pages.

## 4. Mermaid authoring: group lanes with `classDef stroke`, not `subgraph`

When a fenced ` ```mermaid ` diagram (see §5 below for how these render) needs
to visually group nodes into lanes, don't use `subgraph` for the grouping —
subgraph boundaries **clip** any edge that crosses from one subgraph into
another, silently hiding cross-lane arrows. Group visually instead via a
`classDef` that sets a shared `stroke` (and/or `fill`) on the lane's nodes —
this keeps every cross-lane edge intact while still reading as a distinct
group.

## 5. Content-component overrides (`components/content/`) resolve Platform-wide

A same-named file under any layer's `components/content/` directory overrides
the matching bundled `@nuxtjs/mdc` prose component — Nuxt flattens every
layer's component registry into one, so this is override *priority*, not
per-Tenant scoping (there is no way to override a prose component for one
Tenant only). The root Platform's `app/components/content/ProsePre.vue`
(issue #364 — Mermaid diagram rendering for ` ```mermaid ` fenced blocks)
lives at the app root rather than in a Tenant's `layers/` directory precisely
because the override is global: placing it in a Tenant layer would suggest a
scoping that doesn't exist.

## 6. Verify a routing claim against the layer's actual `pages/` tree, not prose search

Before asserting whether a route exists (in a review, a comment, or anywhere
else), check the layer's actual `layers/<tenant>/…/pages/` directory directly
(ADR-0016 tenant-root routes) — don't grep Markdown/Vue prose for the path
string instead. Text search can miss or misreport an actual route; the pages
tree is the real source of truth for what routes exist.
