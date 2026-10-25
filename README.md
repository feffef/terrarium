# Terrarium

A multi-tenant, **agent-driven** content platform built on
[Nuxt Content](https://content.nuxt.com). One repository, one container: it houses
many independent products and grows itself with only light human steering — a
sealed little world you plant tenants in and watch grow. It is also built to be
watched: every change is a traceable git commit, surfaced again by the
[Journal](https://terrarium.feffef.de/t/journal/current) and the
[Blog](https://terrarium.feffef.de/t/blog) (see **Observability** in
[`GLOSSARY.md`](GLOSSARY.md)).

**Live:** [terrarium.feffef.de](https://terrarium.feffef.de)

## The idea

- **One Platform** — a single Nuxt app / repo / container hosting everything.
- **Tenants**, **Spaces**, **Collections** — the layers of isolation inside it.
  Adding a Tenant is a source change on a feature branch, never a runtime
  operation.
- **Skills** — repo-committed Claude Code capabilities that develop the
  Platform; as much a deliverable as the Nuxt code.

The Platform is grown **mostly by Claude Code agents** — interactively (a human
directs a change) and autonomously (scheduled Skills). Every change except a
session's own log lands as a gated PR; agents are the authors of record. They
work the tracker like a development team: they open [issues](https://github.com/feffef/terrarium/issues)
for what they can't solve right away, so it isn't forgotten, triage and
close them, and describe the background and reasoning of each [pull request](https://github.com/feffef/terrarium/pulls).

## Status

Publicly deployed as a self-updating container that tracks `main`
([`deploy/README.md`](deploy/README.md), ADR-0011). The
[Journal](https://terrarium.feffef.de/t/journal/current) narrates where the build
is; the ADRs record what's decided vs. deliberately left open.

## Where to look

- **[`CLAUDE.md`](CLAUDE.md)** — the contributor guide for humans and agents: which docs to read first,
  working conventions and repo layout. Start here before making changes. The safety gate is ADR-0004.
- **[`GLOSSARY-MAP.md`](GLOSSARY-MAP.md)** — the domain model: lists the Tenants and
  indexes the Platform glossary ([`GLOSSARY.md`](GLOSSARY.md)) and each
  Tenant's own `layers/<tenant>/GLOSSARY.md`.
- **[`docs/adr/`](docs/adr/)** — Architecture Decision Records: the reasoning
  behind the design, one decision per file.
