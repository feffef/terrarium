# Tinkerfund: how search works

Answers issue #1370 (part of the wayfinder map #1357): how should
`/t/tinkerfund/(space)/search?q=` find Campaigns (and maybe Inventors and
Updates) in the baked content? The constraints are: no client-side Nuxt Content
queries, results scoped to the current Space, and suggestions as you type in the
header field. Checked 2026-09-26 against `@nuxt/content@3.15.0` and
`nuxt@4.5.x` as installed in this repo (`node_modules`, pinned in
`package.json`), and against the repo's own code.

## Recommendation

**Use a Nitro server route in the Tenant's layer that runs a Content query on
the server for each request. Match with SQL `LIKE`, then rank the matches in
plain TypeScript. Add no new dependency.**

- Route: `layers/tinkerfund/server/api/tinkerfund/[space]/search.get.ts`.
  It resolves `space` through the shared `resolveSpaceRoute('tinkerfund', space, undefined)`
  and returns 404 if that fails. It then runs server-side
  `queryCollection(event, pagesKey)` with `.where(field, 'LIKE', '%q%')` over
  `title`/`description` (and any short frontmatter text fields), plus the
  Inventors data key the same way. It ranks the rows in TS and returns the top
  N rows, projected.
- `search.vue` reads `?q=` and calls `useFetch('/api/tinkerfund/(space)/search', { query: { q } })`.
  During SSR, Nuxt calls the route in-process, so the page arrives rendered
  and works as a plain `<form method="get">` without JS.
- Header suggestions call the **same** route, debounced, with `limit=5`.

Why this one:

- **No client-side Content query.** The browser only ever calls our own JSON
  route, so no WASM SQLite and no `sql_dump.txt` download. That download is the
  failure path ADR-0019 documents.
- **Scoped to the Space by construction.** Every (Tenant, Space, Collection) is
  its own SQLite table (ADR-0001/0006). The route can only name the tables that
  `resolveSpaceRoute` returns for `tinkerfund`/`space`, so a result from another
  Space can't be expressed at all.
- **Baked content only (ADR-0001).** The route only reads the SQLite DB that was
  built into the container. Nothing is created at runtime.
- **Zero bytes of index in the bundle, and no new dependency.** So the PR is not
  forced to human-merge on the dependency axis (ADR-0004).
- **Good enough relevance for a showcase corpus.** Title-prefix and title-word
  matches rank above description matches. The same code serves suggestions and
  the results page.

## How the Commons Search does it (prior art)

- `layers/commons/app/components/commons/Search.vue` loads the **whole corpus**
  with `useAsyncData('commons-search-corpus', () => queryPages())`. It then
  filters it **in the browser** by case-insensitive substring
  (`String.includes`) over title, description, tenant and space. It does no
  ranking or fuzzy matching and adds no dependency.
- `queryPages()` (`app/composables/catalog.ts`) fans out over `#catalog` and
  calls `queryCollection(key).all()` for each contributing collection. That is
  cross-Tenant (ADR-0025), and Tinkerfund stays out of it.
- `queryCollection` in Vue code runs **wherever the component runs**. In
  `@nuxt/content/dist/runtime/client.js`, `executeContentQuery` runs the query
  against WASM SQLite in the browser (`import.meta.client && window.WebAssembly`)
  and falls back to `fetchQuery` otherwise. So Commons Search queries Content
  **on the client** whenever you reach it by client-side navigation. That
  breaks Tinkerfund's constraint, so the pattern **should not be copied as is**.
  Two parts are worth keeping: the plain-substring baseline and the idea of
  projecting only small fields.

## Primary-source facts the recommendation rests on

