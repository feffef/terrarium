# Domain Docs

*Seeded from `.agents/skills/setup-matt-pocock-skills/domain.md`'s generic
template and substantially customized for this repo (repo-specific ADR
references, the "rule of two" section below). This file is the live,
repo-authoritative one — don't re-sync it against the pack template, which
stays generic and reinstallable (ADR-0005).*

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **multi-context** (ADR-0021), in a **shared-kernel** shape: a
Platform context at the root plus one context per Tenant, co-located with that
Tenant's code.

## Before exploring, read these

The reading order and each file's role (`CONTEXT-MAP.md`, then `CONTEXT.md`, then
the Tenant's own `layers/<tenant>/CONTEXT.md`, then the relevant ADRs) are
single-homed in CLAUDE.md's "Read these first" — start there rather than here.

Note the local shape (a deliberate, ADR-0021-recorded divergence from the
`domain-modeling` Skill's generic templates): the root `CONTEXT.md` doubles as the
Platform context *and* carries the Tenants roster, and each per-Tenant `CONTEXT.md`
carries a purpose narrative on top of its glossary (the Skill's template is
glossary-only). Pointers between these files are navigation, not duplication — the
single-home rule forbids copying substantive content, not references. See
`CONTEXT-MAP.md`'s **Decisions** section for where ADRs live today and why a
demo Tenant's reason-to-exist is recorded in its `CONTEXT.md` rather than an ADR.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

This repo's actual shape (multi-context, shared-kernel — ADR-0021) diverges from
the generic `domain-modeling` template: the template puts contexts under
`src/<context>/` with per-context `docs/adr/`; this repo co-locates each
Tenant's `CONTEXT.md` under `layers/<tenant>/` (where the Tenants already live)
and keeps every ADR at the root `docs/adr/`, because all decisions so far are
Platform-wide. See CLAUDE.md's "Repo layout" for the authoritative full path
list.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## The rule of two: coin vocabulary on its second instance

A concept earns a glossary entry (in `CONTEXT.md`) or a named taxonomy slot (in an ADR) only when its **second** instance exists or is concretely scheduled. Before that, describe the first instance in plain words where it lives — don't mint a term, a typology, or a classification for a population of one.

This **complements** the `domain-modeling` skill's 3-part ADR test (defined there) rather than replacing it: that test gates *decisions*; the rule of two gates *vocabulary*. Coined terms are a standing tax — CLAUDE.md makes every session read all ADRs and reconcile term conflicts against the glossary — so the second instance is what proves the abstraction is worth that tax. (The repo already applies the instinct: the friction-tag taxonomy is deferred "until it can emerge from clustering real frictions," and ADR-0010 deferred a dedicated `digests` collection.) It is a brake on future coinage, not a purge — anything already built stays.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0006 (runtime routing by path prefix) — but worth reopening because…_
