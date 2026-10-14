# ADR-0018: Each Tenant is a Nuxt layer in `layers/<tenant>/`

Each Tenant lives in its own folder, `layers/<tenant>/`, the folder Nuxt
itself uses for layers. Nuxt loads every folder there on its own, so adding a
Tenant means adding a folder, and no root config lists the Tenants. "Tenant"
stays the domain word; `layers/` is only a path.

## Scope

- **Where a Tenant lives.** All of a Tenant sits under `layers/<tenant>/`: its
  pages and components in `app/`, its own `nuxt.config.ts`, its manifest
  `tenant.config.ts`, and its content under `content/<space>/<collection>/`.
  Code that finds the Tenants reads this folder.
- **No list of Tenants in `nuxt.config.ts`.** Nuxt extends every folder under
  `layers/` itself. Adding or removing a Tenant never edits the root config.
- **Type checking.** Nuxt's own type check covers each layer's `app/` and
  `nuxt.config.*`. It cannot see the manifests, which load only at build time,
  so `nuxt.config.ts` adds one include for them. A test fails if that include
  stops matching a real manifest.
- **Words.** Say "Tenant" for the domain idea and "layer" only for the Nuxt
  mechanism (`CONTEXT.md`). The folder's name changes neither.

## Why

- Nuxt's convention does work we would otherwise do by hand. Under any other
  folder name, each Tenant must be added to an `extends` list in the root
  config, and type checking needs extra include patterns and a test to guard
  them.
- Adding a Tenant should be adding a folder (ADR-0002). A hand-kept list breaks
  that: every new Tenant would also need an edit to a Human-only file.
- Nuxt keeps its own include patterns in step with the folder. Only the
  manifest include is ours, and a test watches it.

## Rejected alternatives

- **A `tenants/` folder, named after the domain word.** It reads better next
  to the glossary, but Nuxt doesn't know it. It needs the hand-kept `extends`
  list, extra type-check includes and a test guarding them. We chose Nuxt's
  convention over a matching name.

## Consequences

- Old session logs and blog posts still name `tenants/…` paths. They record
  what was true then and stay as written.
- Moving or renaming the folder touches Human-only files, so a human merges
  that change (ADR-0004).

## See

- `nuxt.config.ts`: the manifest include for type checking.
- `tests/unit/typecheck-coverage.spec.ts`: fails when that include matches no
  manifest.
- `.claude/rules/tenant-layers.md`: how to add a Tenant, and the layer gotchas.
- `shared/expand.ts`: reads the manifests from `layers/`.
