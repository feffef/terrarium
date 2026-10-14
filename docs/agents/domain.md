# Domain Docs

*Repo-authoritative. Don't re-sync it against the pack's generic, reinstallable
`domain.md` template (ADR-0005).*

How to use the domain docs while exploring. The repo's shape (multi-context,
shared kernel) is in `GLOSSARY-MAP.md` (ADR-0021).

## Before exploring, read these

Reading order and triggers (`GLOSSARY-MAP.md`, `GLOSSARY.md`, relevant ADRs):
see CLAUDE.md's "Docs you must read first" and `.claude/rules/tenant-layers.md`,
not this page.

This repo deliberately diverges from the `domain-modeling` Skill's generic
templates:

- an ADR follows ADR-0030's template, not the Skill's section layout;
- a `GLOSSARY.md` is a `## Glossary` of `### Term` entries, not the Skill's
  `## Language`/`_Avoid_` layout;
- the root `GLOSSARY.md` doubles as the Platform context and carries the
  Tenants roster, and each per-Tenant `GLOSSARY.md` adds a purpose narrative on
  top of its glossary (ADR-0021 says why).

Match the repo's actual files, not the template: `GLOSSARY-MAP.md`'s
**Decisions** section says where ADRs live; CLAUDE.md's "Repo layout" says where
`layers/<tenant>/` contexts live.

If `GLOSSARY-MAP.md`, a `GLOSSARY.md` or an ADR is missing, **proceed
silently**: don't flag it or suggest creating it. `/domain-modeling` creates
a missing one lazily, when a term or
decision needs resolving.

## Use the glossary's vocabulary

CLAUDE.md's glossary-term rule covers every output that names a domain concept: an issue
title, a refactor proposal, a hypothesis, a test name.

A concept missing from the glossary means either you're inventing language
(reconsider) or there's a real gap (note it for `/domain-modeling`).

## The rule of two: coin vocabulary on its second instance

A concept earns a glossary entry (`GLOSSARY.md`) or a named taxonomy slot (an
ADR) only once its **second** instance exists or is concretely scheduled.
Before that, describe the first instance in plain words, where it lives —
don't mint a term, a typology, or a classification for a population of one.

This complements the `domain-modeling` Skill's 3-part ADR test: that test gates
*decisions*, the rule of two gates *vocabulary*. Every session reads the
glossary and reconciles term conflicts against it, so a coined term costs every
session; only a second instance proves it worth that. Example: ADR-0010 keeps
Digests in the shared `pages` collection until something needs them apart. The
rule brakes new coinage; anything already built stays.

## Flag ADR conflicts

If your output contradicts an existing ADR, say so explicitly rather than
silently overriding it:

> _Contradicts ADR-0006 (requests reach one Space by path prefix) — but worth reopening because…_
