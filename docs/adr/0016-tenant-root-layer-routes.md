# ADR-0016: A Tenant's own layer may hold pages at its root, `/t/<tenant>`

A Tenant may have one page at its root address, `/t/<tenant>`, above its
Spaces, and hand-built static pages directly under it, `/t/<tenant>/<name>`.
They live in that Tenant's own layer and are ordinary presentation code. They
stay out of the manifest and the routing map, and get tested by their own
Tenant. The root page reads Space data only through the shared resolver; a
static page reads no Space data.

## Scope

- **Where they live.** In the Tenant's layer: the root page at
  `layers/<tenant>/app/pages/t/<tenant>/index.vue`, a static page at
  `layers/<tenant>/app/pages/t/<tenant>/<name>.vue`. The Platform has no page
  that answers `/t/<tenant>` for every Tenant.
- **What the root page may do.** Show a landing page, such as a cover or a
  directory of the Spaces, or send the visitor on to one Space. Which one is
  the Tenant's choice.
- **What a static page may do.** Show text the page file itself holds, such as
  a reading list or a notice. It reads no Space data and no other Tenant's,
  so it adds nothing to isolation. Text that needs Documents belongs in a
  Space's `pages` Collection.
- **How the root page reads content.** It reads its own Tenant's Spaces only
  through `resolveSpaceRoute`, once per Space it needs, and other Tenants only
  through the catalog (ADR-0025). It never reads the routing map itself. The
  Platform home page is not a root page; ADR-0025 names it as the one page that
  may read the Tenants it features directly.
- **No clash with a Space.** A path `/t/<tenant>/<name>` is otherwise a Space
  (ADR-0006). A static page's file outranks the Space route, so a Space with
  the same slug would become unreachable. A name must therefore never equal a
  Space slug of its Tenant; a unit test checks it.
- **What stays the same.** The manifest, the routing map and the resolver know
  nothing about these pages. Only Spaces have routes there.
- **Who merges.** These pages add no routing logic, so they merge like any
  other Tenant layer page.
- **Testing.** The smoke test never visits them, so each Tenant tests its own
  in its own tests.

## Why

- A landing page is not a Space. Faking one as an empty Space would put a place
  with no content in every list of Spaces.
- Keeping the pages in the layer leaves the routing model and the isolation
  code untouched. The resolver stays the one way to reach a Space's data.
- Each Tenant decides what its root shows and which few pages sit beside it. A
  landing page, a redirect and a reading list are all just pages.

## Rejected alternatives

- **Make the landing page a Space.** It would have no content of its own, and
  every feature that lists Spaces would show it.
- **One Platform page at `/t/[tenant]` that sends every Tenant to its first
  Space.** It would read the routing map directly, outside the resolver, and
  choose the Space by declaration order rather than let the Tenant choose.
- **A root-page field in the manifest.** It would change the manifest format
  and the expansion code for what a small layer page already does.
- **Put a static page in a Persona's Space** (the Blog's reading list in one
  Persona's Space). It would read as that Persona's voice and show in that
  Space's lists, though it belongs to the whole Tenant.

## When to revisit

- These pages become common enough to deserve a place in the manifest.

## Consequences

- A Tenant without a root page answers `/t/<tenant>` with a 404, because the
  Platform's catch-all page needs both a Tenant and a Space.
- No check makes sure such a page has a test. The Tenant's tests are the only
  cover, besides the build failing on a broken page.
- A static page's text lives in a Vue file, so it is edited as code, not as
  content.

## See

- `shared/expand.ts` (`entryRoutesFrom`): the entry routes the smoke test
  visits.
- `shared/routing.ts` (`resolveSpaceRoute`): the resolver (ADR-0006).
- `app/pages/t/[tenant]/[space]/[...slug].vue`: the Platform catch-all.
- `layers/<tenant>/tests/e2e/`: each Tenant's own page tests.
- `tests/unit/tenant-page-names.spec.ts`: the check that a static page's name
  is not a Space slug.
