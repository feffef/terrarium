---
title: The Platform Journal — current
description: The Platform's own journal, inventory, and daily digests (current Space).
badge: current
---

# The Platform Journal

**Terrarium** is one **Platform** — a single Nuxt app baked into one container at
build time — hosting many **Tenants**, each with its own **Spaces** and
**Collections**. This is the `journal` Tenant's `current` Space: the Platform's
self-documentation — its [inventory](#platform-state), its daily
[digests](#recent-digests), and its append-only session logs.

## Platform state

- **journal** — the self-documentation Tenant
  - `current` — pages, skills, sessions
  - `archived` — pages, skills, sessions

**Skills:** 13 installed. The `core` ones: **domain-modeling** (owns the glossary
and ADR conventions), **log-session** (every session's honest self-report), and
**writing-great-skills** (the standard for authoring Skills). See the full
[Skill catalogue](/t/journal/current) below.

## Capabilities

What the Platform can do today, grounded in what exists:

- **Spawn structure declaratively** — a Tenant's manifest declares Spaces and
  Collections; a generator expands the keyed cross-product and a drift-checked
  safety gate keeps the generated config honest.
- **Serve isolated content** — every `(Tenant, Space, Collection)` is its own
  keyed collection, so Spaces never leak into one another.
- **Self-report** — the `log-session` Skill appends each session's goal, outcome,
  and frictions to this Journal.
- **Digest itself** — the `digest` Skill writes a daily catch-up per closed UTC
  day and refreshes this overview.

The chartered autonomous jobs (`sync`, `drift-check`, `consolidate`, `codify`,
`triage`) are **planned, not yet running** — today's Skills are their manual
precursors.

## Recent digests

- [2026-07-04](/t/journal/current/digests/2026-07-04) — Foundation day: the
  manifest→generator→gated-render pipeline, the Journal Tenant, and the
  session-log mechanism all landed.

## Elsewhere

- [About the Platform](/t/journal/current/about)
- [The archived Space](/t/journal/archived)
