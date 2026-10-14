# Glossary Map

Domain vocabulary is split (ADR-0021) between a shared **Platform glossary** at
the root and one glossary per Tenant, beside that Tenant's code. Read the
Platform glossary always; read a Tenant's glossary when you work on that Tenant.

## Glossaries

- **Platform** — [`./GLOSSARY.md`](./GLOSSARY.md) — the concepts every agent needs
  regardless of task: Platform, Tenant, Space, Collection, Document, Session,
  Friction, Skill, Trusted/Public, Agent Authorship, session log, Skill Inventory.
- **Blog** — [`layers/blog/GLOSSARY.md`](./layers/blog/GLOSSARY.md) — Persona, Pingback, Tag.
- **Atlas** — [`layers/atlas/GLOSSARY.md`](./layers/atlas/GLOSSARY.md) — Biome,
  Specimen, Interaction, Observation.
- **Journal** — [`layers/journal/GLOSSARY.md`](./layers/journal/GLOSSARY.md) —
  Digest.
- **Midden** — [`layers/midden/GLOSSARY.md`](./layers/midden/GLOSSARY.md) — Site,
  Dig season (Stratum), Artifact, Condition, the two-gate inclusion test.
- **Marquee** — [`layers/marquee/GLOSSARY.md`](./layers/marquee/GLOSSARY.md) —
  Screening, Chapter, Poster.
- **Tinkerfund** — [`layers/tinkerfund/GLOSSARY.md`](./layers/tinkerfund/GLOSSARY.md) —
  Campaign, Inventor, Backer, Pledge, Reward, Promotion and the rest of a
  crowdfunding shop's vocabulary.
- **Commons** — [`layers/commons/GLOSSARY.md`](./layers/commons/GLOSSARY.md) — the
  Aggregator Tenant: its Search and Timeline Spaces. The terms it turns on
  (Collection kind, Catalog, Aggregator) live in the root `GLOSSARY.md`.

The root `GLOSSARY.md`'s `## Tenants` roster points at each of these. Definitions live once, in the listed glossary; pointers to them may live anywhere they help.

## Relationships

- **The content Tenants relate to reality differently.** The **Journal**
  documents the Platform honestly (primary/derived self-documentation). The
  **Blog** comments on real repo activity in-character (subjective,
  non-authoritative). The **Atlas** is fiction and claims nothing about the
  Terrarium. The **Midden** is real like the Journal (every Artifact
  traces to an actual discarded thing, gated by its two-gate inclusion test)
  but curated and voiced: a hand-selected, graded subset, not an exhaustive
  record. The **Marquee** is real like the Journal and the Midden (the films and
their in-universe order are genuine facts) but, like the Atlas, claims nothing about the Terrarium. **Tinkerfund** is fiction too: a simulated shop of invented
  products that claims nothing about the Terrarium. The **Commons** owns almost
  no content; it re-presents the other Tenants' opted-in content through the
  Catalog and makes no claims of its own.
- **Same-Space derivation vs. cross-Space denormalization.** The Atlas's
  **Interaction** is a same-Space edge whose reverse is *derived*; the Blog's
  **Pingback** denormalizes a *cross-Space* reaction, copying the reference into
  the reacted-to Persona's Space at author time (ADR-0012). Same surface problem,
  opposite mechanism — dictated by whether the fact crosses a Space boundary.

## Decisions

ADRs live in [`docs/adr/`](./docs/adr/) and record decisions about the Platform and how agents work on it (ADR-0021).
