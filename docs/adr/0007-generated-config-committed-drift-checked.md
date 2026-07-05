# 7. Generated config is committed and drift-checked via diff

Date: 2026-07-04
Status: Accepted — partially superseded by ADR-0013

> **Amended by [ADR-0013](0013-dynamic-content-config-committed-routing-map.md)
> (2026-07-05).** The decision to commit **`content.config.ts`** is superseded:
> it is now an ordinary module that builds the keyed collections dynamically from
> the manifests at config-evaluation time (no committed file, no banner, no drift
> gate, and it is now linted). The decision to commit **`shared/routing.generated.ts`**
> is **retained** — the client needs it at runtime, and its diff remains the
> reviewable "which tables did this manifest change" signal. Read this ADR for the
> original both-artifacts reasoning; read ADR-0013 for the amendment and why the
> routing map alone stays committed.

## Context

ADR-0002 has a generator expand the Tenant manifests into the global
`content.config.ts` (and, in the implementation, `shared/routing.generated.ts`).
ADR-0003 charters a **drift-check** job to detect "manifest ↔ generated-config ↔
content" mismatches. We must decide whether the generated artifacts are committed
to the tree or produced only at build time — and how drift is actually detected.

## Decision

**Commit the generated artifacts**, banner-marked `GENERATED — DO NOT EDIT`, and
detect drift with `git diff`:

- `scripts/generate.ts` writes `content.config.ts` and
  `shared/routing.generated.ts`. Both are committed.
- `dev`/`build`/`typecheck` run `pnpm gen` first, so a developer's working tree
  is always regenerated before use.
- The gate runs `pnpm gate:drift` = `pnpm gen && git diff --exit-code` on the two
  files. If a manifest changed but the committed output was not regenerated (or
  someone hand-edited the generated file), the diff is non-empty and CI fails.
  **That diff *is* the drift-check signal** ADR-0003 asks for — no bespoke
  comparator needed yet.

## Consequences

- The keyed collections and routing table are **reviewable in the PR diff**: a
  reviewer sees exactly which `<tenant>_<space>_<collection>` tables a manifest
  change creates or removes, next to the manifest change itself.
- Generated files are excluded from ESLint and are never hand-edited; the banner
  and the drift gate enforce this.
- Cost: a generated file lives in the tree and can look redundant with the
  manifest. The banner, the `pnpm gen` pre-step, and the drift gate keep it
  honest. If regeneration is ever non-deterministic it would cause false drift —
  so the generator must be deterministic (stable ordering, no timestamps).
- The generator remains **human-only** (ADR-0004): it is the mechanism the whole
  isolation guarantee rests on.
