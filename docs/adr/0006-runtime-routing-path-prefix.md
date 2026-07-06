# 6. Runtime routing selects Tenant + Space by path prefix

Date: 2026-07-04
Status: Accepted — routing-map delivery amended by ADR-0014

> **Amended by [ADR-0014](0014-build-time-virtual-routing-module.md) (2026-07-05).**
> The path-prefix decision and the isolation model below stand unchanged, but the
> routing map's delivery has moved since this was written: it is no longer a
> committed `shared/routing.generated.ts` produced by a generator — the map and the
> `entryRoutes` list are derived from the manifests at build time by
> `modules/routing.ts` and imported as the `#routing` virtual module. Read the
> mechanism references below as historical.

## Context

ADR-0001 bakes every Tenant × Space into one container and selects which one to
serve by **runtime routing** — "subdomain / path prefix / header" — among content
already baked at build time. The initial implementation has to pick one concrete
mechanism. It must be trivial to develop against, crawlable by the L2 smoke gate
(ADR-0004), and require no DNS/host configuration to run locally or in CI.

## Decision

For now, route by **path prefix**: `/t/<tenant>/<space>/<slug>`.

- A single catch-all page (`app/pages/t/[tenant]/[space]/[...slug].vue`) reads
  `tenant` and `space`, looks up the generated **routing map**
  (`shared/routing.generated.ts`, produced by the generator alongside
  `content.config.ts`), and resolves them to the keyed collection
  `<tenant>_<space>_pages`. It then `queryCollection(key).path(slug)` and renders
  with `<ContentRenderer>`.
- The `path` inside a Space is Space-relative (collections are generated with
  `prefix: '/'`), so `current` and `archived` can both have `/about` without
  collision — they are different SQLite tables. Isolation is therefore a direct
  consequence of resolving to the correct key; a query can only ever see one
  Space's table.
- An unknown Tenant/Space yields a 404. The generated `entryRoutes` list drives
  the L2 smoke gate so new Spaces are covered automatically.

## Consequences

- Simplest thing that works: no wildcard DNS, no host parsing; local dev, `curl`,
  and the Playwright/`$fetch` smoke test all work against `localhost` URLs.
- Subdomain routing (`tenant.space.example.com`) and header-based routing remain
  open options. They can be layered on **without changing the isolation model**,
  because resolution funnels through the one routing map → collection key
  indirection. Only the "extract (tenant, space) from the request" step changes.
- The routing resolver is **isolation-critical** and therefore human-only under
  the ADR-0004 blast-radius policy.
- Path-prefix URLs are less production-pretty than subdomains; revisit if/when a
  Tenant needs its own apex domain.
