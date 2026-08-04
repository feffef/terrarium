# CI-Enforced Documentation Invariants

This project does not add gate/CI checks that block a change because a
documentation or metadata invariant is unsatisfied — a doc mentioning a retired
term, a commit missing its authorship stamp, and their relatives.

## Why this is out of scope

The pattern kept arriving as "add one more automatic check to the gate." An
implementation of the first instance was actually built and working, and the
owner closed it unmerged with a one-word verdict: *overengineering*. The verdict
is about the shape, not the instance — each such check buys a narrow, low-stakes
invariant at the cost of a permanent step in the gate, a new failure mode on
every unrelated change, and a maintenance surface that outlives the problem it
was written for.

Two things already cover the ground these checks aimed at, which is why the
marginal value is low:

- **The scheduled documentation review** catches drifted terminology. No drift
  has been reported slipping past it.
- **The provenance guard** (`scripts/github-provenance-guard.ts`) is a
  `PreToolUse` hook that fails closed: it refuses to let an agent post or record
  anything unstamped, at the moment of writing rather than after the fact. What
  remains is a locally-made commit where the stamping helper silently fails —
  narrow, and self-limiting because the same agent's GitHub writes are still
  guarded.

The general principle: prefer a guard that refuses the bad action at the point
it is taken over a gate step that re-checks every change forever. A hook that
fails closed is cheap and precise; a gate check is a standing tax paid by every
contributor for a defect that may never recur.

This is not a rejection of gate checks in general — `pnpm gate` exists and is
the mandatory merge gate (ADR-0004). It is a rejection of *growing* it to
enforce documentation and metadata hygiene.

## Prior requests

- #442 — "Docs-drift staleness CI checks" (implementation closed unmerged as
  PR #477; sibling issue #475 closed not-planned)
- #444 — "Gate-enforced provenance-footer check"
