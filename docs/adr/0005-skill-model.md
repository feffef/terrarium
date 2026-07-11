# 5. Skill model: generic, repo-committed, first-class

Date: 2026-07-04
Status: Accepted

> **Amended (2026-07-11).** **`drift-check` is retired**, not merely quiet:
> ADR-0014 deleted the generated-config artifact (`shared/routing.generated.ts`,
> `pnpm gate:drift`, `scripts/generate.ts`) it existed to check, eliminating its
> premise entirely. It is no longer part of the chartered-job list below;
> `CONTEXT.md`'s Codify entry already lists the current set as `sync`,
> `consolidate`, and `triage` (see also ADR-0003).

## Context

"An ever-growing set of Skills that develop the Platform" is the project's core
identity. We must decide what a Skill is here, where it lives, and whether Skills
are generic or per-Tenant.

Two categories exist and should not be conflated:
- **Platform-operation Skills** — encode how to safely perform a Platform change
  (`spawn-tenant`, `add-space`, `add-collection`, `edit-content`, and the
  chartered autonomous jobs `sync`, `drift-check`, `consolidate`, `triage`,
  `codify`). They embed *this* Platform's conventions (manifest schema, layer
  structure, safety gate). This is the first-class, ever-growing deliverable.
- **General engineering Skills** — `tdd`, `code-review`, `domain-modeling`, etc.
  Inherited tooling, reusable anywhere, not part of the Platform's identity.

"Skill" (a capability) is orthogonal to scheduling (a trigger). An autonomous job
is a schedule that runs a session which invokes a Skill.

## Decision

Platform-operation Skills are **generic** (operate on *any* Tenant by reading and
writing that Tenant's manifest, respecting the schema, regenerating config, and
honouring the gate) and **repo-committed** (`.claude/skills/`, versioned with the
Platform, shipped as part of the deliverable, reviewed in the same PR flow).
Bespoke per-Tenant Skills appear **only by exception**, when a Tenant has a
genuinely unique, repeated workflow.

The platform-operation vs general-engineering distinction is made **explicit** in
the repo (directory/naming), so the deliverable set is visually separable from
inherited tooling.

## Consequences

- **Repo-committed is not optional:** scheduled/cloud autonomous sessions start
  cold, so Skills must travel with the repo, not live in a user profile.
- Generic Skills mirror the manifest philosophy (generic mechanism, declarative
  intent) and keep conventions from drifting per-Tenant.
- Skills are code/instructions → changing one is a PR through the same safety
  gate. A Skill that edits the generator/isolation is high-risk (human-only).
- The `codify` job grows this set; new Skills should follow the
  `writing-great-skills` standard and land via PR like anything else.
