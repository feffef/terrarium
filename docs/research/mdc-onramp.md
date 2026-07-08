# Research: MDC components for the Journal on-ramp cards

**Question:** Would a Nuxt Content MDC (Markdown Components) component be a neat way
to move the editorial "on-ramp card" content out of `layers/journal/app/pages/t/journal/[space]/index.vue`
and into a Markdown content file?

**Status:** No pre-existing research/notes convention exists in this repo (`docs/` holds
only `adr/` and `agents/`; no `*.research.md` or `docs/research/` was present). Saved here at
`docs/research/mdc-onramp.md` as the sensible default per the `research` skill's "say where" rule.

**Versions (confirmed from `node_modules`, not assumed):**
- `@nuxt/content` **3.15.0** (`node_modules/@nuxt/content/package.json`)
- `nuxt` (project pins `^4.0.0`) — Nuxt 4 semantics
- MDC engine: `@nuxtjs/mdc` **0.22.1** and `remark-mdc` **3.11.1**
  (`node_modules/@nuxt/content/package.json` deps → `node_modules/.pnpm/remark-mdc@3.11.1`,
  `node_modules/.pnpm/@nuxtjs+mdc@0.22.1_*`). This is **MDC/remark-mdc v3**, not v2.

All syntax quotes below are verbatim from the installed `remark-mdc` README
(`node_modules/.pnpm/remark-mdc@3.11.1/node_modules/remark-mdc/README.md`) — i.e. the exact
source shipping in this repo, which is the authoritative primary source for the version we run.
(The hosted mirror at `https://remark-mdc.nuxt.space/` and `https://content.nuxt.com/docs`
both returned HTTP 403 to the fetcher; the vendored README is the same content and version-pinned.)

---

## 1. Block component syntax + passing props (incl. arrays of objects)

**Block component** — the `::` identifier:

```md
::card
The content of the card
::
```

**Inline props** via a `{}` scope directly after the tag (`README.md` "`{}` Inline Props"):

```md
::block-component{no-border title="My Component"}
::
```

**YAML props block** — the `---` form inside the fenced component (`README.md` "`---` Yaml Props"):

> "The YAML method uses the `---` identifier to declare one prop per line, which can be useful for readability."

```md
::icon-card
---
icon: IconNuxt
description: Harness the full power of Nuxt and the Nuxt ecosystem.
title: Nuxt Architecture.
---
::
```

**Arrays of objects — YES, two ways:**

- **Native in the YAML block.** The `---` block is parsed as *full YAML*, not a flat
  key=value list. Verified in the parser source
  (`node_modules/.pnpm/remark-mdc@3.11.1/node_modules/remark-mdc/dist/index.mjs`): it
  `import { parseDocument … } from 'yaml'` (line 3) and parses the block via
  `parseFrontMatter(toFrontMatter(yaml), options)` (lines 2129–2130). So a nested array of
  objects is valid there without any escaping trick, e.g.:

  ```md
  ::onramp-cards
  ---
  cards:
    - to: /t/journal/current/architecture
      label: "How it's built & deployed"
      blurb: The tech foundation — Tenants, Spaces, and the deployment model.
    - to: /t/journal/current/how-it-works
      label: How humans + agents work
      blurb: The loop — from a prompt to a reviewed, gated PR.
  ---
  ::
  ```

- **Inline via JSON string with a `:`-prefixed key** (`README.md` "`{}` Inline Props"):

  > "If you want to pass arrays or objects as props to components, you can pass them as a
  > JSON string and prefix the prop key with a colon to automatically decode the JSON string.
  > Note that … you should use single quotes for the value string…"

  ```md
  ::dropdown{:items='["Nuxt", "Vue", "React"]'}
  String Array
  ::
  ::chart{:options='{"responsive": true, "scales": {"y": {"beginAtZero": true}}}'}
  Object
  ::
  ```

**Limits on structured props:** the inline `{}` form requires JSON as a single-quoted string
with the `:` prefix (double quotes reserved for the JSON) — awkward for anything as large as a
two-card list. The `---` YAML block has no such limit: arbitrary nested YAML, so an
**array of card objects is a first-class fit there**. Props ultimately arrive as component
props, so the receiving Vue component must `defineProps` a matching `cards: Array` (typed as
you like).

## 2. Component resolution — where the Vue file must live, and the `<ContentRenderer>` path

Confirmed from the **installed** runtime, not just docs:

- `@nuxt/content`'s module registers a **`components/content/`** directory *per Nuxt layer* as an
  auto-import dir: `node_modules/@nuxt/content/dist/module.mjs` lines 3162–3170 iterate every
  layer and, for each `resolver.resolve(layer.config.srcDir, "components/content")` that exists,
  hooks `components:dirs` with `{ path, pathPrefix: false, prefix: "" }`. So a `::foo` tag
  resolves to a component in **`<layer>/app/components/content/`** (Nuxt 4 srcDir = `app/`).
  Globally-registered components (`global: true` anywhere) also resolve.