1. **Server-side `queryCollection` exists and needs the H3 event.**
   `dist/runtime/server.js`: `queryCollection = (event, collection) => collectionQueryBuilder(collection, (c, sql) => fetchQuery(event, c, sql))`.
   Also see `docs/research/nuxt-content-review-grounding.md` §4 ("available in
   both Vue and Nitro … takes the H3 `event` as first argument").
2. **A server query stays inside the process.** `dist/runtime/internal/api.js`
   `fetchContent` calls `event.$fetch('/__nuxt_content/(collection)/query')`.
   `dist/runtime/api/query.post.js` runs `assertSafeQuery(sql, collection)` and
   then `loadDatabaseAdapter(conf).all(sql)` against the server DB.
3. **`LIKE` is supported and user input is escaped.** In
   `dist/runtime/internal/query.js`, the `LIKE`/`NOT LIKE` case builds
   `"field" LIKE 'value'`, and `singleQuote` doubles any `'`.
   `assertSafeQuery` (`internal/security.js`) strips string literals before it
   checks for SQL keywords, so a query like `q=select` is safe. Two limits:
   the builder has **no `ESCAPE` clause**, so the handler should strip `%` and
   `_` from `q`, and each `.where()` is ANDed (use `orWhere` to OR fields
   together). SQLite `LIKE` is case-insensitive for ASCII only.
4. **Nuxt Content 3.15 ships two search helpers, and neither fits.**
   `useSearchCollection` (`client.js`) builds an FTS index inside the
   **client** WASM DB, so it is a client-side Content query and ruled out.
   `queryCollectionSearchSections` (`internal/search.js`
   `generateSearchSections`) runs on the server too, but it only splits `.md`
   bodies into heading sections. It does no matching or ranking, and it pulls
   every `body`. It is useful only if full-text search of campaign bodies ever
   becomes a need.
5. **Tenant layers can have server routes.** Nitro scans every layer's
   `server/` directory (`@nuxt/nitro-server/dist/index.mjs:424`,
   `scanDirs: layerDirs.map((dirs) => dirs.server)`). No Tenant layer in the
   repo has a `server/` directory yet (checked with `find`), so Tinkerfund's
   would be the first. See the open questions.

## Options compared

| Option | Relevance | Browser bundle | New dependency? | Constraints |
|---|---|---|---|---|
| **A. Server Content query per request, LIKE + TS ranking** (recommended) | Substring hits, ranked title-prefix > title-word > title > description. No typo tolerance | ~0 (JSON results only) | No | All met |
| A′. Same, with `minisearch` on the server for fuzzy/prefix matching | Best: BM25-style scoring, prefix, fuzzy. Index cached in server memory per Space | ~0 | **Yes**, so human-merge-only | All met |
| B. Build-time index shipped to the browser, filtered client-side | Instant suggestions. Substring, or fuzzy with a library | The corpus JSON grows with content per Space, **plus** ~5.9 KB gz for `minisearch` or ~9.5 KB gz for `fuse.js` if fuzzy | Only for fuzzy. It also needs new build-time code to emit the index (a module/hook), or a route serving the corpus | Met only if the index arrives by our own route, not by `queryCollection` in the browser |
| C. Copy Commons: `queryCollection` in the page plus a client `includes` filter | Plain substring | The WASM SQLite DB plus the dump on client navigation | No | **Violates** "no client-side Content queries" |

The bundle sizes are measured, not quoted. They come from `esbuild --bundle --minify --format=esm`
followed by `gzip -9` on `minisearch@7.2.0` (17,654 B min, 5,925 B gz) and `fuse.js@7.5.0`
(26,524 B min, 9,483 B gz), both run 2026-09-26.

**Substring vs. ranked/fuzzy.** A crowdfunding showcase has a small corpus
(tens of Campaigns per Space). Plain substring matching already finds what
people type, and ranking fixes the one real problem with it, which is ordering
(a title hit should beat a description hit). That ranking is a few lines of
TS. Fuzzy matching (typos) is the only thing that needs a library, and it is
the one feature that would make the PR human-merge-only. Leave it out for now.
If it is wanted later, A′ is a local change inside the same route, so no page
or header code changes.

## Scope: Campaigns, Inventors, Updates

- **Campaigns:** the Space's `pages` key, filtered by path
  `LIKE '/campaigns/%'` with `NOT LIKE '/campaigns/%/updates/%'`.
- **Updates:** the same key with path `LIKE '/campaigns/%/updates/%'`. Group
  them under their Campaign or leave them out of suggestions. They are cheap to
  include on the results page.
- **Inventors:** the Space's inventors data key, taken from `collections` on
  the resolved route. Match on name and bio. Categories can be matched the
  same way, or offered as filters instead.
- Reward text lives in frontmatter (JSON columns), so LIKE over it would also
  match JSON syntax. Keep it out of the first cut.

## Open questions for the map (#1357)

- **First `server/` directory in a Tenant layer.** `nuxt.config.ts` says
  layers are "presentation only — they never define content collections". A
  read-only JSON route that goes through `resolveSpaceRoute` does not define a
  collection, but it is new ground. Decide whether it counts as ADR-0004
  "isolation logic" (making it human-only) or as ordinary Tenant code. The
  route adds no new isolation logic, because it reuses `resolveSpaceRoute`.
  It still needs an e2e test so it doesn't trip ADR-0004's
  "untested runtime behaviour" axis.
- Route naming: `/api/tinkerfund/(space)/search` sits outside the ADR-0006
  `/t/...` page namespace. That fits ADR-0006, which covers page routing only,
  but confirm there is no convention for API paths.
