# Context — Commits Tenant

> The Commits context: its own vocabulary (Latest Commit, Runtime Read) and its
> reason-to-exist. Platform-wide terms it leans on (Tenant, Space, Collection,
> …) live in the root `CONTEXT.md`; see `CONTEXT-MAP.md`.

The Commits Tenant is a deliberately tiny **technical** proof-of-concept, not a
demo/content Tenant. Where the Journal, Blog, and Atlas author content, this
Tenant authors almost none: its single page is a shell whose only interesting
value is read from the live git repository **at runtime**.

## Why it exists

To answer one narrow question in the real app: *can a Tenant surface a fact read
at runtime from the local machine, rather than baked at build time?* It proves
the mechanism end to end — a backend endpoint shells out to the `git` CLI, a
component fetches it during SSR, and the page shows it large. It is a scaffold
for that experiment, nothing more; it makes no product claim and grows no
content archive.

## The ADR-0001 exception, scoped

ADR-0001 bakes everything at build time — nothing is created or read at runtime.
This Tenant deliberately relaxes that, but **only inside its own
`server/api/latest-commit` endpoint**. The exception is a property of this one
PoC endpoint, exactly as ADR-0011 scopes a different relaxation to the deploy
runner alone — it never touches the application model, the manifest/expansion,
or any other Tenant. A runtime with no git (or no repo) is a valid outcome: the
endpoint degrades to `{ ok: false }` and the page shows a quiet fallback rather
than erroring.

## Glossary

### Latest Commit
The single fact this Tenant exists to display: the repository's most recent
commit (`git log -1`) — its subject line (shown large), full body, short hash,
author, and author date. Read live, never stored as content.

### Runtime Read
The PoC's mechanism and its whole point: a value fetched when the page is
requested (here, via the `git` CLI in a backend endpoint) rather than baked into
the content DB at build time. The scoped exception to ADR-0001 above.

## What lives where

- **This file** — the Commits vocabulary and why the Tenant exists.
- **Root `CONTEXT.md`** — the platform-wide terms it leans on, and the Tenants
  roster that points here.
- **`layers/commits/server/api/latest-commit.get.ts`** — the runtime git read.
- **`layers/commits/app/components/content/LatestCommit.vue`** — its one view
  (the `::latest-commit` MDC component embedded in the Space's `index.md`).
