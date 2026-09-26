# Tinkerfund: serving app routes (cart, checkout, account, search) per Space

Grounding note for issue #1358, researched 2026-09-26 against the repo at
`origin/main` and Nuxt 4.5.2 (the installed version). The question: how can
the planned Tinkerfund Tenant serve pages that aren't content, such as cart,
checkout, confirmation, Backer account, search with query params, and a
category listing? They live under `/t/tinkerfund/<space>/…`, per Space, with no
change to the human-only routing/resolver modules (ADR-0004).

## Answer

**Use static Nuxt pages in the Tenant's own layer, next to its
`[...slug].vue`.** Examples: `layers/tinkerfund/app/pages/t/tinkerfund/[space]/cart.vue`,
`checkout.vue`, `account.vue`, `search.vue`, and `category/[category].vue`.
Each page calls `useSpace('tinkerfund')` for the Space's keyed collections, or
a 404. The journal Tenant already does this, and it is tested in every Space.
**No human-only file needs to change.**

## What the sources establish

- **Only `pages` is route-addressable, and only through the catch-all.** The
  resolver maps `(tenant, space)` to a single Space's `pages` key and lists the
  rest as `collections` (`shared/routing.ts` `resolveSpaceRoute`; ADR-0006).
  So an app route can't be a new addressable Collection without resolver
  changes. It has to be a layer page.
- **Layer pages at fixed paths sit outside the routing model.** ADR-0016 allows
  a static layer page at `/t/<tenant>` that is "not produced by the manifest,
  not in the routing map, and not in the `entryRoutes` smoke list". It calls it
  "a layer presentation concern, not a routing-model change". Its wording only
  covers the Tenant root, but the same reasoning is already used one level
  down (next bullet).
- **Precedent: journal's per-Space static pages.**
  `layers/journal/app/pages/t/journal/[space]/ideas.vue` and `skills.vue` sit
  next to `[...slug].vue`. Their comment reads: "A static segment, so it
  outranks the sibling `[...slug].vue`." Each calls `useSpace('journal')` and
  reads `collections.sessions` / `collections.skills`.
  `layers/journal/tests/e2e/journal.e2e.ts:205-225` asserts both pages render
  in **both** Spaces (`current`, `archived`), never fall through to
  "No document at", and hydrate cleanly. No ADR records this pattern; it is
  only a layer convention.
- **Why the static page wins.** Nuxt docs (`docs/2.directory-structure/1.app/1.pages.md`
  @ v4.5.2): named routes "take priority over nested dynamic routes", and
  `[...slug].vue` "will match *all* routes under that path". Vue Router's `*`
  repeatable param matches zero or more segments
  (`vuejs/router` `packages/docs/guide/essentials/route-matching-syntax.md`).
  The journal e2e test above is the working proof in this repo.
- **Per-Space scoping and 404s come free from `useSpace`.**
  `app/composables/space.ts` reads `route.params.space`, runs it through the
  same `resolveSpaceRoute`, and throws a 404 for an unknown Space. So
  `/t/tinkerfund/nope/cart` 404s, while `prod`/`qa` each get only their own
  collection keys. Only Tenant-layer files are involved.
- **Query params already have precedents.** `layers/blog/app/pages/t/blog/index.vue`
  reads `route.query.tag`, and the atlas `[space]` pages read `route.query.day`.
  A search page reads `route.query.q` and filters the Space's own product
  collection. It must **not** use `queryAcrossTenants` (ADR-0025): that is the
  cross-Tenant primitive, which Commons Search uses.
- **The app is SSR, not static-generated.** `pnpm build` = `nuxt build`, and
  `deploy/Dockerfile` serves "the Nitro node server". So the server sees query
  params, and dynamic segments like `category/[category]` need no prerender
  list.
- **`sessionStorage` is per origin and per tab, not per Space.** MDN
  (`mdn/content` `files/en-us/web/api/window/sessionstorage/index.md`):
  "partitioned by both origin and browser tabs", and closing the tab clears it.
  Every Tenant and Space shares one origin, so storage keys must include the
  Space (for example `tinkerfund:${space}:cart`), or `prod` and `qa` carts will
  mix. The server cannot see `sessionStorage`, so render storage-backed state
  after mount (`<ClientOnly>` or `onMounted`) to avoid hydration mismatches.
  The page can still render its layout on the server.

