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

One **new** trial per run; §1 may close several.

## 1. Judge the open trials

Open trials are in `.agents/prune-trials.yml`.

**A trial is judgeable only once its prune has landed on `main` and sessions
have run against it since.** Run
`pnpm exec tsx .agents/skills/prune-trial/scripts/find-trial-window.ts` to get every open trial's real landing commit, timestamp, and `judgeable from:` time, taken from `git log -S`; never derive or recall them by hand (a hand-derived one is how PR #1061 judged a trial a day early against a landing commit that did not exist). Its `judgeable from:` time is a floor, not a deadline: judge at or after it, never before. A `NOT FOUND` result means silence is not evidence: leave the entry alone and judge nothing.

For each trial that has landed and is past its window: **apply** its `check`
(prose, not a command), and read the Frictions logged since it landed
(`scripts/session/extract-frictions.ts --since <landing time>`, then only sessions that started after it — large output goes to a file automatically),
plus Gate failures and any issue filed since as a regression of an earlier
fix — `frictions-to-fixes` files those, naming the fix that didn't hold.

- `major` or `blocker` damage that traces to the trial → restore the
  **minimum**: the one goal-shaped line that would have prevented it, never the
  wall that was there before.
- `nit`, `minor`, `moderate`, silence → the prune holds.

Read every hit in full before counting it: a session using the pruned topic's
tools *correctly* trips a keyword check without being damage.

Delete every entry you judged — git holds the history.

## 2. Choose the problem

One problem, chosen in this order — and when several clear a criterion, take the
one with the most prose mass (its largest single home is a fair proxy; don't map
every candidate's full smear to rank them):

1. **Prose that already failed.** A rule whose own failure is on the tracker —
   an issue filed because the rule didn't hold, or a rule narrowed repeatedly and
   still not followed. Dispatch one subagent to search the whole instruction corpus (guard mechanism records included; a record is often the largest prose mass) and the tracker for such a rule, before you read any candidate yourself. Read candidates one by one only if the search finds nothing or is ambiguous. Such a
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
searched in the ledger; earlier ledger entries prove nothing about today (the
tracker and logs have moved). Any other claim in the ledger or PR (a file has no
recorded failures, only whole-file inbound pointers) must come from a source you
read this run, with the Read tool so the log shows it, or be left out.

## 3. Prune it to the goal

Read every place the problem is covered (usually CLAUDE.md, a `docs/agents/`
page and several Skills). Search the instruction
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
lives (the issue or PR) — never to a ruleless rule with no forwarding
address. `audit-docs`' Stale-narration lens owns that shape; it is barred from
retiring these, and you are not.

**Write for Sonnet.** It runs most sessions here and cannot reconstruct the
means from a goal as readily as you can. A goal it can't act on isn't simpler,
just shorter — and neither is a surviving rule now buried mid-paragraph where a
skimmer will miss it.

Size follows the problem. Cut the whole of one problem's instructions; a small
cut is fine. Never pad the scope, and never delete the worked examples a weaker
reader needs.

**You may also rewrite any Markdown file in scope plainly** (see Bounds),
alongside a prune or instead of one; do this when no problem clears the bar. Use
short sentences and plain English, avoid project jargon, keep every rule and
decision, and cut the rest. Restructure, merge sections and reword freely. The
file is the trial's territory and gets the same ledger entry and §4 probe as a
prune.

When §4's probe fails, or a landed trial's verdict in §1 showed real damage,
the behaviour has proven it needs a hook. **File a `needs-triage` issue proposing it** (`docs/agents/issue-tracker.md`'s "Filing an issue"); a
session with a human present builds it, because a scheduled run can't wire
`.claude/settings.json` (`docs/agents/guards.md`). The issue names the
behaviour, the trial or verdict that proved it, the wrong shape to fire on, and
one unit test.

## 4. Prove it on Sonnet

Before shipping, commit the prune, then dispatch a Sonnet subagent
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
"Closing a scheduled run's PR" sequence. You may prune any instruction text,
a script's comments included; changing what runs is not a prune: escalate
that (ADR-0027).

## Bounds

Everything the Platform tells its agents is in scope: CLAUDE.md, GLOSSARY.md,
`docs/` and our own Skills including the scheduled ones; ADR-0004's Human-only
merge rule stands. Skip `docs/proposals/<N>-*.md` and `.out-of-scope/*.md` —
written for a human to apply once, not for agents to read.

Three exceptions and one refusal:

- **ADRs** (`docs/adr/`) and their summary rules — they change only through
  a human-led rewrite (ADR-0030) or a trial a Trusted user starts; a `major`
  or `blocker` verdict on such a trial restores the cut text.
- **External pack Skills** (`skills-lock.json`) — the Gate rejects the edit.
- **Session logs** — the record, not instructions.
- **Retiring a Skill or a Routine, including your own** — file a `needs-triage`
  issue (`docs/agents/issue-tracker.md`'s "Filing an issue"), never act; `audit-skills` records the same class of signal as an
  `ideas` entry, so look for one and cite it rather than filing twice. Nothing breaks when a Skill stops running, so no verdict could tell you
  it was a mistake. Two runs in a row that open no trial (a failed probe aside) is the
  signal to file yours.
