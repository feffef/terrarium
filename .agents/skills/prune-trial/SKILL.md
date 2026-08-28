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

One **new** trial per run — §1 may close several. Branch per CLAUDE.md's
pre-`checkout` checklist before you
edit anything. Everything below is mechanism; the goal above is the point.

## 1. Judge the open trials

`.agents/prune-trials.yml` holds them; its header states the window.

**A trial is judgeable only once its prune has landed on `main` and sessions
have run against it since.** `opened:` records when the entry was written, which
is earlier and is never the window's start. Run
`tsx scripts/prune-trial-window.ts` to get every open trial's real landing
commit, timestamp, and window-close time — ground truth from `git log -S`, not
a date to derive or recall by hand (a hand-derived one is how PR #1061 judged a
trial a day early against a landing commit that turned out not to exist).
Quote its `landed:`/`closes:` lines verbatim in the verdict commit. A `NOT
FOUND` result means silence is not evidence: leave the entry alone and judge
nothing.

For each trial that has landed and is past its window: **apply** its `check`
(prose, not a command), and read the Frictions logged since it landed
(`scripts/session-frictions.ts`, redirected to a file), plus Gate failures and
any issue filed since as a regression of an earlier fix — `frictions-to-fixes`
files those, naming the fix that didn't hold.

- `major` or `blocker` damage that traces to the trial → restore the
  **minimum**: the one goal-shaped line that would have prevented it, never the
  wall that was there before.
- `nit`, `minor`, silence → the prune holds.
- `moderate` → your judgement; restore the same minimum if you do.

Read every hit in full before counting it: a session using the pruned topic's
tools *correctly* trips a keyword check without being damage.

Delete every entry you judged — git holds the history.

## 2. Choose the problem

One problem, chosen in this order — and when several clear a criterion, take the
one with the most prose mass (its largest single home is a fair proxy; don't map
every candidate's full smear to rank them):

1. **Prose that already failed.** A rule whose own failure is on the tracker —
   an issue filed because the rule didn't hold, or a rule narrowed repeatedly and
   still not followed. `docs/research/rulebook-migration-table.md` indexes these
   against the issues they failed on; start there, confirm on the tracker — but
   its "excluded from rule-extraction" list is not out of your scope: a mechanism
   record for a guard already built is often the largest prose mass going. Such a
   rule has proven **the prose** isn't load-bearing — not the behaviour, which
   may matter more than ever. Check what holds that behaviour now: a rule a wired
   guard, gate or test already enforces is the safest prune on the board; one
   nothing holds is the riskiest, whatever its history. Prune the justification and the restatements; keep
   the rule, as one goal-shaped line.
2. **Prose mass.** The problem the most words are spent avoiding.
3. **Context cost.** Text loaded into every session beats text read on demand.

It must not touch the territory of any trial that was open at the **start** of
this run — including one you just judged and deleted — or no verdict can be
attributed.

## 3. Prune it to the goal

Read every place the problem is legislated — it is usually smeared across
CLAUDE.md, a `docs/agents/` page and several Skills. Search the instruction
corpus, not the Journal: session logs quote these rules constantly and will
swamp any grep. Work out what all of it is
chasing. Write that, in the plainest words that stay exact, in one home. Delete
the rest: the incident histories, the restatements, the step-by-step for
decisions the reader is capable of making.

Write the trial's ledger entry as you prune, and commit it **with** the prune.
Before committing, grep the repo for inbound references to anything you deleted —
Skills, docs and code comments cite sections by name, and the Gate does not catch
a dangling one.

Cut an incident history to **the rule plus a pointer** to where the history
lives (the issue, the ADR) — never to a ruleless rule with no forwarding
address. `audit-docs`' Stale-narration lens owns that shape; it is barred from
retiring these, and you are not.

**Write for Sonnet.** It runs most sessions here and cannot reconstruct the
means from a goal as readily as you can. A goal it can't act on isn't simpler,
just shorter — and neither is a surviving rule now buried mid-paragraph where a
skimmer will miss it.

Around 100 lines **deleted** is the bar for the prune itself — the goal you
write back and the ledger entry don't count against it. Clear it by retiring a whole problem,
never by deleting the worked examples a weaker reader needs.

Write a hook **only when §4's probe fails, or when a landed trial's verdict in
§1 showed real damage** — the two moments the behaviour has proven it needs
holding. One shipped beside a passing prune
holds the very behaviour the trial is testing, so no verdict can form (ADR-0027);
and a guard here runs to a few hundred lines, which a prune can't absorb — so it
lands as its own PR. Keep it the smallest thing that fires on the wrong shape,
with one unit test. It warns and exits 0, never blocking, not even when it
crashes — deliberately unlike the repo's fail-closed guards, because this one is
written unattended. Hardening it to block is a later trial.

## 4. Prove it on Sonnet

Before shipping, dispatch a Sonnet subagent (`dispatch-subagents`). Give it the
surviving text only — never the deleted prose — plus a real situation the pruned
scaffolding covered, and ask what it would do. A wrong answer means the goal
isn't clear enough yet, or the behaviour needs the hook. Never ship a prune
Sonnet can't execute. If no subagent tool is available to you, say so in the PR
**and set `proven: false` on the ledger entry** — the PR body is read once, the
entry is what the verdict reads later. Never treat the step as satisfied.

## 5. Ship and record

One PR, the line delta in its title. At PR-open, invoke `close-session` — your
first log (`in-review`). **A dispatched worktree-isolated agent must not**: the
log belongs to the session that dispatched it (`close-session/SKILL.md`).

Then Gate green, and self-merge (`docs/agents/pr-workflow.md`). Your tier is
bounded by **reversibility, not by file** (ADR-0003's ledger row): prose
anywhere, a script's comments included. Changing what runs unattended is not a
prune — escalate that.

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
  issue, never act; `audit-skills` records the same class of signal as an
  `ideas` entry, so look for one and cite it rather than filing twice. Nothing breaks when a Skill stops running, so no verdict could tell you
  it was a mistake. Two runs in a row that find nothing worth ~100 lines is the
  signal to file yours.
