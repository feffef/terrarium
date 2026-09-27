# In-app navigation without @nuxt/content's browser SQLite (WASM)

Can pages keep building in the browser on in-app navigation (Vue Router +
`useAsyncData` + `queryCollection`) without downloading `@nuxt/content`'s SQLite
WASM runtime (~856 KB `sqlite3.*.wasm` plus a ~193 KB JS chunk) and the
per-Collection `sql_dump.txt` files? Background: issue #1444 (closed, not
planned: the owner kept browser-side building and rejected full page loads
because of Tinkerfund's view transitions and in-memory state) and ADR-0019
(the history of client-DB failures).

**Researched 2026-09-27.** This note is based on installed source and the
official upstream repos only. The versions read were:

- `@nuxt/content` **3.15.0** (`node_modules/@nuxt/content/package.json`).
  Upstream `main` is **3.16.1** (`raw.githubusercontent.com/nuxt/content/main/package.json`).
- `nuxt` **4.5.2**, `@nuxt/nitro-server` **4.5.2**, `@nuxt/schema` **4.5.2**,
  `nitropack` **2.13.4**. The last build's `.output/nitro.json` reports preset
  **`node-server`**.

Short names used in the citations below:

- **content** = `node_modules/@nuxt/content/dist/`
- **nuxt** = `node_modules/nuxt/dist/`
- **nitro-server** = `node_modules/.pnpm/@nuxt+nitro-server@4.5.2_…/node_modules/@nuxt/nitro-server/dist/`
- **schema** = `node_modules/.pnpm/@nuxt+schema@4.5.2/node_modules/@nuxt/schema/dist/`
- **nitropack** = `node_modules/.pnpm/nitropack@2.13.4_…/node_modules/nitropack/dist/`

`content.nuxt.com` returns 403 through the proxy here. Doc quotes therefore
come from the docs source in `nuxt/content`, under `docs/content/docs/…` on `main`.

**Nothing here was verified end to end with a build.** Every conclusion comes
from reading the code, and the recommended option is followed by a
verification recipe.

---

## How the client decides today (verified)

- The auto-import `queryCollection` resolves to `content/runtime/client.js`
  (`content/module.mjs:3137-3143`).
- Every builder call runs `executeContentQuery`. When `import.meta.client &&
  window.WebAssembly` is true, it `import()`s `internal/database.client.js`,
  which loads `@sqlite.org/sqlite-wasm` and the Collection's dump. Otherwise it
  calls `fetchQuery` (`content/runtime/client.js:67-77`,
  `internal/database.client.js:46-66`). Both the WASM runtime and the dumps
  load only through that dynamic `import()`. **A page load where no client-side
  query runs downloads neither.**
- `fetchQuery` POSTs `{ sql }` to `/__nuxt_content/<collection>/query`. It uses
  `event.$fetch` when an event exists and the global `$fetch` otherwise
  (`content/runtime/internal/api.js:3-35`).
- The endpoint handler checks the query with `assertSafeQuery`, then runs it on
  the server DB (`content/runtime/api/query.post.js:5-14`). The server
  adapter's `all()` applies the same `refineContentFields` as the WASM adapter,
  so rows come back in the same shape (`internal/database.server.js:19-20`,
  `internal/database.client.js:31`).
- **SSR already uses this endpoint for every query.** On the server
  `import.meta.client` is false, so each SSR `queryCollection` goes through
  `fetchQuery` (`client.js:8-9,68-72`). Any SQL this app builds therefore
  already passes `assertSafeQuery`.
- The WASM runtime is *not* built into the entry chunk. The last build has it
  as a separate asset, `.output/public/_nuxt/sqlite3.DBpDb1lf.wasm` (856,447 B).

---

## Avenue 1: a Content option or hook that sends client queries to the server

**It does not exist, in 3.15.0 or on upstream `main`.**

- The only experimental options in 3.15.0 are `nativeSqlite` and
  `sqliteConnector` (`content/module.mjs:3083-3085, 3188`), and both are
  server-side.
- Upstream `main` (3.16.1) has the same `experimental` block
  (`src/types/module.ts`, `experimental?: { nativeSqlite, sqliteConnector }`).
  It still has the same branch: `if (import.meta.client && window.WebAssembly)`
  (`src/runtime/client.ts:114-119` on `main`).
