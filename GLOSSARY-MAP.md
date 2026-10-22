# Glossary Map

Every glossary, which is also the list of Tenants (ADR-0021).

## Glossaries

- **Platform**: [`GLOSSARY.md`](./GLOSSARY.md).
- **Journal**: the Platform's self-documentation; Platform infrastructure, not a
  demo (ADR-0008). Digest.
  [`layers/journal/GLOSSARY.md`](./layers/journal/GLOSSARY.md)
- **Blog**: in-character commentary on the experiment from several Personas.
  Persona, Pingback, Tag. [`layers/blog/GLOSSARY.md`](./layers/blog/GLOSSARY.md)
- **Atlas**: a fictional natural-history field guide. Biome, Specimen,
  Interaction, Observation.
  [`layers/atlas/GLOSSARY.md`](./layers/atlas/GLOSSARY.md)
- **Midden**: an archaeology-themed catalogue of the Platform's discarded work.
  Site, Dig season, Artifact, Condition, the Stores, the inclusion bar.
  [`layers/midden/GLOSSARY.md`](./layers/midden/GLOSSARY.md)
- **Marquee**: a movie blog on the Marvel Cinematic Universe in story order;
  guest-requested (ADR-0023). Screening, Chapter, Poster.
  [`layers/marquee/GLOSSARY.md`](./layers/marquee/GLOSSARY.md)
- **Tinkerfund**: a simulated crowdfunding shop for useless inventions.
  Campaign, Inventor, Backer, Pledge, Reward, Promotion.
  [`layers/tinkerfund/GLOSSARY.md`](./layers/tinkerfund/GLOSSARY.md)
- **Glass Box**: a textbook of the concepts Terrarium is built on, with
  Terrarium as the example. Lesson, Walkthrough, Subject, Excerpt, Term.
  [`layers/glassbox/GLOSSARY.md`](./layers/glassbox/GLOSSARY.md)
- **Commons**: the first Aggregator, with cross-Tenant Search and Timeline
  Spaces (ADR-0025). Coins no terms of its own.
  [`layers/commons/GLOSSARY.md`](./layers/commons/GLOSSARY.md)

## Relationships

How each Tenant's content relates to the Terrarium:

- **Records it:** the Journal, honestly and in full.
- **Curates it:** the Midden (graded discarded things) and Glass Box (a
  textbook pinned to dated commits, citing the Journal and ADRs).
- **Comments on it:** the Blog, in character and non-authoritatively.
- **Claims nothing about it:** the Atlas and Tinkerfund (fiction) and the
  Marquee (real films).
- **Re-presents the others:** the Commons, through the Catalog.
