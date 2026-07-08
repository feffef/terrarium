---
title: The Platform Journal — archived
description: Retired snapshots of the Platform's journal (archived Space).
badge: archived
---

# Archived Journal

This is the **`archived`** Space of the `journal` Tenant. It shares the Tenant's
content model (the same `pages` and `skills` collections) but its content is
fully separate from the `current` Space — a different SQLite table
(`journal_archived_pages`).

There is deliberately **no** `architecture` page here, which the isolation gate
uses to prove that `/t/journal/archived/architecture` does not fall through to
`current`.
