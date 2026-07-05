# 13. Dynamic content.config.ts; only the routing map stays committed

Date: 2026-07-05
Status: Accepted — the content.config.ts decision stands; the retained routing-map
decision is superseded by [ADR-0014](0014-build-time-virtual-routing-module.md)

> **Amends ADR-0007** (which committed *both* generated artifacts and drift-checked
> them). ADR-0007's decision to commit `content.config.ts` is **superseded** here;
> its decision to commit `shared/routing.generated.ts` was **retained** here but is
> now **further superseded by ADR-0014** (2026-07-05), which replaces the committed
> routing map with a build-time virtual module (`#routing`). No committed `GENERATED`
> file remains.

## Context

ADR-0002 makes each Tenant author a small declarative **manifest**; the mechanical
`tenant × space × collection` cross-product is expanded by code (`expand()`).
ADR-0007 then chose to **commit** the generator's two outputs — `content.config.ts`
(the keyed Nuxt Content collections) and `shared/routing.generated.ts` (the runtime
routing map) — banner-marked `GENERATED`, and detect staleness with
`pnpm gate:drift` (`pnpm gen && git diff --exit-code`).

But `content.config.ts` is not a data file: it is a TypeScript module Nuxt Content
*evaluates* (via jiti) at prepare/build time. Committing string-templated TS that a
loop could produce at evaluation time bought reviewability at the cost of a standing
apparatus to keep the committed copy honest: the `GENERATED` banner + "never
hand-edit" rules, a drift gate, two ESLint ignores, `pnpm gen &&` prefixed onto five
package scripts, and a recurring PR failure mode ("manifest edited, regeneration not
committed" — the drift gate only *detects* it). The routing map, by contrast, is a
genuine committed artifact: the **client** needs it at runtime, and deriving it in
the browser would drag every Tenant manifest (and zod) into the client bundle.

The kill-switch risk — can config-evaluation-time file IO (`readdirSync` + importing
manifests) run inside `content.config.ts` under Nuxt Content's jiti loader? — was
settled by a spike (issue #59, step 1): `nuxt prepare` and `nuxt build` both evaluate
a dynamic config cleanly, and the baked collection set (`.nuxt/content/manifest.ts`
and the 12 `_content_*` SQLite tables in `.output`) is byte-identical to the
committed-codegen output.

## Decision

**Make `content.config.ts` an ordinary, hand-editable module; keep the routing map
committed and drift-checked.**

- The pure expansion (`expand()` + the L3 key-uniqueness invariant) and manifest
  loading move verbatim into **`shared/expand.ts`**, the single source of truth
  shared by the config, the generator, and the L3 test. `ExpandedCollection` now
  also carries each Collection's `schema`, so consumers need not re-import manifests.
- **`content.config.ts`** imports `shared/expand`, enumerates `tenants/*`, runs
  `expand(loadManifests())`, and builds `defineContentConfig({ collections })` in a
  loop at evaluation time. It has no `GENERATED` banner and is linted like any module.
  Manifests are loaded **synchronously** via jiti (the same TS loader Nuxt Content
  already uses for the config), so `defineContentConfig` stays a synchronous call.
- **`scripts/generate.ts`** slims to emit only `shared/routing.generated.ts`, still
  committed and drift-checked. `pnpm gen` and `pnpm gate:drift` remain — now covering
  the routing map alone. A `pnpm gen --print` debug hatch dumps the expanded
  collections (the legible view that used to be the committed `content.config.ts`).

**Why the routing map stays committed (ADR-0007's reviewability argument, kept where
it still pays):** its one-line-per-`(tenant, space, collection)` diff *is* the
"which tables did this manifest change create/remove" signal ADR-0007 valued, at a
fraction of the noise of the full `defineCollection` blocks — and the client needs
it committed anyway. The fuller keyed explosion was the redundant half; ADR-0007
itself noted the committed config "can look redundant with the manifest."

## Consequences

- A manifest edit is picked up by `dev`/`build`/`prepare`/`typecheck` with **no
  regenerate step for collections** — the "manifest edited, regeneration not
  committed" failure mode is now *impossible* for collections (prevention over
  detection), not merely drift-detected.
- Deleted: `content.config.ts`'s committed banner file, its ESLint ignore, its half
  of the drift gate, and the CLAUDE.md/docs passages explaining the hand-edit hazard
  for it. The L3 tests keep testing `expand()` unchanged (import path only).
- Debugging is one step more indirect (no expanded file to read); mitigated by
  `pnpm gen --print`.
- New dependency surface at config-evaluation time: `content.config.ts` does file IO
  and imports manifests via jiti. Proven under the current Nuxt Content loader by the
  spike; if a future Nuxt/jiti change breaks synchronous manifest import, this
  decision must be revisited (fallback: the full Nuxt-module variant, or reverting to
  ADR-0007's committed config).
- **Still human-only (ADR-0004):** `content.config.ts`, `shared/expand.ts`,
  `scripts/generate.ts`, and the routing map are the generator/isolation surface the
  whole Platform guarantee rests on. This ADR changes the *delivery mechanism*, not
  the human-only ownership. `expand()`'s determinism and L3 tests are unchanged.
- `shared/routing.generated.ts` remains the one committed `GENERATED` file: banner,
  drift gate, and ESLint ignore all still apply to it.
