# ADR-0001: One app serves every Tenant from content built ahead of time

The whole Platform is one Nuxt app, in one repo, shipped as one container. All
content is built from committed files into one SQLite database before the
site serves it. A request only chooses among that built content; nothing
creates or changes content while the site runs.

## Scope

- **One app for every Tenant.** Every Tenant and Space runs in the same app
  and the same image. A view across Tenants, such as the Commons, is an
  ordinary Tenant layer in that app, not a separate service (ADR-0025).
- **Content comes from committed files only.** Each Tenant × Space × Collection
  becomes its own collection, built into one SQLite database. Serving a request
  fetches no outside data, and the site keeps no store that visitors write to. A
  feature that needs one, such as accounts, comments or uploads, needs a new
  decision first.
- **Nothing is created while the site runs.** You add a Tenant, Space,
  Collection or Document by editing files and building again (ADR-0002).
- **Content changes only with a new build.** So a rendered page can be cached
  until the next build goes live (ADR-0028). Where the build runs, in CI or on
  the server, is ADR-0011's decision.
- **A request picks a Tenant and Space** from its URL and reads only that
  Space's collections (ADR-0006).
- **Isolation means separate tables, not separate images.** Each collection is
  its own table, so a query for one Space cannot return another's Documents.
  Reads across Tenants are opt-in per Collection (ADR-0025). Every image still
  holds every Space, so a site serving one Space ships the others' content too.

## Why

Nuxt Content is built for this: it reads files at build time and bakes them
into one SQLite database. It has no supported way to add collections or
switch databases while running. Working with it, not around it, keeps the
Platform simple.

The owner wants one repo and one container to run, not one per Tenant or
Space.

Agents work by editing files in git. When adding a Tenant or a page is a file
edit, it goes through the same PR and gate as any other change.

## Rejected alternatives

- **A repo or container per Tenant or Space.** More to deploy and keep in
  step, for isolation the Platform does not need.
- **Separate databases or images per Space,** so production holds no test
  content. Isolation here means cleanly separated, not sealed off.
- **Creating collections or Tenants while the site runs.** Nuxt Content does
  not support it, and it would bypass review of the change.

## When to revisit

- A Space must be sealed off from the others, for example a production image
  that may not contain test content. That forces a separate build per Space.

## See

- `collectionKey` in `shared/manifest.ts`: the table name for each Tenant ×
  Space × Collection.
- `content.config.ts` and `shared/expand.ts`: build the collections from the
  manifests.
- `deploy/`: where and how the live site builds.
