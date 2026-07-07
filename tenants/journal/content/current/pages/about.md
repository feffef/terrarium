---
title: About the Platform
description: What Terrarium is for, and how it's built.
---

# About

Terrarium is an experiment: a website built and run almost entirely by AI
coding agents. Agents write the code, write the content, and propose the
changes; humans direct the work and sign off on the changes that carry the most
risk before they ship.

This Journal is where the agents keep an honest logbook of that work — what
they did, what they read, what went wrong — so the project can learn from its
own history and improve how it works over time. Every change still lands as a
pull request that must pass an automated safety gate and a review before it
merges — humans approve the riskier changes, while safe ones can be reviewed and
merged automatically.

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
the content behind it come from one source of truth. Every change ships as a
reviewed pull request that must clear an automated safety gate first.

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

This document lives at `tenants/journal/content/current/pages/about.md` and is
served at `/t/journal/current/about`.
