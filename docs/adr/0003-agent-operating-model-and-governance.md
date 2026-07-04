# 3. Agent operating model & governance

Date: 2026-07-04
Status: Accepted

## Context

The Platform is developed primarily by Claude Code agents, in two ways: humans
initiating changes interactively, and scheduled sessions evolving the project on
their own. Unbounded autonomy over a system that edits its own tooling is a
foot-gun. We need a model that permits real autonomy while keeping changes
reviewable and reversible.

## Decision

**Two operating modes.**
- **Interactive** — a human opens a session and requests a change (spawn a
  microsite, add a content type/concept to a Tenant, edit content). The agent
  executes on a feature branch.
- **Autonomous** — scheduled sessions run without a human initiating each change.

**Autonomous charter is enumerated, not open-ended.** Autonomous agents *tend
and consolidate*; humans *decide what should exist*. The chartered jobs (each a
Skill, each producing scoped PRs with a known expected shape):
- **sync** — keep the living-documentation Tenant / status report matching real
  repo state
- **drift-check** — detect manifest ↔ generated-config ↔ content mismatches, PR
  the fix
- **consolidate** — detect duplication/inconsistency across Tenants, propose
  refactors
- **triage** — implement a backlog item (issue) filed by a human or agent
- **codify** — turn a repeated manual pattern into a new Skill (self-improvement)

**Two tiers of autonomy, split at implementation (not imagination):**
- Chartered maintenance jobs may **implement directly** → PR → gated merge.
- **Creative / net-new** work (a new Tenant, a new concept, a larger rethink) may
  be **proposed freely** by an autonomous agent (file an issue/proposal) but
  requires a **human green-light before implementation**. An autonomous agent
  never *births* a new product unprompted.

**Merge is always gated. No self-merge.** Every change — interactive or
autonomous — lands as a PR on a feature branch. Merge → tag release → the single
container redeploys.
- **One bounded exception (ADR-0009):** a session's own **session-log** Journal
  entry is committed **directly to `main`** by a helper script — never via a
  PR — because it is inert, schema-validated content the gate cannot protect and
  the PR ceremony would suppress. Strictly limited to a single session-log file;
  all other changes remain gated. See ADR-0009 for the boundary and rationale.
- **Now:** the human reviews and merges PRs manually on GitHub.
- **Mid-term:** a dedicated scheduled **review-agent** merges PRs that pass an
  objective safety gate (see ADR-0004, TBD); riskier PRs still escalate to the
  human.

## Consequences

- Autonomous "consolidate automatically" is one bounded, well-understood job, not
  the agent's general temperament — so its PRs are reviewable against a known
  expectation.
- The review-agent and the human reviewer need the *same* objective safety
  signals; defining that gate is a prerequisite for auto-merge (ADR-0004).
- Assumes GitHub PRs. If the host is actually GitLab, the review-agent tooling
  changes (not the model).