- `ContentRenderer.vue` (`node_modules/@nuxt/content/dist/runtime/components/ContentRenderer.vue`)
  resolves body tags through `#content/components` — it imports
  `{ globalComponents, localComponents, localComponentLoaders }` and its `resolveVueComponent()`
  looks the tag up in those lists (global → `resolveComponent`, local → `defineAsyncComponent`
  via a loader). It then hands the resolved map to `MDCRenderer`.
- **Does it work through `<ContentRenderer :value="doc" />`?** Yes — that is *exactly* the code
  path above. This repo renders every page body that way
  (`index.vue` line 138: `<ContentRenderer :value="rootDoc" />`), so an MDC component placed in
  `layers/journal/app/components/content/` **would** resolve and render inside that call.
  Note: the journal layer today has **no** `components/content/` dir — its components live in
  `layers/journal/app/components/journal/` (a *prefixed* dir), so using MDC would mean creating
  the new `components/content/` dir + a new SFC.

## 3. Slots — default + named `#slot`, and whether slot content is rendered Markdown

`README.md` "Slots":

> "Block components can accept slots (like Vue slots) with different names. The content of these
> slots can be anything from a normal markdown paragraph to a nested block component."
> "The `default` slot renders the top-level content inside the block component."
> "Named slots use the `#` identifier to render the corresponding content."

```md
::hero
Default slot text

#description
This will be rendered inside the `description` slot.
::
```

**Slot content is itself rendered Markdown** (per the quote above — "a normal markdown paragraph
… or a nested block component"). So **yes, the card blurbs could be authored as slot Markdown**
rather than props — the blurb could contain emphasis, links, `code`, etc., and render richly.
Trade-off: an *array* of cards does not map cleanly onto slots — you'd need one named slot per
card (e.g. `#card-1`, `#card-2`) or nest a `::card` block per card and let each `::card`'s default
slot be its blurb. That is more verbose than a single `cards:` YAML array, and couples the count
to authored slot names. Slots shine when there is *one* rich blurb; props/YAML shine for a
*uniform list*.

## 4. Inline vs block, and nesting

- **Inline component** — single `:` (`README.md` "`:` Inline Components"): sits inside a paragraph
  (spans, icons, etc.):

  ```md
  A simple :inline-component
  A simple :inline-component[John Doe]
  ```

  (`[...]` is the inline component's default slot text.)

- **Block component** — `::` (own block, can hold slots). Cards are block-level, so `::`.

- **Nesting** — add colons per depth (`README.md` "`:::` Nesting"): indent nested components and
  give them *more* colons than their parent:

  ```md
  ::hero
    :::card
      A nested card

      ::::card
        A super nested card
      ::::
    :::
  ::
  ```

  So a `::onramp-cards` wrapper could nest one `:::card` per door if you preferred slots-per-card
  over a YAML array. **Indentation is significant** for the nested form.

## 5. Schema / Zod validation interaction — body MDC bypasses the collection schema

**Body MDC does NOT go through the collection's Zod schema.** This is confirmed by *this repo's own*
`scripts/validate-content.ts` (the only place these schemas are actually `safeParse`d), whose header
and `parseDocument()` document the behavior authoritatively:

- Its header comment: `nuxt build` "parses every content file into the SQLite content DB using each
  Collection's Zod schema **only to derive SQL column types** … it does not actually run the schema's
  `safeParse` against the parsed frontmatter anywhere in that path." (Matches
  `@nuxt/content/dist/module.mjs`, which imports `zodToJsonSchema` for SQL type derivation, not
  runtime content validation.)
- `parseDocument()` (its comment): "`.md` → **frontmatter only** (the body isn't part of the authored
  schema)". `readFrontmatter()` extracts only the leading `---…---` block and validates *that*.

Consequence for the on-ramp: if the cards are authored as **body MDC inside `index.md`**, they are
part of the parsed body AST, **not** frontmatter — so the `pages` collection schema
(`shared/…`/`content.config.ts`) needs **no new field**, and neither `validate:content` nor the build
inspects the card data. That is a double-edged result: **zero schema churn**, but also **zero
validation** — a typo'd `to:` or a missing `label:` is caught only at render time (if at all), never
by the gate. By contrast, an `onramp` array in **frontmatter** *would* be schema-validated (once you
add the field), giving real `.safeParse` coverage via `pnpm validate:content`.

## 6. Gotchas

