# ADR-0025: Reads across Tenants go through opted-in collection kinds

A Collection stays hidden from other Tenants unless its manifest names a kind,
a shared shape from `shared/kinds.ts`; the build lists every such Collection in
`#catalog`. Code reads across Tenants only through the catalog's read
functions, which only read built content (ADR-0001).

## Scope

- **Opt-in per Collection.** A Collection joins the catalog by naming a kind
  in its manifest. Without one, no code outside its Tenant can read it.
- **A kind is a minimum.** Its contract lists the fields every reader may rely
  on. The Collection's schema is that contract plus its own fields, so opting
  in costs a Tenant none of its private fields. A kind is separate from a
  Collection's type, page or data; the manifest check refuses an unknown kind
  or a mismatched type (ADR-0002).
- **One read path.** `queryAcrossTenants` reads one kind from every Collection
  that opted in and tags each row with its Tenant, Space and Collection.
  `queryPages` adds each page's own URL. Code never reads another Tenant any
  other way: not by its manifest, a list of Tenants or its collection keys.
- **Who may read across.** Any Tenant layer may call the read functions. A
  view whose whole job is to look across Tenants, such as Search or the
  Timeline, goes in the Commons Tenant as a new Space. The Commons's own pages
  name no kind, so its views never list the Commons itself.
- **A view's own logic is its own.** The read functions stay generic. How a
  view turns rows into entries, such as what counts as a post or which link it
  uses, lives in that view's layer and is an ordinary change.
- **Links go to real addresses.** A result links to the item's own URL, as
  `queryPages` gives it.
- **Nothing writes across Tenants.** Each Tenant's content is written only in
  its own layer.
- **Who merges.** A view's code in its layer is an ordinary change, even when
  it calls the read functions. Which catalog files wait for a human merge:
  ADR-0004's list.

## Why

- Views such as a search or an activity feed need to look across Tenants. With
  no supported way, a fork built a hard-coded list of Tenants with fake data.
- Copying another Tenant's schema drifts, and importing its manifest couples
  the two. A kind gives a shared shape one home.
- Opting in keeps isolation the default. A Tenant that names no kind is as
  isolated as before, and nothing is exposed that a manifest did not mark.
- The catalog comes from the same manifest expansion as routing (ADR-0014). A
  new Tenant appears and a removed one drops with no list to edit.
- Other Tenants and views depend on a kind. Renaming or dropping a field can
  silently empty a view, and widening the read path can expose content. The
  gate sees neither, so a human merges those files.

## Rejected alternatives

- **Each reader declares the schemas it reads.** The copies drift.
- **Every Collection readable by default.** It ends isolation as the default,
  and a Tenant would have to opt out to keep data private.
- **A kind's contract is the whole schema.** Every Tenant that opts in would
  move its schema into `shared/` and lose its private fields.
- **Type each read's results from the kind name.** It fights Nuxt Content's
  per-collection types for little gain. Each read accepts one cast instead.

## When to revisit

- Before anyone builds a sitemap. Naming the `page` kind means both
  "searchable" and "listed": a sitemap wants every routed page, including ones
  with no kind. Read it from the routing map, or split the opt-in by purpose.
- When the catalog grows large: the read functions fetch whole documents
  before trimming them. Select fields in the query, or build an index at build
  time.

## See

- `shared/kinds.ts`: the kinds and their contracts.
- `shared/schemas/`: the session-log and timestamp shapes the contracts use.
- `shared/manifest.ts` (`validateManifest`): the kind checks.
- `shared/expand.ts` (`catalogFrom`) and `modules/catalog.ts`: build `#catalog`.
- `app/composables/catalog.ts`: `queryAcrossTenants` and `queryPages`.
- `shared/routing.ts` (`documentUrl`): a page's own URL.
- `layers/commons/`: Search, the Timeline and its adapters (`timeline.ts`).
