# 25. Cross-Tenant read model: collection kinds + a derived `#catalog` + aggregator views

Date: 2026-07-22
Status: Accepted

> Concept surfaced in issue #642, itself provoked by the Eyra "dollhouse" fork
> (#631). This ADR is the Decision half; #642 holds the fuller design narrative
> and the alternatives weighed.

## Context

Tenant collections are isolated, and that is a feature: each
`tenant_space_collection` key is its own SQLite table and **the unit of
isolation** (`shared/manifest.ts`). But the Platform had **no model for an
application with a legitimate interest in reading *across* Tenants** — a global
search, a platform-wide activity feed, a "recent everywhere" rail, or an honest
version of the dollhouse. The dollhouse fork, lacking any sanctioned seam, went
around the model entirely: a static `public/` microsite, a hardcoded Tenant
roster, and faked data. Wrong shape — but it exposed a real missing seam.

Two concrete blockers, both grounded in the code:

1. **Schemas are per-Tenant, per-collection, inlined in each manifest**
   (`shared/manifest.ts`, carried through by `expand()`). Collection *names* are
   free slugs — nothing says two Tenants' `pages` collections share a shape. An
   aggregator wanting "all pages" had to either **re-declare** each schema (drift)
   or **import a Tenant's manifest internals** (coupling).
2. **No cross-Tenant read primitive.** Nuxt Content queries one collection
   (table) at a time. The only cross-Tenant derivation that existed was `#routing`
   (ADR-0014), and it knows only `pages`, only for URL resolution.

Both flow from **one** source already — `expand(loadManifests())`. The design
must *extend that source*, never add a parallel one (the single-home rule).

By the rule of two, this is earned: `#routing` was the first cross-Tenant
derivation; this catalog is the second — so "collection kind" and "aggregator"
deserve names (CONTEXT.md) and an ADR rather than another one-off. By the 3-part
test it is ADR-worthy: **hard to reverse** (introduces cross-Tenant coupling),
**surprising without context** (dents the "Tenants are isolated" model), **a real
trade-off** (aggregation power vs isolation purity).

## Decision

Three moves, all derived from the existing `expand()` source.

### 1. Collection *kinds* — a shared, opt-in read contract

A **kind** is a named, shared contract a manifest collection may assert
conformance to. Kinds live in one registry, `shared/kinds.ts` (`KINDS`), the
single home for every shared cross-Tenant shape. A collection references one via
`kind:` in its manifest def:

```ts
collections: {
  pages:   { type: 'page', kind: 'page' },       // catalog-visible, page contract
  secrets: { type: 'data', schema: z.object({…}) } // no kind → invisible, Tenant-private
}
```

- `kind` is **orthogonal to `type`**: `type` is the local build/route mechanism
  (page vs data); `kind` is the cross-Tenant read contract **and** the catalog
  opt-in.
- **Every kind carries a *minimum contract*** — a Zod object stating the shared
  floor an aggregator may rely on. A collection's **effective schema is the
  kind's contract merged with the collection's own local `schema`**
  (`shared/expand.ts`), uniformly for page and data collections, so opting in
  never costs a Tenant its private fields. How much a contract covers is a
  matter of degree, not two mechanisms: the `page` kind's contract adds only the
  optional cross-cutting metadata aggregators read (`publishedAt`, `summary` —
  optional because a `pages` collection is heterogeneous: index landings carry
  no publish date, only posts do; the win is that the field name + type is
  single-homed in the kind, not re-declared per Tenant), while the `session`
  kind's contract is a collection's entire shape
  (`shared/schemas/session.ts`). The shared `utcTimestamp` refinement both
  contracts use is likewise single-homed (`shared/schemas/timestamp.ts`).
- **A `data` collection needs at least one schema source** — an inline `schema`,
  a `kind` whose contract supplies one, or both. Enforced in `validateManifest`,
  so a mistake fails at the manifest-authoring surface (ADR-0002), not later
  inside `expand()`. `kind`/`type` mismatch and unknown-kind references fail
  there too.
- **Opt-in is the whole point.** A collection with no `kind` is invisible to any
  aggregator. **Isolation stays the default; cross-Tenant exposure is an explicit,
  per-collection declaration.**

### 2. A build-time `#catalog` projection (reuse the ADR-0014 pattern)

`modules/catalog.ts` — a sibling to `modules/routing.ts` — runs the same
`expand(loadManifests())`, tags each opted-in collection with its kind, and
exposes `#catalog`: `catalogByKind('page') → [{ key, tenant, space, collection,
kind }, …]`. **Derived, not hand-written** (`catalogFrom()` in `shared/expand.ts`,
L3-tested): a new Tenant with a `kind`-tagged collection appears automatically; a
removed one drops. Written to `.nuxt/catalog.mjs` as plain data + a companion
`.d.ts`, wired exactly as `#routing` is (nuxt alias, `vitest.config.ts`,
`tsconfig.node.json`).

### 3. `queryAcrossTenants(kind)` + a first-class **aggregator** role

`app/composables/catalog.ts` exposes `queryAcrossTenants(kind)` — the sanctioned
cross-Tenant read *primitive* (what `useSpace` is to `#routing`). It fans out over
`#catalog` — `Promise.all(catalogByKind(kind).map(e => queryCollection(e.key)))` —
merges, and tags every row with its provenance and its **canonical route** via a
single-homed `documentUrl()` (`shared/routing.ts`). Because every contributing
table carries the same merged kind contract, the union is uniformly typed — the
"without repeating the schemas" answer. The cross-collection generic is narrowed
at **one** documented assertion boundary (issue #642's flagged typing question),
mirroring `resolveSpaceRoute`'s single cast.

The platform composable stays the generic, isolation-critical *floor* only. An
aggregator's **normalization policy** — which kinds it consumes, what counts as
a post, how a digest is dated, which fragment a deep-link uses — lives in the
aggregator's own layer (the Commons Timeline's adapters:
`layers/commons/app/composables/timeline.ts`), where an agent can add or change
a source under normal gating. This keeps the ADR-0004 human-only surface small:
extending a *view* is a layer edit; only widening the *read primitive* touches
the human-only family.

The *consumer* — a search, a timeline, an activity feed, an honest dollhouse — is
a new role: an **aggregator** (platform view). It is still implemented as an
ordinary Tenant layer; its distinguishing feature is that it reads `#catalog`
(the sanctioned cross-Tenant read), not that it is a different runtime mechanism
(ADR-0001 intact). Normal Tenants never read across; a small, governed set of
aggregators may. One aggregator Tenant may host **several** cross-Tenant views,
one per Space.

### First consumer — the Commons Tenant (two views validate two shapes)

The **Commons Tenant** (`layers/commons/`) is the first aggregator, with two
Spaces that deliberately exercise *different* shapes of cross-Tenant read:

- **Search** (`/t/commons/search`) — one box over every opted-in `pages`
  collection (`queryAcrossTenants('page')`), filtered client-side over baked
  content, each result linking back to its real route.
- **Timeline** (`/t/commons/timeline`) — a reverse-chronological feed of every
  timestamped piece of content across the Platform (`queryTimeline()`, a Commons
  layer composable), one line each. This is the "beyond the dollhouse" case: a
  cross-Tenant view that *normalizes* across **kinds**. Three sources today, each
  reduced to `{ when, summary, url }` by a per-source adapter in the layer's
  `timeline.ts`: **posts** (`page`-kind rows with the contract's `publishedAt`),
  **digests** (*Journal* `page`-kind rows under `/digests/<date>` — the digest
  adapter is explicitly fenced to `tenant === 'journal'`, since `/digests/` is a
  Journal path convention (ADR-0010), so another Tenant's page at that path is
  treated as an ordinary page, never misclassified or mislinked), and
  **sessions** (`session`-kind rows — session logs). The aggregator owns the
  adapters for the kinds it consumes, so adding a source is a layer edit,
  never per-Tenant.

The Commons's *own* `pages` collections are deliberately **un-kinded**, so neither
view surfaces the Commons itself — the isolation default, made concrete and tested.
A future cross-Tenant view is another Space here, not another Tenant.

## Consequences

- **Read-only by construction.** The projection and the composable never write;
  write isolation (ADR-0020) is untouched. An aggregator is strictly a consumer.
- **Build-time + committed data only (ADR-0001).** The catalog and its reads
  derive from committed content at build; no runtime/external data — precisely
  where the dollhouse went wrong.
- **`kind` is a versioned contract — and the aggregators' real dependencies live
  in it.** Multiple Tenants and aggregators depend on a kind, so widening or
  removing one is a breaking-change surface, wanting the same discipline the
  session log's `schemaVersion` already shows. The minimum-contract semantics
  exist precisely so the fields a view actually reads (`publishedAt`, `summary`)
  are *in* the contract, not per-Tenant conventions read by cast — renaming a
  manifest field can no longer silently drop a Tenant out of the Timeline,
  because the field is not the manifest's to declare anymore.
- **Human-only to merge (ADR-0004).** `shared/kinds.ts`, `modules/catalog.ts`, and
  `app/composables/catalog.ts` join `content.config.ts` / `shared/expand.ts` /
  `modules/routing.ts` / `shared/routing.ts` in the isolation-critical family —
  editable, but a PR touching them never auto-merges. An aggregator's own
  normalization (e.g. `layers/commons/app/composables/timeline.ts`) is
  deliberately *outside* that family: it is an ordinary layer surface.
- **Opt-in keeps isolation the default.** Nothing is exposed that a manifest did
  not explicitly mark; a Tenant that never adds `kind:` is exactly as isolated as
  before this ADR.
- **Migration is additive.** Existing `pages` collections adopt `kind: 'page'`
  when they want to be searchable; the contract's fields merge into their inline
  page schema (which stops re-declaring them — `publishedAt` left the blog and
  marquee manifests, `summary` left the Journal's, all now sourced from the
  contract with unchanged names and types). No existing content changed. A future
  shared kind is one `KINDS` entry away, with no change to `expand()` or the
  catalog module (the *composable-level* generic is a recorded follow-up below).
- **Session logs are a first-class `data` kind (the schema-relocation path taken).**
  The Journal's `sessions` schema moved verbatim from its manifest to
  `shared/schemas/session.ts` and became the `session` kind's contract; the Journal
  references it by `kind`, and `scripts/log-session.ts` now sources the very same
  object (behaviour-neutral — every session-logging test stays green). Under
  minimum-contract semantics the relocation is a *choice*, not a forced move (a
  collection can keep a local schema alongside its kind) — but it remains the
  honest home here: a session log is Platform self-documentation (ADR-0009), not
  Tenant-private content, and now that the Timeline reads it across the Catalog it
  is a genuine cross-consumer contract. A future Tenant-owned shape that other
  Tenants merely also want does **not** have to move into `shared/` as the price
  of aggregation.
- **Non-page content deep-links instead of routing.** Sessions and daily digests
  have no standalone page route (they render on the Journal dashboard), so their
  Timeline entries link to `<space-landing>#<anchor>` using the Journal's own
  `session-`/`digest-` fragment scheme (defined by
  `layers/journal/app/utils/dashboard.ts`). The Timeline's copy of that format
  lives with its adapters in the Commons layer — the aggregator owns the
  coupling it chose, citing the Journal source. Posts keep their real page route.

### Deferred follow-ups (recorded, deliberately not built)

- **Type-level kind→item linkage.** `queryAcrossTenants(kind)`'s signature
  admits only `'page'`, and the session read is a private adapter in the
  Commons layer — "one `KINDS` entry away" is true of the module, not yet of a
  typed consumer surface. Deriving `KindItem<K>` from `KINDS` and making
  `queryAcrossTenants<K extends KindName>` a real generic would remove the
  documented casts; deferred until a second consumer needs it.
- **The sitemap/enumeration ambiguity.** `kind: 'page'` conflates
  "aggregatable/searchable" with "publicly enumerable" — a sitemap wants every
  routed page (`#routing`'s domain), including never-kinded ones like the
  Commons's own landings. Either bless a `#routing`-derived enumeration as a
  second, purpose-distinct sanctioned read, or split the exposure bit by
  purpose — a one-paragraph amendment, needed before anyone builds a sitemap.
- **Query payload.** `queryAcrossTenants` runs `.all()` with no `.select()`, so
  the Search corpus pulls full items (including `body` ASTs) before projecting
  five scalar fields. Fine at today's scale; add `.select(…)` — or a baked
  build-time index module (the ADR-0014 pattern again) — when the corpus grows.
- **Module consolidation.** `content.config.ts`, `modules/routing.ts`, and
  `modules/catalog.ts` each run `expand(loadManifests())` with separately
  maintained dev watch lists. Fold into one derived-data module the next time
  either is touched — before a fourth parallel derivation appears.
- **Tenant-identity metadata.** A directory/dollhouse view wants a display
  name, tagline, accent per Tenant; the manifest carries only the slug. A small
  optional manifest block surfaced through the catalog is the missing piece —
  to be added when such a view is actually built, not speculatively.
