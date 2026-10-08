# Diagram brief: how the Terrarium app is built

Source material for an interactive architecture diagram aimed at outside
visitors. Written 2026-10-08 against `main` and checked against the code in
three review rounds.

**Term convention.** Every node is labelled with the project's own term,
exactly as the glossary [`CONTEXT.md`](../../CONTEXT.md) spells it, with a
plain subtitle underneath, for example **Space** · *one area of a Tenant*. In
prose, glossary terms are **bold** on first use and other bold text is
emphasis.

How to use this brief:
- §1 builds the mental model in plain words.
- §2 introduces the seven Tenants.
- §3 gives ready-made nodes, edges and captions for each zoom level.
- §4 says what to leave out and what to label honestly.
- The further-reading table points to the decisions behind each part.

## 1. The app in plain words

**The metaphor.** The glossary uses commercial real estate:
- the **Platform** is one building;
- each **Tenant** leases its part of it and does its own *fit-out*: its own
  look and components;
- a Tenant uses its rented **Spaces** for different purposes, like a live
  floor, a test lab or a demo showroom.

(`CONTEXT.md` → The metaphor.)

**One app, seven Tenants.** The Platform is a single Nuxt web application.
It hosts seven Tenants: seven separate websites with their own design. Each
Tenant is a folder, `layers/<tenant>/` (in Nuxt terms, a *layer*), holding:
- its fit-out: pages, components, styles;
- its **Documents**: Markdown and YAML content files;
- a short **Tenant manifest** listing its Spaces and its **Collections**
  (its types of content).

**Decide it at build time.** Nothing changes while the site runs. No Tenant
is created on the fly, and no content is written to a database. Everything
served was committed to the repository and compiled first, so every change
is visible in a diff that can be reviewed. That matters because AI agents
write the code.

**The build turns manifests into three things:**
- one table per Collection in each Space of each Tenant;
- the **routing map**: which web address leads to which tables;
- the **Catalog**: the Collections that other Tenants may read.

**A request reaches exactly one Tenant.** An address like
`/t/atlas/canopy/<page>` is looked up in the routing map. It leads only to
the tables of that Tenant's Space, and this is what keeps the Tenants apart.

**One Tenant reads across.** **Commons** is an **Aggregator**, the
building's shared lobby. Its Search and Timeline read only Collections that
another Tenant opted into the Catalog. The opt-in is a **Collection kind**:
`page` or `session`.

**Shipping.** A container on the server watches the GitHub repository. When
`main` changes, it rebuilds and switches over; if the build fails, the old
version keeps running.

> repository → build reads Tenant manifests → tables + routing map + Catalog →
> one server → a visitor's address reaches one Tenant's Space

## 2. The seven Tenants

The seven Tenants fall into two groups (`CONTEXT-MAP.md` → Relationships;
`layers/journal/content/current/pages/real-and-invented.md`). Draw them as
two boxes.

**Record of the real build**

| Tenant | Subtitle | Spaces | Pointer |
|---|---|---|---|
| **Journal** | Honest record of the agents' work | `current`, `archived` | `layers/journal/` |
| **Blog** | Fictional writers retelling real activity | 4 **Personas** | `layers/blog/` |
| **Midden** | Museum of the project's discarded work | `trench`, `stores` | `layers/midden/` |
| **Commons** | Search and Timeline across Tenants (**Aggregator**) | `search`, `timeline` | `layers/commons/` |

**Practice grounds and demos (invented)**

| Tenant | Subtitle | Spaces | Pointer |
|---|---|---|---|
| **Atlas** | Fictional nature field guide | 3 **Biomes** | `layers/atlas/` |
| **Tinkerfund** | Make-believe crowdfunding shop | `prod`, `qa` | `layers/tinkerfund/` |
| **Marquee** | Marvel movie blog, requested by a guest | 1 **Screening** | `layers/marquee/` |

