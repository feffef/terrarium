# 18. Tenant layers live under Nuxt's conventional `layers/` directory

Date: 2026-07-07
Status: Accepted

## Context

A Tenant is implemented as a Nuxt layer (CONTEXT.md, ADR-0001). Nuxt 4
**auto-extends** anything under a top-level `layers/` directory. Until now the
Tenant layers lived under `tenants/` instead — a name chosen to echo the
ubiquitous language (Platform / Tenant / Space). Because that name is *not*
Nuxt's convention, the repo carried standing apparatus that the stock layout
would delete outright:

1. A hand-curated `extends: ['./tenants/journal', './tenants/blog',
   './tenants/atlas']` list in `nuxt.config.ts`. Every Tenant with its own
   fit-out had to be added by hand — which quietly contradicted ADR-0002's
   "spawn a Tenant = drop a folder + `pnpm install`" story: a Tenant with a
   layer also needed a root-config edit.
2. A `typescript.tsConfig.include` patch (issue #55 Option B, extended by #93)
   re-adding `tenants/*/app/**`, `tenants/*/nuxt.config.*`, and
   `tenants/*/tenant.config.*` to the typecheck program — globs Nuxt generates
   for `layers/*` automatically.
3. A typecheck-coverage canary (`tests/unit/typecheck-coverage.spec.ts`)
   guarding that patch against silent glob rot.

This revives **issue #55's Option A**, which #55 recommended long-term but
deferred in favour of Option B. It is recorded as its own decision because it
meets the 3-part ADR test: it is **hard to reverse** (a directory rename that
touches a human-only surface, `shared/expand.ts`), **surprising without
context** (why would the "Tenant" concept live under a directory named
`layers/`?), and **a real trade-off** — stock Nuxt convention versus a directory
name that mirrors the domain vocabulary.

## Decision

Move the Tenant layers from `tenants/` to Nuxt's conventional **`layers/`**
directory (`git mv tenants layers`; content moves with them to
`layers/<tenant>/content/…`).

- **The domain term "Tenant" is unchanged.** CONTEXT.md's glossary is
  untouched: "Tenant" stays the domain concept, "layer" the Nuxt primitive it
  maps to. Only the *directory name* — a path, not a concept — becomes `layers/`.
  Say "Tenant" in domain sentences; the folder is just where the layers live.
- **`nuxt.config.ts` loses its `extends` list.** Nuxt auto-extends every
  `layers/*`, verified empirically (all Tenant routes render via `pnpm build`
  + `pnpm test:e2e` with no `extends`).
- **The `tsConfig.include` patch shrinks to one glob:**
  `['../layers/*/tenant.config.*']`. Nuxt's generated tsconfig already includes
  `../layers/*/app/**/*` and `../layers/*/nuxt.config.*` (confirmed by
  inspecting `.nuxt/tsconfig.app.json`); the manifest `tenant.config.ts` is the
  one surface it does **not** know about (jiti-only at build time), so that
  single glob is retained to keep the #93 coverage.
- **The coverage canary narrows accordingly.** The retired `nuxt.config.ts`
  glob's canary is removed; the canary now guards only the surviving
  `tenant.config.*` glob and `content.config.ts` in `tsconfig.node.json`.
- `shared/expand.ts` (human-only, ADR-0004) reads from `layers/` and emits
  `cwdRel: layers/<tenant>/content/<space>/<collection>`.

## Consequences

- **Spawning a Tenant is now purely additive**, honouring ADR-0002: drop a
  `layers/<name>/` folder + `pnpm install`. No `nuxt.config.ts` edit, even for a
  Tenant with a full layer fit-out.
- **Typecheck coverage for layer fit-out and layer config is free forever** —
  Nuxt owns those globs now, so they cannot rot out from under us. Only the
  manifest glob remains our responsibility, still canary-guarded.
- **Runtime routing is unaffected.** Routes are `/t/<tenant>/<space>/<slug>`
  (ADR-0006), keyed by Tenant *name* (journal/blog/atlas), which did not change —
  only the source directory did. Immutable blog links, the routing map, and
  isolation keys are all untouched.
- **This ADR touched human-only surfaces** (`shared/expand.ts`, the root Nuxt
  config) and so landed as a high-care, human-reviewed PR, never auto-merged
  (ADR-0004).
- **Prior ADRs and historical records keep their `tenants/` paths.** ADRs are
  the historical record: affected ones (0002, 0003, 0009, 0010, 0013, 0014,
  0015, 0016) carry a one-line amending note pointing here rather than being
  rewritten. Session logs and blog posts — append-only records of what happened
  when the path *was* `tenants/` — are likewise left as-is; rewriting them would
  falsify history.
