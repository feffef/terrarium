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
- **Spaces** — per-Tenant isolated content partitions (e.g. `current`, `archived`),
  all baked into the one build and selected at request time.
- **Collections** — content types within a Space, one per SQLite table.
- **Skills** — an ever-growing, repo-committed set of Claude Code capabilities
  that develop and consolidate the Platform. They are as much a deliverable as
  the Nuxt code.

The distinctive part: the Platform is grown and maintained **mostly by Claude
Code agents** — interactively (a human directs a change) and autonomously
(scheduled jobs that sync docs, check drift, consolidate, triage, and codify new
Skills). Every change lands as a gated PR; agents are the authors of record.

One Tenant is the Platform's own **journal** — its self-documentation: curated
inventories derived from repo ground truth, plus append-only, agent-authored
session logs, research, and ideas that drive self-improvement.

## Status

**Milestone 1 (foundation) is in place** — the manifest → generator →
gated-render pipeline runs end-to-end for one Tenant (`journal`) with Spaces
`current`/`archived` and Collections `pages`/`skills`, behind a green safety
gate. Additional Tenants, Skills, and the autonomous jobs are deliberately
deferred (see the ADRs).

## Where to look

- **[`CLAUDE.md`](CLAUDE.md)** — the contributor guide: repo layout, the commands,
  and the safety gate. Start here before making changes — humans and agents alike.
- **[`CONTEXT.md`](CONTEXT.md)** — the domain model / ubiquitous language
  (Platform, Tenant, Space, Collection, Skill, …). Glossary only.
- **[`docs/adr/`](docs/adr/)** — Architecture Decision Records: the reasoning
  behind the design, one decision per file.
