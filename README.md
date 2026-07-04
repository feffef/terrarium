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

Early design. The domain model and ADRs exist; the Nuxt implementation does not
yet. See the ADRs for what's decided and what's deliberately left open.
