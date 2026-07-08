# 14. Build-time virtual routing module supersedes committed routing map

Date: 2026-07-05
Status: Accepted — supersedes both halves of ADR-0007; amends ADR-0013

> **Amended by [ADR-0018](0018-tenant-layers-under-layers-directory.md) (2026-07-07).**
> Tenant layers moved from `tenants/` to Nuxt's conventional `layers/` directory;
> `tenants/…` paths below reflect the pre-rename layout.

> **Amended by #211 (2026-07-08).** The companion `.nuxt/routing.d.ts` is now written
> with Kit's `addTypeTemplate` (not the plain `addTemplate` the Decision describes), so
> the `.d.ts` self-registers into Nuxt's generated type references for the app-side
> `vue-tsc` pass. Behaviour-neutral; the three alias wirings below are unchanged, and the
> `tsconfig.node.json` `paths['#routing']` entry (wiring #3) still stands on its own.

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
build, written to `.nuxt/routing.mjs`, and made importable as `#routing` — a plain
static import, no Nuxt composable required — so the isolation-critical
`resolveSpaceRoute` function and its L3 unit tests are unchanged.

## Decision

**Replace `shared/routing.generated.ts` + `scripts/generate.ts` with a small inline
Nuxt module (`modules/routing.ts`) that computes and registers `#routing`.**

- `modules/routing.ts` runs `expand(loadManifests())` at module setup time (same
  as `content.config.ts`), builds `routingMap` and `entryRoutes` from the result, and
  calls `addTemplate` + `nuxt.options.alias['#routing']` to expose them as the
  `#routing` virtual module. The template is written as **plain JavaScript**
  (`.nuxt/routing.mjs`) because Nitro's Rollup bundler cannot parse TypeScript syntax.
  A companion `.nuxt/routing.d.ts` carries the type declarations for `tsc`/`vue-tsc`.
- `shared/routing.ts` changes one import: `'./routing.generated'` → `'#routing'`.
  The resolver logic and signature are **unchanged**.
- Three alias wirings connect `#routing` to the generated file:
  1. `nuxt.options.alias['#routing']` (Nuxt/Vite, set by the module) → `.nuxt/routing.mjs`
  2. `vitest.config.ts` `resolve.alias['#routing']` → `.nuxt/routing.mjs` (vitest
     runs outside the Nuxt alias layer; uses `fileURLToPath(new URL(..., import.meta.url))`
     for cwd-independent resolution; requires `nuxt prepare` first, guaranteed by
     `pnpm install`'s `postinstall` hook and prefixed on `pnpm test`)
  3. `tsconfig.node.json` `paths['#routing']` → `.nuxt/routing.d.ts` (for the
     `tsc -p tsconfig.node.json` second pass in `pnpm typecheck`)
- `scripts/generate.ts`, `pnpm gen`, `pnpm gate:drift`, `shared/routing.generated.ts`,
  and the ESLint ignore for it are **deleted**. No committed `GENERATED` file remains.
- `package.json` scripts lose the `pnpm gen &&` prefix everywhere; `postinstall`
  is now simply `nuxt prepare`; `pnpm test` is prefixed with `nuxt prepare &&` to
  ensure the unit tests never resolve a stale `.nuxt/routing.mjs`.
- The e2e smoke test (`tests/e2e/smoke.spec.ts`) derives its `entryRoutes` list via
  `entryRoutesFrom(expand(loadManifests()))` — a helper single-homed in
  `shared/expand.ts` and shared with `modules/routing.ts` to prevent divergence.

## Consequences

- A manifest edit is picked up by `dev`/`build`/`prepare`/`typecheck` with **no
  regenerate step for anything** — the last remaining "manifest edited, regeneration
  not committed" failure mode is eliminated (prevention over detection).
  **Caveat:** `nuxt dev` does not watch `tenants/*/tenant.config.ts`; a mid-session
  manifest edit requires a dev-server restart to pick up the updated routing map.
- **The CI workflow still carries a now-dead `L0 · drift` step** (`pnpm gate:drift`
  in `.github/workflows/gate.yml`). CI is human-only (ADR-0004), so this change
  cannot remove it; a human must delete that step **in lockstep with merging this
  change**, or the gate fails on every run with `Missing script: gate:drift`.
  *(Resolved by #97: the `L0 · drift` step and its `gate:drift` compat shim were
  removed once the branch had merged.)*
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
