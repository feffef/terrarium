# Context Map

This repo is **multi-context** (ADR-0021). Domain vocabulary is split between a
shared **Platform context** at the root and one context per Tenant, co-located
with that Tenant's code. Read the Platform context always; read a Tenant's
context when you work on that Tenant.

## Contexts

- **Platform** — [`./CONTEXT.md`](./CONTEXT.md) — the concepts every agent needs
  regardless of task: Platform, Tenant, Space, Collection, Document, Session,
  Friction, Skill, Trusted/Public, Agent Authorship, session log, Skill Inventory.
- **Blog** — [`layers/blog/CONTEXT.md`](./layers/blog/CONTEXT.md) — Persona,
  Pingback; why the Blog exists (a demo/content Tenant).
- **Atlas** — [`layers/atlas/CONTEXT.md`](./layers/atlas/CONTEXT.md) — Biome,
  Specimen, Interaction, Observation; why the Atlas exists (a demo/content Tenant).
- **Journal** — [`layers/journal/CONTEXT.md`](./layers/journal/CONTEXT.md) —
  Digest; why the Journal isn't optional (Platform infrastructure, ADR-0008).
- **Commits** — [`layers/commits/CONTEXT.md`](./layers/commits/CONTEXT.md) —
  Latest Commit, Runtime Read; a tiny technical PoC (runtime git read, a scoped
  ADR-0001 exception).
- **Midden** — [`layers/midden/CONTEXT.md`](./layers/midden/CONTEXT.md) — Site,
  Dig season (Stratum), Artifact, Condition, the two-gate inclusion test; why the
  Midden exists (a demo/content Tenant, issue #515).
- **Marquee** — [`layers/marquee/CONTEXT.md`](./layers/marquee/CONTEXT.md) —
  Screening, Chapter, Poster; why the Marquee exists (a guest-requested
  demo/content Tenant, ADR-0023, issue #551).

The root `CONTEXT.md` also carries a `## Tenants` roster that points at each of
these — a pointer, not a second home. Substantive definitions live once, in the
context listed above; pointers to them may live wherever they help a reader.

## Relationships

- **The content Tenants relate to reality differently** (Commits sits outside
  this axis — it's a technical PoC, not a content Tenant). The **Journal**
  documents the Platform honestly (primary/derived self-documentation). The
  **Blog** comments on real repo activity in-character (subjective,
  non-authoritative). The **Atlas** is fiction — it claims nothing about the
  Terrarium at all. The **Midden** is real like the Journal (every Artifact
  traces to an actual discarded thing, gated by its two-gate inclusion test)
  but curated and voiced rather than comprehensive — it catalogues a
  hand-selected, graded subset, not an exhaustive record. The **Marquee** is
  real like the Journal and the Midden (the films and their in-universe
  order are genuine facts, not invented), but — like the Atlas — it claims
  nothing about the Terrarium itself; it is plain content about something
  else entirely.
- **Same-Space derivation vs. cross-Space denormalization.** The Atlas's
  **Interaction** is a same-Space edge whose reverse is *derived*; the Blog's
  **Pingback** denormalizes a *cross-Space* reaction, copying the reference into
  the reacted-to Persona's Space at author time (ADR-0012). Same surface problem,
  opposite mechanism — dictated by whether the fact crosses a Space boundary.
- **Tenant words for a Space.** "Persona" (Blog) and "Biome" (Atlas) are each a
  Tenant's word for the Platform's **Space**; the Journal uses plain `current` /
  `archived`; the Marquee's single Space is a "Screening." Say the Tenant's
  word in product sentences, "Space" for the mechanism.

## Decisions

System-wide ADRs live in [`docs/adr/`](./docs/adr/). There are no context-scoped
`docs/adr/` directories today — every ADR so far is Platform-wide. A demo Tenant's
reason-to-exist is product, not architecture, so it is recorded in that Tenant's
`CONTEXT.md`, not an ADR (ADR-0021).
