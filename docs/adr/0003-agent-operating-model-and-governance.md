# 3. Agent operating model & governance

Date: 2026-07-04
Status: Accepted

> **Amended by [ADR-0018](0018-tenant-layers-under-layers-directory.md) (2026-07-07).**
> Tenant layers moved from `tenants/` to Nuxt's conventional `layers/` directory;
> `tenants/…` paths below reflect the pre-rename layout.

> **Amended (2026-07-07).** **Opening the gated PR is automatic, not a question
> to ask.** Once a session has committed substantive work to a feature branch and
> that work is in a coherent state, it **opens the PR itself** — it does not stop
> to ask "shall I open a PR?". Pre-PR abandonment is rare, and more commits can
> always be pushed to an open PR, so the ask only costs a round-trip. This governs
> **opening** the PR, not **deciding to do the work**: the two-tier rule below is
> untouched — net-new autonomous work still needs a human green-light *before*
> implementation; this only removes the second gate once legitimate work exists.
> The session-log direct-to-`main` exception (ADR-0009) is unaffected — a
> session-log-only change still never gets a PR. Opening the PR is also a **session
> closure point**: it triggers the session's first `log-session`, logged with
> status **`in-review`** (the PR is open, not merged — see ADR-0009 / the
> `log-session` Skill). The same no-ask default extends to **babysitting**: on
> opening the PR the session **subscribes to its activity automatically** (CI,
> reviews) and follows it to merge/close — it does not ask "shall I watch it?".
>
> **Amended (2026-07-06, ADR-0015).** A chartered job is a **remit**, realised by
> **one or more Skills** — not necessarily a single Skill. `sync` ("keep living
> documentation matching real repo state") is realised by several: `digest` keeps
> the digest feed current, `audit-skills` keeps the Skill Inventory honest. Read
> "each a Skill" in the list below as "each a Skill *or a family of Skills under one
> remit*". See ADR-0015.
>
> **Amended (2026-07-06).** The **mid-term review-agent** described below is now
> **live in a bounded form**: the `frictions-to-fixes` Skill's main session reviews
> and merges the PRs authored by its dispatched (Sonnet) impl agents. "No
> self-merge" is **preserved** — the merging session is never the author of the
> diff it merges; it is a distinct reviewer gating on ADR-0004. It merges green,
> low-risk PRs and escalates high-risk ones to a human (see ADR-0004's amended
> high-risk list). This **activates**, and does not reverse, the "Now → Mid-term"
> transition below. Scope today is that one Skill; a broader standing
> agent-reviewer capability would warrant its own ADR.
>
> **Amended (2026-07-08).** The **two operating modes below classify *initiation*
> and are unchanged**; the session log's `kind` field (ADR-0009) now records a
> finer, three-way autonomy spectrum: `interactive`, `delegated`, `autonomous` —
> canonical definitions in `CONTEXT.md` → **Session**. In this ADR's terms, both
> `interactive` and `delegated` sessions are Interactive-mode initiations (a human
> opened the session); `delegated` marks that no human prompt followed the kickoff
> and execution ran hands-off. **`kind` is descriptive log vocabulary, not a merge
> permission:** a `delegated` session merges only what the carve-outs in the notes
> above already allow (the digest auto-merge tier; the reviewer-not-author
> pattern), and everything else keeps this ADR's default — gated PR, human merge.
>
> **Amended (2026-07-06).** The **`digest` Skill's gated PR auto-merges on a
> green gate**: after opening the PR, the authoring session enables GitHub
> auto-merge (or, where that is unavailable, merges only after the gate
> reports green). This activates ADR-0004's **low-risk auto-merge tier**
> ("content only — auto-mergeable when green") for this one chartered job: the
> merge decision is delegated to the **objective gate**, not made by the
> author's judgement, and the PR's expected shape is fixed and known (digest
> pages under `tenants/journal/content/current/pages/digests/`, at most plus
> the Journal index's editorial intro). Bounded: if anything **outside that
> scope** rides in the PR it is left for human review, and a **red gate is
> never merged** — fix on the branch or escalate. Everything else keeps
> ADR-0003's default: gated PR, human merge.
>
> **Amended (2026-07-09).** The **`audit-docs` Skill gets the same bounded
> auto-merge grant as `digest`'s above**, not a generalization of it — same
> ADR-0004 low-risk tier, same bounds (out-of-scope content or a red gate
> leaves it for human review). Scope specific to `audit-docs`: only fact-checked
> reconciliations to *live* docs and Skills (its own Live/Historical/Pack-generic
> tiering) qualify; an ADR amendment, CI, isolation, or routing/manifest-expansion
> edit is out of scope and rides its own human-reviewed PR. Recorded after the
> fact — this was the intended design when `audit-docs` was authored, but the
> amendment was missed; filed once the gap surfaced during its first run (PR
> #262).
>
> **Amended (2026-07-09).** `audit-skills` joins the low-risk auto-merge tier
> (ADR-0004) as a third exemption, after `digest`/`audit-docs`. Bounded to
> Inventory-only content citing an existing evidence rule; see ADR-0015.
>
> **Amended (2026-07-11).** **`drift-check` is retired**, not merely quiet:
> ADR-0014 deleted the generated-config artifact (`shared/routing.generated.ts`,
> `pnpm gate:drift`, `scripts/generate.ts`) it existed to check, eliminating its
> premise entirely. It is no longer part of the live chartered-job set below;
> `CONTEXT.md`'s Codify entry already lists the current set as `sync`,
> `consolidate`, and `triage` (see also ADR-0005).

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