## Options

| # | Option | Per Space | Human-only change | Trade-offs |
|---|---|---|---|---|
| **A** | **Static sibling pages** in `layers/tinkerfund/app/pages/t/tinkerfund/[space]/` (`cart.vue`, `checkout.vue`, `checkout/confirmation.vue` or `confirmation.vue`, `account.vue`, `search.vue`, `category/[category].vue`) | Yes, via `useSpace` | None | Explicit, one file per route, per-route code splitting. Proven by the journal pages. A static name shadows any `pages` Document with the same path in that Space (a `/cart.md` could never be reached). Routes aren't in `entryRoutes`, so the Tenant's own e2e module must cover them, as journal's does. `category/[category].vue` must 404 an unknown slug itself (`createError`) after checking the Space's data. |
| B | **One layer `[...slug].vue` that branches internally**: if the path is `/cart`, `/checkout`…, render that view; otherwise query `pages` | Yes | None | Atlas, blog, marquee, and midden each already override `[...slug].vue`. But this builds a small router by hand inside one SFC: one big bundle, no per-route `definePageMeta`, and app logic mixed into the content renderer. Worse than A in every way that matters. |
| C | **MDC Documents that host app components**: `pages/cart.md` whose body is `::tinkerfund-cart`, served by the layer's `[...slug].vue` or even the Platform catch-all | Yes (a Document per Space) | None | Needs no page file per route, but each app route becomes a sham content Document that every Space must duplicate. `components/content/` resolves Platform-wide (`docs/agents/tenant-layers.md` §4), and body MDC props bypass Zod validation (`docs/agents/mdc-when-to-use.md`). This misuses a tool meant for in-prose composition. |
| D | **Query-param views on existing pages**, e.g. `/t/tinkerfund/prod?view=cart` | Yes | None | Fine for filters: search `?q=`, category `?sort=` (the blog `?tag=` precedent). Poor for flow steps: no distinct URL per step, and it is awkward to link or test. Use it inside A, not instead of A. |
| E | **Tenant-root routes (ADR-0016)**, e.g. `/t/tinkerfund/cart` | **No** | None | Fails the per-Space requirement. The Space would have to travel in the query or in storage. ADR-0016 also frames the root as a landing page and warns: revisit "if Tenant-root routes ever proliferate". Rejected. |
| F | **Programmatic routes** (`pages:extend` / `extendPages` in the layer's `nuxt.config.ts` or a module) | Yes | None if kept in the layer | Works, but it is less discoverable than A's files (tenant-layers.md §5: "the pages tree is the real source of truth"). It would also add routing logic outside the routing family that reviewers must judge against ADR-0004's "isolation logic" catch-all. Not needed. |

## Recommendation

Use **A**, with **D** for filter state inside `search.vue` and the category
page. Concretely:

1. The manifest declares a data collection (e.g. `products`) alongside
   `pages`. That is ordinary manifest editing (ADR-0002), not a human-only
   file. Pages read it via `useSpace('tinkerfund').collections.products`.
2. Put `[space]/index.vue` (storefront) and `[space]/[...slug].vue` (project
   pages from `pages`) next to the app-route pages, following the journal
   layout.
3. Key all simulated state (cart, Backer, pledges) by Tenant and Space in
   `sessionStorage`, and render it client-side only.
4. Add a `layers/tinkerfund/tests/e2e` module that loops over both Spaces for
   each app route, as `journal.e2e.ts:205-225` does. The shared smoke list
   does not cover these routes (ADR-0016's Consequences).

**Human-only surfaces:** none of the eight pinned modules, nor
`shared/manifest.ts` or the root `nuxt.config.ts`, need to change. One open
point: ADR-0016 legalises only the Tenant *root* page. Per-Space static pages
(journal today, Tinkerfund next) follow its reasoning but have no ADR. If this
pattern is expected to spread, a human may want an amending note on ADR-0016.
That would be an ADR edit, which is human-only to merge.

## Source note

`nuxt.com`, `router.vuejs.org`, and `developer.mozilla.org` are blocked by the
egress proxy in this environment. The Nuxt, Vue Router, and MDN citations
above come from each project's own docs source on GitHub (`nuxt/nuxt@v4.5.2
docs/`, `vuejs/router` `packages/docs/`, `mdn/content`). Those are the sources
each site renders from.