- **Placement is tied to document flow (the decisive one for this case).** A page body renders as a
  single `<ContentRenderer :value="rootDoc" />` call. An MDC block placed in `index.md` renders
  **wherever it sits in the body**, i.e. *inside* `index.vue`'s `<section class="intro">`
  (line 137–139) — **not** between the intro and the digests where the current
  `<section class="onramp">` (lines 141–151) lives. MDC offers **no built-in "teleport this block up
  to the page layout" mechanism**; body components render in-flow. Ways around it, all with costs:
  - **Split the body** — `<ContentRenderer>` has only an `excerpt` boolean (renders content before a
    single `<!--more-->` split); it gives *one* cut point (intro vs rest), not a clean 3-way
    intro/on-ramp/digests split. Not a real fit.
  - **Pull the node out in the SFC** — you *could* read `rootDoc.body` (the minimark/AST) in
    `index.vue`, find the `onramp-cards` node, and render your existing `<section class="onramp">`
    from its props — but that means the SFC reaching into the body AST by tag name (fragile, couples
    the layout to body structure) and you'd have to *exclude* the node from the intro render. Strictly
    worse than reading a frontmatter field.
  So **body-MDC inherently places the cards in the intro**, contradicting the current
  intro → on-ramp → digests layout. This is the core reason MDC is an awkward fit *here*.
- **SSR/hydration:** MDC components render server-side and hydrate like normal Vue components; local
  content components are wired as `defineAsyncComponent` (ContentRenderer `resolveVueComponent`), so
  they're async-loaded chunks. No special caveat for a simple card component, but they are full Vue
  components (client JS), unlike the current static markup.
- **Styling / scoping:** the component is an ordinary SFC, so `<style scoped>` works normally. But the
  existing on-ramp styles live in `index.vue`'s `<style scoped>` (`.onramp*`, lines 317–354); moving
  the cards into a content component means **relocating that CSS into the new component** (scoped
  styles don't cross SFCs), or exposing the tokens. Extra churn, not a saving.
- **Prose overrides are a separate mechanism.** ContentRenderer maps native tags (`p`, `a`, `h1`…)
  to `prose-*` components when `mdc.components.prose` is on (see `proseComponentMap` in
  `ContentRenderer.vue`). Custom `::onramp-cards` is a *content component* (in `components/content/`),
  not a prose override — different bucket; no conflict, just noting the distinction.
- **Indentation sensitivity:** the `::`/`:::` nesting form is indentation-significant (§4). The flat
  single-`::` block with a `---` YAML array is the least error-prone authoring shape.
- **v3 vs v2 note:** in Content **v3** (this repo) bodies are stored as minimark/AST in SQLite and
  rendered via `<ContentRenderer :value="doc" />` resolving components through `#content/components`
  (verified above). The `components/content/` resolution dir and `::`/`---`/`#slot` MDC syntax are
  unchanged from v2; what changed is storage + the removal of v2 helpers like `<ContentDoc>`. Nothing
  in the on-ramp scenario depends on a v2-only affordance.

---

## Verdict: MDC is **not** a neat fit for *this specific* on-ramp case

MDC is technically fully capable here — a `::onramp-cards` block with a `cards:` YAML array of
`{to,label,blurb}` objects, resolved from a new `layers/journal/app/components/content/OnrampCards.vue`,
would render through the existing `<ContentRenderer :value="rootDoc" />`. But it's the wrong tool for
this job, for reasons that all trace to primary sources above:

1. **Placement breaks (§6).** Body MDC renders *inside* the intro section, not between intro and
   digests. There is no clean MDC affordance to hoist it to the page layout; the workarounds
   (excerpt split, AST-node extraction) are fragile and worse than the alternatives.
2. **It moves, but doesn't shrink, the machinery.** You trade a small hardcoded array + inline markup
   for: a new content component, a new `components/content/` dir, **relocated scoped CSS** (§6), and a
   YAML array in `index.md` — net *more* moving parts, and the layout logic (the `.filter()` that only
   shows a card when its target page exists, `index.vue` lines 57–61) can't easily live in body MDC.
3. **No schema safety (§5).** Body MDC bypasses Zod entirely — the card data gets *zero* gate
   validation.

**Compared with the two content-homing alternatives:**

- **(A) Frontmatter on the *target* pages** (each explainer page declares its own on-ramp
  `label`/`blurb`; `index.vue` reads them from the already-loaded `pages`): schema-validated (add
  fields to the `pages` schema → covered by `pnpm validate:content`), keeps placement fully in the
  SFC, and single-homes each door's copy *next to the page it describes* — which also naturally
  subsumes the existing "only show if the page exists" rule (`index.vue` 57–61). Best fit with this
  repo's manifest/frontmatter-as-intent grain (ADR-0002/0013) and its single-home rule (CLAUDE.md).
- **(B) An `onramp` array in `index.md` frontmatter** (`index.vue` reads `page.value.onramp`):
  simplest change, schema-validated once the field is added, and placement stays in the SFC exactly
  where it is now. Loses (A)'s co-location with the target pages, and centralizes the list in one
  document.

Both (A) and (B) keep the cards where they render today and get real schema validation; MDC gives up
both. **Recommendation: prefer (A), fall back to (B); do not use body MDC for the on-ramp.** MDC would
be the neat choice for *rich, in-flow editorial* content authored by writers inside a page body — not
for structural navigation cards the page layout positions and gates.
