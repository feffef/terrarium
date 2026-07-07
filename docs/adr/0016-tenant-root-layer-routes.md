# 16. A Tenant may own a root landing route above its Spaces

Date: 2026-07-06
Status: Accepted

> **Amended by [ADR-0018](0018-tenant-layers-under-layers-directory.md) (2026-07-07).**
> Tenant layers moved from `tenants/` to Nuxt's conventional `layers/` directory;
> the `tenants/atlas/app/pages/t/atlas/index.vue` path in the Decision below is now
> `layers/atlas/app/pages/t/atlas/index.vue`.

## Context

ADR-0006 routes every request by the path prefix `/t/<tenant>/<space>/<slug>`:
the isolation-critical resolver (`shared/routing.ts`) takes a `(tenant, space)`
pair and maps it to exactly one Space's keyed `pages` collection. Every route
under `/t/` has, until now, been Space-scoped — there was no reason for a page
that belongs to a Tenant as a whole rather than to one of its Spaces.

The Atlas Tenant (PRD #64) needs one: a **front door** at `/t/atlas` — a cover,
foreword, and directory of the three Biomes (#65). It is not a Space, has no
Space content of its own, and exists to send the visitor *into* a Space. Forcing
it to be a Space (an `atlas/index` Biome with no specimens) would be a lie in the
domain model — a Biome is a place with a population — and would pollute the
Biome set the food web, field log, and Space toggle enumerate.

## Decision

A Tenant's **layer** may register a static page at its own root, `/t/<tenant>`,
above its Spaces. The Atlas does so with `tenants/atlas/app/pages/t/atlas/index.vue`.

- The route is an ordinary Nuxt layer page at a fixed path. It is **not** produced
  by the manifest, **not** in the routing map, and **not** in the `entryRoutes`
  smoke list — those remain Space-scoped (ADR-0006/0014).
- It never resolves a `(tenant, space)` request itself. Where it needs Space data
  (the Atlas front door counts specimens per Biome for its directory), it calls
  the **same** shared `resolveSpaceRoute` once per Space — read-only, no new
  isolation surface. It therefore stays outside the ADR-0004 human-only routing
  core: it is presentation, like any other layer page.
- It does not collide with the catch-all: `/t/atlas` is a single segment after
  `/t/`, while `app/pages/t/[tenant]/[space]/[...slug].vue` needs at least two.

## Consequences

- A Tenant that wants a proper landing (a showpiece cover, a portal) can have one
  without inventing a sham Space. Spaces stay honest — every Space has real content.
- The precedent is deliberately narrow: a Tenant-root page is a **layer
  presentation** concern, not a routing-model change. The resolver, the routing
  map, and the isolation guarantee are all untouched — a Tenant with no layer
  still has no root page and falls through to the generic Space renderer.
- The smoke gate does not cover `/t/<tenant>` roots automatically (they aren't
  entry routes). A Tenant relying on one should assert it in its own way; the
  Atlas front door is exercised via the per-Biome routes it links to and by the
  build, which fails on a broken page.
- If Tenant-root routes ever proliferate, revisit whether they deserve a
  first-class place in the manifest rather than being a layer convention.
