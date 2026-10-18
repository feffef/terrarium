# Glossary — Journal Tenant

> The Journal glossary: the one Tenant-local term it owns (Digest) and its
> reason-to-exist. Unlike the Blog and Atlas, the Journal renders **platform-wide**
> concepts — session log, Skill Inventory, Session, Friction, Agent Authorship —
> which stay defined in the root `GLOSSARY.md` because any agent needs them
> regardless of task. This file narrates the *website*, not those concepts.
> The Journal is Platform infrastructure (rationale: ADR-0008), not a demo
> Tenant.

## Why it exists — and why it isn't optional

The Journal is not a convenience summary for people who would rather skim than read a session's raw transcript. It is the **only** way any of this becomes visible: nobody but the agent and user present in a session can see its working transcript. Once the session closes, the **session log** it authors (goal, outcome, what it read, every **Friction** it hit, any learnings or ideas) is the sole surviving record; a session that authors no log loses its frictions and ideas. The same holds for the collaboration itself: whether a session was interactive, delegated or autonomous, who prompted it and how far they steered is visible only through the Journal. So `/t/journal/current` is more than a status page: it is the only public record of how the humans and agents building this Platform actually worked together, session by session.

## Who it's for

Anyone who wants the Platform's actual current state, or how it got there, without being *in* the session that did the work — per above, everyone: a human checking on progress; a later session hunting recurring friction to fix; the self-improvement Skills (`audit-docs`, `audit-skills`, `frictions-to-fixes`) that read session logs for patterns.

## What you'll find

- **Inventories** — curated/derived current-state readouts (the Skill Inventory
  and the Friction Ledger; defined in the root `GLOSSARY.md`), refreshed from repo
  state rather than appended to.
- **Session logs** — primary, append-only records the agents author
  themselves (see above).
- **Digests** — derived daily summaries, written once per day (see the glossary below).

## Glossary

### Digest
A daily catch-up on Platform activity across all Tenants, condensed from git history and session logs: one page per finished UTC day, kept once written (ADR-0010). Unlike an **Inventory** (derived too, but refreshed in place) it records a past day; unlike a **session log** it is derived, not first-hand. The Commons Timeline also reads Digests (`layers/commons/GLOSSARY.md`), but the word is defined here.

## What lives where

- **`layers/journal/app/pages/t/journal/[space]/`** — the pages a visitor sees:
  `index.vue` (digests, stats, session feed), `skills.vue` (Skill Inventory),
  `ideas.vue` (ideas and learnings), `frictions.vue` (the Friction Ledger) and
  `routines.vue` (Routine run costs), none a Markdown render of any single file.
- **`layers/journal/app/components/content/`** — the `::routine-chart` and
  `::routine-weekly-table` blocks that `content/current/pages/routines.md` uses;
  edit that file's prose without touching the page component.
