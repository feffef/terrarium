# ADR-0021: A Platform glossary plus one glossary per Tenant

The root `GLOSSARY.md` holds the terms every agent needs, whatever its task.
Each Tenant's own words, why it exists and its product decisions live in
`layers/<tenant>/GLOSSARY.md`, beside its code. ADRs record decisions about the
Platform and how agents work on it, so a Tenant that only serves content gets
no ADR.

## Scope

- **Where a term goes.** A term an agent needs whatever the task goes in the
  root `GLOSSARY.md`. A term used only while working on one Tenant goes in that
  Tenant's `GLOSSARY.md`. Each term is defined once; other files may point to
  it.
- **The root `GLOSSARY.md`** is a glossary only, with no implementation details
  or specs. It also lists the Tenants, each with a link to its glossary, and the
  terms we stopped using, so older text stays readable.
- **A Tenant's `GLOSSARY.md`** holds that Tenant's glossary, plus why it exists,
  who it is for and its product decisions as they stand. A spec issue may hold
  the detail and the history, linked from the glossary. The file sits directly
  in the Tenant's folder: it is instruction for agents, while the Tenant's
  content is not.
- **`GLOSSARY-MAP.md`** lists every glossary and how they relate.
- **Which decisions get an ADR.** Only decisions about the Platform and how
  agents work on it, and every ADR lives in `docs/adr/`. A Tenant gets one only
  when it changes how the Platform works, as the Journal (ADR-0008) and the
  Commons (ADR-0025) do. Why a demo Tenant exists, and what it should be,
  belongs in its glossary.
- **Adding a Tenant** means adding its `GLOSSARY.md`, a line in the root
  list and an entry in `GLOSSARY-MAP.md`. It needs no ADR unless it changes
  how the Platform works.

## Why

Every agent reads the root glossary. When it also held every Tenant's words,
an agent looking up a Platform term read past another Tenant's fictional
species. Splitting by who needs a term keeps the root short. An agent reads
the Platform glossary always, and a Tenant's glossary only when it works on
that Tenant, where the words sit beside the code that uses them.

A demo Tenant's reason to exist is a product choice, not architecture. It
needs a home, and a glossary-only root can't hold it, so the Tenant's own
glossary does. Keeping product choices out of `docs/adr/` keeps the ADRs about
how the Platform works.

The `domain-modeling` Skill already supports several glossaries indexed by a
map, so we use its shape.

## Rejected alternatives

- **One flat glossary.** Simpler, but every agent pays for every Tenant's
  words on every task.
- **An ADR, or an ADR folder, per Tenant.** Product choices would sit beside
  architecture, and agents would search more ADRs to find the ones that bind
  the Platform.
- **A glossary-only file per Tenant, as the Skill's template has.** A Tenant's
  purpose would have no home.

## Consequences

- A demo Tenant's product decisions change in an ordinary PR, which an agent
  may merge. An ADR change waits for a human merge (ADR-0004).

## See

- `GLOSSARY-MAP.md`: the glossaries and how they relate.
- `docs/agents/domain.md`: how a `GLOSSARY.md` is laid out, and where it
  differs from the `domain-modeling` Skill's templates.
- `CLAUDE.md` and `.claude/rules/tenant-layers.md`: when to read which glossary.
- `scripts/shell-reads.ts`: treats `layers/<tenant>/GLOSSARY.md`, one level
  deep, as instruction and the Tenant's content as not.
