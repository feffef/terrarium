# ADR-0028: In-app navigation reads a cached server payload, not the browser database

When a visitor follows a link inside the app, the page takes its data from a
file the server rendered for that route (`_payload.json`), not from a Content
query in the browser. Only cached routes get that file, so the server caches
rendered pages briefly, and a page that reads the request must say so.

## Scope

- **The home page and every Tenant page are cached on the server** for a short
  time, in a cache of bounded size, never serving an expired copy. Content
  changes only when a new build goes live (ADR-0001), so this is safe.
- **One rendered copy serves every visitor.** A page whose server render reads
  a request header or cookie lists it in its route's `varies`, or the first
  visitor's version reaches everyone.
- **A page may opt out of the cache;** navigation to it then queries Content
  in the browser.
- **Server-computed times such as "today" can be slightly old** on a first
  page load, bounded by the cache's lifetime plus the browser's reuse of the
  response. After a navigation the browser computes them afresh.
- **Links fetch a payload, and the route's code, on hover or tap,** not when
  they scroll into view.
- **Everything a page's `useAsyncData` returns travels in its payload,** so
  return only what the page reads.
- **The browser database still loads** for an uncached page, a query that
  re-runs after the page mounts, and a failed payload fetch. ADR-0019 covers
  recovery when that load fails.
- A Tenant adds `varies` or opts a page out in its own layer.

## Why

The owner wants pages to keep building in the browser, so view transitions
and in-memory state such as Tinkerfund's cart survive navigation. A Content
query in the browser downloads the SQLite WASM runtime and each Collection's
dump. That is heavy, and it is where content loads fail (ADR-0019). Content
has no setting to send browser queries to the server.

Payloads need only documented Nuxt settings: no server code and no Content
internals, so a Content upgrade does not break them. Measured navigations got
several to dozens of times lighter. Fetching payloads on sight made navigation
heavier than before, because every visible link fetched one and some are large.

## Rejected alternatives

- **Full page loads.** They lose view transitions and in-memory state. The
  owner's call.
- **Prerender the page routes.** Same benefit with no runtime cache, but a
  longer build, a route list to keep, and no cover for query-string pages.
- **Send `queryCollection` to Content's server endpoint from app code.** One
  uncacheable request per query instead of one payload, and it relies on an
  undocumented detail of `@nuxt/content/server`.
- **Serve an expired copy while refreshing.** After an idle spell a visitor
  gets an arbitrarily old page, and old server-computed times.
- **Patch Content or hide WebAssembly from it.** Fragile across upgrades;
  ADR-0019 rejects patching it.

## When to revisit

- Payloads prove too narrow, such as many queries outside `useAsyncData`. Then
  add the server-endpoint route as a complement.
- Content ships a supported switch that sends browser queries to the server.

## See

- `nuxt.config.ts`: payload, prefetch and cache settings, and the size cap.
- `layers/tinkerfund/nuxt.config.ts`: its `varies` and opt-out rules.
- `tests/unit/page-cache.spec.ts`, `tests/e2e/smoke.spec.ts`,
  `layers/blog/tests/e2e/blog.spec.ts`,
  `layers/tinkerfund/tests/e2e/tinkerfund.spec.ts`: the checks.
- `docs/research/content-client-queries-without-wasm.md`: how it works, the
  measurements and the options weighed.
