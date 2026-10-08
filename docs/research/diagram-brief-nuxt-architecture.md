# Diagram brief: how the Terrarium app is built

Research for an interactive architecture diagram aimed at **outside
visitors**. Written 2026-10-08 against `main`. Two rounds of independent
review checked it against the code. Terms in **bold** are defined in
[`CONTEXT.md`](../../CONTEXT.md).

How to use it:
- §1–§2 explain the app in plain words.
- §3 lists ready-made diagram nodes and edges per zoom level.
- §4 lists what to leave out and what to label honestly.
- Further reading is at the end.

## 1. The app in plain words

**One app, several websites.** Terrarium is a single web application (the
**Platform**) that hosts seven separate websites (**Tenants**): a field
guide, a blog, a shop and others. Think of an office building. The Platform
is the building, each Tenant leases a floor and furnishes it its own way,
and each Tenant splits its floor into rooms (**Spaces**), e.g. a live
version and an archive.

**Each website is one folder.** A Tenant lives in `layers/<tenant>/` and
brings:
- its look: pages, components and styles;
- its content: Markdown and YAML files (**Documents**);
- a short **manifest** listing its Spaces and its content types
  (**Collections**).

**Everything is decided at build time.** Nothing changes while the site runs:
no new sites appear and nothing is written to the database. Everything that
is served was written in the repository and compiled first. So every change
shows up in a reviewable diff, which matters when AI agents write the code.
The only exceptions are a short-lived cache of rendered pages and the
visitor's own browser state, such as the shop's cart.

**Building the app.** The build reads every manifest and produces three
things:
- one **content database**, with a separate table for each content type of
  each Space;
- an **address map** saying which web address leads to which tables;
- a **shared catalog**: the content other sites are allowed to read.

**Serving a page.** A visitor's address, `/t/<tenant>/<space>/<page>`, is
looked up in the address map and leads to exactly one Tenant's content. This
lookup is what keeps the websites apart.

**One site reads the others.** **Commons** is a site that collects from the
other sites (an **Aggregator**). Its Search and Timeline read only content
that other Tenants have put in the shared catalog.

**Shipping it.** A single server container watches the GitHub repository.
When `main` changes it rebuilds the app and switches to the new version. If
the build fails, the old version keeps running.

## 2. The seven websites

The numbers below are for tooltips.

| Tenant | What it is | Spaces (rooms) |
|---|---|---|
| **Journal** | The Platform's honest record of its own work: agent session logs, daily digests, its Skill list | live, archive |
| **Blog** | Four fictional writers commenting on real project activity | one per writer (4) |
| **Atlas** | A fictional nature field guide; the design showpiece | canopy, floor, pool |
| **Midden** | A museum-style catalogue of the project's own discarded work | trench, stores |
| **Marquee** | A Marvel movie blog in story order, requested by a guest | reel |
| **Tinkerfund** | A make-believe crowdfunding shop; the largest site | prod, qa |
| **Commons** | Search and a timeline across all the other sites | search, timeline |

Tooltip numbers: 48 content tables in total, 14 of them in the shared catalog.
Commons' own pages are deliberately left out of the catalog, so it never
lists itself (`layers/commons/tenant.config.ts`).

## 3. Diagram items

Labels are at most 4 words. 🔒 marks code that only a human may merge,
because it decides which site can see which content (`CLAUDE.md` → Ground
rules).

### Zoom 0: the big picture (repo → build → running site)

Three columns, left to right: **Repository**, **Build**, **Running site**.
Caption: *"Everything is decided at build time."*

**Nodes**

| ID | Label | Plain description | File pointer |
|---|---|---|---|
| repo | GitHub repository | Where all code and content live | `README.md` |
| tenant ×7 | e.g. "Atlas" | One website: its look, content and manifest | `layers/<tenant>/` |
| manifest 🔒 | Site manifest | Lists a site's rooms and content types | `layers/<tenant>/tenant.config.ts`, `shared/manifest.ts` |
| reader 🔒 | Manifest reader | Lists every site × room × content type | `shared/expand.ts` |
| engine 🔒 | Content engine | Checks content files and loads them into tables (Nuxt Content) | `content.config.ts` |
| addrmap 🔒 | Address map | Which address leads to which tables | `modules/routing.ts`, `shared/routing.ts` |
| catalog 🔒 | Shared catalog | Content other sites may read | `modules/catalog.ts`, `shared/kinds.ts` |
| app 🔒 | One combined app | All site folders merged into one Nuxt app | `nuxt.config.ts` |
| db | Content database | One database file, one table per content type and room (SQLite) | build output |
| server | Self-updating server | Pulls, builds, serves, swaps versions | `deploy/entrypoint.sh` |
| visitor | Visitor's browser | Opens pages | – |

**Edges**

