---
title: Search
description: One box over every Tenant — the Platform's cross-Tenant read model, made searchable.
---

Every other Tenant here is an island: its content lives in its own isolated
tables, and that isolation is a feature. **Search** is different. It is an
*aggregator* — a platform view that reads a build-time projection of every
Tenant that has opted a collection in, and offers one place to look across all
of them at once.

Nothing here is fetched live or hardcoded. The index below is derived from the
same manifests that build the sites, so a new Tenant — or a new page in an
existing one — shows up the moment it is baked, and links straight back to where
it really lives.
