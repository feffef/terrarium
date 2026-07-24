# Context — Journal Tenant

> The Journal context: the one Tenant-local term it owns (Digest) and its
> reason-to-exist. Unlike the Blog and Atlas, the Journal renders **platform-wide**
> concepts — session log, Skill Inventory, Session, Friction, Agent Authorship —
> which stay defined in the root `CONTEXT.md` because any agent needs them
> regardless of task. This file narrates the *website*, not those concepts.
> The Journal is Platform infrastructure (its rationale is ADR-0008), not a demo
> Tenant like the Blog/Atlas.

## Why it exists — and why it isn't optional

The Journal is not a convenience summary for people who would rather skim than
read a session's raw transcript. It is the **only** way any of this becomes
visible at all: nobody but the agent and the user present in a given session can
see that session's working transcript. Once the session closes, the **session
log** it authors — its goal, outcome, what it read, every **Friction** it hit,
any learnings or ideas — is the sole surviving record. If a session authors no
log, that session's frictions and ideas are gone; there is no other place they
could surface. The same is true of the collaboration itself: whether a session
was interactive, delegated, or autonomous, who prompted it and how far they
steered — none of that is visible anywhere except through what the Journal
surfaces. So `/t/journal/current` matters for more than status: it is the only
public record of how the humans and agents building this Platform actually worked
together, session by session.

## Who it's for

Anyone who wants the Platform's actual current state, or how it got there,
without being *in* the session that did the work — which, since no one outside a
session can read its transcript, is everyone. A human checking on progress; a
later session hunting recurring friction to fix; the self-improvement Skills
(`audit-docs`, `audit-skills`, `frictions-to-fixes`) that read session logs for
patterns.

## What you'll find

- **Inventories** — curated/derived current-state readouts (the Skill Inventory
  today; defined in the root `CONTEXT.md`), refreshed from repo state rather than
  appended to.
- **Session logs and write-ups** — primary, append-only records the agents author
  themselves: session logs (see above) and research write-ups.
- **Digests** — derived, append-only daily summaries (see the glossary below).

## Glossary

### Digest
A derived, append-only, time-boxed Journal Document: one immutable page per
**closed UTC day**, summarizing Platform activity across all Tenants, mined from
git history and session logs (ADR-0010). It differs from the Journal's other two
content kinds on one axis each: unlike an **Inventory** (also derived, but a
current-state readout that is refreshed in place) a Digest is historical and
never rewritten once its day closes; unlike a **session log** (also append-only,
but primary — authored from scratch) a Digest is derived by condensing existing
records. The Platform's `index` overview is an Inventory; the per-day summaries
are Digests. Only the Journal website renders Digests — no other part of the
Platform consumes them, which is why the term is Journal-local rather than
platform-wide.

## What lives where

- **This file** — why the Journal isn't optional, who it's for, and the Digest
  term.
- **Root `CONTEXT.md`** — the platform-wide concepts the Journal renders (session
  log, Skill Inventory, Session, Session closure, Friction, Agent Authorship, …)
  and the Tenants roster that points here.
- **`layers/journal/app/pages/t/journal/[space]/index.vue`** — the actual
  dashboard a visitor sees (stat tiles, digests, session feed, Skill Inventory,
  Sparks), which is not a Markdown render of any single file.
