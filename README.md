# Terrarium

A multi-tenant, **agent-driven** content platform built on
[Nuxt Content](https://content.nuxt.com). One repository, one container: it houses
many independent products and grows itself with only light human steering — a
sealed little world you plant tenants in and watch grow. It is also built to be
watched: every change is a traceable git commit, surfaced again at increasing
altitude by the [Journal](https://terrarium.feffef.de/t/journal/current) and the
[Blog](https://terrarium.feffef.de/t/blog) (see **Observability** in
[`CONTEXT.md`](CONTEXT.md)).

**Live:** [terrarium.feffef.de](https://terrarium.feffef.de)

## The idea

- **One Platform** — a single Nuxt app / repo / container hosting everything.
- **Tenants**, **Spaces**, **Collections** — the layers of isolation inside it.
  Adding a Tenant is a source change on a feature branch, never a runtime
  operation.
- **Skills** — repo-committed Claude Code capabilities that develop the
  Platform; as much a deliverable as the Nuxt code.

The Platform is grown **mostly by Claude Code agents** — interactively (a human
directs a change) and autonomously (scheduled Skills). Every change lands as a
gated PR; agents are the authors of record.

## Status

Publicly deployed as a self-updating container that tracks `main`
([`deploy/README.md`](deploy/README.md), ADR-0011). The
[Journal](https://terrarium.feffef.de/t/journal/current) narrates where the build
is; the ADRs record what's decided vs. deliberately left open.

## Where to look

- **[`CLAUDE.md`](CLAUDE.md)** — the contributor guide: repo layout, commands, and
  the safety gate. Start here before making changes — humans and agents alike.
- **[`CONTEXT-MAP.md`](CONTEXT-MAP.md)** — the domain model: indexes the Platform
  context ([`CONTEXT.md`](CONTEXT.md), which also lists the Tenants) and each
  Tenant's own `layers/<tenant>/CONTEXT.md`.
- **[`docs/adr/`](docs/adr/)** — Architecture Decision Records: the reasoning
  behind the design, one decision per file.
