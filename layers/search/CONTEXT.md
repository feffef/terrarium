# Context — Search Tenant

> The Search context: its reason-to-exist and the platform-wide terms it turns
> on. Search coins no vocabulary of its own — the concepts it depends on
> (**Aggregator**, **Catalog**, **Collection kind**) are Platform terms and live
> in the root `CONTEXT.md`; see `CONTEXT-MAP.md`.

The Search Tenant is the Platform's first **Aggregator** — a platform view that
reads *across* Tenants — not a demo/content Tenant. Where the Journal, Blog,
Atlas, Midden, and Marquee each author and own their own isolated content, Search
owns almost none: one landing page whose interesting value is a live-filtered
index of every *other* Tenant's opted-in pages.

## Why it exists

To answer, honestly, what the "dollhouse" fork (#631) reached for and the
cross-Tenant read model (ADR-0025, issue #642) set out to make possible: *one
place to look across every Tenant at once.* The dollhouse bypassed the model — a
static microsite, a hardcoded Tenant roster, faked data. Search is the sanctioned
version, and its job is to **validate the architecture end to end**:

- It reads the **Catalog** (`#catalog`) through the sanctioned
  `queryAcrossTenants('page')` composable — never a manifest import, never a
  hardcoded Tenant list. A Tenant added or a page written tomorrow appears with no
  edit here.
- Every result links back to its **real** route (`/t/<tenant>/<space>/…`, ADR-0006)
  — the Catalog composing with the routing map, not inventing URLs.
- The corpus is build-time, committed content (ADR-0001); filtering is
  client-side over that baked index, with no runtime or external fetch.

## The isolation default, made concrete

Search's *own* `pages` collection carries **no `kind`**, so it is absent from the
Catalog and Search never indexes itself. That absence is the whole isolation
stance in miniature: a Collection is invisible to every Aggregator unless it
explicitly opts in. An e2e test asserts no result ever links back into
`/t/search/*`.

## What lives where

- **This file** — why the Search Tenant exists.
- **Root `CONTEXT.md`** — Aggregator, Catalog, Collection kind, and the Tenants
  roster that points here.
- **`docs/adr/0025-*.md`** — the read-model decision Search consumes.
- **`app/composables/catalog.ts`** — `queryAcrossTenants`, the sanctioned read
  (Platform-level, not owned by this layer).
- **`layers/search/app/pages/t/search/[space]/index.vue`** — the search interface.
