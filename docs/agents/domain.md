# Domain Docs

*Seeded from the pack's generic `domain.md` template, then customized for this
repo. This is the live, repo-authoritative version — don't re-sync it against
the pack template, which stays generic and reinstallable (ADR-0005).*

How to use this repo's domain documentation while exploring the codebase.

This repo is multi-context and shared-kernel-shaped — see `CONTEXT-MAP.md` for
the shape (ADR-0021).

## Before exploring, read these

For the reading order and what each file covers — `CONTEXT-MAP.md`, then
`CONTEXT.md`, then the Tenant's own `layers/<tenant>/CONTEXT.md`, then the
relevant ADRs — start at CLAUDE.md's "Read these first" rather than here.

This repo deliberately diverges from the `domain-modeling` Skill's generic
templates (ADR-0021):

- every ADR here uses the fuller `Context / Decision / Consequences` form, not
  the Skill's minimal one;
- a `CONTEXT.md` is a `## Glossary` of `### Term` entries, not the Skill's
  `## Language`/`_Avoid_` layout;
- the root `CONTEXT.md` doubles as the Platform context and carries the
  Tenants roster, and each per-Tenant `CONTEXT.md` adds a purpose narrative on
  top of its glossary.

Match the repo's actual files, not the template. See `CONTEXT-MAP.md`'s
**Decisions** section for where ADRs live today.

If any of these files don't exist, **proceed silently** — don't flag the
absence or suggest creating them upfront. The `/domain-modeling` Skill creates
them lazily, once a term or decision actually needs resolving.

## File structure

The same divergence applies to layout: the generic template puts each context
under `src/<context>/` with its own `docs/adr/`. This repo instead co-locates
each Tenant's `CONTEXT.md` under `layers/<tenant>/` and keeps every ADR at the
root `docs/adr/`. CLAUDE.md's "Repo layout" has the full path list.

## Use the glossary's vocabulary

When your output names a domain concept — an issue title, a refactor
proposal, a hypothesis, a test name — use the term `CONTEXT.md` defines for
it. Don't drift to a synonym the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either
you're inventing language the project doesn't use (reconsider), or there's a
real gap (note it for `/domain-modeling`).

## The rule of two: coin vocabulary on its second instance

A concept earns a glossary entry (`CONTEXT.md`) or a named taxonomy slot (an
ADR) only once its **second** instance exists or is concretely scheduled.
Before that, describe the first instance in plain words, where it lives —
don't mint a term, a typology, or a classification for a population of one.

This **complements**, not replaces, the `domain-modeling` Skill's 3-part ADR
test: that test gates *decisions*, the rule of two gates *vocabulary*. A
coined term is a standing tax — every session reads all the ADRs and
reconciles term conflicts against the glossary — so the second instance is
what proves the abstraction is worth that tax. (The friction-tag taxonomy
waits "until it can emerge from clustering real frictions"; ADR-0010 deferred
a `digests` collection the same way.) It's a brake on new coinage, not a
purge — anything already built stays.

## Flag ADR conflicts

If your output contradicts an existing ADR, say so explicitly rather than
silently overriding it:

> _Contradicts ADR-0006 (runtime routing by path prefix) — but worth reopening because…_

## Check a new Tenant/Collection proposal against ADR-0006 immediately

Check a new Tenant or Collection against ADR-0006's pages-only-routing
constraint (CLAUDE.md's Ground rules) as soon as it's proposed — don't defer
the check to a later pass. A separately-named, addressable-sounding
Collection (e.g. a Tenant's "sites" or "exhibits") looks like natural design
but violates ADR-0006. Catching it at proposal time stops the mistake from
riding several turns before someone else notices (issue #573).
