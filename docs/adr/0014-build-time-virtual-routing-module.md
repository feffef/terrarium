# 14. Build-time virtual routing module supersedes committed routing map

Date: 2026-07-05
Status: Accepted — supersedes both halves of ADR-0007; amends ADR-0013

> **Supersedes ADR-0007** (both halves — the committed `content.config.ts` half was
> already superseded by ADR-0013; this supersedes the retained committed
> `shared/routing.generated.ts` half). **Amends ADR-0013** (which retained the
> committed routing map; that retained decision is now superseded here).

## Context

ADR-0013 made `content.config.ts` a dynamic module that builds the keyed collections
at config-evaluation time — eliminating the "manifest edited, regeneration not
committed" failure mode for collections. It deliberately kept the conservative half:
`scripts/generate.ts`, `pnpm gen`, `pnpm gate:drift`, and the committed
`shared/routing.generated.ts` still existed solely to produce the runtime routing map.

The stated reason for keeping the committed file: the client needs the routing map at
runtime, and deriving it in the browser would drag every manifest (and zod) into the
client bundle. That reasoning forces the map to be **computed at build time and shipped
as plain data** — it does *not* force it to be a *committed, drift-checked* file.

Nuxt's `addTemplate` API writes arbitrary content into `.nuxt/` at `prepare`/`build`
time and registers it as an alias. This gives us a **build-time virtual module**: the
routing map and entry-route list are derived from `expand(loadManifests())` once per
build, written to `.nuxt/routing.ts`, and made importable as `#routing` — a plain
static import, no Nuxt composable required — so the isolation-critical
`resolveSpaceRoute` function and its L3 unit tests are unchanged.

## Decision

**Replace `shared/routing.generated.ts` + `scripts/generate.ts` with a small inline
Nuxt module (`modules/routing.ts`) that computes and registers `#routing`.**

- `modules/routing.ts` runs `expand(loadManifests())` at module setup time (same
  as `content.config.ts`), builds `routingMap` and `entryRoutes` from the result, and
  calls `addTemplate` + `nuxt.options.alias['#routing']` to expose them as the
  `#routing` virtual module (written to `.nuxt/routing.ts`).
- `shared/routing.ts` changes one import: `'./routing.generated'` → `'#routing'`.
  The resolver logic and signature are **unchanged**.
- The L3 unit tests (`tests/unit/routing.spec.ts`) add a vitest alias
  `'#routing' → '.nuxt/routing.ts'` in `vitest.config.ts` so the "default map" test
  continues to resolve without fixture injection (requires `nuxt prepare` first,
  already guaranteed by `pnpm install`'s `postinstall` hook).
- `scripts/generate.ts`, `pnpm gen`, `pnpm gate:drift`, `shared/routing.generated.ts`,
  and the ESLint ignore for it are **deleted**. No committed `GENERATED` file remains.
- `package.json` scripts lose the `pnpm gen &&` prefix everywhere; `postinstall`
  is now simply `nuxt prepare`.
- The e2e smoke test (`tests/e2e/smoke.spec.ts`) derives its `entryRoutes` list
  directly from `expand(loadManifests())` instead of importing from the deleted file.

## Consequences

- A manifest edit is picked up by `dev`/`build`/`prepare`/`typecheck` with **no
  regenerate step for anything** — the last remaining "manifest edited, regeneration
  not committed" failure mode is eliminated (prevention over detection).
- Deleted: `scripts/generate.ts`, `pnpm gen`, `pnpm gate:drift`,
  `shared/routing.generated.ts`, its ESLint ignore, and the CLAUDE.md/docs passages
  explaining regeneration. One mechanism remains: manifests → `expand()` → both
  collections *and* routing, all at build time.
- **Trade-off accepted — loss of committed routing-map diff**: ADR-0007/0013 valued
  the one-line-per-`(tenant, space, collection)` PR diff as a reviewable "which tables
  did this manifest change" signal. The routing map now lives uncommitted in `.nuxt/`,
  absent from PR diffs. Mitigated by the manifest diff itself (the intent) being
  reviewable, and `pnpm gen --print` being replicated by running
  `node --import tsx/esm -e "import {expand,loadManifests} from './shared/expand.ts'; console.log(JSON.stringify(expand(loadManifests()),null,2))"`.
- **More coupling to Nuxt build internals** (`addTemplate` + module setup hook) instead
  of a dumb committed file — small and idiomatic, but Nuxt-API surface.
- **Still human-only (ADR-0004):** `modules/routing.ts`, `content.config.ts`,
  `shared/expand.ts`, and the resolver `shared/routing.ts` are the
  isolation-critical surfaces. `expand()`'s determinism and L3 tests are unchanged.
