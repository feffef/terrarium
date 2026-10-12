# Tests

How the test suite is laid out, and the one non-obvious rule about e2e. The
*why* is ADR-0004 (see its 2026-10-12 amendment); this file is the operational
"where do I put a test" reference.

## A test is homed with the code it exercises

- **Platform tests** — exercise `shared/`, `scripts/`, `modules/`, routing, the
  isolation invariant, or the cross-Tenant smoke — live here under `tests/`:
  - `tests/unit/` — L0/L3 fast tests. (L1 — content validation — is `pnpm
    validate:content`, a separate script; `validate-content.spec.ts` here only
    unit-tests the validator against synthetic fixtures, not real content.)
  - `tests/e2e/` — the L2 smoke render (see below).
  - `tests/support/` — shared test helpers (not specs; never collected alone).
- **Tenant-specific tests** — exercise a single Tenant's layer
  (`layers/<tenant>/app/**`, its content, its dashboard module) — live *in that
  layer* under `layers/<tenant>/tests/`:
  - `layers/<tenant>/tests/unit/*.spec.ts`
  - `layers/<tenant>/tests/e2e/<tenant>.spec.ts` — that Tenant's e2e spec (see below).

This keeps "which tests belong to which Tenant vs. which are global" obvious,
and lets the suite grow additively: adding a Tenant that needs tests adds a
`layers/<tenant>/tests/` folder — nothing here changes.

## The e2e gate is ONE build, reused by every spec

The build is the gate's `pnpm build`. The `e2e` vitest project's `globalSetup`
(`tests/support/e2e-global-setup.ts`) reuses its `.output` and builds only when
that is stale: `.output/server/index.mjs` must be at least as new as every
tracked and untracked-not-ignored file and its directories (a deletion moves
only the directory's mtime). The decision is `tests/support/fresh-output.ts`;
`E2E_FRESH_BUILD=1` forces a build.

Every e2e spec calls `await setupL2()` (`tests/support/e2e.ts`) inside its
top-level `describe`, which spawns a server on `.output` plus a browser. An e2e
spec never passes `build: true`. Specs run in parallel: one or more per Tenant plus
the Platform specs (`tests/e2e/`).

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

`expect.poll` defaults to a **1000ms timeout / 50ms interval** — not set in
`vitest.config.ts`, so the numbers aren't visible from this repo's own config.
A poll racing a longer app-side settle animation (e.g. a rAF-driven
transition) needs its timeout raised per-call —
`expect.poll(..., { timeout: 5000 })` — not just re-run as flaky.

## Running

- `pnpm test` — unit (L0/L3), platform **and** tenant, fast. Filters by the
  `tests/unit` path substring, which matches both `tests/unit/**` and
  `layers/*/tests/unit/**`.
- `pnpm test:e2e` — the L2 specs, in parallel, on the gate's build.

Both are part of the safety gate (ADR-0004); the steps live in `package.json`'s
`gate` script.