| From → To | Label | Style |
|---|---|---|
| tenant → manifest | declares | solid |
| tenant → engine | content files | solid |
| tenant → app | pages & styles | solid |
| manifest → reader | read at build | solid |
| reader → engine / addrmap / catalog | generates | solid |
| engine → db | fills | solid |
| repo → server | watches `main`, rebuilds | solid |
| visitor → server | requests page | bold |

### Zoom 1: one page request

**Nodes**

| ID | Label | Plain description | File pointer |
|---|---|---|---|
| front | Public web front | HTTPS entry at terrarium.feffef.de (Caddy) | `deploy/docker-compose.yml` |
| web | App web server | Renders pages into HTML (Nitro, Nuxt's server) | `nuxt.config.ts` |
| cache | Page cache | Reuses a rendered page for 60 seconds | `nuxt.config.ts` (`routeRules`) |
| home | Platform home | Showcase of all sites at `/` | `app/pages/index.vue` |
| sitepage | Site's own page | Each site renders its pages its own way | `layers/<tenant>/app/pages/t/<tenant>/` |
| fallback | Generic fallback page | Used only where a site has no page of its own | `app/pages/t/[tenant]/[space]/[...slug].vue` |
| lookup | Room lookup | Address → that room's tables, nothing else | `app/composables/space.ts`, `shared/routing.ts` |
| tables | That room's tables | The content of one room of one site | – |
| notfound | Not found page | Unknown site, room or page | `app/error.vue` |
| prepared | Prepared page data | What the browser fetches on later clicks | ADR-0028 |

**Edges**

visitor → front "https" · front → web · web → cache "seen recently?" ·
web → home "`/`" · web → sitepage "`/t/…`" · sitepage ⇢ fallback "if none"
(dashed) · sitepage → lookup "which tables?" · lookup → tables "query" ·
lookup → notfound "unknown" · web → visitor "HTML" · visitor → prepared
"next click".

### Zoom 2: how the sites stay apart

A grid of the 16 rooms (site / room), each cell holding its tables. Cells
whose content is in the shared catalog get a badge: "page" or "session".

**Extra nodes**
- **Shared catalog** (`modules/catalog.ts`).
- **Cross-site reader** (`app/composables/catalog.ts`).
- **Commons: Search, Timeline** (`layers/commons/app/composables/timeline.ts`).
- **Platform home** (`app/pages/index.vue`).

**Edges**

| From → To | Label | Style |
|---|---|---|
| each site page → its own cell | own room only | bold |
| Commons → cross-site reader | reads through | accent |
| cross-site reader → badged cells | only shared content | accent |
| Platform home → Atlas, Midden, Tinkerfund cells | reads directly (exception) | dashed |

Captions for this zoom:
- "Separate tables, one shared building."
- "Kept apart by human review and automated tests, not by a hard wall": all
  site folders share one code space (`tests/unit/expand.spec.ts`,
  `routing.spec.ts`, `kinds.spec.ts`).

### Legend

- **solid:** produced at build time;
- **bold:** what happens on a request;
- **accent:** allowed cross-site read;
- **dashed:** exception or fallback;
- **🔒:** a human must merge changes.

## 4. What to leave out, and what to label honestly

**Leave out of all zoom levels:**
- the AI-agent tooling (guards, Skills, session logs), which belongs in the
  companion diagram;
- individual files, components and function names;
- config values;
- the rare in-browser database fallback and its recovery dialog;
- pre-rendered diagram images;
- test wiring;
- designs that were replaced: committed generated config (ADR-0007) and a
  patched content engine (ADR-0019).

**Label honestly:**
- **The Platform home reads three sites directly,** not through the shared
  catalog (`app/pages/index.vue`). Draw it as the dashed exception.
- **A site folder can also change app-wide settings.** The shop adds its own
  cache rules and animated page changes (`layers/tinkerfund/nuxt.config.ts`).
  The Journal reads the project's Skills folder at build time
  (`layers/journal/nuxt.config.ts`). A footnote is enough.
- **Adding a site is mostly automatic:** its tables, addresses and catalog
  entries appear by themselves. A few hand edits are still needed (tests,
  home page, footer).

## Further reading

| Topic | Where |
|---|---|
| One container, sites separated but not air-gapped | ADR-0001 (`docs/adr/0001-*.md`) |
| Manifests generate the config | ADR-0002, ADR-0013, ADR-0014 |
| Address scheme `/t/<tenant>/<space>/…` | ADR-0006, ADR-0016 |
| Self-updating server | ADR-0011, `deploy/` |
| Sites as folders under `layers/` | ADR-0018, `docs/agents/tenant-layers.md` |
| Shared catalog and Aggregators | ADR-0025 |
| Later clicks read prepared page data | ADR-0028 |
| Checks every change must pass (the Gate) | ADR-0004, `scripts/gate.ts` |
| Building and serving, step by step | `deploy/entrypoint.sh` (checks GitHub every 2 minutes, then rebuilds) |