Tooltip counts (2026-10-08; reproduce with `expand(loadManifests())` in
`shared/expand.ts`):
- 16 Spaces in total;
- 48 Collections, one table each;
- 14 of those Collections are in the Catalog: 12 of kind `page`, 2 of kind
  `session` (the Journal's session logs);
- Commons' own pages are left out of the Catalog on purpose, so it never
  lists itself.

## 3. Diagram items

### Zoom 0: the big picture

- **Layout:** three columns: Repository → Build → Running site.
- **Caption:** "Everything is decided at build time."
- **Grouping:** draw one band labelled **Human-only** around the isolation
  machinery (`reader`, `engine`, `routing`, `catalog`, `platform`). Only a
  human may merge changes there (`CLAUDE.md` → Ground rules).

**Nodes**

| ID | Label | Subtitle | Pointer |
|---|---|---|---|
| repo | **GitHub repository** | All code and content | `README.md` |
| tenant ×7 | **Tenant** (e.g. Atlas) | One website: fit-out, Documents, manifest | `layers/<tenant>/` |
| manifest | **Tenant manifest** | Lists the Tenant's Spaces and Collections | `layers/<tenant>/tenant.config.ts` |
| reader | **Manifest expansion** | Lists every Tenant × Space × Collection | `shared/expand.ts`, `shared/manifest.ts` |
| engine | **Nuxt Content** | Checks Documents and loads them into tables | `content.config.ts` |
| routing | **Routing map** | Address → that Space's tables | `modules/routing.ts`, `shared/routing.ts` |
| catalog | **Catalog** | Collections other Tenants may read | `modules/catalog.ts`, `shared/kinds.ts` |
| platform | **Platform** | All Tenant layers merged into one Nuxt app | `nuxt.config.ts` |
| db | **Content database** | One SQLite file, one table per Collection | build output |
| server | **Self-updating container** | Pulls, builds, serves, swaps versions | `deploy/entrypoint.sh` |
| visitor | **Visitor** | Opens pages in a browser | – |

**Edges**

| From → To | Label | Style | Note |
|---|---|---|---|
| tenant → manifest | declares | solid | |
| tenant → engine | Documents | solid | |
| tenant → platform | fit-out | solid | |
| manifest → reader | read at build | solid | |
| reader → engine, routing, catalog | generates | solid | all three come from one expansion, so they never disagree |
| engine → db | fills | solid | |
| repo → server | watches `main`, rebuilds | solid | tooltip: checks every 2 minutes |
| visitor → server | requests a page | bold | |

### Zoom 1: one page request

- **Layout:** left-to-right trace.
- **Caption:** "One address, one Tenant's Space."
- **Worked example:** `/t/atlas/canopy/<page>`.

**Nodes**

| ID | Label | Subtitle | Pointer |
|---|---|---|---|
| visitor | **Visitor** | Browser | – |
| web | **Nitro server** | Nuxt's server; renders the page to HTML | `nuxt.config.ts` |
| page | **Tenant page** | The Tenant's own page design | `layers/<tenant>/app/pages/t/<tenant>/` |
| lookup | **useSpace** | Finds that Space's tables in the routing map | `app/composables/space.ts`, `shared/routing.ts` |
| tables | **Space's Collections** | The content of one Space | – |

**Edges**

| From → To | Label | Style | Note |
|---|---|---|---|
| visitor → web | HTTPS request | bold | tooltip: served through a shared proxy; rendered pages are cached for 60 s |
| web → page | `/t/<tenant>/<space>/…` | bold | tooltip: a generic fallback page exists for Tenants without their own (`app/pages/t/[tenant]/[space]/[...slug].vue`) |
| page → lookup | which tables? | bold | unknown Tenant or Space → 404 |
| lookup → tables | `queryCollection` | bold | |
| web → visitor | HTML | bold | tooltip: later clicks fetch prepared page data, not a new query |

### Zoom 2: how Tenants stay apart

- **Layout:** a grid of the 16 Spaces (Tenant / Space). Each cell holds that
  Space's Collections. Collections in the Catalog get a badge with their
  **Collection kind**: `page` or `session`.
- **Caption:** "Separate tables in one building. Kept apart by the Gate and
  Human-only review, not by a hard wall." All layers share one code
  namespace. Isolation tests: `tests/unit/expand.spec.ts`, `routing.spec.ts`,
  `kinds.spec.ts`.

**Extra nodes**

| ID | Label | Subtitle | Pointer |
|---|---|---|---|
| catalog | **Catalog** | Opted-in Collections, by kind | `modules/catalog.ts` |
| xreader | **queryAcrossTenants** | Reads only Catalog Collections | `app/composables/catalog.ts` |
| commons | **Commons** (Search, Timeline) | The Aggregator | `layers/commons/app/composables/timeline.ts` |
| home | **Platform home** | `/`, a showcase of every Tenant | `app/pages/index.vue` |

**Edges**

| From → To | Label | Style | Note |
|---|---|---|---|
| each Tenant page → its own cells | own Space only | bold | |
| commons → xreader | reads through | accent | |
| xreader → badged cells | only Catalog Collections | accent | |
| home → commons | Timeline teasers | accent | |
| home → Atlas, Midden, Tinkerfund cells | reads directly | dashed | the known exception; see §4 |

### Legend (shared with the improvement-loop diagram)

- **solid:** produced at build time;
- **bold:** what happens on a request;
- **accent:** reading through the Catalog;
- **dashed:** an exception to the rule;
- **Human-only band:** a human must merge changes here.

For cross-linking: `repo` and `server` here are `main` and `site` in the
improvement-loop diagram (`docs/diagrams/improvement-loop.md`).

## 4. Leave out, and label honestly

**Leave out:**
- Agent tooling (guards, Skills, session logs), *because* the
  improvement-loop diagram covers it.
- Individual components, functions and config values, *because* they aren't
  visible from this altitude.
- The in-browser database fallback and its recovery dialog, *because* it is
  rarely used.
- Pre-rendered diagram images and test wiring, *because* they are build
  details.
- Replaced designs (committed generated config, a patched Nuxt Content),
  *because* they are no longer true (`docs/adr/0007-*.md`,
  `docs/adr/0019-*.md`).

**Label honestly:**
- **The Platform home crosses Tenant lines.** It reads Atlas, Midden and
  Tinkerfund tables directly, not through the Catalog, and reuses Tenant
  components such as Midden's `GlossedText` (`app/pages/index.vue`). Draw it
  as one dashed edge with that tooltip.
- **A Tenant layer can change Platform settings.** Tinkerfund adds its own
  cache rules and animated page changes (`layers/tinkerfund/nuxt.config.ts`).
  The Journal reads the repo's Skills folder at build time
  (`layers/journal/nuxt.config.ts`). Add a tooltip on the `platform` node.
- **Adding a Tenant is mostly automatic.** Its tables, routes and Catalog
  entries appear by themselves, but its tests, the home page and the footer
  need hand edits. Add a tooltip on the `tenant` node.

## Further reading

| Topic | Where |
|---|---|
| Glossary and metaphor | `CONTEXT.md`, `CONTEXT-MAP.md`, `layers/<tenant>/CONTEXT.md` |
| One container; separated but not air-gapped | `docs/adr/0001-single-container-baked-multitenancy.md` |
| Manifests generate the config | `docs/adr/0002-manifest-driven-config-generation.md`, `docs/adr/0013-dynamic-content-config-committed-routing-map.md`, `docs/adr/0014-build-time-virtual-routing-module.md` |
| Address scheme `/t/<tenant>/<space>/…` | `docs/adr/0006-runtime-routing-path-prefix.md`, `docs/adr/0016-tenant-root-layer-routes.md` |
| Self-updating container | `docs/adr/0011-poc-self-updating-deploy-container.md`, `deploy/` |
| Tenants as layers | `docs/adr/0018-tenant-layers-under-layers-directory.md`, `docs/agents/tenant-layers.md` |
| Catalog, Collection kinds, Aggregators | `docs/adr/0025-cross-tenant-catalog-and-collection-kinds.md` |
| Prepared page data on later clicks | `docs/adr/0028-navigation-reads-server-payloads.md` |
| The Gate | `docs/adr/0004-objective-safety-gate.md`, `scripts/gate.ts` |
