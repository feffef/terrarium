# Domain Docs

*Repo-authoritative. Don't re-sync it against the pack's generic, reinstallable
`domain.md` template (ADR-0005).*

How to use the domain docs while exploring. The repo's shape (multi-context,
shared kernel) is in `CONTEXT-MAP.md` (ADR-0021).

## Before exploring, read these

Reading order and triggers (`CONTEXT-MAP.md`, `CONTEXT.md`, relevant ADRs):
see CLAUDE.md's "Docs you must read first" and `.claude/rules/tenant-layers.md`,
not this page.

This repo deliberately diverges from the `domain-modeling` Skill's generic
templates (ADR-0021):

- every ADR here uses the fuller `Context / Decision / Consequences` form, not
  the Skill's minimal one;
- a `CONTEXT.md` is a `## Glossary` of `### Term` entries, not the Skill's
  `## Language`/`_Avoid_` layout;
- the root `CONTEXT.md` doubles as the Platform context and carries the
  Tenants roster, and each per-Tenant `CONTEXT.md` adds a purpose narrative on
  top of its glossary.

Match the repo's actual files, not the template: `CONTEXT-MAP.md`'s
**Decisions** section says where ADRs live; CLAUDE.md's "Repo layout" says where
`layers/<tenant>/` contexts live.

If `CONTEXT-MAP.md`, a `CONTEXT.md` or an ADR is missing, **proceed
silently**: don't flag it or suggest creating it. `/domain-modeling` creates
a missing one lazily, when a term or
decision needs resolving.

## Use the glossary's vocabulary

When your output names a domain concept — an issue title, a refactor
proposal, a hypothesis, a test name — use the term `CONTEXT.md` defines for
it. Don't drift to a synonym the glossary explicitly avoids.

A concept missing from the glossary means either you're inventing language
(reconsider) or there's a real gap (note it for `/domain-modeling`).

## The rule of two: coin vocabulary on its second instance

A concept earns a glossary entry (`CONTEXT.md`) or a named taxonomy slot (an
ADR) only once its **second** instance exists or is concretely scheduled.
Before that, describe the first instance in plain words, where it lives —
don't mint a term, a typology, or a classification for a population of one.

This complements, not replaces, the `domain-modeling` Skill's 3-part ADR test:
that test gates *decisions*, the rule of two gates *vocabulary*. Every session
reads the glossary and reconciles term conflicts against it, so a coined term
costs every session; only a second instance proves it worth that (ADR-0010
deferred a `digests` collection this way). It brakes new coinage; anything
already built stays.

## Flag ADR conflicts

If your output contradicts an existing ADR, say so explicitly rather than
silently overriding it:

> _Contradicts ADR-0006 (runtime routing by path prefix) — but worth reopening because…_

## Check a new Tenant/Collection proposal against ADR-0006 immediately

A separately named, addressable-sounding Collection (e.g. a Tenant's "sites"
or "exhibits") looks natural but violates ADR-0006's pages-only routing. Check
a new Tenant or Collection against it at proposal, before the mistake rides
several turns (issue #573).
