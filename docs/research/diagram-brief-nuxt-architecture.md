# Diagram brief: how the Nuxt application is built

Research for an interactive architecture diagram of the Terrarium Nuxt app.
Written 2026-10-08 against `main` at `c1f25c18`. Every claim here was checked
against the code. Where a doc and the code disagree, the code wins, and §8
lists the gaps. Words in **bold capitals** (Tenant, Space, …) are glossary
terms; [`CONTEXT.md`](../../CONTEXT.md) defines them.

Its companion, [`diagram-brief-improvement-loop.md`](./diagram-brief-improvement-loop.md),
covers how humans and agents change the app. This brief covers what the app
*is*.

## 1. The idea in one paragraph

Terrarium is **one** Nuxt app (the **Platform**) that hosts several separate
websites (**Tenants**), such as a blog, a field guide and a shop. Each Tenant
is a Nuxt *layer* in `layers/<tenant>/`. A layer brings its own pages,
components and styling, plus a small manifest, `tenant.config.ts`, that
declares the Tenant's **Spaces** (separate content variants) and
**Collections** (content types). At build time the Platform reads every
manifest and generates three things: the content tables, a routing map and a
cross-Tenant catalog. At request time a URL `/t/<tenant>/<space>/<slug>` is
resolved through the routing map to exactly one Tenant's tables. That
lookup is what keeps Tenants apart. One container builds and serves it all.

The building metaphor from `CONTEXT.md` helps: the Platform is the building,
a Tenant leases a floor and fits it out, and Spaces are that Tenant's rooms.

## 2. The parts

### 2.1 The shared contract (`shared/`)

| Part | Role | File |
|---|---|---|
| Manifest types and validation | `defineTenant()` and a strict zod `validateManifest()` (slug format, known kinds). `collectionKey(t,s,c)` builds `<tenant>_<space>_<collection>`, the table name and the unit of isolation. | `shared/manifest.ts` |
| Expansion | `loadManifests()` loads every `layers/*/tenant.config.ts` with jiti. `expand()` builds the Tenant × Space × Collection cross-product, merges each kind's contract into the schema and checks keys are unique. Also `catalogFrom()` and `entryRoutesFrom()` (smoke-test routes). | `shared/expand.ts` |
| Collection kinds | The `KINDS` registry: `page` (optional `publishedAt`, `summary`) and `session` (the whole session-log shape). A kind is how a Collection opts into cross-Tenant reads. | `shared/kinds.ts`, `shared/schemas/session.ts`, `shared/schemas/timestamp.ts` |
| Route resolution | `resolveSpaceRoute(tenant, space, slug)` reads only `routingMap[tenant][space]` and returns `{pagesKey, collections, path, atRoot}` or null. **This is the isolation decision.** Also `documentUrl`, `slugToPath`. | `shared/routing.ts` |

### 2.2 Build-time generators (root of the repo)

| Part | Role | File |
|---|---|---|
| Root Nuxt config | Registers `./modules/routing`, `@nuxt/content`, `@nuxt/eslint`. It has no `extends` list, because Nuxt auto-extends every `layers/*` (ADR-0018). Sets `/t/**` page cache (60 s), the LRU cache store, the native SQLite connector, and client payload extraction (ADR-0028). | `nuxt.config.ts` |
| Content config | A dynamic file: runs `expand(loadManifests())` and calls `defineCollection` once per key. Result: one SQLite table per (Tenant, Space, Collection). | `content.config.ts` (ADR-0013) |
| Routing module | Writes `.nuxt/routing.mjs` (tenant → space → collection → key) and exposes it as the virtual import `#routing`. | `modules/routing.ts` (ADR-0014) |
| Catalog module | Writes `.nuxt/catalog.mjs` (`catalog`, `catalogByKind()`) as `#catalog`, listing only Collections that declared a kind. Not listed in `nuxt.config.ts`: Nuxt auto-registers everything in `modules/`. | `modules/catalog.ts` (ADR-0025) |

None of these generated files is committed; `.nuxt/` is regenerated on every
build. ADR-0007 (commit generated config) is superseded.

### 2.3 Platform runtime (`app/`)

