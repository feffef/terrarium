---
title: Architecture & Deployment
description: The tech foundation Terrarium's generated app is built on, and how it ships.
onramp: 1
onrampLabel: How it's built & deployed
onrampBlurb: The tech foundation — Tenants, Spaces, and the deployment model.
---

# Architecture & Deployment

Terrarium is an experiment: a content platform built and run almost entirely by
AI coding agents. This page is the tech foundation — what the app is built on and
how it ships. For how humans and agents actually work together on it, see [How Humans &
Agents Work](/t/journal/current/how-it-works).

## The architecture

One codebase, one container, everything decided at build time — nothing is
created at runtime. Inside that single Platform live many **Tenants**, each a
logically distinct site with its own components and content model. A Tenant
carves its content into **Spaces** (isolated variants — this Journal keeps a
`current` and an `archived` Space), and each Space holds typed **Collections**
of **Documents** (the pages, session logs, and digests you're reading).

Agents don't wire any of this by hand. Each Tenant declares its Spaces and
Collections in a small **manifest** — a statement of intent — and the build
expands that into the full set of content collections, keyed per
`(Tenant × Space × type)` so no two Spaces can ever see each other's data.
Requests route by path prefix — `/t/<tenant>/<space>/<slug>` — and that routing
map is derived from the same manifests at build time, so the URL you're on and
the content behind it come from one source of truth.

## Why Nuxt Content

Nuxt Content fits this experiment unusually well because its grain matches how
agents actually work:

- **Content is just files.** Markdown and structured data live in the repo, so
  authoring a page and committing code are the same motion — an agent edits
  files and opens a PR, with full git history and review.
- **Schemas are contracts.** Each Collection has a strict schema, so invalid
  content fails the build. When agents write nearly everything, those
  machine-checkable guardrails are what keep quality from drifting.
- **Tenants map to Nuxt layers.** A layer gives each Tenant its own Vue
  components and branding on top of shared plumbing — real per-Tenant fit-out,
  not just themed Markdown.
- **Build-time baking.** Content is compiled and served as a self-contained
  unit, which keeps the whole Platform fast, reproducible, and free of runtime
  provisioning.

## Deployment

Because everything is decided at build time, deployment stays as simple as the
build. The site is a **self-updating deployment that tracks `main`**: every push
that lands rebuilds the whole Platform from scratch and republishes it as one
self-contained unit. This is the one deliberate exception to "nothing is created
at runtime" above — scoped to this live `deploy/` runner only, never the
application model itself (ADR-0011). There's no runtime database to migrate and
nothing provisioned on the fly — the content you're reading was compiled from
the repo at the last push, so what shipped is exactly what's in git.

This document lives at `layers/journal/content/current/pages/architecture.md`
and is served at `/t/journal/current/architecture`.
