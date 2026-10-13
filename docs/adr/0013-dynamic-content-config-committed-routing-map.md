# ADR-0013: content.config.ts builds collections from the manifests

`content.config.ts` is an ordinary module that people and agents edit by hand.
Each time Nuxt Content loads it, it reads every Tenant manifest and builds one
collection per Tenant × Space × Collection. No generated copy of that list
is committed or needs regenerating.

## Scope

- **One source for the collection list.** `content.config.ts` gets its
  collections from `expand(loadManifests())` in `shared/expand.ts`. To add,
  change or remove a collection, edit the Tenant's manifest; never write a
  collection into `content.config.ts` by hand (ADR-0002).
- **Only the root config defines collections.** A Tenant layer adds none of
  its own. A layer's collection would skip `expand()`, and with it the check
  that every collection key is unique, which keeps Spaces apart (ADR-0002).
- **When it runs.** Nuxt Content loads the config at every `nuxt prepare`,
  build and dev-server start, so each of those rebuilds the list from the
  manifests. Nothing needs regenerating or committing after a manifest edit.
- **The same expansion feeds the routes.** `modules/routing.ts` runs the same
  `expand()` to build the routing map (ADR-0014), so collections and routes
  cannot disagree.
- **It is ordinary code.** `content.config.ts` carries no "generated" banner,
  and the linter checks it like any other module.

## Why

`content.config.ts` is TypeScript that Nuxt Content runs, not a data file. A
loop can build the collections when the file runs, so a committed copy of its
output adds nothing.

A committed copy needs machinery to stay current (ADR-0007). Building the list
on load needs none and makes a stale list impossible.

## Rejected alternatives

- **Commit the generated config and drift-check it.** ADR-0007 rejects it.

## When to revisit

- A Nuxt Content or jiti change stops `content.config.ts` from importing the
  manifests synchronously while it loads. Then fall back to a Nuxt module that
  registers the collections, or to a committed config.

## Consequences

- In dev, Nuxt Content restarts on edits to `content.config.ts` only, not to
  the files it imports. `modules/routing.ts` adds the manifests and
  `shared/expand.ts` to the dev watch list (ADR-0014).

## See

- `content.config.ts`: the config.
- `shared/expand.ts`: `loadManifests()` (synchronous, through jiti) and
  `expand()`.
- `tests/unit/expand.spec.ts`: the key-uniqueness test.
- `docs/research/nuxt-content-review-grounding.md` §12: when Nuxt Content
  loads and watches the config.
- `.claude/rules/adr-0004-human-merge.md`: these files need a human merge.
