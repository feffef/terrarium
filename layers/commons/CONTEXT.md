# Context — Commons Tenant

> The Commons context: its reason-to-exist and the platform-wide terms it turns
> on. Commons coins no vocabulary of its own — the concepts it depends on
> (**Aggregator**, **Catalog**, **Collection kind**) are Platform terms and live
> in the root `CONTEXT.md`; see `CONTEXT-MAP.md`.

The Commons is the Platform's shared, cross-Tenant space — the home for
**Aggregator** views that read *across* every Tenant (ADR-0025, issue #642). It is
not a demo/content Tenant: where the Journal, Blog, Atlas, Midden, and Marquee
each author and own their own isolated content, the Commons owns almost none. Each
of its Spaces is one cross-Tenant view over the other Tenants' opted-in content.

The name is on-metaphor (a building's *commons*) and deliberately outlives its
current two views. A future cross-Tenant view — an activity feed, a tag index, a
directory — is another **Space** in the Commons, not another Tenant.

## The Spaces (each a cross-Tenant view)

- **Search** (`/t/commons/search`) — one box over every page collection that
  opted into the **Catalog**, filtered client-side over the baked index. Each
  result links back to its real route.
- **Timeline** (`/t/commons/timeline`) — a reverse-chronological feed of every
  timestamped piece of content across the Platform, one line each. Three sources:
  **posts** (dated blog/marquee pages), **digests** (the Journal's daily
  summaries), and **sessions** (session logs). Posts link to their real page;
  sessions and digests deep-link into the Journal dashboard.

## Why it exists

To answer, honestly, what the "dollhouse" fork (#631) reached for and the
cross-Tenant read model (ADR-0025) set out to make possible: *one place to look
across every Tenant at once.* The dollhouse bypassed the model — a static
microsite, a hardcoded roster, faked data. The Commons is the sanctioned version,
and it exists to **validate the architecture** on more than one shape of view:

- It reads the **Catalog** (`#catalog`) through the sanctioned
  `queryAcrossTenants`/`queryTimeline` composables — never a manifest import,
  never a hardcoded Tenant list. A Tenant added or a page published tomorrow
  appears with no edit here.
- Every entry links to its **real** route (`/t/<tenant>/<space>/…`, ADR-0006) —
  the Catalog composing with the routing map, not inventing URLs.
- The corpus and the feed are build-time, committed content (ADR-0001); nothing
  is fetched live or hardcoded.

## The isolation default, made concrete

The Commons's *own* `pages` collections carry **no `kind`**, so they are absent
from the Catalog and neither Search nor Timeline ever surfaces itself. That
absence is the whole isolation stance in miniature: a Collection is invisible to
every Aggregator unless it explicitly opts in. An e2e test asserts no result or
entry ever links back into `/t/commons/*`.

## What lives where

- **This file** — why the Commons exists and what its Spaces are.
- **Root `CONTEXT.md`** — Aggregator, Catalog, Collection kind, and the Tenants
  roster that points here.
- **`docs/adr/0025-*.md`** — the read-model decision the Commons consumes.
- **`app/composables/catalog.ts`** — `queryAcrossTenants` / `queryTimeline`, the
  sanctioned reads (Platform-level, not owned by this layer).
- **`layers/commons/app/components/commons/{Search,Timeline}.vue`** — the views.
