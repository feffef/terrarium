# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**: one `CONTEXT.md` and one `docs/adr/` at the repo root.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the domain model / ubiquitous language.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

(If a `CONTEXT-MAP.md` ever appears at the root, this repo has become multi-context: it points at one `CONTEXT.md` per context, and `src/<context>/docs/adr/` holds context-scoped decisions. Read each one relevant to the topic.)

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (this repo):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-single-container-baked-multitenancy.md
│   └── 0002-manifest-driven-config-generation.md
└── …
```

Multi-context repo (would be signalled by a `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## The rule of two: coin vocabulary on its second instance

A concept earns a glossary entry (in `CONTEXT.md`) or a named taxonomy slot (in an ADR) only when its **second** instance exists or is concretely scheduled. Before that, describe the first instance in plain words where it lives — don't mint a term, a typology, or a classification for a population of one.

This **complements** the `domain-modeling` skill's 3-part ADR test (defined there) rather than replacing it: that test gates *decisions*; the rule of two gates *vocabulary*. Coined terms are a standing tax — CLAUDE.md makes every session read all ADRs and reconcile term conflicts against the glossary — so the second instance is what proves the abstraction is worth that tax. (The repo already applies the instinct: the friction-tag taxonomy is deferred "until it can emerge from clustering real frictions," and ADR-0010 deferred a dedicated `digests` collection.) It is a brake on future coinage, not a purge — anything already built stays.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0006 (runtime routing by path prefix) — but worth reopening because…_
