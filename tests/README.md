# Tests

How the test suite is laid out, and the one non-obvious rule about e2e. The
*why* is ADR-0004 (see its 2026-07-07 amendment); this file is the operational
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
  - `layers/<tenant>/tests/e2e/*.e2e.ts` — an imported module, **not** a spec
    (see below).

This keeps "which tests belong to which Tenant vs. which are global" obvious,
and lets the suite grow additively: spawning a Tenant that needs tests adds a
`layers/<tenant>/tests/` folder — nothing here changes.

## The e2e gate is ONE build — do not split it

There is exactly **one** e2e spec: `tests/e2e/smoke.spec.ts`. It owns the sole
`setup()` and runs the cross-Tenant entry-route sweep. Each Tenant's e2e
assertions live in its layer as a `register…()` module (e.g.
`layers/journal/tests/e2e/journal.e2e.ts`) that the smoke spec **imports and
calls inside its single `describe`** — so they share the one build.

**Do not "clean this up" into per-Tenant e2e spec files** — see ADR-0004's
2026-07-07 amendment for why splitting them multiplies the gate's build cost.
To add e2e coverage for a new Tenant: write
`layers/<tenant>/tests/e2e/<tenant>.e2e.ts` exporting a `register…(ctx)`
function, then add one import + one call in `tests/e2e/smoke.spec.ts`.

## Playwright scroll/visibility gotchas

- `isVisible()`/the `visible` locator state is true for elements outside the
  current viewport — it only reflects CSS visibility, not scroll position. To
  assert an element is actually scrolled into view, compare
  `getBoundingClientRect()` against `window.innerHeight`/`innerWidth`, not
  `isVisible()`.
- `locator.click()` (and similar action methods) perform an implicit
  scroll-into-view before dispatching the event. If a test needs an exact
  "before" scroll-position measurement ahead of a click, call
  `scrollIntoViewIfNeeded()` (or otherwise settle scroll position) explicitly
  *before* taking that measurement — don't measure right before `.click()`,
  since its own auto-scroll can land between the measurement and the app's
  handler.

## Running

- `pnpm test` — unit (L0/L3), platform **and** tenant, fast. Filters by the
  `tests/unit` path substring, which matches both `tests/unit/**` and
  `layers/*/tests/unit/**`.
- `pnpm test:e2e` — the single L2 smoke build.

Both are part of the safety gate (ADR-0004); CI (`.github/workflows/gate.yml`)
runs the same set, cheapest-first.
