# Nuxt 4 / Nuxt Content 3: grounding facts for code-review claims

Primary-source answers to twelve questions about how Nuxt 4 and Nuxt Content 3
actually behave, gathered to verify (or refute) code-review claims about this
app. Every claim below is traced to the official docs or the installed source
in `node_modules` — nothing is from memory or third-party posts.

**Researched 2026-07-11.** Versions verified against `node_modules` (re-check
if they've moved):

- `nuxt` **4.4.8** (`node_modules/nuxt/package.json`)
- `@nuxt/content` **3.15.0** (`node_modules/@nuxt/content/package.json`)
- `@nuxt/kit` **4.4.8**, `vue-router` **5.1.0**, `c12` **3.3.4** (Content's
  config loader), `zod` **3.25.76** + `zod-to-json-schema` (the Zod-v3 path)
- Node **22.22.2** in this environment

Both `content.nuxt.com` and `nuxt.com` return 403 to the fetcher here, so doc
quotes come from the docs *source* in the official repos, pinned to the
installed versions: `nuxt/content` at tag `v3.15.0` (`docs/content/docs/…`,
rendered at `content.nuxt.com/docs/…`) and `nuxt/nuxt` at tag `v4.4.8`
(`docs/…`, rendered at `nuxt.com/docs/4.x/…`). Same content, version-pinned.
File-path citations are to this repo's `node_modules` (installed code — the
strongest source of all).

---

## 1. `defineCollection` source object: `cwd`, `include`, `prefix`, `exclude`

Docs (Content `docs/2.collections/3.sources.md`):

- **`include`** (required): "Glob pattern of your target repository and files
  in the content folder."
- **`exclude`**: "Glob patterns to exclude content from the import." The
  module additionally always ignores `**/.DS_Store`
  (`@nuxt/content/dist/module.mjs:1946`, `getExcludedSourcePaths`).
- **`cwd`**: "Root directory for content matching" — set an absolute path to
  include files from outside `content/`. Source: defaults to
  `join(rootDir, 'content')`; a `~~/` prefix is replaced with the project
  rootDir (`module.mjs:1953` `defineLocalSource` → `prepare`).
- **`prefix`**: "only applied for **page** type … It represents the path
  prefix (base URL) of the corresponding page on the website … must start by
  a leading `/`. By default, module extracts the static prefix of
  `source`(or `source.include`) and uses it as a prefix for content paths …
  The prefix can be removed by setting `prefix: '/'`."

Mechanics in the installed source:

- The derived default prefix is the *static* (pre-`*`) part of the include
  glob: `parseSourceBase` splits on the first `*` (`module.mjs:2079`);
  `defineLocalSource` sets `prefix: withoutTrailingSlash(withLeadingSlash(fixed))`,
  then spreads `...source` **after** it, so a user-supplied `prefix` wins
  (`module.mjs:1953-1981`).
- Matched keys are relative to `cwd` with the include's fixed part stripped
  (`getKeys` … `key.substring(fixed.length)`, `module.mjs:1969-1971`).
- Each document's id is `join(collection.name, source.prefix || '', key)`
  (`module.mjs:3301`). `describeId` (`module.mjs:1173`) drops the first
  segment (the collection name) and the extension to produce **`stem`**; the
  page **`path`** is generated from the stem by the `path-meta` transformer
  (`module.mjs:1145`, `generatePath` at `1161`): each segment is slugified
  (lowercased), numeric ordering prefixes `N.` are stripped, and `index`
  becomes `''`.

