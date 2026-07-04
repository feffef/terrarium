---
title: About the Platform
description: How Terrarium is structured.
---

# About

The Platform bakes every Tenant and Space into a single SQLite database at
build time. Runtime routing selects which `(Tenant, Space)` to serve — here,
`journal / current` — and content is queried from a single keyed collection, so
Spaces never leak into one another.

This document lives at `tenants/journal/content/current/pages/about.md` and is
served at `/t/journal/current/about`.
