---
title: Living Documentation — archived
description: Retired snapshots of the Platform's documentation (archived Space).
badge: archived
---

# Archived Documentation

This is the **`archived`** Space of the `status` Tenant. It shares the Tenant's
content model (the same `pages` and `skills` collections) but its content is
fully separate from the `current` Space — a different SQLite table
(`status_archived_pages`).

There is deliberately **no** `about` page here, which the isolation gate uses
to prove that `/t/status/archived/about` does not fall through to `current`.