**So for a `page` collection with a custom `cwd` and `prefix: '/'`** (exactly
what this repo's `content.config.ts` does): the document's `path` is `/` +
the slugified file path *relative to `cwd`* (minus the include's static base
and the extension) — no extra prefix segment. E.g. `cwd: layers/x/content/y`,
`include: 'pages/**'` (fixed part `pages/`) gives `hello.md` → path `/hello`,
`index.md` → `/`.

**`prefix` on `data` collections**: the docs state it "only applied for
**page** type". In code the prefix still feeds the id/stem string for any
type (`module.mjs:3301` doesn't branch on type), but `data` collections have
no `path` column (see §3), so prefix has no route/URL meaning there — only a
cosmetic effect on `id`/`stem`.

## 2. Collection `schema`: what it is used for (and NOT used for)

What the schema drives (all confirmed in installed source):

- **SQL column derivation.** `generateCollectionTableDefinition`
  (`module.mjs:2566`) maps each schema key to a column (`TEXT`, `VARCHAR(n)`,
  `INT`, `BOOLEAN`, `DATE`, JSON-as-TEXT); an unsupported type throws
  "Unsupported Zod type" at build. Schema `default`s become SQL `DEFAULT`s
  and are applied when a field is missing (`generateCollectionInsert`,
  `module.mjs:2454`).
- **Type generation.** `contentTypesTemplate` (`module.mjs:1543`) compiles
  each collection's JSON schema into a TS interface extending
  `PageCollectionItemBase`/`DataCollectionItemBase` and augments the
  `Collections` interface — this is what types `queryCollection('key')`.
- **Field routing at parse time.** Parsed fields whose key is in the schema
  become columns; **everything else is moved into `meta`**
  (`module.mjs:1490-1498`). Docs (`2.collections/2.types.md`): "`meta`:
  Custom fields not defined in the collection schema."
- Studio form metadata (`property(...).editor(...)`), per the validators doc.

What it does **not** do: **content is never validated against the schema at
build or dev time.** There is no `safeParse`/`~standard.validate` call
anywhere in the parse/insert pipeline (`createParser`, `module.mjs:1470-1523`;
insert at `2454`). Wrong-typed frontmatter is *coerced* per column type at
insert (`Number(...)`, `!!...`, string-quoting — `module.mjs:2461-2483`), not
rejected. A file whose *parsing* throws (e.g. malformed YAML) is skipped with
a logged warning — `"<id>" is ignored because parsing is failed`
(`module.mjs:3329`) — and the build continues. Invalid frontmatter therefore
does **not** fail the build. (This is why this repo's
`scripts/validate-content.ts` exists — it is the only thing that actually
runs documents through the Zod schema.)

**Validator support** (Content `docs/2.collections/4.validators.md`): "Zod v3
/ v4 and Valibot" out of the box, detected via the Standard Schema
`~standard.vendor` marker (`detectSchemaVendor`, `module.mjs:2322`: vendor
`zod` + `.def` → zod4, without → zod3), converted internally to **JSON Schema
Draft-07**. Zod v3 requires `zod-to-json-schema` (imported at
`module.mjs:50`); Zod v4 exports JSON Schema natively; other validators are
possible via Draft-07 adapters. The `z` re-export from `@nuxt/content` is
deprecated. This repo (zod 3.25.76 imported from `'zod'` + zod-to-json-schema)
is on the supported Zod-v3 path.

## 3. Built-in fields: page vs data collections

From Content `docs/2.collections/2.types.md` and the installed types
(`@nuxt/content/dist/module.d.mts:279-302`) / built-in JSON schemas
(`module.mjs:2129` `metaStandardSchema`, `2168` `pageStandardSchema`):

- **Every collection** (`CollectionItemBase`): `id`, `stem` ("file path
  without extension"), `extension`, `meta` (bucket for un-schema'd fields).
- **`page` collections additionally** (`PageCollectionItemBase`): `path`
  (generated route path), `title`, `description`, `seo` (default `{}`;
  title/description backfilled from the page's at parse time,
  `module.mjs:1507-1510`), `body` (parsed AST — minimark), `navigation`
  (boolean or `{title, description, icon}`, default `true`).
- **`data` collections**: `DataCollectionItemBase extends CollectionItemBase {}`
  — *nothing beyond the four base fields*. Notably `title` and `path` are
  **not** built-in on data collections: a `title:` in a data file goes into
  `meta` unless the collection schema declares it.

The question's list (id, stem, extension, meta, path, title, description,
seo, body, navigation) is confirmed as the page-collection set; only the
first four exist on data collections.

## 4. `queryCollection` API

Docs: Content `docs/4.utils/1.query-collection.md`; source:
`@nuxt/content/dist/runtime/client.js` and `runtime/internal/query.js`.

- **Typing**: `function queryCollection<T extends keyof Collections>(collection: T):
  CollectionQueryBuilder<Collections[T]>` — the `Collections` interface is
  generated per collection key by the types template (§2), so the collection
  key is a checked literal type and results are typed per collection.
- **`.path(p)`**: "Search for contents that have specific `path`. (`path` is
  an special field in `page` collections which generates based on fs path and
  can be use as route to render the content)". Implementation is literally
  `where('path', '=', withoutTrailingSlash(p))` (`query.js:85-87`).
- **`.where(field, operator, value?)`**: SQL condition; operators `=`, `>`,
  `<`, `<>`, `IN`, `BETWEEN`, `NOT BETWEEN`, `IS [NOT] NULL`, `[NOT] LIKE`.
  Chained `.where()`s AND together. `andWhere`/`orWhere` take group factories.
- **`.order(field, 'ASC' | 'DESC')`**: SQL ORDER BY (direction is mandatory
  uppercase union). Also `select(...)`, `limit(n)`, `skip(n)`, `count()`.
- **`.all()`**: Promise of all matching rows (array). **`.first()`**: first
  match **or `null`** (docs: "or `null` if no documents match").
- **Server + client**: "available in both Vue and Nitro". In Vue it's
  auto-imported from `runtime/client` (`module.mjs:3138`); in Nitro handlers
  the same name is server-imported (`module.mjs:3144`) but takes the H3
  `event` as first argument: `queryCollection(event, 'docs')…`. Client-side
  execution uses a WASM SQLite database in the browser when available, else
  falls back to an API fetch (`client.js:67-77`).

## 5. `experimental.sqliteConnector: 'native'`

Docs (Content `docs/1.getting-started/3.configuration.md`, "## experimental —
Experimental features that are not yet stable"):

- Four connectors: `better-sqlite3` (default; not WebContainers/Bun),
  `sqlite3` (not Vercel/Cloudflare), **`native`** — "As of Node.js v22.5.0,
  the `node:sqlite` module is available natively … works in all Node
  environments with Node.js version **22.5.0 or newer**" — and `bun`.
  It supersedes the deprecated `experimental.nativeSqlite`.
- Source (`module.mjs:386` `findBestSqliteAdapter`): `'native'` is honored
  only if `isNodeSqliteAvailable()` (`module.mjs:231`, probes
  `process.getBuiltinModule('node:sqlite')` and suppresses Node's "SQLite is
  an experimental feature" `ExperimentalWarning`). **Caveat:** if
  `node:sqlite` is unavailable the option silently falls through to the
  default path, which auto-installs/uses `better-sqlite3`.
- Status: experimental on both sides — the option lives under Content's
  `experimental` namespace, and `node:sqlite` itself is flagged experimental
  by Node (hence the suppressed warning). This repo sets it in
  `nuxt.config.ts` and runs Node 22.22.2, well above the 22.5.0 floor.

## 6. Nuxt 4 layers: auto-registration, priority, contributions

Docs: `nuxt/nuxt` `docs/2.directory-structure/1.layers.md` and
`docs/1.getting-started/14.layers.md` (rendered under `nuxt.com/docs/4.x/…`).

- **Auto-registration**: "Any layers within your project in the `layers/`
  directory will be automatically registered" (since v3.12). Source:
  `@nuxt/kit` `loadNuxtConfig` globs `layers/*` (directories only) and adds
  them to `_extends` (`@nuxt/kit/dist/index.mjs:793-798`) — the glob itself
  does not check for a config file, but the docs state the contract: "Every
  layer **must have** a `nuxt.config.ts` file to be recognized as a valid
  layer, even if it's empty." (All three layers in this repo have one.)
- **Priority** (getting-started/14.layers.md "Layer Priority", highest first):
  1. **project files**, 2. **auto-scanned `~~/layers`** — "sorted
  alphabetically (**Z has higher priority than A**)", 3. **`extends` entries**
  — "first entry has higher priority than second". The kit source sorts the
  scanned layers with `b.localeCompare(a)` (descending), matching the doc.
  Number-prefixing (`1.base/`, `2.theme/`) is the documented ordering control.
- **What a layer contributes** (directory-structure/layers.md "Layer
  Content"): `nuxt.config.ts` (merged), `app.config.ts`, `app/components/`
  (**auto-imported**), `app/composables/` (**auto-imported**), `app/utils/`
  (**auto-imported**), `app/pages/`, `app/layouts/`, `app/middleware/`,
  `app/plugins/`, `server/`, `shared/`. Local layer modules
  (`layers/*/modules/`) are scanned too (kit `resolveLayerPaths`,
  `@nuxt/kit/dist/index.mjs:1261-1301`). **`content/` is not a Nuxt-core
  layer directory** — but `@nuxt/content` itself iterates layers: it loads a
  `content.config` from every layer root (`module.mjs:2662-2666`) and
  registers each layer's `components/content/` dir (`module.mjs:3163-3171`).
- Named aliases `#layers/<name>` exist since v3.16.

## 7. Pages route precedence (root catch-all vs layer static routes)

Nuxt maps files to vue-router routes (`[x]` → `:x()`, `[...slug]` →
`:slug(.*)*` — evidenced by Nuxt's own `OPTIONAL_PARAM_RE =
/^\/?:.*(?:\?|\(\.\*\)\*)$/`, `nuxt/dist/index.mjs:1160`) and **vue-router
resolves by score, not registration order**. The ranking constants live in
the installed matcher (`vue-router@5.1.0/dist/vue-router.js:400-440`,
`tokensToParser`): per sub-segment, base 40; **static segment +40 (= 80)**;
**dynamic param +20 (= 60)**; custom regexp +10; optional −8; repeatable −20;
**`.*` (catch-all) −50**. Scores compare segment-by-segment, so one static
segment beats a param at the same position regardless of what follows.
(Nuxt's pages doc also states the coarser rule: "Named parent routes will
take priority over nested dynamic routes", and defers matching to vue-router's
dynamic-matching docs.)

Verified empirically against the installed vue-router 5.1.0 with this repo's
exact shapes — routes `/t/:tenant()/:space()/:slug(.*)*` (root
`app/pages/t/[tenant]/[space]/[...slug].vue`), `/t/atlas/:space()` (layer
`index.vue`), `/t/atlas/:space()/:slug(.*)*` (layer catch-all), registered
with the root catch-all *first*:

| URL | winner |
| --- | --- |
| `/t/atlas/field` | layer `index.vue` (`/t/atlas/:space()`) |
| `/t/atlas/field/x` | layer catch-all (`/t/atlas/:space()/:slug(.*)*`) |
| `/t/journal/current`, `/t/journal/current/x` | root catch-all |

i.e. the static `atlas` segment (80) beats `:tenant` (60) at position 2, and
within the atlas pair the plain `:space()` (60) beats the trailing catch-all
segment (negative score) for the bare Space URL. Layer-vs-project priority
(§6) is irrelevant here — these are *different* route paths, so ranking, not
file override, decides.

## 8. `#shared` alias and the `shared/` directory

Docs: `nuxt/nuxt` `docs/2.directory-structure/1.shared.md` (available since
v3.14).

- **`#shared` is a built-in alias**: "Any other files you create in the
  `shared/` folder must be manually imported using the `#shared` alias
  (**automatically configured by Nuxt**)".
- **Auto-imports are narrow**: "Only files in the `shared/utils/` and
  `shared/types/` directories will be auto-imported. Files nested within
  subdirectories of these directories will not be auto-imported" (unless
  added to `imports.dirs`/`nitro.imports.dirs`). Everything else in `shared/`
  — including files at its top level, like this repo's `shared/manifest.ts` /
  `shared/expand.ts` / `shared/routing.ts` — needs an explicit import
  (`#shared/...` or relative).
- **Environment constraint**: "Code in the `shared/` directory **cannot
  import any Vue or Nitro code**" — it must work in both the Vue app and the
  Nitro server.
- Layers contribute their own `shared/` (kit `resolveLayerPaths` includes
  `layers/*/shared/**`).

## 9. Nuxt Kit `addTemplate` / `addTypeTemplate`

Docs: `nuxt/nuxt` `docs/4.api/5.kit/10.templates.md`; source `@nuxt/kit/dist/index.mjs`.

- **`addTemplate`**: "Renders given template during build into the virtual
  file system, and optionally to disk in the project `buildDir`". `write:
  true` ⇒ written to `dst`; otherwise virtual-FS only. **`dst` defaults to
  `resolve(buildDir, filename)`** (`normalizeTemplate`, kit
  `index.mjs:1255` — `template.dst ||= resolve(buildDir, template.filename)`).
  Templates (re)generate on `builder:generateApp` (i.e. at `nuxt prepare`,
  dev start, and build; `updateTemplates` re-fires it).
- **`.d.ts` templates always write**: `if (template.filename.endsWith('.d.ts'))
  template.write = true` (kit `index.mjs:1254`).
- **`addTypeTemplate`** = `addTemplate` + enforcement that the filename ends
  in `.d.ts` + **self-registration in the generated tsconfig**: it hooks
  `prepare:types` and pushes `{ path: template.dst }` into `references`
  (Nuxt context by default; `nitro: true` adds it to Nitro's types; kit
  `index.mjs:1218-1240`). Docs: "Renders given template during build into the
  project buildDir, then registers it as types."
- **Aliasing a template's `dst`** (`nuxt.options.alias['#x'] = template.dst`)
  is not written up as a named pattern in the templates doc, but it is the
  idiom first-party code uses: `@nuxt/content` itself does
  `nuxt.options.alias = defu(nuxt.options.alias, { '#content/components':
  addTemplate(...).dst, '#content/manifest': addTemplate(...).dst })`
  (`module.mjs:3152-3155`) and `nitroConfig.alias['#content/dump'] =
  addTemplate(...).dst` (`module.mjs:2751`); Nuxt core aliases `#imports` to
  a buildDir path the same way (`nuxt/dist/index.mjs:3898`); kit's own
  `addPluginTemplate` consumes `addTemplate(plugin).dst` (kit
  `index.mjs:1729-1732`). This repo's `modules/routing.ts` (`#routing` →
  `template.dst`) matches that idiom exactly.

## 10. `useAsyncData` keys, payload, and blocking

Docs: `nuxt/nuxt` `docs/4.api/2.composables/use-async-data.md`,
`docs/1.getting-started/10.data-fetching.md`, `18.upgrade.md`.

- **Key semantics**: "a unique key to ensure that data fetching can be
  properly de-duplicated across requests". Omitted key ⇒ auto-generated from
  file name + line number (docs recommend always setting your own). A plain
  string key like `route.path` is evaluated once per component setup — each
  page path gets its own cache/payload entry; **Nuxt Content's own docs use
  exactly `useAsyncData(route.path, () => queryCollection(...).path(route.path).first())`**
  (`4.utils/1.query-collection.md`), so a route-derived dynamic key is the
  documented idiom, not an anti-pattern. Reactive keys (ref/computed/getter)
  are supported and auto-refetch when the key changes ("Reactive Keys").
- **The consistency rule** (Nuxt 4): calls sharing a key share the same
  `data`/`error`/`status` refs and **must use a consistent `handler`, `deep`,
  `transform`, `pick`, `getCachedData`, and `default`** — differing values
  trigger a dev warning ("Shared State and Option Consistency"; also an
  upgrade-guide migration item). `server`/`lazy`/`immediate`/`dedupe`/`watch`
  may differ. Nuxt 4 also changed `data`/`error` to default to `undefined`
  (not `null`).
- **SSR payload**: results fetched on the server are "adding responses to the
  Nuxt payload so they can be passed from server to client **without
  re-fetching the data on client side** when the page hydrates";
  `pick`/`transform` shrink what lands in the payload.
- **Blocking**: yes — awaiting `useAsyncData` at the top level of
  `<script setup>` blocks navigation by default. "By default, data fetching
  composables will wait for the resolution of their asynchronous function
  before navigating to a new page by using Vue's Suspense"; the
  `lazy` option opts out ("Under the hood, `lazy: false` uses `<Suspense>` to
  block the loading of the route before the data has been fetched.").

## 11. `ContentRenderer`

Docs: Content `docs/5.components/0.content-renderer.md`; source:
`@nuxt/content/dist/runtime/components/ContentRenderer.vue`.

- "renders a document coming from a query with `queryCollection()`" —
  `value` (the document) is the one required prop. Docs note: "This component
  **only works** with `Markdown` files."
- Source behavior (`ContentRenderer.vue:67-77, 167-188`): it renders
  `value.body` (falling back to `value` itself), converting the stored
  minimark AST to hast. `isEmpty = !body?.children?.length`; when empty it
  renders the **`empty` slot instead of the body — and the default empty slot
  renders nothing** (`<!-- nobody -->`). So a page item with an empty body
  renders nothing, silently, unless you provide `#empty` or a `v-if`
  fallback (the docs' "Handling Missing Pages" example uses `v-if="page"`).
- **`data` collections**: there is no documented support — data items have no
  `body` field unless the schema defines one (§3), and a JSON/YAML/CSV
  "body" is not a minimark tree, so the renderer lands in the empty branch.
  Rendering data-collection items is the layer component's job, not
  `ContentRenderer`'s.

## 12. `content.config.ts` evaluation and dev watching

Source: `@nuxt/content/dist/module.mjs:2652` (`loadContentConfig`) and `c12`
3.3.4 (`c12/dist/index.mjs`).

- **Loader**: the config is loaded with **c12** (`loadConfig` /
  `watchConfig`, imported at `module.mjs:46`), and c12 imports the file via
  **jiti** (`c12/dist/index.mjs:8, 123, 318`) — so TS + imports work without
  a build step. One config is loaded per Nuxt layer rootDir (name
  `content`), with the project's collections overriding a layer's on key
  collision (`module.mjs:2662-2681`).
- **When it's evaluated**: once, inside the Content module's `setup()`
  (`module.mjs:3131`) — i.e. at every **`nuxt prepare`**, **dev-server
  start**, and **`nuxt build`**. There is no separate codegen step; the
  collections (and anything the config computes from its imports) are
  re-derived from scratch on each of those runs.
- **Dev watching — the sharp edge**: in dev, c12's `watchConfig` watches
  **only the config-file candidates themselves** — `content.config.<ext>` and
  `.config/content.<ext>` in each layer cwd (plus rcfile/package.json if
  enabled) — see the `watchingFiles` construction at
  `c12/dist/index.mjs:356-375`. On a change it hard-restarts Nuxt
  ("`content.config.ts updated, restarting the Nuxt server...`",
  `module.mjs:2656-2659`). **It does *not* watch files imported by
  `content.config.ts`.** Separately, Nuxt watches local module files, so
  editing `modules/routing.ts` itself also hard-restarts dev
  (`nuxt/dist/index.mjs:7227-7228, 7400-7403`) — but that watch list contains
  the module entry files, not their imports.
- **Consequence for this repo's claim** ("a manifest edit is picked up by
  `nuxt dev` with no regenerate step"): the *no-regenerate-step* half is true
  — nothing committed needs regenerating; the next `prepare`/`dev`/`build`
  derives everything. As of `modules/routing.ts` explicitly pushing each
  Tenant's `tenant.config.ts` and `shared/expand.ts` onto `nuxt.options.watch`
  in dev (issue #325), a **running** dev server now picks up an edit to an
  *existing* Tenant's `tenant.config.ts` or `shared/expand.ts` with an
  automatic restart, same as `content.config.ts`/`modules/routing.ts` itself.
  The one remaining gap: a brand-new `layers/<tenant>/` directory still needs
  a manual restart, since layer auto-extension resolves before this module's
  watcher registers. (Content *documents* are a separate, hot path: the
  module chokidar-watches each source's cwd/prefix dirs and re-parses changed
  files live, `module.mjs:1769-1800`.)

## Sources

- Nuxt Content docs source, tag **v3.15.0** (`github.com/nuxt/content`,
  rendered at `content.nuxt.com/docs/…`): `docs/content/docs/2.collections/`
  `1.define.md` / `2.types.md` / `3.sources.md` / `4.validators.md`;
  `4.utils/1.query-collection.md`; `5.components/0.content-renderer.md`;
  `1.getting-started/3.configuration.md` (§ `experimental.sqliteConnector`).
- Nuxt docs source, tag **v4.4.8** (`github.com/nuxt/nuxt`, rendered at
  `nuxt.com/docs/4.x/…`): `docs/2.directory-structure/1.layers.md`,
  `1.shared.md`, `1.app/1.pages.md`; `docs/1.getting-started/14.layers.md`,
  `10.data-fetching.md`, `18.upgrade.md`;
  `docs/4.api/2.composables/use-async-data.md`; `docs/4.api/5.kit/10.templates.md`.
- Installed `@nuxt/content` **3.15.0**: `dist/module.mjs` (line-cited above),
  `dist/module.d.mts:279-302` (item base types),
  `dist/runtime/components/ContentRenderer.vue`, `dist/runtime/client.js`,
  `dist/runtime/internal/query.js`.
- Installed `@nuxt/kit` **4.4.8**: `dist/index.mjs:793-798` (layers/* scan),
  `1218-1240` (`addTypeTemplate`), `1241-1257` (`normalizeTemplate`).
- Installed `nuxt` **4.4.8**: `dist/index.mjs:1160` (`OPTIONAL_PARAM_RE`),
  `3898` (`#imports` alias), `6980-6988` (layers dir watch),
  `7227-7228`/`7400-7403` (module-file watch/restart).
- Installed `vue-router` **5.1.0**: `dist/vue-router.js:400-440`
  (`tokensToParser` scoring) — plus an ad-hoc `createRouter().resolve()`
  probe against this repo's exact route shapes (run 2026-07-11, not committed).
- Installed `c12` **3.3.4**: `dist/index.mjs:8/123/318` (jiti), `356-375`
  (`watchConfig` watched-file set).
- This repo: `content.config.ts`, `modules/routing.ts`, `nuxt.config.ts`
  (the surfaces these facts ground).
