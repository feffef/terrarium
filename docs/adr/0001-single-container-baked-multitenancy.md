# 1. Single-container, build-time-baked multi-tenancy

Date: 2026-07-04
Status: Accepted

## Context

The Platform must host multiple Tenants, each with multiple Spaces (e.g. `prod`,
`it`, `uat`, `dev`) whose content is isolated. Two forces are in tension:

- Nuxt Content v3 is **build-time and static**: collections are declared in
  `content.config.ts`, parsed from files at build, and compiled into a single
  SQLite database bundled with the server. There is no first-class runtime API
  to create collections/tenants while running.
- The operator wants **one repository and one deployed container** — not many
  repos or many containers. Adding a microsite is a feature branch → review →
  merge → tag release → redeploy the single updated image.

## Decision

Model the whole Platform as **one Nuxt app, one repo, one container**. Declare
many collections in a single `content.config.ts`, keyed Tenant × Space × type;
all Tenants' and all Spaces' content bakes into the one SQLite DB inside the one
image. **Runtime routing** (subdomain / path prefix / header) selects which
Tenant + Space to serve, but only among content already baked at build time.
Nothing is created at runtime.

Isolation between Spaces is **physical at the table level** (one SQLite table per
Tenant × Space × Collection) but **logical at the container level** (all Spaces
ship in one image); it is not separate DBs or containers.

## Consequences

- Uses Nuxt Content exactly as designed (static, git-based, baked). No dynamic
  DB switching or runtime collection creation.
- Every Space's content ships inside every container. Spaces are separated and
  independently addressable, but **not** air-gapped: the `prod` image physically
  contains `uat`/`dev` content. Acceptable because isolation here means "cleanly
  separated," not "cryptographically air-gapped." If that assumption ever
  changes, this decision must be revisited (it would force separate builds).
- "Spawn a microsite" is a source-code operation, reconciling the agent-driven
  workflow (agents edit files in a git tree — their native strength) with Nuxt
  Content's static model.
