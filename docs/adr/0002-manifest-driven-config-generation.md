# ADR-0002: Each Tenant is declared in one manifest, and code expands it

Each Tenant states what it holds in one small file, its manifest
`layers/<tenant>/tenant.config.ts`: its Spaces, and its Collections with their
schemas. Code expands all manifests into one collection per Tenant × Space ×
Collection, and into the routes. To change what a Tenant holds, an agent edits
its manifest and nothing else.

## Scope

- **The manifest is the only place a Tenant declares content.** It gives the
  Tenant's name, which is also its folder name, its Spaces and its Collections.
  Each Collection has a type, page or data, and a schema, a kind (ADR-0025) or
  both. Routes follow from the page Collections; the manifest doesn't list them.
- **Only manifests define collections.** A Tenant's layer may change how its
  pages look, but never defines a collection of its own.
- **Code does the expansion.** Nobody writes the keyed collections by hand.
  One expansion feeds the collections (ADR-0013), the routing map (ADR-0014)
  and the cross-Tenant catalog (ADR-0025), and it refuses two collections with
  the same key.
- **A manifest is checked before it is expanded.** A misspelt key, an unknown
  kind or a data Collection with no schema fails at the manifest, with a
  message that names the field. The gate also type-checks every manifest.
- **Adding a Tenant edits no shared config file** (ADR-0018). Its glossary
  entries follow ADR-0021.

## Why

- Agents build this Platform. They work best on a small file that states
  intent and sits next to the Tenant's own code.
- The full list of collections grows with every Tenant, Space and Collection.
  Written by hand, it would be one file that every Tenant edits: easy to get
  wrong, prone to merge conflicts, and a mistake there reaches every Tenant.
- Each collection key is its own table and keeps Tenants apart (ADR-0001). The
  expansion is mechanical and easy to get wrong, so it is tested code, not
  hand-typed names.
- Checking the manifest first makes an agent's mistake fail early and clearly,
  not deep inside a build.

## Rejected alternatives

- **One hand-written `content.config.ts` listing every collection.** It is the
  shared file described under *Why*.
- **A generator that writes the expanded config into the repo.** ADR-0007
  rejects committing derived files.

## See

- `shared/manifest.ts`: the manifest's shape and `validateManifest`.
- `shared/expand.ts`: loading the manifests, the expansion and its checks.
- `nuxt.config.ts`: the type-check include for manifests.
- `docs/agents/tenant-layers.md` §3: the steps to add a Space, Collection or
  Tenant.
