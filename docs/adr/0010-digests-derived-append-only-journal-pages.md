# 10. Digests — derived, append-only Journal pages

Date: 2026-07-05
Status: Accepted

## Context

The Journal Tenant (ADR-0008) named two content kinds: **Inventories** (curated,
derived from repo state, **overwritten** each sync — the Skill catalogue today)
and **Journal entries** (**primary**, append-only, agent-authored — session logs,
research, ideas). A new need does not fit either: a short, human-facing **daily
catch-up** of everything that happened across the Platform on a given day, mined
from git history and session logs.

It is *derived* (like an Inventory) yet *append-only and historical* (like a
Journal entry): once a UTC day closes, its summary is fixed and never rewritten.
The glossary names this third kind a **Digest** (`CONTEXT.md`).

Three things had to be decided to build it: where a Digest lives in the content
model, how it lands, and what authors it.

## Decision

- **A Digest is a rendered Markdown *page*, not `data`.** It is a free-form
  human entry point — several paragraphs, inline links to issues/PRs — which is
  exactly what Nuxt Content's `page` type is for; `data` collections are not
  routable and were rejected.
- **Digests live inside the existing `pages` collection**, under a `digests/`
  subfolder: `tenants/journal/content/current/pages/digests/<YYYY-MM-DD>.md`,
  routed for free at `/t/journal/current/digests/<YYYY-MM-DD>`. A *dedicated*
  `digests` collection was considered and **deferred**: the runtime resolver
  routes only the collection literally named `pages` (`shared/routing.ts`), so a
  first-class collection would force a change to that human-only, isolation-
  critical surface (ADR-0004) plus a per-collection URL-prefix convention. That
  earns nothing today — Digests are found by their `/digests/` path and are
  isolated per-Space regardless — so it waits until a first-class collection is
  actually needed.
- **One immutable file per *closed* UTC day.** A day is digestible only once its
  `[00:00, 24:00)` UTC window has closed; today is never digested until it does.
  Commits attribute to the UTC day of their commit timestamp; sessions to the UTC
  day of their `endedAt`. A day with no activity gets no page.
- **Digests land via a gated PR** (ADR-0003's default) — **not** the ADR-0009
  direct-to-main path. That exception is deliberately bounded to inert,
  schema-validated `data` (session logs); a Digest is a routed page that renders,
  so it stays gated like all other content.
- **A `digest` platform-operation Skill authors them**, backed by a thin,
  unit-tested `scripts/digest.ts` helper that does only the deterministic work
  (enumerate closed-and-undigested days; gather a day's git + session-log
  materials as compact JSON). The Skill writes the prose. The same run also
  **regenerates the Journal index** as an Inventory overview of the Platform's
  current state and capabilities — a manual precursor to the chartered, still-
  deferred `sync` job (ADR-0003), which will one day own that refresh; the Skill
  does not claim the `sync` name.

## Consequences

- The `pages` schema gains an optional `summary` field (the day's headline,
  source of the index's "recent digests" preview). Optional and non-strict, so
  `index`/`about` are unaffected and no generated config drifts.
- Because Digests share the `pages` collection key, they are not independently
  queryable by collection — the index preview is *baked* by the Skill from each
  file's front matter rather than queried at runtime. Acceptable while the Skill
  owns the index anyway; the deferred dedicated-collection upgrade would restore
  runtime queryability if ever wanted.
- Digests surface **frictions** (as a rollup) in a human-facing page — visible
  self-improvement, consistent with the Journal's purpose.
- Backfill is unbounded by design (every missing closed day), which is a non-issue
  at this repo's age; a future aging/`consolidate` job owns any `current → archived`
  migration, as it does for session logs (ADR-0009).
