# Glossary — Journal Tenant

> The Journal glossary: the one Tenant-local term it owns (Digest) and its
> reason-to-exist. Unlike the Blog and Atlas, the Journal renders **platform-wide**
> concepts — session log, Skill Inventory, Session, Friction, Agent Authorship —
> which stay defined in the root `GLOSSARY.md` because any agent needs them
> regardless of task. This file narrates the *website*, not those concepts.
> The Journal is Platform infrastructure (rationale: ADR-0008), not a demo
> Tenant.

## Why it exists — and why it isn't optional

The Journal is not a convenience summary for skimmers. It is the **only** way any of this becomes visible: once a session closes, its **session log** is the sole surviving record, and a session that authors none loses its frictions and ideas (ADR-0008). The same holds for how the humans and agents worked together (whether a session was interactive, delegated or autonomous, who prompted it, how far they steered): `/t/journal/current` is the only public record of it, session by session.

## Who it's for

Anyone who wants the Platform's actual current state, or how it got there, without being *in* the session that did the work — per above, everyone: a human checking on progress; a later session hunting recurring friction to fix; the self-improvement Skills (`audit-docs`, `audit-skills`, `frictions-to-fixes`) that read session logs for patterns.

## What you'll find

- **Inventories** — the Skill Inventory and the Friction Ledger (root `GLOSSARY.md`).
- **Session logs** — primary records the agents author
  themselves, one per session.
- **Digests** — see Digest below.

## Glossary

### Digest
A daily catch-up on Platform activity across all Tenants, condensed from git history and session logs: one page per finished UTC day, kept once written (ADR-0010). Unlike an **Inventory** (derived too, but refreshed in place) it records a past day; unlike a **session log** it is derived, not first-hand. The Commons Timeline also reads Digests (`layers/commons/GLOSSARY.md`), but the word is defined here.

## What lives where

- **`layers/journal/app/pages/t/journal/[space]/`** — the pages a visitor sees:
  `index.vue` (digests, stats, session feed), `skills.vue` (Skill Inventory),
  `ideas.vue` (ideas and learnings) and `frictions.vue` (the Friction Ledger),
  none a Markdown render of any single file, and `routines.vue` (Routine run
  costs), which renders `content/current/pages/routines.md` beside its charts.
- **`layers/journal/app/components/content/`** — the `::routine-chart` and
  `::routine-weekly-table` blocks that `content/current/pages/routines.md` uses;
  edit that file's prose without touching the page component.
