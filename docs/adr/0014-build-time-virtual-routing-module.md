# ADR-0014: The routing map is built from the manifests at build time, never committed

The routing map, which turns a Tenant and Space into its collection keys, is
worked out from the Tenant manifests each time the app is prepared or built.
A Nuxt module writes it into `.nuxt/` and the app imports it as `#routing`.
Nothing generated is committed, so there is no regenerate step and nothing to
drift.

## Scope

- **One source.** The routing map comes from the same expansion of the
  manifests (`expand(loadManifests())`) that builds the collections
  (ADR-0013). The smoke test's list of entry routes comes from it too. None of
  them can disagree with the manifests or with each other.
- **What the map holds.** Each Tenant's Spaces and each Space's collection
  keys. Only `pages` gets routes (ADR-0006); a Tenant's root page is not in
  the map (ADR-0016).
- **How it reaches code.** As a plain static import of `#routing`, with no Nuxt
  composable, so the resolver in `shared/routing.ts` stays plain code that
  unit tests can run without Nuxt.
- **To change the map,** edit a manifest. Never commit or hand-write a routing
  file (ADR-0007).
- **Other data derived from the manifests** is built the same way, into a `#`
  import. `#catalog` is one (ADR-0025).

## Why

- Building the map every time makes a stale copy impossible (ADR-0007).
- The browser needs the map, but working it out there would ship every
  manifest and zod to the client. Building it ahead of time ships plain data.
- One expansion feeding the collections, the map and the tests keeps the
  Tenant isolation guarantee in one place.

## Rejected alternatives

- **Commit the generated map and check it for drift in the gate.** ADR-0007
  rejects committing derived files.
- **Work out the map in the browser.** It pulls every manifest and zod into the
  client bundle.

## When to revisit

- A fourth module would derive data from the manifests. Fold the routing,
  catalog and content-config derivations into one module first.

## Consequences

- A PR diff does not show the routing map. Read the manifest diff instead.
- Tools that run outside Nuxt, the unit tests and the second type-check pass,
  read the map from `.nuxt/`. After a rebase or a new layer, refresh `.nuxt/`
  or they see a stale map.
- A running dev server restarts when an existing manifest changes, but not
  when a new layer folder appears.
- The design leans on Nuxt's module and template API rather than a plain file.

## See

- `modules/routing.ts`: builds and registers `#routing` and the dev watch list.
- `vitest.config.ts`, `tsconfig.node.json`: the `#routing` aliases for tools
  outside Nuxt.
- `shared/expand.ts`: the expansion and `entryRoutesFrom`.
- `docs/agents/tenant-layers.md`: refreshing `.nuxt/` after adding a Tenant.
