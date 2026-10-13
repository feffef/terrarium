# ADR-0007: Derived files are built, not committed

Whatever the build can derive, such as the collections and routes from the
Tenant manifests, it derives at build time, so no generated copy sits in the
repo. A derived file is committed only
when the build cannot make it. Then the gate re-derives or checks it and fails
when the committed copy no longer matches its source.

## Scope

- **Derived at build time.** The keyed collections, the routing map and the
  catalog are computed from the manifests on every prepare, build or dev
  start (ADR-0013, ADR-0014, ADR-0025). Edit the manifest; there is nothing
  to regenerate or commit.
- **Committed only when the build cannot make it.** For example, rendering a
  diagram needs a browser, which the production container lacks, so the
  SVGs are rendered by the author and committed (ADR-0024).
- **A committed derived file has a gate check** that fails when the file no
  longer matches its source. A new kind of committed derived file needs such
  a check.
- **Derivation is deterministic.** The same sources give byte-identical
  output, or every build and check would see false drift.

## Why

A committed copy of derived output needs machinery to stay honest: a "do not
edit" banner, a regenerate step before every script, and a drift check. Even
then the check only catches the common mistake, a manifest edited without the
regenerated output. Deriving at build time makes that mistake impossible.

The manifest diff already shows a reviewer what a change intends. Expanding
it in a PR adds noise, not review.

## Rejected alternatives

- **Commit the generated config and routing map**, so a PR diff shows which
  Collections a manifest change adds or removes. It needs the machinery
  above, and the manifest diff carries the same signal.

## Consequences

- No file in the repo shows the expanded collections or routes. To inspect
  them, run `expand(loadManifests())` from `shared/expand.ts`.

## See

- `shared/expand.ts`: the one expansion every build-time consumer uses.
- `modules/routing.ts`, `modules/catalog.ts`, `content.config.ts`: where the
  build derives them.
- `scripts/verify-mermaid.ts` and `scripts/gate.ts`: the drift check for a
  committed derived file and where the gate runs it.
