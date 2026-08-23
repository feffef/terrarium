# 27. Instructions are pruned as trials, judged by the sessions that follow

Date: 2026-08-23
Status: Accepted

> Green-lit by a human in a `/grill-with-docs` session (ADR-0003). This ADR is
> the Decision half; the `prune-trial` Skill is the mechanism.

## Context

The Platform's instructions grow; its behaviour does not. Every incident ends in
a rule, every rule that fails to hold is narrowed rather than removed, and
nothing in the repo has removal as its job. `audit-docs` reconciles prose
against the code — it fixes drift, duplication and contradiction — but a
reconciled corpus is still a growing one.

Two things make that growth costly rather than merely untidy.

**Prose is not the enforcement mechanism we keep treating it as.** Issue #772
records the same rule failing a fourth time across #413 → #682 → #703, each
round sharpening the wording, and concludes that "prose alone is not holding for
this rule". Issue #1018 shows why a doc fix can miss entirely: the sessions that
hit the failure had no occasion in their own procedure to open the doc the fix
landed in. The rules that have actually held here are the mechanical ones —
`PreToolUse` guards, the Gate, `commit-msg`.

**The corpus is now read almost entirely by scheduled agents.** Of the 41
session logs in the current Journal window, 40 are `kind: autonomous` and their
triggers split exactly eight ways across each of the five scheduled Skills, with
one interactive session. Instruction bloat is therefore paid for, every run, by
agents that skim — and mostly by Sonnet.

Removal has been blocked by a real asymmetry: adding a rule is safe and
reversible, removing one might resurrect the incident it was written for, and
nobody can tell which rules are still load-bearing by reading them. That
uncertainty is empirical, so it should be settled empirically rather than
argued.

## Decision

A rule's necessity is established by **removing it and observing**, not by
inspection. The `prune-trial` Skill runs one **Prune Trial** per run: one
problem's instructions are pruned to the goal behind them, shipped, and left
standing for **three days**. Frictions logged by real sessions in that window
deliver the verdict — `major` or `blocker` damage traceable to the prune
restores one goal-shaped line; anything less means the prose was not
load-bearing. Open trials are tracked in `.agents/prune-trials.yml` and each
carries the check that would reveal its own failure, recorded when the prune is
made.

Three consequences of that principle are settled here because they bear on
governance:

- **Scope is the whole rulebook, ADRs included.** A trial may prune any
  instruction the Platform gives its agents. This is a narrow amendment to
  ADR-0004: ADR prose loses its Human-only merge status *for prune-only
  trials*, which are reversible by construction. It reaches an ADR's
  **explanatory prose only** — ADR-0018's record-integrity rule stands, so an
  ADR's Decision and Consequences text is never rewritten, and no prune ever
  changes what an ADR decided. Everything else in ADR-0004's
  high-risk set is untouched, and the external pack Skills (ADR-0015) remain
  unreachable because the Gate rejects the edit.
- **Merge authority: green Gate alone.** The exemption's exact scope is a row in
  ADR-0003's auto-merge exemption ledger, which single-homes it; how the PR
  actually lands is `docs/agents/pr-workflow.md`. A hook a trial writes warns and
  exits 0 — it cannot block a session, including when it crashes — so no
  unattended run can wedge the repo.
- **Other Sessions detect; `prune-trial` decides.** A standing note in
  CLAUDE.md tells every Session that a pruned instruction may be on trial: record
  the side-effects you hit, work around anything short of a blocker, and leave
  the keep/revert/mechanize call to the trial. Without that, another Skill
  restores the prose and no trial ever reaches a clean verdict.
- **Capability removal is not trialable.** Nothing fails when a Skill stops
  running, so no verdict could detect a mistaken retirement. Retiring a Skill or
  a Routine is filed as an issue for a human, never acted on.

## Consequences

Rules now leave the corpus the way they entered it: one at a time, with
evidence. A prune that damages nothing is proof the rule was decoration; a prune
that damages something has produced the strongest case available for a hook,
because it has demonstrated the behaviour matters and prose did not hold it.

The verdict window is blind in one direction: an agent that fails *without
noticing* logs no friction. Each trial's recorded check narrows that blindness,
and a Sonnet comprehension probe before shipping catches the common case of a
goal written at a level its actual audience cannot act on — but silent damage
remains possible, and a later trial reverting a prune is a normal outcome, not a
failure of the mechanism.

The growth engine is not capped. `frictions-to-fixes` may still answer a
friction with a new prose rule, so a pruned problem can be re-legislated. This
was weighed and deliberately left open: the cutter out-cuts the source for now,
and the constraint on friction fixes is itself a problem a future trial can
take.
