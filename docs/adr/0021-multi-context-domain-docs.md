# 21. Multi-context domain docs: a Platform context plus per-Tenant contexts

Date: 2026-07-11
Status: Accepted

## Context

`CONTEXT.md` began as a single flat glossary at the repo root — the right shape
when the Platform had one kind of vocabulary. It has since accreted three
distinct populations of terms:

1. **Platform concepts** every session needs regardless of task — Platform,
   Tenant, Space, Collection, Document, Session, Friction, Skill, Trusted,
   Public, Agent Authorship.
2. **Tenant-local vocabulary** that only matters when authoring *one Tenant's*
   content — the Blog's Persona/Pingback, the Atlas's Biome/Specimen/
   Interaction/Observation, the Journal-website's Digest. An agent doing Blog
   work never needs the Atlas's terms, and vice versa.
3. **Speculative job-taxonomy** coined before the work existed — `sync`,
   `consolidate`, `codify`. The real self-improvement work grew different names
   (`digest`, `audit-docs`, `audit-skills`, `frictions-to-fixes`); the docs even
   admit it (`digest`'s SKILL says "still do not call it `sync`"). The coined
   names lingered as filler and drifted.

Mixing all three in one file means every agent reads a Biome's rarity grades to
find the definition of Friction, and keeps meeting dead job-names presented as
live vocabulary. Meanwhile the *reason a demo Tenant exists* (why the Blog runs
three Personas; who the Atlas is for) had nowhere to live — `CONTEXT.md` is
glossary-only by convention, so it can't hold that rationale, and there was no
per-Tenant home for it either.

The `domain-modeling` Skill we build on already ships a structure for exactly
this: a **multi-context** repo with a root `CONTEXT-MAP.md` indexing one
`CONTEXT.md` per bounded context.

## Decision

Adopt the multi-context structure, in a **shared-kernel** shape:

- **Root `CONTEXT.md` is the Platform context** — the glossary of concepts every
  agent needs regardless of which Tenant it works on, plus a `## Tenants` roster
  that names each Tenant and points to its own context. It stays glossary-only.
- **`CONTEXT-MAP.md` at the root** indexes the contexts (Platform → `./CONTEXT.md`;
  Blog / Atlas / Journal → `layers/<tenant>/CONTEXT.md`) and records the
  cross-context **relationships**.
- **`layers/<tenant>/CONTEXT.md`** holds that Tenant's own vocabulary *and* its
  purpose narrative (why it exists, who it is for), co-located with the Tenant's
  code. A demo Tenant's reason-to-exist is **product, not architecture**, so it
  lives here — not in an ADR.

**What stays vs. moves** is decided by one test: *does an agent need this term
regardless of task?* If yes it stays in the Platform context (session log, Skill
Inventory, Digest-the-Skill's governance); if it is only consumed while
authoring one Tenant's content, it moves to that Tenant's context (Persona,
Pingback, Biome, Specimen, Interaction, Observation, and the Digest content-kind,
which only the Journal website renders).

**The speculative job-taxonomy is retired.** `sync`, `consolidate`, and `codify`
are named once in the Platform context as retired terms — describing their
original intent and directing new writing to the real Skills — and are swept out
of living docs. The ADRs that coined them are left untouched as the historical
record. `Spawn` (never really used) is dropped; the coined term "Journal entry"
is retired in favour of the concrete "session log."

The ADR boundary is drawn explicitly: **ADRs record Platform architecture only.**
The existence and reason-to-exist of a demo/content Tenant (Blog, Atlas, and
future ones) is not architecture and gets no ADR — the Journal is the one
exception because it *is* Platform infrastructure (the self-documentation
apparatus), which is why its rationale is ADR-0008.

## Consequences

- Vocabulary sits with the code that uses it. An agent working in `layers/blog/`
  finds Persona/Pingback in `layers/blog/CONTEXT.md`, not by scrolling past the
  Atlas's food-web terms in a monolith.
- Pointers to a moved term (in code comments, the map, the roster) are fine and
  encouraged — the single-home rule forbids duplicating *substantive content*,
  not references that help a reader reach the one home.
- `docs/agents/domain.md` flips from single-context to multi-context and
  documents this exact shared-kernel shape, including that per-Tenant contexts
  carry a purpose narrative on top of their glossary (a deliberate divergence
  from the Skill's glossary-only `CONTEXT.md` template, which this repo already
  diverges from elsewhere).
- Retiring the job-taxonomy is a drift-correction, not a new trade-off, so it
  needs no ADR of its own — a note in the Platform context plus a living-doc
  sweep is the honest weight. The scheduled `audit-docs` run backstops any
  swept-doc misses.
- New Tenants are cheap to document: drop a `layers/<name>/CONTEXT.md` with the
  Tenant's terms + purpose and add a roster line. No ADR unless the Tenant
  changes Platform architecture.
