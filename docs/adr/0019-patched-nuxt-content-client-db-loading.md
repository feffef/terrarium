# 19. A committed patch to `@nuxt/content`'s client-side DB loading

Date: 2026-07-08 (decision made); documented retroactively 2026-07-11

Status: Accepted — retroactive record. The patch has been live on `main` since
commit `12a9564` (2026-07-08); this ADR was written after the fact once a
review found the decision met the 3-part test but had no ADR.

## Context

A human-reported bug (issue #236): following a link occasionally left a
component (the About section on a blog Persona page) **permanently empty**
until a full page reload. Diagnosis (session `session_014i7ctF8d56WnSorhtSNTUw`,
2026-07-08) traced the root cause into `@nuxt/content` 3.15.0 itself, not this
repo's code: client-side `queryCollection` runs against a WASM SQLite DB whose
per-collection `sql_dump.txt` is fetched lazily on first query.
`loadDatabaseAdapter` (`dist/runtime/internal/database.client.js`) caches that
in-flight load as a promise in a module-level `dbPromises` map, but only
evicts it — and marks the collection loaded — **after a successful await**. If
the dump fetch rejects (a transient blip that outlasts `$fetch`'s single
built-in retry), the **rejected promise stays cached**, so every later query
for that collection re-awaits the same rejection: the component can never
load again for the life of the page. Only a full reload (fresh module state)
recovers. This repo is unusually exposed because it keys ~21 small
per-(Tenant, Space, collection) collections, so client navigations fetch far
more distinct dumps than a typical single-collection site.

This was reproduced deterministically two ways: first by aborting the first
two `sql_dump.txt` requests during a client navigation (commit `12a9564`,
PR #235), then — after issue #236 flagged the first repro as an *injected*
failure, not a captured production one — by actually stopping/restarting the
production server mid-navigation (`scripts/repro-236.ts`, PR #251, issue #236
comment 2026-07-08T23:00:23Z): 4/4 RED unpatched, GREEN patched. The same
evict-only-on-success code was confirmed present on `@nuxt/content`'s `main`
branch at the time, i.e. this is an upstream robustness gap, not a misuse on
our side. No upstream `nuxt/content` issue is recorded as filed yet (issue
#236's tracking checklist still lists "file the upstream issue" as an open
item); no upstream PR/issue reference exists anywhere in this repo.

This meets the 3-part ADR test: **hard to reverse** (the patch targets
compiled `dist` output at a specific version and must be re-authored or
re-validated on every `@nuxt/content` upgrade); **surprising without context**
(a `pnpm patch` of a third-party dependency's build artifact is not
discoverable from reading application code); **a real trade-off** (carrying a
version-pinned fork of vendored code vs. leaving a real user-facing bug
unpatched while waiting on upstream).

## Decision

Ship a committed `pnpm patch` of `@nuxt/content@3.15.0`
(`patches/@nuxt__content@3.15.0.patch`, wired via `pnpm-workspace.yaml`
`patchedDependencies`), touching two compiled files under
`dist/runtime/internal/`:

- **`database.client.js`, `loadDatabaseAdapter`:** evict the cached
  `dbPromises` entry in a `finally` (both the WASM-init entry and the
  per-collection entry), on success **or** rejection. A failed load can now be
  retried by the next query instead of poisoning the collection forever.
- **`api.js`, `fetchDatabase`:** retry the dump fetch (`retry: 4,
  retryDelay: 300`) so a short blip self-heals within a single query, before
  it ever reaches the eviction path above.
- **`api.js`, `fetchDatabase` (client only):** on a failure that survives the
  retries, record a best-effort diagnostic entry to a `localStorage` ring
  buffer (`__content_db_errors`, capped at 25 entries: timestamp, collection,
  HTTP status if any, truncated message) and `console.warn`. This exists
  because the underlying production trigger (network blip vs. post-deploy
  checksum-mismatch 404 vs. 5xx) was — and, per issue #236's open tracking
  checklist, still is — an unconfirmed hypothesis; the ring buffer is how a
  real occurrence gets captured without devtools open.

A red-capable e2e regression test (`layers/blog/tests/e2e/blog.e2e.ts`) injects
the two-failure blip on a client navigation and asserts the component still
fills; it fails on an unpatched build and passes patched.

## Consequences

- **Standing maintenance cost, not a one-time fix.** The patch is pinned to
  `@nuxt/content@3.15.0`'s exact compiled output (`pnpm-workspace.yaml`'s
  `patchedDependencies` key is version-qualified). Any `@nuxt/content` version
  bump must re-validate the patch against the new `dist` output — line
  offsets, surrounding code, or the bug itself may have changed — and likely
  requires re-authoring the diff by hand. `pnpm install` applies the patch
  from the store, so there is no pristine unpatched `dist` on disk to diff
  against; reconstructing pre-patch behavior for A/B testing requires a
  `patch -R` + rebuild + restore dance (documented in `scripts/repro-236.ts`'s
  header).
- **Exit path is upstream, not permanent forking.** Issue #236's tracking
  checklist calls for filing the `finally`-evict fix upstream and dropping
  this repo's patch once a fixed `@nuxt/content` release ships. As of this
  writing no upstream issue or PR is recorded in this repo — that filing is
  still outstanding.
- **The root cause is still an open hypothesis, not a confirmed diagnosis.**
  Issue #236 remains open; its first checklist item ("capture at least one
  real `__content_db_errors` entry from production") is unchecked. The patch
  is believed correct and necessary regardless of which specific trigger
  (network blip, stale-deploy 404, 5xx) turns out to be the real-world one,
  because all of them funnel through the same poisoned-promise code path — but
  that belief has not yet been confirmed against a captured production entry.
- **Gate coverage is automatic, not incidental.** Because the patch surfaces
  as an ordinary `patches/*.patch` file plus a `pnpm-workspace.yaml` entry, it
  re-applies on every `pnpm install`, so CI and the local safety gate exercise
  the patched behavior the same way they exercise any other dependency.
- **New-dependency-shaped risk without being a new dependency.** No new
  package was added, but per ADR-0004's escalation axes, changing an existing
  dependency's runtime behavior this way is exactly the kind of change that
  stays human-only to merge even though the touched paths (`patches/`,
  `pnpm-workspace.yaml`) aren't on ADR-0004's named high-risk file list.