- The changelog records one relevant change. 3.6.2 added the API fallback only
  for browsers *without* WebAssembly: "fallback to api call if webassembly is
  not supported (#3399)" (`CHANGELOG.md` on `main`, line 270). Nothing from
  3.7.0 to 3.16.1 adds a switch.
- The docs describe `queryCollection` as "available in both Vue and Nitro", and
  on the server it takes `event` as its first argument
  (`docs/content/docs/4.utils/1.query-collection.md`, lines 23 and 279-286).
  The configuration page lists only `sqliteConnector` and `nativeSqlite` under
  `experimental` (`docs/content/docs/1.getting-started/3.configuration.md`,
  line 521 onward).
- Two security fixes on the endpoint path since 3.15.0 matter if it becomes the
  hot path:
  - 3.15.2 rejects SQL function calls in `WHERE`.
  - 3.16.1 fixes a ReDoS in `assertSafeQuery`.

  (`CHANGELOG.md` lines 3-11 and 26-31.)

**Verdict:** there is no supported switch. The upstream route would be a
feature request for a `clientDB: false`-style option. Nothing indicates one is
planned.

---

## Avenue 2: Nuxt payload extraction for server-rendered routes

**This works in Nuxt 4.5.2 for routes that carry an `isr`/`cache`/`swr` route
rule, and for prerendered routes. It needs only config: no server code and no
dependency patch.**

### How it works

**Client side**

- The `nuxt:payload` plugin hooks `router.beforeResolve`. It calls
  `loadPayload(to)` and copies the payload's `data` into `nuxtApp.static.data`
  (`nuxt/app/plugins/payload.client.js:22-35`).
- `useAsyncData`'s default `getCachedData` returns `nuxtApp.static.data[key]`
  outside hydration (`nuxt/app/composables/asyncData.js:413-416`). A cached
  value short-circuits the handler: `queryCollection` never runs, so the WASM
  runtime is never imported (`asyncData.js:317-323`).

**Which routes get a payload** (`nuxt/app/composables/payload.js:110-141`)

- A route with a `prerender` rule.
- A route whose rules have `payload: true`.
- A route listed as prerendered in the app manifest.

The client route-rule matcher rewrites any `cache`/`isr`/`swr` rule into
`payload: true` (`nitro-server/index.mjs:608-611`).

**How the payload URL is built**

- The URL is `<path>/_payload.json?_b=<buildId>`.
- For "cached payload routes", the query string is kept, so `?q=` pages get
  their own payload (`payload.js:75-86, 117-120`).

**Server side**

- The renderer extracts the payload at runtime when
  `NUXT_RUNTIME_PAYLOAD_EXTRACTION && (routeOptions.isr || routeOptions.cache)`.
  It then answers `…/_payload.json` by rendering the page and returning only
  the payload (`nitro-server/runtime/handlers/renderer.mjs:72-84, 133-136`).
- `NUXT_RUNTIME_PAYLOAD_EXTRACTION` is true when any route rule has `isr` or
  `cache` (`nitro-server/index.mjs:436, 448`).
- A wildcard rule such as `/t/**` also matches `/t/…/_payload.json` at request
  time. The build step that adds explicit `_payload.json` rules skips wildcard
  keys (`nitro-server/index.mjs:647`), so that step is not needed here.

**The documented option.** `experimental.payloadExtraction` is described as:
"Controls how payload data is delivered for prerendered and cached (ISR/SWR)
pages." With `'client'`, the payload is "inlined in HTML for the initial server
render, and extracted to `_payload.json` files for client-side navigation"
(`schema/index.d.mts:2144-2156`). The default is `true` (`'client'` from
compatibility version 5). `true` would add a separate `_payload.json` request
on first load (`renderer.mjs:159`; `nitro-server/index.mjs:446-447`), so
`'client'` is the setting to use.

**State of this build.** The client half is already switched on here, as a
side effect. Content adds `prerender: true` rules for every
`sql_dump.txt` (`content/module.mjs:3179-3184`). That makes Nuxt's client
`payloadExtraction` flag true (`nuxt/index.mjs:3278`). The built client bundle
confirms it: `loadPayload` has no `!payloadExtraction` early return. Only the
server half is off: `.output/server/chunks/routes/renderer.mjs` contains
`NUXT_RUNTIME_PAYLOAD_EXTRACTION = false`.

### Variant 2a: a runtime rule on page routes (`swr`/`cache`)

```ts
// nuxt.config.ts: sketch only, not applied
experimental: { payloadExtraction: 'client' },
routeRules: { '/t/**': { swr: true } },   // or cache: { maxAge: … }
```

**What it costs**

- **Nitro really caches the HTML.** A cached wildcard rule inserts a cached
  copy of the renderer (`nitropack/rollup/index.mjs:1077-1105`;
  `runtime/internal/app.mjs:126-133`). Content is baked at build time
  (ADR-0001), so a per-deploy cache is semantically safe.
- **The cache key includes the full URL, query string included**
  (`nitropack/runtime/internal/cache.mjs:127-145`). Arbitrary `?q=` values
  therefore grow the cache without bound. Scope the rule, or exclude search
  routes.
- **Each uncached navigation costs a full server render.** Only the payload is
  returned.
- **Cached HTML freezes the time it was rendered at.** Two Tenants compute a
  server-side "now" and send it to the browser in the payload for hydration.
  Atlas uses `useGlassToday()` (`layers/atlas/app/composables/almanac.ts:170-172`),
  and Tinkerfund uses `useTinkerfundClock()` (`layers/tinkerfund/app/composables/clock.ts:12-16`).
  A cached page served on a later day hydrates with the render-time value, not
  today's. Both need a rule that excludes their routes, or a `maxAge` shorter
  than the staleness they can tolerate. (Checked in the source, not measured.)

**What it keeps**

- Navigation is still a client router navigation (`beforeResolve`), so
  in-memory state such as Tinkerfund's cart survives. The plugin merges only
  `payload.data`.
- The interaction with view-transition timing was **not verified**.

**Key matching.** Pages key `useAsyncData` by `route.path` or by static,
Space-derived strings (e.g.
`layers/blog/app/pages/t/blog/[space]/[...slug].vue:21`,
`layers/tinkerfund/app/composables/cart.ts:52-53`). These are the same on server
and client, so the payload keys match.

**What still hits WASM**

- Queries outside `useAsyncData`.
- Keys that depend on client-only state.
- Reactive re-queries after mount.
- A failed payload fetch. `_importPayload` returns `null` on non-OK
  (`payload.js:87-108`), and the handler then runs in the browser as today.

**Search pages**

- Commons Search loads its corpus through `useAsyncData` and filters it in JS
  (`layers/commons/app/components/commons/Search.vue:7-25`). The corpus would
  come from the payload, with no WASM.
- Tinkerfund search remounts per `fullPath` and keys by `q`
  (`layers/tinkerfund/app/pages/t/tinkerfund/[space]/search.vue:3,9`). A cached
  payload route is query-aware, so its results would be server-rendered into
  the payload. In effect the search SQL would run on the server, with no new
  server code. If the owner wants that search to stay in the browser, exclude
  the route.

### Variant 2b: `isr: true` instead of `swr`/`cache`

`isr` turns on Nuxt's payload logic (`renderer.mjs:74`,
`nitro-server/index.mjs:608`). Nitro, however, only interprets `isr` in the
vercel, netlify and zeabur presets. On `node-server` it does not become a
`cache` rule (`nitropack/core/index.mjs:505-546`: only `swr`/`cache` are
normalized; `grep` finds `isr` only under `presets/`).

