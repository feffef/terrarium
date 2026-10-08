# Diagram brief: how the Nuxt application is built

Research for an interactive architecture diagram of the Terrarium Nuxt app.
Written 2026-10-08 against `main` at `c1f25c18`. Every claim here was checked
against the code, and an independent reviewer cross-checked them too. **Bold**
terms are defined in [`CONTEXT.md`](../../CONTEXT.md).

Its companion, [`diagram-brief-improvement-loop.md`](./diagram-brief-improvement-loop.md),
covers how humans and agents change the app. This brief covers what the app
*is*.

## 1. The idea in one paragraph

Terrarium is **one** Nuxt app (the **Platform**) that hosts several separate
websites (**Tenants**), such as a field guide, a blog and a shop. Each Tenant
is a folder under `layers/<tenant>/` that holds three things:

- its look and code: pages, components and CSS;
- its content: Markdown/YAML **Documents**;
- a small manifest that declares its **Spaces** (separate content variants)
  and **Collections** (content types).

At build time the Platform reads every manifest and turns the content into one
database, along with a routing map and a cross-Tenant catalog. At request time
a URL is matched to exactly one Tenant's content. That lookup is what keeps
Tenants apart. A single container rebuilds the whole thing from GitHub
whenever `main` changes.

**The organising principle: decide it at build time.** Nothing is created or
written while the site runs. There is no live database writing and no site
provisioned on the fly. Everything that is served was declared in the repo
and compiled first, so the whole of what ships is visible in a diff. This is
what makes a codebase written by agents reviewable.
(`layers/journal/content/current/pages/architecture.md`, lines 18–23. The only
runtime state is in the visitor's browser, e.g. the Tinkerfund cart.)

## 2. The building blocks

| Block | One-line role | Where |
|---|---|---|
| **Tenant layers** | One per site: manifest, content, pages, components, CSS. | `layers/<tenant>/` (ADR-0018); how-to: `docs/agents/tenant-layers.md` |
| **Manifest** | Declares a Tenant's Spaces, Collections, their schemas and an optional *kind*. | `layers/<tenant>/tenant.config.ts`; types and validation: `shared/manifest.ts` |
| **Expansion** | Reads all manifests and builds the full list of Tenant × Space × Collection, the single source for everything below. | `shared/expand.ts` (`expand()`) |
| **Nuxt Content** | The content engine. Parses the Documents, checks them against their schemas, stores them in SQLite, answers `queryCollection()` on server and browser. | `@nuxt/content`, configured by `content.config.ts` (ADR-0002, ADR-0013) |
| **Routing map** (`#routing`) | Generated lookup: Tenant → Space → its tables. | `modules/routing.ts` (ADR-0014) |
| **Catalog** (`#catalog`) | Generated list of only those Collections that opted in to cross-Tenant reading via a *kind* (`page`, `session`). | `modules/catalog.ts`, `shared/kinds.ts` (ADR-0025) |
| **Route resolver** | Turns `/t/<tenant>/<space>/<slug>` into that Space's tables, and nothing else. The isolation decision. | `shared/routing.ts` (`resolveSpaceRoute`), used via `app/composables/space.ts` (`useSpace`) |
| **Generic page renderer** | Renders any Space page a Tenant hasn't built itself. | `app/pages/t/[tenant]/[space]/[...slug].vue` (ADR-0006) |
| **Cross-Tenant reader** | The one sanctioned way to read other Tenants: through the Catalog. | `app/composables/catalog.ts` (`queryAcrossTenants`, `queryPages`) |
| **Platform home** | `/`, a showcase of every Tenant. | `app/pages/index.vue` |
| **Nitro server + page cache** | Nuxt's built-in server. Renders pages and keeps rendered `/t/**` pages in an in-memory cache for 60 s. | `nuxt.config.ts` (`routeRules`, `nitro.storage`) |
| **Self-updating container** | Clones `main` from GitHub, builds, serves; polls for new commits and swaps in the new build. | `deploy/` (ADR-0011) |

The Tenants (48 tables in total; the Catalog holds 12 `page` and 2 `session`
Collections):

| Tenant | Spaces | Collections | Purpose (tooltip material) |
|---|---|---|---|
| **Journal** | `current`, `archived` | 3 (pages, skills, **sessions**) | The Platform's self-documentation: session logs, digests, Skill Inventory |
| **Blog** | 4 Personas | 2 | In-character commentary on real repo activity |
| **Atlas** | `canopy`, `floor`, `pool` | 3 | Fictional field guide, design showpiece |
| **Midden** | `trench`, `stores` | 3 | Catalogue of the Platform's own discarded work |
| **Marquee** | `reel` | 1 | Movie blog (guest-requested) |
| **Tinkerfund** | `prod`, `qa` | 8 | Simulated crowdfunding shop; the largest layer |
| **Commons** | `search`, `timeline` | 1 | The **Aggregator**: reads other Tenants through the Catalog |

## 3. Build time: from repo to running app

1. **Inputs (all in git):** each layer's manifest, its content files, its
   pages/components/CSS, and the shared contract in `shared/`.
2. **Expansion:** `expand()` reads every manifest (`shared/expand.ts`).
3. **Three generated outputs from that one expansion.** Because all three come
   from the same expansion, they can never disagree:
   - **content tables:** Nuxt Content loads each Collection's files from
     `layers/<t>/content/<space>/<collection>/` into its own SQLite table,
     validating every Document against its schema (`content.config.ts`);
   - **`#routing`** (`modules/routing.ts`);
   - **`#catalog`** (`modules/catalog.ts`).
4. **Layer merge:** Nuxt merges every layer's pages, components and config
   into the one app. A layer can also change Platform-wide settings. For
   example, `layers/tinkerfund/nuxt.config.ts` adds its own cache rules and
   page transitions, and `layers/journal/nuxt.config.ts` reads the repo's
   `.agents/skills/` folder.
5. **`nuxt build`** produces one Node server with one SQLite database and the
   browser bundle.

None of the generated files is committed. Adding a Tenant automatically
creates its tables, routes and catalog entries. Its e2e test hook
(`tests/e2e/smoke.spec.ts`), the home page showcase and the footer still need
hand edits.

A small side path: Mermaid diagrams in Markdown are pre-rendered to SVG when
they are authored and committed (`app/assets/mermaid/`, ADR-0024), so no
browser is needed on the server.

## 4. Request time: from URL to page

1. Browser → Caddy (`terrarium.feffef.de`) → the container's Nitro server.
   Rendered `/t/**` pages come from the 60 s cache when available.
2. The path picks a page. In order:
   - `/` → Platform home;
   - `/t/<tenant>` → that Tenant's own front door (ADR-0016);
   - `/t/<tenant>/<space>/…` → the Tenant's own page if it has one, else the
     generic renderer.
3. The page asks `useSpace('<tenant>')` for its tables. An unknown Tenant or
   Space → 404 (`app/error.vue`). It then queries that Space's table with
   `queryCollection()`. A missing Document renders a "not found" page with
   status 404.
4. The server renders HTML. For later clicks the browser fetches a ready-made
   data file per page instead of querying (ADR-0028). Only in rare cases
   does the browser load its own copy of a table (WASM SQLite), with a
   recovery dialog if that fails.

## 5. Isolation: how Tenants stay apart

- **One table per (Tenant, Space, Collection),** all in one database in one
  container: "cleanly separated, not air-gapped" (ADR-0001).
- **Normal Tenants read only their own Space,** through the route resolver.
- **Opt-in cross-Tenant reading.** A Collection that declares a *kind* appears
  in the Catalog. An **Aggregator** (Commons: Search and Timeline,
  `layers/commons/app/composables/timeline.ts`) reads only those tables, via
  the cross-Tenant reader.
- **A human must merge any change to this machinery:** `shared/`, `modules/`,
  `content.config.ts`, the root `nuxt.config.ts`,
  `app/composables/catalog.ts` (full list: `CLAUDE.md` → Ground rules). A
  padlock on those three or four nodes says it.
- **It is a convention, not a sandbox.** All layers share one code namespace,
  so nothing technically stops a layer from querying another Tenant's table.
  Review and the isolation tests (`tests/unit/expand.spec.ts`,
  `routing.spec.ts`, `kinds.spec.ts`) hold the line.

## 6. Delivery (inset; the companion brief has the detail)

A change passes the **Gate** (tests and checks, locally and in GitHub CI,
ADR-0004), merges to `main` on GitHub, and the container on the server
notices within about two minutes. It rebuilds and swaps in the new version.
If the build fails, the old version keeps serving
(`deploy/entrypoint.sh`, `deploy/docker-compose.yml`).

## 7. Recommended diagram

**Zoom 0, the overview: three columns, left to right.**

1. **Repo (GitHub):** 7 Tenant cards (name, Spaces, Collection count; purpose
   on hover) plus the `shared/` contract box.
2. **Build:** expansion → content tables + `#routing` + `#catalog` (via Nuxt
   Content), plus "layers merged into one app" → one server bundle. Caption:
   *decide it at build time*.
3. **Run:** Browser → Caddy → container (Nitro + cache + SQLite) → page →
   `useSpace` → that Space's tables. GitHub → container edge labelled "polls
   `main`, rebuilds".

**Zoom 1, a request trace** (step-through): §4, with the branches *Tenant
page vs generic renderer* and *server render vs next-click data file*, and the
404 exit.

**Zoom 2, isolation:** a grid of Tenants × Spaces with their tables. Highlight
the Catalog-tagged ones, and show Commons reading them through the Catalog
(accent colour). The Platform home's direct reads are a dashed warning edge
(see §8).

Edge legend: solid = build-time derivation, bold = runtime query, accent =
sanctioned cross-Tenant read, dashed = known exception. Padlock = human
merges.

**Leave out:** agent tooling (guards, Skills, session logs, which go in the
companion diagram), individual files and components (show counts), function
names beyond `expand`/`useSpace`, config values, the browser-DB recovery
internals, and superseded designs: ADR-0007 (committed generated config) and
ADR-0019 (patched @nuxt/content) are no longer how it works.

**Reuse:** the Journal page
`layers/journal/content/current/pages/architecture.md` already tells this
story for visitors in three Mermaid diagrams. Keep the new one consistent with
it.

## 8. Known gaps between docs and code (label them honestly)

- **The Platform home reads Tenants directly.** `app/pages/index.vue` queries
  Atlas, Midden and Tinkerfund tables without going through the Catalog
  (Tinkerfund has no kind at all), and uses Tenant-layer code.
- **The footer is hard-coded.** `app/components/SiteFooter.vue` leaves out
  Marquee and Commons.
- Footnote, not an exception: the Blog's post page links that day's Journal
  digest through the sanctioned `queryPages()` helper, although `CONTEXT.md`
  says only Aggregators read across.
