# 28. In-app navigation reads server-rendered payloads, not the browser Content DB

Date: 2026-09-27
Status: Accepted

> Green-lit by a human in an interactive session (ADR-0003), after a local trial.
> Research: `docs/research/content-client-queries-without-wasm.md` (PR #1445).

## Context

With `@nuxt/content` 3.15.0, a `queryCollection` inside `useAsyncData` runs in
the browser whenever the handler runs client-side, which is every in-app
navigation to a route not yet loaded. The first such navigation downloads the
SQLite WASM runtime and its loader (about 450 KB gzipped). Each queried
Collection then adds its `sql_dump.txt`. Content has no switch to send those
queries to its server endpoint instead (`executeContentQuery`,
`dist/runtime/client.js`). That same browser load is also the failure path
behind #236 and ADR-0019.

The owner wanted pages to keep building in the browser, so navigation stays
client-side and Tinkerfund's view transitions and in-memory state survive
(#1444). Full page loads were rejected for that reason.

## Decision

Use Nuxt payload extraction (`nuxt.config.ts`):

- `experimental.payloadExtraction: 'client'`: the first load keeps its payload
  inline, and later navigations fetch the target route's `_payload.json`.
  `useAsyncData` takes its data from that file and never runs the query in the
  browser.
- `routeRules['/t/**'].cache = { maxAge: 60, swr: false }`: Nuxt only extracts
  payloads for cached (or prerendered) routes. A short lifetime without stale
  serving bounds how old a first page load's server-computed "now" can be:
  Atlas's `useGlassToday` and Tinkerfund's `useTinkerfundClock`. On navigation
  both recompute in the browser, because Nuxt merges only a payload's `data`,
  not its state. The response also carries `max-age=60`, so a browser may reuse
  it for another minute. That makes the worst case about two minutes.
- Tinkerfund's own layer config adds two rules. Its pages vary the cache on
  `accept-language`, because its money and dates follow the visitor's locale
  (#1365) and a cached render otherwise sees no request headers. Its search
  route is uncached and keeps its deliberate in-browser search.
- NuxtLink prefetches on interaction, not visibility. Visibility prefetch
  fetched the payload of every visible link, and some pages carry about 550 KB
  payloads, so navigations ended up heavier than before.

Measured locally, gzipped per navigation: blog post about 494 → 7 KB; journal
skills 579 → 144 KB; Tinkerfund page 578 → 19 KB; Commons Timeline about
1.85 MB → 72 KB.

## Consequences

- **The browser DB still loads where a query runs outside a payload.** That
  covers Tinkerfund search, reactive re-queries after mount, and a failed
  payload fetch (Nuxt then runs the handler in the browser as before). ADR-0019's
  recovery (`ContentLoadErrorDialog`, the chunk-error auto-reload) therefore
  stays.
- **The server now caches rendered `/t/**` pages in memory for 60 s.** Content
  is baked per deploy (ADR-0001), so that is safe. A page that reads anything
  else from the request, such as a header or cookie, needs `varies` like
  Tinkerfund's, or it serves the first visitor's version to everyone.
- **The cache has no size bound.** Each distinct URL, query string included, is
  its own entry, and expired entries are only replaced, not evicted. Junk query
  strings grow memory until the next deploy or restart clears it.
- **A route's code downloads on hover, not on sight.** With visibility prefetch
  off, a touch device fetches it on tap.
- Reverting means deleting `payloadExtraction`, the `nuxtLink.prefetchOn`
  default and the `routeRules` in `nuxt.config.ts` and
  `layers/tinkerfund/nuxt.config.ts`. Nothing else depends on them.
