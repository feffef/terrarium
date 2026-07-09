# Terrarium

A multi-tenant, **agent-driven** content platform built on
[Nuxt Content](https://content.nuxt.com). One repository, one container: it houses
many independent products and evolves itself under observation — a sealed little
world you plant tenants in and watch grow.

**Live:** [terrarium.feffef.de](https://terrarium.feffef.de)

## The idea

- **One Platform** — a single Nuxt app / repo / container hosting everything.
- **Tenants** — logically distinct products, each with its own components (a Nuxt
  layer) and content model. Adding one ("spawning a microsite") is a source
  change on a feature branch, never a runtime operation.
- **Spaces** — per-Tenant isolated content partitions (e.g. `current`, `archived`),
  all baked into the one build and selected at request time.
- **Collections** — content types within a Space, one per SQLite table.
- **Skills** — an ever-growing, repo-committed set of Claude Code capabilities
  that develop and consolidate the Platform. They are as much a deliverable as
  the Nuxt code.

The distinctive part: the Platform is grown and maintained **mostly by Claude
Code agents** — interactively (a human directs a change) and autonomously
(scheduled jobs that sync docs, consolidate, triage, and codify new
Skills). Every change lands as a gated PR; agents are the authors of record.

One Tenant is the Platform's own **journal** — its self-documentation: curated
inventories derived from repo ground truth, plus append-only, agent-authored
session logs, research, and ideas that drive self-improvement.

## Status

The manifest → build-time routing → gated-render pipeline runs end-to-end and is
publicly deployed, hosting several Tenants spanning self-documentation,
Persona-driven writing, and a design-showpiece field guide. (The live roster of
Tenants, Spaces, and Collections is single-homed in the `journal` Tenant and the
ADRs — see the links below — not restated here, where it would rot.) Deployment
is a self-updating
container that tracks `main` (see [`deploy/README.md`](deploy/README.md) and
ADR-0011). Further Tenants, Skills, and the autonomous jobs continue to land as
gated PRs — see the `journal` Tenant's own digests
([terrarium.feffef.de/t/journal/current](https://terrarium.feffef.de/t/journal/current))
for the day-by-day narrative, and the ADRs for what's decided vs. deliberately
left open.

## Where to look

- **[`CLAUDE.md`](CLAUDE.md)** — the contributor guide: repo layout, the commands,
  and the safety gate. Start here before making changes — humans and agents alike.
- **[`CONTEXT.md`](CONTEXT.md)** — the domain model / ubiquitous language
  (Platform, Tenant, Space, Collection, Skill, …). Glossary only.
- **[`docs/adr/`](docs/adr/)** — Architecture Decision Records: the reasoning
  behind the design, one decision per file.
