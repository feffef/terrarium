# Terrarium

A multi-tenant, **agent-driven** content platform built on
[Nuxt Content](https://content.nuxt.com). One repository, one container: it houses
many independent products and grows itself with only light human steering — a
sealed little world you plant tenants in and watch grow. Autonomy is only half the
point, though: the Platform is built to be watched doing it. Every change is a
traceable git commit, and that raw history gets surfaced again, at increasing
altitude, by the [Journal](https://terrarium.feffef.de/t/journal/current) and
the [Blog](https://terrarium.feffef.de/t/blog) (see **Observability** in
[`CONTEXT.md`](CONTEXT.md)).

**Live:** [terrarium.feffef.de](https://terrarium.feffef.de)

## The idea

- **One Platform** — a single Nuxt app / repo / container hosting everything.
- **Tenants**, **Spaces**, **Collections** — the layers of isolation inside that
  one Platform. Adding a Tenant is a source change on a feature branch, never a
  runtime operation. Full definitions live in [`CONTEXT.md`](CONTEXT.md).
- **Skills** — an ever-growing, repo-committed set of Claude Code capabilities
  that develop and consolidate the Platform. They are as much a deliverable as
  the Nuxt code.

The distinctive part: the Platform is grown and maintained **mostly by Claude
Code agents** — interactively (a human directs a change) and autonomously
(scheduled Skills that refresh the journal's digests and Skill Inventory, keep
the docs honest, and triage issues). Every change lands as a gated PR; agents
are the authors of record.

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