The result is payload extraction without server caching. It works on this
preset, but only because of preset-specific semantics that a reader would not
expect. **Not recommended.**

### Variant 2c: prerender the page routes

- Add a `prerender: true` rule (e.g. `/t/**`) or `nitro.prerender.routes`. The
  routes can be derived from the manifests.
- `nuxt build` already runs Nitro's prerenderer, because Content prerenders
  every public `sql_dump.txt` (`content/module.mjs:3179-3184`;
  `.output/public/__nuxt_content/…` exists). It still ships a `node-server`
  output.
- So this is hybrid rendering, not `nuxt generate`, contrary to #1444's
  "changes the hosting model" framing. It does lengthen the build.
- Query-string variants are not prerendered. So `?q=` search pages, and any
  route the list misses, fall back to the browser query (WASM). That fallback
  is acceptable here.

---

## Avenue 3: sending queries to `/__nuxt_content/<c>/query` from app code

**This is feasible without patching and without importing non-exported
internals. It relies on one undocumented detail.**

### The mechanism

`@nuxt/content/server` is a *public* export
(`content/package.json` `exports["./server"]` → `dist/runtime/server.js`). It
exposes `queryCollection(event, collection)`, built on the same
`collectionQueryBuilder` with `fetchQuery` (`content/runtime/server.js:1-8`).

- Called in the browser with `event = undefined`, `fetchContent` falls through
  to the global `$fetch` POST (`internal/api.js:4, 15`).
