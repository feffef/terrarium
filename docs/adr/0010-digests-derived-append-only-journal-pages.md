# 10. Digests — derived, append-only Journal pages

Date: 2026-07-05
Status: Accepted

> **Amended by [ADR-0018](0018-tenant-layers-under-layers-directory.md) (2026-07-07).**
> Tenant layers moved from `tenants/` to Nuxt's conventional `layers/` directory;
> `tenants/…` paths below reflect the pre-rename layout.

> **Amended (2026-07-08).** The "chartered, still-deferred `sync` job" below is
> **no longer fully deferred**: the `digest` Skill now runs on a schedule via an
> external Routine (Skill + trigger = an autonomous job, ADR-0005), so the `sync`
> remit is partially live — realised by `digest` and `audit-skills`, both now
> scheduled (see ADR-0015). The live-dashboard point below stands unchanged.

## Context

The Journal Tenant (ADR-0008) named two content kinds: **Inventories** (curated,
derived from repo state, **overwritten** each sync — the Skill Inventory today)
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
  materials as compact JSON). The Skill writes the prose. **The Journal index
  needs no regeneration:** its Space landing is a live dashboard that queries this
  Space's collections — including a *Recent digests* panel that reads the digest
  pages — so a new Digest surfaces automatically, with no baked overview. That
  standing live overview is what the chartered, still-deferred `sync` job (ADR-0003)
  will one day formalize; the Skill does not claim the `sync` name.

## Consequences

- The `pages` schema gains an optional `summary` field (the day's headline, which
  feeds the dashboard's *Recent digests* panel). Optional and non-strict, so
  `index`/`about` are unaffected and no generated config drifts.
- Because Digests share the `pages` collection key, they are not a *separate* Nuxt
  collection — but they are still surfaced by path: the Space landing's live
  dashboard filters the `pages` collection to `/digests/*` to render the recent-
  digests panel, so previews are runtime-live, not baked. The deferred dedicated-
  collection upgrade would make them independently queryable by collection if ever
  wanted.
- Digests surface **frictions** (as a rollup) in a human-facing page — visible
  self-improvement, consistent with the Journal's purpose.
- Backfill is unbounded by design (every missing closed day), which is a non-issue
  at this repo's age; a future aging/`consolidate` job owns any `current → archived`
  migration, as it does for session logs (ADR-0009).
