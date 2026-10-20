# Tests

Where each test lives, and the non-obvious e2e rules. Every spec reuses one build, because a spec that builds its own copy multiplies the gate's slowest step. Each spec's server gets its own SQLite file, because servers sharing one raced and failed.

## A test is homed with the code it exercises

- **Platform tests** — exercise `shared/`, `scripts/`, `modules/`, routing, the
  isolation invariant, or the cross-Tenant smoke — live here under `tests/`:
  - `tests/unit/` — L0/L3 fast tests. (L1, content validation, is the separate `pnpm validate:content`;
`validate-content-schema.spec.ts` only unit-tests the validator on synthetic fixtures.)
  - `tests/e2e/` — the L2 smoke render (see below).
  - `tests/support/` — shared test helpers (not specs; never collected alone).
- **Tenant-specific tests** — exercise a single Tenant's layer
  (`layers/<tenant>/app/**`, its content, its dashboard module) — live *in that
  layer* under `layers/<tenant>/tests/`:
  - `layers/<tenant>/tests/unit/*.spec.ts`
  - `layers/<tenant>/tests/e2e/<tenant>.spec.ts` — that Tenant's e2e spec (see below).

Adding a Tenant that needs tests adds that folder; nothing here changes.

- **A Skill's helper script** — one only its Skill runs — lives at
  `.agents/skills/<name>/scripts/`, its unit test at
  `.agents/skills/<name>/tests/unit/` (the gate skips build and e2e for these, not unit tests: `scripts/gate/gate.ts` `isSkillFile`, #1603).

## The e2e gate is ONE build, reused by every spec

The build is the gate's `pnpm build`. The `e2e` vitest project's `globalSetup`
(`tests/support/e2e-global-setup.ts`) reuses its `.output` and builds only when
that is stale: `.output/server/index.mjs` must be at least as new as every
tracked and untracked-not-ignored file and its directories (a deletion moves
only the directory's mtime). The decision is `tests/support/fresh-output.ts`;
`E2E_FRESH_BUILD=1` forces a build.

Every e2e spec calls `await setupL2()` (`tests/support/e2e.ts`) inside its
top-level `describe`, which spawns a server on `.output` plus a browser. An e2e
spec never passes `build: true`. One or more specs per Tenant plus
the Platform spec (`tests/e2e/smoke.spec.ts`) run in parallel.

To add e2e coverage for a Tenant, add `layers/<tenant>/tests/e2e/<tenant>.spec.ts`
that calls `setupL2()`; nothing else needs wiring. Split a Tenant's slowest spec
into several (`tinkerfund-flows.spec.ts`) so its parts run in parallel.

## Playwright scroll/visibility gotchas

Single-homed in `docs/agents/verifying-ui-changes.md`'s "The sharp edges" section
("Visibility is not in-viewport" and "`locator.click()` scrolls the element
into view first") — read that doc, not a copy here.

## vitest `expect.poll` defaults

e2e assertions use vitest's `expect` (with `expect.poll(...).toBe(...)` for
async/polling conditions), not Playwright's own matcher set (`toBeVisible`,
`toHaveText`, etc.) — those won't type or run here.

In the `e2e` project `expect.poll` has a **10s timeout** (set in `vitest.config.ts`; vitest's own default is 1s, with a 50ms interval).
A poll racing a settle animation longer than that (e.g. a rAF-driven
transition) needs its timeout raised per-call —
`expect.poll(..., { timeout: 15_000 })` — not just re-run as flaky.

## Running

- `pnpm test` — unit (L0/L3), platform **and** tenant, fast. Filters by the
  `tests/unit` path substring, which matches `tests/unit/**`,
  `layers/*/tests/unit/**` and `.agents/skills/*/tests/unit/**`.
- `pnpm test:e2e` — the L2 specs, in parallel, on the gate's build.

Both are part of the safety gate (ADR-0004); the steps live in `package.json`'s
`gate` script.
