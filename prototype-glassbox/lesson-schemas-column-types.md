---
# PROTOTYPE (ticket #1968)
title: Schemas give column types, not validation
description: Nuxt Content turns a Collection's Zod schema into database columns; Terrarium runs the schema against every Document itself.
---

# Schemas give column types, not validation

Give a Nuxt Content Collection a strict Zod schema, add a Document with a typo'd
field, and the build still passes. Terrarium doesn't rely on the build to catch
it: it checks every Document against its schema in its own gate step.

> **Know Nuxt Content collections and Zod?** Skip to [In Terrarium](#in-terrarium).

## The concept

**Nuxt Content** builds Markdown, YAML and JSON files into a SQLite database at
build time. A **collection** groups files of one type and can carry a
**schema** describing each file's fields.

**Zod** describes the shape of data in TypeScript. `schema.parse(data)` throws
on bad data; `schema.safeParse(data)` returns `{ success, error }` instead.
`.strict()` makes unknown keys an error.

The two meet in `defineCollection({ schema })`: Nuxt Content reads the Zod
schema to decide the table's columns.

→ Full reference: [Nuxt Content, "Define collections"](https://content.nuxt.com/docs/collections/define)
(UNVERIFIED link) · [Zod basics](https://zod.dev/basics) (UNVERIFIED link)

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

## Try it in your project

Add a field your schema doesn't allow to one content file and run your build.
If it passes, add a script that loads your collections' schemas and calls
`safeParse` on every file, and run it in CI.

## Where next

- Lesson: The gate (not drafted)
- Lesson: One manifest per Tenant (not drafted)
