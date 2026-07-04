# 2. Per-Tenant manifest generates content.config.ts

Date: 2026-07-04
Status: Accepted

## Context

The Platform is developed primarily by Claude Code agents. Agent-drivability
depends on agents editing something small, local, and declarative rather than
hand-maintaining Nuxt internals.

Nuxt Content needs a single `content.config.ts` declaring every collection. With
collections keyed `tenant × space × collection`, that file is a cross-product
explosion (e.g. `marketing_prod_blog`, `marketing_uat_blog`, …) that grows with
every Tenant, Space, and Collection — error-prone to author by hand and a
global coupling point (one file, all Tenants, merge conflicts, wide blast radius).

## Decision

Each Tenant layer carries a small declarative **manifest** (e.g.
`tenants/<tenant>/tenant.config.ts`) declaring its Spaces, its Collections (and
their schemas), and its routing. A build step (a Nuxt module / prebuild script)
iterates all `tenants/*/tenant.config.ts` and **generates** the global
`content.config.ts` — expanding the `tenant × space × collection` cross-product,
the collection keys, and the routing table automatically.

Agents only ever author/diff the local manifest — they declare *intent*, never
the keyed explosion. The mechanical, error-prone expansion is code.

## Consequences

- "Spawn a Tenant" = drop a folder with a manifest; config regenerates. Colocates
  a Tenant's declaration with its layer.
- Manifests are schema-validated → an agent's output can be checked before build.
- Cost: a generator (Nuxt module) must be built and maintained up front, and
  there is an indirection between manifest and the real Nuxt config. Debugging
  spans the generated file, so generation must be legible and traceable.
- The manifest — not `content.config.ts` — becomes the source of truth an agent
  reasons about.