| Part | Role | File |
|---|---|---|
| Generic page renderer | Catch-all for any Space URL that has no layer route. `useSpace()` → `queryCollection(pagesKey).path(…).first()` → `<ContentRenderer>`. At a Space root it also loads the Space's data collections. | `app/pages/t/[tenant]/[space]/[...slug].vue` (ADR-0006) |
| `useSpace(tenant)` | The one presentation-side door into routing: wraps `resolveSpaceRoute`, throws 404. | `app/composables/space.ts` |
| Cross-Tenant read helpers | `queryAcrossTenants(kind, …)` and `queryPages()` fan out over `#catalog`. The only sanctioned way to read another Tenant's content. | `app/composables/catalog.ts` |
| Platform home `/` | Showcase of all Tenants. | `app/pages/index.vue` |
| Mermaid in Markdown | ` ```mermaid ` blocks are routed by `ProsePre` to `MermaidDiagram`, which inlines an SVG **pre-rendered and committed** at authoring time (no browser at runtime). | `app/components/content/ProsePre.vue`, `app/components/MermaidDiagram.vue`, `app/assets/mermaid/*.svg`, `scripts/render-mermaid.ts`, `scripts/verify-mermaid.ts` (ADR-0024) |
| Content-load recovery | If the browser-side content DB or a JS chunk fails to load, show a dialog or do one guarded reload. Replaces the old @nuxt/content patch (ADR-0019, superseded). | `app/components/ContentLoadErrorDialog.vue`, `app/composables/contentLoadRecovery.ts`, `app/plugins/chunk-errors.client.ts`, `app/utils/chunkRecovery.ts` |
| Cross-site footer | "Elsewhere:" links between sites, from a hard-coded list. | `app/components/SiteFooter.vue` |

There is no `server/` directory and no route middleware. The server is Nuxt's
default Nitro server plus Nuxt Content's own endpoints.

### 2.4 Tenant layers (`layers/<tenant>/`)

Every layer has the same shape (`docs/agents/tenant-layers.md` is the how-to):

- `tenant.config.ts`: the manifest (Spaces, Collections, schemas, kinds).
- `nuxt.config.ts`: mostly a CSS theme.
- `app/pages/t/<tenant>/index.vue`: the Tenant's own front door (ADR-0016).
  Usually `[space]/index.vue` and `[space]/[...slug].vue` too, which take
  priority over the Platform catch-all.
- `app/components/<tenant>/`, composables, utils: the Tenant's "fit-out".
- `content/<space>/<collection>/`: the Markdown/YAML Documents.
- `CONTEXT.md`: the Tenant's own vocabulary.
- `tests/unit/*.spec.ts`, `tests/e2e/*.e2e.ts`.

| Tenant | What it is | Spaces | Collections (kind) |
|---|---|---|---|
| **Journal** | The Platform's honest self-documentation: session logs, digests, Skill Inventory. Infrastructure, not a demo. | `current`, `archived` | pages (page), skills, sessions (session) |
| **Blog** | In-character commentary on real repo activity by four Personas. | `david`, `karen`, `kevin`, `eyra` | pages (page), pingbacks |
| **Atlas** | Fictional natural-history field guide; design showpiece. | `canopy`, `floor`, `pool` | pages (page), interactions, observations |
| **Midden** | Archaeology-style catalogue of the Platform's own discarded work. | `trench`, `stores` | pages (page), artifacts, labels |
| **Marquee** | MCU movie blog in story order (guest-requested). | `reel` | pages (page) |
| **Tinkerfund** | Simulated crowdfunding shop; the most routes and components. | `prod`, `qa` | pages, inventors, categories, comments, updates, promotions, backer, shop (no kinds) |
| **Commons** | The **Aggregator**: owns almost no content, reads others via the Catalog. | `search`, `timeline` | pages (no kind) |

In total this gives 48 collection keys (= SQLite tables). The Catalog holds
12 `page`-kind collections and 2 `session`-kind ones (the Journal's two
`sessions`). Recount by running `expand(loadManifests())` rather than by
hand; a hand tally has been wrong before.

## 3. Build-time flow (what to draw as a pipeline)

```
layers/*/tenant.config.ts
        │ loadManifests() + validateManifest()     shared/expand.ts, shared/manifest.ts
        ▼
     expand()  ──────────────┬──────────────────────┬────────────────────┐
        ▼                    ▼                      ▼                    ▼
 content.config.ts     modules/routing.ts     modules/catalog.ts   tests/support/e2e.ts
 → SQLite tables       → #routing             → #catalog           → smoke-test routes
   _content_<key>
                    + Nuxt auto-extends layers/* (pages, components, CSS)
                                     ▼
                          nuxt build → .output/
           (Nitro server, server SQLite DB, client bundle, per-collection SQL dumps)
```

Key message: **three consumers run the same `expand()` independently**, so
content tables, routes and catalog can never disagree. Adding a Tenant means
adding a layer folder and nothing else; it appears everywhere at the next
build.

## 4. Request-time flow (what to draw as a lifecycle)

1. Browser → Caddy (`terrarium.feffef.de`) → the container's Node server.
2. Nuxt matches the path. Precedence:
   - `/` → Platform home.
   - `/t/<tenant>` → that layer's front door.
   - `/t/<tenant>/<space>/…` → the layer's own route if it has one, else the
     Platform catch-all.
3. The page calls `useSpace('<tenant>')` → `resolveSpaceRoute` against
   `#routing`. Unknown Tenant/Space/page → 404.
4. `queryCollection(<key>)` runs **on the server** against the native SQLite
   DB. The page renders with `ContentRenderer` or Tenant components. Nitro
   caches the HTML for 60 s.
5. **Client-side navigation** (ADR-0028): the browser fetches the next route's
   `_payload.json` instead of querying. Only in rare cases (Tinkerfund search,
   re-queries after mount, a failed payload) does the browser lazily load a
   WASM SQLite plus that collection's SQL dump. A failure there goes to the
   recovery dialog or a one-time reload.

## 5. Isolation and the one sanctioned cross-Tenant path

- **Physical:** one table per (Tenant, Space, Collection), all in one
  database in one container: "cleanly separated, not air-gapped" (ADR-0001).
- **Logical gate:** `resolveSpaceRoute` only returns keys under the requested
  Tenant and Space. Normal Tenants read only through it.
- **Opt-in cross-Tenant reads (ADR-0025):** a Collection that declares a
  `kind` lands in `#catalog`. An Aggregator reads `catalogByKind()` via
  `queryAcrossTenants` / `queryPages`. Commons is the Aggregator. Its
  `queryTimeline()` (`layers/commons/app/composables/timeline.ts`) merges
  pages, digests and sessions for the Timeline, and Search queries all
  `page`-kind collections.
- **The guarded files:** `content.config.ts`, `shared/expand.ts`,
  `shared/routing.ts`, `shared/kinds.ts`, `shared/schemas/`,
  `shared/manifest.ts`, `modules/routing.ts`, `modules/catalog.ts`,
  `app/composables/catalog.ts` and the root `nuxt.config.ts` are
  **Human-only**: an agent may edit them, but a human must merge. A padlock
  badge on these nodes shows that well.
- **Isolation is a convention, not a sandbox.** Nuxt layers share one
  auto-import namespace and one CSS/plugin space, so nothing technically stops
  a layer from querying another Tenant's table. Code review and tests (L3:
  `tests/unit/expand.spec.ts`, `routing.spec.ts`, `kinds.spec.ts`) hold the
  line. Known exceptions are in §8.

## 6. Delivery (small inset, details in the companion brief)

- **Gate:** `scripts/gate.ts` runs a Floor tier (skills-lock and mermaid drift
  checks, lint, typecheck, content validation) and a Heavy tier (unit tests,
  build, e2e smoke). Heavy is skipped when every changed path is Inert. CI runs
  the same steps via `.github/workflows/gate.yml` →
  `.github/actions/gate/action.yml` (ADR-0004, ADR-0026). Tests:
  `vitest.config.ts`, `tests/unit/`, `tests/e2e/smoke.spec.ts` (which also
  runs each layer's `register<Tenant>E2E()`).
- **Deploy (ADR-0011):** `deploy/Dockerfile` contains no app source.
  `deploy/entrypoint.sh` clones `main`, installs, builds, serves
  `.output/server/index.mjs`, then polls `origin/main` every 120 s and rebuilds
  and swaps atomically. A failed build keeps the old version serving.
  `deploy/docker-compose.yml` puts it behind Caddy. Every commit to `main` goes
  live within minutes.

## 7. Recommended diagram

**Zoom 0, the overview: three columns, left to right.**

1. **Author** (the repo): the 7 Tenant layer cards (collapsed: name, Spaces,
   one-line purpose) and the `shared/` contract box.
2. **Build**: `expand()` fanning out to *content tables*, *#routing* and
   *#catalog*, plus "layers merged into one app" → `nuxt build`.
3. **Run**: Browser → Caddy → container (Nitro + SQLite) → page →
   `useSpace` → table.

**Zoom 1, a request trace** (animated or step-through): the path from §4,
with the two branches (layer route vs Platform catch-all, server render vs client
payload) and the 404 exit.

**Zoom 2, isolation**: a grid of Tenants × Spaces with their tables, the
Catalog-tagged tables highlighted, and Commons drawing accent-coloured arrows
into them via `#catalog`. Show the known exceptions as dashed warning edges.

**Zoom 3, delivery inset**: Gate (Floor/Heavy) → `main` → self-updating
container.

Edge legend: solid = build-time derivation, bold = runtime query, accent =
sanctioned cross-Tenant read, dashed red = known exception. Padlock =
Human-only file.

**Leave out:** the agent tooling (guards, session-log scripts, Skills; these
belong in the companion diagram), commit/GitHub provenance (ADR-0017, not
part of the app), individual content files and components (show counts),
TypeScript/tsconfig plumbing, and the removed ADR-0019 patch.

**Reuse:** `layers/journal/content/current/pages/architecture.md` already
explains this for visitors with three Mermaid diagrams ("One application,
many sites", "Manifests, not wiring", "How it ships"). Keep the new diagram
consistent with it.

## 8. Known gaps between docs and code (draw honestly, label them)

- `app/pages/index.vue` (the Platform home) reads Atlas, Midden and
  Tinkerfund tables directly via `resolveSpaceRoute` + `queryCollection`,
  outside the Catalog, and uses Tenant-layer auto-imports. Tinkerfund pages
  have no kind, so they aren't in the Catalog at all.
- The Blog's post page
  (`layers/blog/app/pages/t/blog/[space]/[...slug].vue` ~l.49–53) calls
  `queryPages()` to link that day's Journal digest. It does go through the
  sanctioned helper, but `CONTEXT.md` says only Aggregators read across.
- `SiteFooter.vue`'s list omits Marquee and Commons.
- ADR-0007 and ADR-0019 are superseded. Don't draw committed generated config
  or a patched @nuxt/content.
