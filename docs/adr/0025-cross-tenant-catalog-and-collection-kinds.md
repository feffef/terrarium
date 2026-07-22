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
- A **`page` kind carries no schema** — a routed page's cross-Tenant contract is
  the built-in page fields (`title`/`description`/`path`/`body`), so the kind is a
  pure catalog-exposure marker. A **`data` kind carries a shared Zod schema** that
  *becomes* the collection's schema (single-homed; the manifest inlines none).
  This mirrors `CollectionDef`'s existing page/data asymmetry.
- **Exactly one schema source for a `data` collection** — an inline `schema` XOR a
  `kind`. Enforced in `validateManifest`, so a mistake fails at the
  manifest-authoring surface (ADR-0002), not later inside `expand()`. `kind`/`type`
  mismatch and unknown-kind references fail there too.
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
cross-Tenant read (what `useSpace` is to `#routing`). It fans out over
`#catalog` — `Promise.all(catalogByKind(kind).map(e => queryCollection(e.key)))` —
merges, and tags every row with its provenance and its **canonical route** via a
single-homed `documentUrl()` (`shared/routing.ts`). Because every contributing
table references the same kind contract, the union is uniformly typed — the
"without repeating the schemas" answer. The cross-collection generic is narrowed
at **one** documented assertion boundary (issue #642's flagged typing question),
mirroring `resolveSpaceRoute`'s single cast.

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
  timestamped page across the Platform (`queryTimeline()`), one line each. This is
  the "beyond the dollhouse" case: a cross-Tenant view that *normalizes* — each
  timeline-eligible kind reduces to `{ when, summary, url }` in a per-kind adapter
  in the composable (the aggregator understands the kinds it consumes, so adding a
  kind is localized, never per-Tenant).

The Commons's *own* `pages` collections are deliberately **un-kinded**, so neither
view surfaces the Commons itself — the isolation default, made concrete and tested.
A future cross-Tenant view is another Space here, not another Tenant.

## Consequences

- **Read-only by construction.** The projection and the composable never write;
  write isolation (ADR-0020) is untouched. An aggregator is strictly a consumer.
- **Build-time + committed data only (ADR-0001).** The catalog and its reads
  derive from committed content at build; no runtime/external data — precisely
  where the dollhouse went wrong.
- **`kind` is a versioned contract.** Multiple Tenants and aggregators depend on
  it, so widening or removing one is a breaking-change surface, wanting the same
  discipline the session log's `schemaVersion` already shows. The first kind,
  `page`, rides the stable built-in page fields, so its v1 is trivial.
- **Human-only to merge (ADR-0004).** `shared/kinds.ts`, `modules/catalog.ts`, and
  `app/composables/catalog.ts` join `content.config.ts` / `shared/expand.ts` /
  `modules/routing.ts` / `shared/routing.ts` in the isolation-critical family —
  editable, but a PR touching them never auto-merges.
- **Opt-in keeps isolation the default.** Nothing is exposed that a manifest did
  not explicitly mark; a Tenant that never adds `kind:` is exactly as isolated as
  before this ADR.
- **Migration is additive.** Existing `pages` collections adopt `kind: 'page'`
  when they want to be searchable; the field sits alongside their inline page
  schema. No existing content or schema changed. A future shared `data` kind (e.g.
  a `session` shape adopted by more than one Tenant) is one `KINDS` entry away,
  with no change to `expand()` or the catalog module.
- **Deferred — session logs in the Timeline, and the projection-vs-schema
  question.** The Timeline draws today from the `page` kind only. Session logs are
  the obvious next source, but including them surfaced two decisions worth their
  own treatment rather than a rushed bundle: (1) a `data` kind currently *replaces*
  a collection's schema, so a rich, Tenant-owned collection (the Journal's
  `sessions`, ADR-0009 — also read directly by `scripts/log-session.ts`) can't yet
  expose a *narrow* shared projection without relocating its whole schema; and
  (2) session logs have no individual public route (they render on the Journal
  dashboard), so a non-page kind needs a public-URL story. A likely answer is a
  kind that is a *minimum contract* a collection's own schema satisfies (plus a
  per-kind timeline adapter, already stubbed), but that is left for a follow-up.
