# 26. The Gate workflow is a thin shell over an agent-pushable composite action

Date: 2026-08-06
Status: Accepted — the composite lands with this ADR; CI runs it only once the
`gate.yml` shell swap is hand-applied (`docs/proposals/879-gate-yml-thin-shell.md`)

> Green-lit by a human in a `/grill-with-docs` session (ADR-0003). Issue #879
> holds the session's findings; this ADR is the Decision half. Supersedes the
> remaining half of [#445](https://github.com/feffef/terrarium/issues/445) and
> subsumes #630 and #659.

## Context

Agent sessions cannot push `.github/workflows/*` — they lack the `workflow`
OAuth scope (ADR-0004's 2026-07-11 amendment). Every change to the Gate has
therefore needed a human to hand-apply YAML, routed through the
`docs/proposals/` drop-zone. Three such Proposals were pending simultaneously:
#445 (guard the Heavy tier on the Inert classifier), #630 (`verify:mermaid`),
#659 (the fork-PR doorbell false-negative).

The queue is the visible cost. The real cost is **drift**: `gate.yml` silently
running a stale subset of `pnpm gate`. That has happened repeatedly and is
recorded in three separate places — CLAUDE.md's standing "Known gap" sentence,
this repo's `docs/proposals/README.md` companion-change discipline, and
ADR-0004's own 2026-07-11 amendment, where `validate:content` landed in
`package.json` via an agent PR while the matching `gate.yml` step waited on a
human. In the interim CI gated on less than it claimed to, and nothing could
detect that, because the two halves lived on opposite sides of a push barrier.

**The `workflow` scope's fence is narrower than we had assumed.** It covers
`.github/workflows/` only. `.github/actions/**` is agent-pushable. This was
verified empirically rather than inferred: a throwaway
`.github/actions/probe/action.yml` was committed, pushed, read back from
`origin/`, and reverted (issue #879).

## Decision

**The Gate's substance lives in `.github/actions/gate/action.yml`, a composite
action. `.github/workflows/gate.yml` is a shell that invokes it.**

The shell keeps only what cannot move: `on:`, `permissions:`, `runs-on:`,
`actions/checkout` (mechanically forced — `uses: ./.github/actions/gate` cannot
resolve before the repo is on disk), and the `github-token` input, because the
`secrets` context is unreachable inside a composite action. Everything else —
Node/pnpm setup, install, the Scope decision, the Floor tier, the Heavy tier
with its `if:` guards, and the doorbell — is composite content that agents push
like any other file.

Applying the shell is a **one-time** human act. After it, the shell's only
remaining reasons to change are triggers and permissions.

**`.github/actions/gate/action.yml` joins ADR-0004's high-risk set** — Human-only
to *merge*, never auto-merged by any chartered-Skill tier. It is agent-*editable*,
exactly as `content.config.ts` is (CLAUDE.md, Ground rules). Removing a
mechanical barrier does not remove a governance one.

**`tests/unit/gate-parity.spec.ts` pins the three homes together**: the
composite's step list must equal `scripts/gate.ts`'s `FLOOR` + `HEAVY`, in order,
with the Heavy tier guarded and the Floor tier not; and `package.json`'s `gate`
script must equal the same sequence. The drift class above becomes a test
failure rather than an invisible gap.

### Why this is not a new security hole

The instinct is that a Human-only `gate.yml` was protecting the Gate from the
agents it gates. It was not, and the belief is worth killing explicitly:

- `gate.yml` runs `pnpm typecheck`. **`package.json` defines what that means**,
  and it has always been agent-pushable. A PR could already hollow out a layer
  without touching a workflow file.
- Once #445's classifier guard exists, CI's *execution* of the Heavy tier is
  decided by `scripts/gate.ts` — also agent-pushable.
- `./.github/actions/gate` resolves from the checked-out `refs/pull/N/merge`,
  i.e. the PR's own copy. So does everything else CI runs.

What actually protects the Gate is **human review at merge**, and ADR-0004's
"human-only" was always a merge rule, not an edit rule. This ADR changes which
mechanism enforces that rule, not the rule.

### Rejected alternatives

**One `run: pnpm gate:scoped` step.** Maximally single-homed, and rejected on
three counts (carried forward from #445's proposal, which weighed it first): CI
loses per-layer step names, so "which layer failed" moves from the run summary
into log scrollback; `gate:scoped`'s stale-deps preflight would run a non-frozen
`pnpm install`, defeating `--frozen-lockfile`; and its base detection is
`merge-base origin/main HEAD`, wrong for any PR not targeting `main`. A composite
keeps the named steps and costs nothing extra.

**Granting the agent token the `workflow` scope.** Outside our control, and
undesirable if offered: it would let a single PR rewrite its own merge gate in
the workflow file *and* the code, with no human-applied surface left anywhere.

**Keeping setup/install in the shell** (a narrower fence). Rejected because it
leaves the shell changing for #659, for install changes, and for anything
touching Node or pnpm versions — which forfeits the point.

## Consequences

- **The composite ships unexercised.** No CI run will have executed
  `action.yml` until a human applies the shell; every prior Gate change was
  tested by the Gate itself. Accepted deliberately: the failure mode is
  fail-closed — a malformed action reds the job rather than skipping a layer —
  and the PR that applies the shell is itself the first test. This is the one
  respect in which this change is weaker than the status quo.
- **The drop-zone shrinks to near-nothing.** #630 and #659 become composite
  content that agents push directly, and the three pending Proposals collapse
  into one. Future Gate work needs a Proposal only if it touches triggers or
  permissions.
- **A stale shell degrades safely.** If a later edit drops `fetch-depth: 0`,
  `changedPathsBetween()` refuses to classify a shallow checkout and CI runs the
  Full gate. The optimization stops optimizing; it does not stop gating.
- **The parity spec must be kept honest.** It asserts *which* steps run, not
  what they do — a hollowed-out `package.json` script still passes it. That
  residue is human review's job, as it always was.
- **`gate.yml` and `pr-authorassociation-label.yml` diverge in shape.** Only the
  Gate gets this treatment. Applying it to the second workflow would be the
  concept's second instance, at which point "gate shell" earns a glossary term;
  today it does not (`docs/agents/domain.md`'s rule of two).
