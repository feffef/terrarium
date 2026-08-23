---
name: prune-trial
description: Prune one problem's instructions down to the goal behind them, then let real sessions deliver the verdict before the prune is judged.
disable-model-invocation: true
---

# Prune Trial

The Platform's instructions grow; its behaviour doesn't. Rules accrete around
every incident, get narrowed when they don't hold, and are never removed — so
agents read more and follow less.

Your goal: **the Platform's agents should be steered by goals they can act on,
not by a rulebook they skim.** You get there by pruning, and you find out
whether a prune was right the only honest way — by leaving it standing as a
**trial** and letting real sessions deliver the verdict.

One trial per run. Everything below is mechanism; the goal above is the point.

## 1. Judge the open trials

`.agents/prune-trials.yml` holds them. Every trial past its window gets a
verdict now: run its `check`, and read the Frictions logged since it landed
(`scripts/session-frictions.ts`, redirected to a file), plus Gate failures and
any issue filed since as a regression of an earlier fix — `frictions-to-fixes`
files those, naming the fix that didn't hold.

- `major` or `blocker` damage that traces to the trial → restore the
  **minimum**: the one goal-shaped line that would have prevented it, never the
  wall that was there before.
- `nit`, `minor`, silence → the prune holds.
- `moderate` → your judgement; restore the same minimum if you do.

Delete every entry you judged — git holds the history. Done when nothing in the
ledger is past its window.

## 2. Choose the problem

One problem, chosen in this order:

1. **Prose that already failed.** A rule whose own failure is on the tracker —
   an issue filed because the rule didn't hold, or a rule narrowed repeatedly and
   still not followed. Search the tracker for issues naming a fix that recurred;
   the repo has a run of them. Such a rule has proven it isn't load-bearing —
   the safest thing here to replace with a goal.
2. **Prose mass.** The problem the most words are spent avoiding.
3. **Context cost.** Text loaded into every session beats text read on demand.

It must not touch an open trial's territory, or no verdict can be attributed.

## 3. Prune it to the goal

Read every place the problem is legislated — it is usually smeared across
CLAUDE.md, a `docs/agents/` page and several Skills. Work out what all of it is
chasing. Write that, in the plainest words that stay exact, in one home. Delete
the rest: the incident histories, the restatements, the step-by-step for
decisions the reader is capable of making.

Cut an incident history to **the rule plus a pointer** to where the history
lives (the issue, the ADR) — never to a ruleless rule with no forwarding
address. `audit-docs`' Stale-narration lens owns that shape; it is barred from
retiring these, and you are not.

**Write for Sonnet.** It runs most sessions here and cannot reconstruct the
means from a goal as readily as you can. A goal it can't act on isn't simpler,
just shorter.

Around 100 lines is the bar for a run. Clear it by retiring a whole problem —
never by deleting the worked examples a weaker reader needs.

If the behaviour genuinely needs enforcement to survive, write one hook: the
smallest thing that fires on the wrong shape. It warns and exits 0 — it never
blocks, including when it crashes — and it ships with one unit test. Making a
hook block is its own later trial.

## 4. Prove it on Sonnet

Before shipping, dispatch a Sonnet subagent (`dispatch-subagents`). Give it the
surviving text only — never the deleted prose — plus a real situation the pruned
scaffolding covered, and ask what it would do. A wrong answer means the goal
isn't clear enough yet, or the behaviour needs the hook. Never ship a prune
Sonnet can't execute.

## 5. Ship and record

One PR, the line delta in its title. **At PR-open, invoke `close-session`** —
your first log (`in-review`). Then Gate green, self-merge
(`docs/agents/pr-workflow.md`; ADR-0027 charters the tier). Then append the
trial to the ledger — the file documents its own shape — and `close-session`.

## Bounds

Everything the Platform tells its agents is in scope: CLAUDE.md, CONTEXT.md,
`docs/`, our own Skills including the scheduled ones, and the ADRs — ADR-0027
grants that; ADR-0004's Human-only merge rule otherwise stands. In an ADR you
prune the **explanatory prose only**: its Decision and Consequences are the
historical record and are never rewritten (ADR-0018). Skip
`docs/proposals/<N>-*.md` and `.out-of-scope/*.md` — written for a human to
apply once, not for agents to read.

Two exceptions and one refusal:

- **External pack Skills** (`skills-lock.json`) — the Gate rejects the edit.
- **Session logs** — the record, not instructions.
- **Retiring a Skill or a Routine, including your own** — file a `needs-triage`
  issue, never act. Nothing breaks when a Skill stops running, so no verdict could tell you
  it was a mistake. Two runs in a row that find nothing worth ~100 lines is the
  signal to file yours.
