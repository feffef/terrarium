# Context — Journal Tenant

> The Journal context: the one Tenant-local term it owns (Digest) and its
> reason-to-exist. Unlike the Blog and Atlas, the Journal renders **platform-wide**
> concepts — session log, Skill Inventory, Session, Friction, Agent Authorship —
> which stay defined in the root `CONTEXT.md` because any agent needs them
> regardless of task. This file narrates the *website*, not those concepts.
> The Journal is Platform infrastructure (its rationale is ADR-0008), not a demo
> Tenant like the Blog/Atlas.

## Why it exists — and why it isn't optional

The Journal is not a convenience summary for people who would rather skim than read a session's raw transcript. It is the **only** way any of this becomes visible: nobody but the agent and user present in a session can see its working transcript. Once the session closes, the **session log** it authors — goal, outcome, what it read, every **Friction** it hit, any learnings or ideas — is the sole surviving record; a session that authors no log loses its frictions and ideas, with nowhere else to surface. The same holds for the collaboration itself: whether a session was interactive, delegated, or autonomous, who prompted it and how far they steered is visible only through what the Journal surfaces. So `/t/journal/current` matters for more than status: it is the only public record of how the humans and agents building this Platform actually worked together, session by session.

## Who it's for

Anyone who wants the Platform's actual current state, or how it got there, without being *in* the session that did the work — per above, everyone: a human checking on progress; a later session hunting recurring friction to fix; the self-improvement Skills (`audit-docs`, `audit-skills`, `frictions-to-fixes`) that read session logs for patterns.

## What you'll find

- **Inventories** — curated/derived current-state readouts (the Skill Inventory
  today; defined in the root `CONTEXT.md`), refreshed from repo state rather than
  appended to.
- **Session logs** — primary, append-only records the agents author
  themselves (see above).
- **Digests** — derived, append-only daily summaries (see the glossary below).

## Glossary

### Digest
A derived, append-only, time-boxed Journal Document: one immutable page per **closed UTC day**, summarizing Platform activity across all Tenants, mined from git history and session logs (ADR-0010). Unlike an **Inventory** (derived too, but a current-state readout refreshed in place) a Digest is historical and never rewritten once its day closes; unlike a **session log** (append-only too, but primary — authored from scratch) a Digest is derived by condensing existing records. The Skill Inventory (root `CONTEXT.md`) is an Inventory; the per-day summaries are Digests. The Journal website renders them, and the Commons Timeline also reads them cross-Tenant as one of its sources (`layers/commons/CONTEXT.md`) — but the *word* "Digest" is defined once, here, because the Commons only consumes the concept through the Catalog.

## What lives where

- **This file** — why the Journal isn't optional, who it's for, and the Digest
  term.
- **Root `CONTEXT.md`** — the platform-wide concepts the Journal renders (session
  log, Skill Inventory, Session, Session closure, Friction, Agent Authorship, …)
  and the Tenants roster that points here.
- **`layers/journal/app/pages/t/journal/[space]/`** — the pages a visitor sees:
  `index.vue` (digests, stats, session feed), `skills.vue` (Skill Inventory) and
  `ideas.vue` (ideas and learnings), none a Markdown render of any single file.
