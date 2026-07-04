# Terrarium

A multi-tenant, **agent-driven** content platform built on
[Nuxt Content](https://content.nuxt.com). One repository, one container: it houses
many independent products and evolves itself under observation — a sealed little
world you plant tenants in and watch grow.

## The idea

- **One Platform** — a single Nuxt app / repo / container hosting everything.
- **Tenants** — logically distinct products, each with its own components (a Nuxt
  layer) and content model. Adding one ("spawning a microsite") is a source
  change on a feature branch, never a runtime operation.
- **Spaces** — per-Tenant isolated content partitions (e.g. `prod`, `it`, `uat`,
  `dev`), all baked into the one build and selected at request time.
- **Collections** — content types within a Space, one per SQLite table.
- **Skills** — an ever-growing, repo-committed set of Claude Code capabilities
  that develop and consolidate the Platform. They are as much a deliverable as
  the Nuxt code.

The distinctive part: the Platform is grown and maintained **mostly by Claude
Code agents** — interactively (a human directs a change) and autonomously
(scheduled jobs that sync docs, check drift, consolidate, triage, and codify new
Skills). Every change lands as a gated PR; agents are the authors of record.

One Tenant is the Platform's own **living documentation** — a status report
derived from repo ground truth.

## Design & decisions

Start here before changing anything structural:

- **`CONTEXT.md`** — the domain model / ubiquitous language (Platform, Tenant,
  Space, Collection, Skill, …). Glossary only.
- **`docs/adr/`** — Architecture Decision Records. The reasoning behind the
  design lives here:
  - [0001](docs/adr/0001-single-container-baked-multitenancy.md) — single-container, build-time-baked multi-tenancy
  - [0002](docs/adr/0002-manifest-driven-config-generation.md) — per-Tenant manifest generates `content.config.ts`
  - [0003](docs/adr/0003-agent-operating-model-and-governance.md) — agent operating model & governance
  - [0004](docs/adr/0004-objective-safety-gate.md) — objective safety gate for agent PRs
  - [0005](docs/adr/0005-skill-model.md) — Skill model: generic, repo-committed, first-class

## Status

**Milestone 1 (foundation) is in place.** The manifest → generator → gated-render
pipeline works end-to-end for one Tenant (`status`, the Living-Documentation Tenant)
with two Spaces (`current`, `archived`) and two Collections (`pages`, `glossary`).
The full safety gate (ADR-0004) is green: L0 (drift/lint/typecheck/build),
L1 (strict schemas), L2 (smoke render), L3 (isolation).

Not yet built (deliberately deferred): additional Tenants, the `spawn-tenant` and
other Skills, and the autonomous `sync`/`drift-check` jobs. See the ADRs for
what's decided and what's left open.

## Layout

```
tenants/<tenant>/tenant.config.ts   # the manifest an agent edits (declarative intent)
tenants/<tenant>/content/<space>/<collection>/…   # Documents, isolated per Space
shared/manifest.ts                  # manifest types + defineTenant() + validation
scripts/generate.ts                 # generator: manifests → keyed collections
content.config.ts                   # GENERATED — keyed Nuxt Content collections
shared/routing.generated.ts         # GENERATED — routing map + L2 entry routes
app/pages/t/[tenant]/[space]/[...slug].vue   # runtime routing + ContentRenderer
tests/unit/                         # L3 isolation; tests/e2e/ L2 smoke
ci/gate.yml                         # the safety gate (a maintainer installs it
                                    #   to .github/workflows/ — CI is human-only)
```

## Commands

```
pnpm install     # installs, generates config, prepares types
pnpm dev         # regenerate + dev server (http://localhost:3000)
pnpm build       # L0/L1: regenerate + build (fails on invalid content)
pnpm typecheck   # L0
pnpm lint        # L0
pnpm test        # L3: generator/isolation unit tests
pnpm test:e2e    # L2: smoke-render every (Tenant, Space) entry route
pnpm gate:drift  # regenerate and fail if the committed config drifted
```

To add a Space or Collection: edit the Tenant's `tenant.config.ts`, run `pnpm gen`,
commit the regenerated files. Never hand-edit the `GENERATED` files.
