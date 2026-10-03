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

One **new** trial per run — §1 may close several. Branch off `main` per
CLAUDE.md's Working conventions before you edit anything. Everything below is
mechanism; the goal above is the point.

## 1. Judge the open trials

`.agents/prune-trials.yml` holds them; its header states the window.

**A trial is judgeable only once its prune has landed on `main` and sessions
have run against it since.** `opened:` records when the entry was written, which
is earlier and is never the window's start. Run
`pnpm exec tsx scripts/prune-trial-window.ts` to get every open trial's real landing
commit, timestamp, and window-close time — from `git log -S`, not a date to
derive or recall by hand (a hand-derived one is how PR #1061 judged a
trial a day early against a landing commit that turned out not to exist).
Its `judgeable from:` time is a floor, not a deadline: judging any time at or
after it is fine (nothing guarantees this Skill runs at a precise time), only
judging before it is the failure. A `NOT FOUND` result means silence is not evidence:
leave the entry alone and judge nothing.

For each trial that has landed and is past its window: **apply** its `check`
(prose, not a command), and read the Frictions logged since it landed
(`scripts/session-frictions.ts` — large output goes to a file automatically),
plus Gate failures and any issue filed since as a regression of an earlier
fix — `frictions-to-fixes` files those, naming the fix that didn't hold.

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
   still not followed. Dispatch a single subagent to search for one in a full
   pass — the instruction corpus, `docs/research/rulebook-migration-table.md`
   (its "excluded from rule-extraction" list included: a mechanism record for a
   guard already built is often the largest prose mass going), and the tracker
   — before reading any candidate file yourself; manual, one-by-one reading is
   the fallback only if that search comes up empty or ambiguous, not the
   starting point. Such a
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

**"Nothing clears the bar" is a result you earn, not one you inherit.** Say it
only after criterion 1's subagent search ran this run, and name what it
searched in the ledger. Earlier ledger entries saying the same prove nothing
about today: the tracker and the logs have moved. The same goes for every other
claim you write in the ledger or PR (a file has no recorded failures, only
whole-file inbound pointers): read it from a source this run, or leave it out.
Read files with the Read tool, so the log shows what you actually read.

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

Aim for around 100 lines **deleted** (the goal you write back and the ledger
entry don't count). Get there by retiring a whole problem. Never pad the scope,
and never delete the worked examples a weaker reader needs.

**You may also simplify the language of any Markdown file in scope** (see
Bounds), alongside a prune or instead of one. Do this when no problem clears
the bar. Rewrite the whole file if that helps: a Skill, a doc or an ADR. Use
short sentences. Avoid project jargon. Prefer plain English. Keep every rule and
decision; cut the rest. Be brave: restructure the file, merge its sections,
reword all of it. The file is the trial's territory. It gets the same ledger
entry and §4 probe as a prune.

When §4's probe fails, or a landed trial's verdict in §1 showed real damage,
the behaviour has proven it needs a hook. **File an issue proposing it**; a
session with a human present builds it, because a scheduled run can't wire
`.claude/settings.json` (`docs/agents/guards.md`). The issue names the
behaviour, the trial or verdict that proved it, the wrong shape to fire on, and
one unit test. The hook must warn and exit 0, even when it crashes
(ADR-0027).

## 4. Prove it on Sonnet

Before shipping, commit and push the prune, then dispatch a Sonnet subagent
(`dispatch-subagents`) pinned to **that exact post-prune SHA** — never the
orchestrator's own working copy, where the deleted prose is still reachable.
The probe checks out that SHA before reading anything and reports the SHA it
read at. Give it the surviving text only, plus a real situation the pruned
scaffolding covered, and ask what it would do. A wrong answer means the goal
isn't clear enough yet: rewrite it and re-probe. Never ship a prune Sonnet can't
execute — if it still fails, drop the prune, open no trial this run, and file
the hook issue (§3).

An answer whose reported SHA is missing or differs from the pinned one doesn't
count — a stale worktree may have fed it the deleted text (issue #1420); re-run
the probe. A dispatched implementer has no `Agent` tool, so the orchestrator
runs the probe. If no subagent tool is available at all, say so in the PR
**and set `proven: false` on the ledger entry** — the PR body is read once, the
entry is what the verdict reads later. Never treat the step as satisfied.

## 5. Ship and record

One PR, the line delta in its title. Follow `docs/agents/pr-workflow.md`'s
"Closing a self-merged chartered run" sequence. Your tier is bounded by
**reversibility, not by file** (ADR-0003's ledger row): prose anywhere, a
script's comments included. Changing what runs unattended is not a prune —
escalate that.

## Bounds

Everything the Platform tells its agents is in scope: CLAUDE.md, CONTEXT.md,
`docs/`, our own Skills including the scheduled ones, and the ADRs — ADR-0027
grants that; ADR-0004's Human-only merge rule otherwise stands. You may
rewrite an ADR whole, Decision and Consequences included, as long as **what it
decided does not change**: fold its amendments into the text and retell its
history wherever that reads clearer. Skip
`docs/proposals/<N>-*.md` and `.out-of-scope/*.md` — written for a human to
apply once, not for agents to read.

Two exceptions and one refusal:

- **External pack Skills** (`skills-lock.json`) — the Gate rejects the edit.
- **Session logs** — the record, not instructions.
- **Retiring a Skill or a Routine, including your own** — file a `needs-triage`
  issue, never act; `audit-skills` records the same class of signal as an
  `ideas` entry, so look for one and cite it rather than filing twice. Nothing breaks when a Skill stops running, so no verdict could tell you
  it was a mistake. Two runs in a row that open no trial (a failed probe aside) is the
  signal to file yours.
