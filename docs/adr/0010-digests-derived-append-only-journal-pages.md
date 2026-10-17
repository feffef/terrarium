# ADR-0010: A Digest is a daily Journal page, written once and landed by PR

A Digest is a short catch-up on one finished UTC day across the whole
Platform, condensed from git history and session logs. It is an ordinary
Markdown page in the Journal's `pages` collection under `digests/<date>`,
written once and then kept. The `digest` Skill writes it and lands it through
an ordinary gated PR, not the direct-to-main path that session logs use.

## Scope

- **A page with its own URL.** The Journal's home page also lists Digests and
  opens each in place. Both read the pages live, so a new Digest shows up
  without any edit to the index.
- **No collection of its own.** Digests share the Journal's `pages`
  collection, and the `digests/` path marks them. The path means a Digest only
  in the Journal; in another Tenant it is an ordinary page.
- **Which days.** Only a finished UTC day gets a Digest, so today never does.
  A day with no activity gets none. A run writes every finished day that is
  still missing one.
- **Written once.** A run never rewrites an existing Digest. Moving old
  Digests from the `current` Space to `archived` is allowed: it changes the
  URL, not the text. A wrong fact found later is fixed by an ordinary PR.
- **Script and Skill.** A tested script finds the missing days and gathers one
  day's material. The Skill writes the prose.
- **Merging.** The agent merges the PR on a green gate (ADR-0004).

## Why

- A Digest fits neither other Journal kind (ADR-0008). It is derived from
  records, like an Inventory, but it covers a finished day, so a run writes it
  once.
- It is prose for people, with links, so it is a page. Data collections get
  no route.
- Only a Space's `pages` collection gets routes (ADR-0006). A separate
  collection would need a change to the routing code, which a human must
  merge, and the `digests/` path already finds them.
- The direct-to-main path is for session logs: schema-checked data that
  changes no code or route (ADR-0009). A Digest adds a page with its own URL,
  so it goes through the gate like any page.
- A day's summary is complete only once the day is over. UTC gives every
  machine the same boundary.
- Day boundaries and attribution are where bugs hide, so they live in tested
  code. The prose is judgement, so the Skill writes it.

## Rejected alternatives

- **A dedicated `digests` collection.** It changes the routing code and buys
  nothing while the path is enough.
- **Bake a Digest list or overview into the index page each run.** The live
  listing does that with nothing to keep in step.
- **Commit Digests straight to `main`** like session logs. A Digest adds a
  page, so it needs the gate.

## When to revisit

- Something needs Digests as their own collection, such as querying them
  apart from other pages.

## Consequences

- Because old Digests move to `archived`, the script must look in both Spaces
  for existing Digests. Otherwise an archived day looks missing and gets
  written again.

## See

- `.agents/skills/digest/SKILL.md`: the run, the writing rules and what a run
  may change.
- `.agents/skills/digest/scripts/digest.ts` and `.agents/skills/digest/tests/unit/digest.spec.ts`: the folders, finished
  days and the day's material.
- `.agents/skills/digest/scripts/archive-journal-content.ts`: how many Digests stay in `current`.
- `layers/journal/app/utils/dashboard.ts`: the live listing and its headline.
- `shared/kinds.ts`: the `summary` headline field.
- `layers/commons/app/composables/timeline.ts`: the Timeline's Journal-only
  reading of `digests/`.
