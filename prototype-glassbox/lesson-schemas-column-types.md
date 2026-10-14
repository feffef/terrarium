---
# PROTOTYPE (ticket #1968). Order B: Terrarium first, the concept in a box.
title: Schemas give column types, not validation
summary: Nuxt Content turns a Collection's Zod schema into database columns; Terrarium runs the schema against every Document itself.
type: lesson
subject: nuxt-content
officialDocs:
  - label: Nuxt Content docs, "Define collections"
    url: https://content.nuxt.com/docs/collections/define   # UNVERIFIED: proxy blocked the check
  - label: Zod docs, "safeParse"
    url: https://zod.dev/basics                              # UNVERIFIED
verifiedAgainst:                 # a version-bound claim names the version it was checked on
  "@nuxt/content": "3.16.1"
inTerrarium:
  - scripts/validate-content.ts
  - layers/journal/tenant.config.ts
  - .github/actions/gate/action.yml
  - docs/adr/0004-objective-safety-gate.md
prerequisites: [collections-and-the-manifest]
related: [the-gate, one-manifest-per-tenant]
---

# Schemas give column types, not validation

Give a Nuxt Content Collection a strict Zod schema, add a Document with a typo'd
field, and the build still passes. Terrarium doesn't rely on the build to catch
it: it checks every Document against its schema in its own gate step.

> **New to Nuxt Content collections or Zod?** Read [the concept](#the-concept)
> first; it takes a minute.

## In Terrarium

Each Tenant declares its Collections, with their Zod schemas, in its manifest
(`layers/<tenant>/tenant.config.ts`). Many schemas end in `.strict()`, so an
unknown field should be an error. The Friction Ledger's entry schema in
`layers/journal/tenant.config.ts` is one: it also rejects an unknown `status`
and a session listed twice.

The surprise: `nuxt build` uses the schema only to work out the SQL column
types for each Collection's table. It never runs the schema against the parsed
content. An out-of-enum value or an extra field on a `.strict()` schema goes
straight into the database.

So `scripts/validate-content.ts` does the missing step. It loads the same
manifests the build does, reads every Document, calls `schema.safeParse()` on
its data, and lists every failure with its file. It runs as `pnpm
validate:content`, and it is a step of the gate, both locally and in CI.

### Why it's built this way

Agents write all of Terrarium's content, so a machine-checkable contract is the
guardrail, not a reviewer's eye ([ADR-0004](../../docs/adr/0004-objective-safety-gate.md)).
A schema nobody evaluates is a contract nobody enforces. Running it in a
separate, fast step also means a content-only change can be checked in seconds,
without a full build.

### What to watch for

- **The claim is version-bound.** It was checked on `@nuxt/content` 3.16.1. If
  a later version starts validating at build time, this Lesson changes, and the
  extra step may become redundant.
- **One source for the schemas.** The validator reuses the manifest expansion
  the build uses (`shared/expand.ts`), so it can never check a different schema
  from the one that built the table.

<details>
<summary><h2 id="the-concept">The concept</h2></summary>

**Nuxt Content** builds Markdown, YAML and JSON files into a SQLite database at
build time. A **collection** groups files of one type and can carry a
**schema** describing each file's fields.

**Zod** describes the shape of data in TypeScript. `schema.parse(data)` throws
on bad data; `schema.safeParse(data)` returns `{ success, error }` instead.
`.strict()` makes unknown keys an error.

The two meet in `defineCollection({ schema })`: Nuxt Content reads the Zod
schema to decide the table's columns.

→ [Nuxt Content: Define collections](https://content.nuxt.com/docs/collections/define)
· [Zod basics](https://zod.dev/basics)

</details>

## Try it in your project

Add a field your schema doesn't allow to one content file and run your build.
If it passes, add a script that loads your collections' schemas and calls
`safeParse` on every file, and run it in CI.

## Where next

- Lesson: The gate (not drafted)
- Lesson: One manifest per Tenant (not drafted)