- The one import this pulls in is h3, and `client.js` already has it in the
  client bundle through `internal/api.js:1`. It adds no new dependency weight.

### How to rewire the auto-import

Content registers its import through `addImports`, which is a Nuxt
`imports:extend` hook (`@nuxt/kit@4.5.2 dist/index.mjs:1324-1328`). Hooks run in
registration order. A local module listed **after** `'@nuxt/content'` can
therefore, in its own `imports:extend` hook:

1. Rename Content's entry (`as: 'queryCollectionInBrowser'`), so search can
   still opt into WASM explicitly.
2. Push an app composable named `queryCollection` that calls
   `serverQueryCollection(import.meta.server ? useRequestEvent() : undefined, c)`.

Hooks declared in `nuxt.config`'s `hooks:` key run *before* modules, so they
would not see Content's entry.

### What it costs

- **The undocumented reliance.** `server.d.ts:11` types `event: H3Event` as
  required, so this needs a cast. The docs present the export only for Nitro
  use. An upgrade could add a server-only import to `server.js` and break the
  client bundle. That is cheap to detect with a build, but it is a real upgrade
  seam.
- **More round trips.** Each client query becomes one uncacheable POST: Content
  sets `cache: false` on `/__nuxt_content/**` (`content/module.mjs:3173-3178`).
  Pages that run several queries pay several round trips, where avenue 2 pays
  one payload fetch.
- **No new server surface.** The endpoint is already public and already serves
  all SSR queries.
- **Scope gaps.** `queryCollectionNavigation`, `ItemSurroundings` and
  `SearchSections` from `client.js` call the *internal* `queryCollection`
  (`client.js:78-79`), so they would still use WASM. A grep finds no use of any
  of them in `app/` or `layers/`. `useSearchCollection` is WASM by design
  (`client.js:37`).

### Rejected sub-variants

- A Vite `resolve.alias` pointing `…/runtime/internal/database.client.js` (or
  `client.js`) at a shim. This effectively patches the dependency by path and
  targets non-exported internals.
- Hiding `window.WebAssembly`, e.g. via Vite `define`. This flips the
  `client.js:68` branch, but it breaks the WASM search path and any other WASM
  user. It is a hack against an implementation detail.
- Nitro aliases (`#content/adapter` etc., `content/module.mjs:3190-3193`). They
  are server-side only and do nothing for the client.

---

## Avenue 4: a JS-only client query engine

**None exists.** The client paths are WASM SQLite
(`database.client.js`, `@sqlite.org/sqlite-wasm`) and HTTP `fetchQuery`
(`client.js:67-73`). Content ships no in-JS SQL evaluator.

A related Nuxt mechanism, not investigated in depth: server components
(islands). They render on the server and are fetched through the island handler
(`nitro-server/runtime/handlers/island.mjs`). This avoids client queries too,
but it means rewriting pages into server components, and they lose client
interactivity.

---

## Ranked recommendation

1. **Avenue 2a: runtime payload extraction.** Set
   `experimental.payloadExtraction: 'client'` plus an `swr`/`cache` rule on the
   page routes, and leave search routes uncached or unruled. It uses documented
   Nuxt config, needs no Content internals and no server code, and survives
   Content upgrades. Unmatched cases fall back to today's WASM behaviour.
   `nuxt.config.ts` is human-only (ADR-0018), and this changes global runtime
   behaviour, so a human merges it (ADR-0004).
   **Verify before adopting:**
   - Build, then `router.push` between two `/t/**` pages in Playwright.
   - Assert that a `_payload.json` request happens and that no `sqlite3*.wasm`
     or `sql_dump.txt` request does.
   - Confirm Tinkerfund view transitions still animate.
2. **Avenue 2c: prerender the page routes.** This has the same client benefit
   with no runtime cache, at the cost of build time and the work of listing
   the routes.
3. **Avenue 3: rewire the `queryCollection` auto-import to the endpoint.** Use
   this only if payloads prove insufficient (queries outside `useAsyncData`),
   or as a complement to 1. It has more round trips and one undocumented seam
   in `@nuxt/content/server`.
4. **Upstream feature request** for a supported client-DB toggle in
   `nuxt/content`. Nothing on `main` provides one today.
5. **Reject:** the `isr` trick on `node-server`, the `window.WebAssembly` hack,
   Vite aliasing of Content internals, and a dependency patch (ADR-0019
   already reverted one).
