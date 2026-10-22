---
paths:
  - "nuxt.config.ts"
  - "layers/*/nuxt.config.ts"
  - "layers/*/tenant.config.ts"
  - "layers/*/app/**"
---
# Tenant layers

- **Share no code between Tenants;** read another Tenant only through the
  Catalog (ADR-0025). Add a shared layer only when a concrete cross-cutting
  need proves it worth the coupling.
- **Auto-imports first.** A layer's `app/components/`, `app/composables/` and
  `app/utils/` are auto-imported in every layer, components by
  directory-prefixed name. The namespace is global: name exports in the
  Tenant's words (`formatBlogDate`, not `fmtDate`), and never give a local
  binding an auto-imported name.
- **Aliases (`~`, `@`, `~~`, `@@`) resolve to the main app, not the layer.**
  Import a layer's own types by relative path; in its `nuxt.config.ts`, build
  asset paths with `fileURLToPath(new URL('./app/…', import.meta.url))`. A
  main-app module keeps its alias (`#shared/routing`).
- **New Tenant:** add a `nuxt.config.ts` (`defineNuxtConfig({})`), then
  `nuxt prepare` before `pnpm lint`. Check a new Collection against ADR-0006
  (only `pages` gets URLs, #573).
- **A layer is not a sandbox.** Its `css:` loads on every page (scope it under
  the wrapper class), its plugins and `nuxt.config` flags apply app-wide (keep
  them inert outside the Tenant's opt-in), its `package.json` can't scope a
  dependency (a new one escalates, ADR-0004), and storage is one origin
  (prefix keys, delete only yours, never `clear()`).

Wrapper CSS tokens, content-component overrides and routing claims:
docs/agents/tenant-layers.md. Before you work on a Tenant, read its terms in
layers/<tenant>/GLOSSARY.md.
