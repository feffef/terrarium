---
name: clear-backlog
description: Clear the open-issue backlog in one run — explore the issues its sweep picks up, grill the owner once in plain words, then build, review and land the PRs unattended.
disable-model-invocation: true
---

Take every issue the sweep picks up (§1) to a merged PR, a closed issue, or
a decision only the owner can make. The owner is present twice: at the start
and for one **grilling** in the middle. Everything else runs unattended.

The chat holds only questions for the owner and the final report. Handle PR
events, task notifications and finished agents silently. When you wait on an
answer, the questions are your whole message.

Two saved workflows do the agent work, so their steps can't be skipped:
`clear-backlog-explore` (§1) and `clear-backlog-build` (§3). Invoking this
Skill is the opt-in: run each by name with the Workflow tool, pass `args` as
a JSON value, and act on the structured result. Pass `session` (this
session's id, `session_…`) in both: every GitHub write carries it as the
ADR-0017 header. A workflow can't ask the owner, wait on CI or merge, so you
do those. To see what a run's agents did, read its `journal.jsonl`. A run's saved
`.output` nests the return value as JSON under `result`. A branch with
`status: ready-to-push` has already passed `gate:scoped`.

## 1. Explore

If `git rev-parse --is-shallow-repository` prints `true`, run
`git fetch --unshallow` first: triage reads the history.

Resolve the set with step 1 of `.agents/skills/auto-triage/SKILL.md` (Read
it; it is user-invoked) in its default mode, and add every open
`ready-for-agent` issue. Only when that set is empty, resolve it in
`full-sweep` mode instead; the owner starting this run is the human direction
that mode needs. Either way, leave out every issue with a `wayfinder:*` label;
the `wayfinder` Skill drives those with the owner. Leave out too every issue
whose fix changes a guard or `.claude/settings.json`'s hook wiring
(`docs/agents/guards.md`); the report lists it.

Run `clear-backlog-explore` with
`{ session, issues: [{ number, mode, notes?, reserved? }] }`. `mode` is
`ready-recheck` for a `ready-for-agent` issue, `blocked-check` for one
blocked outside the chat (an upstream release, a date, an owner action), and
`full` for the rest, deferred ones included. Set `reserved: true` on an issue
the owner reserved ("I decide this one", directly or relayed).

The result holds one triage `results[n]` per issue, the `missing` ones, and
a proposed `grouping`: one branch per group of issues that share a file or
are clearly related. Adjust the grouping where you know better; a grouping
you are unsure of is a grilling question. Then start §3 for the groups whose
issues are all `build`, and grill while it runs.

**Done:** every issue has a result, or is in `missing` and goes to the
report with that word.

## 2. Grill in one sitting

With no `grill` results, skip this section.

Send a push notification with the `PushNotification` tool:
`grilling ready: N questions`. Then run the `grilling` Skill on one list,
built from the `grill` results. Where its format differs, this list wins:

- Keep the `Q` numbering running across the whole run: follow-up rounds and
  §3 interrupts continue the count. Label every option `a)`, `b)`, `c)`, so
  the owner can answer `1a, 2c, 3b`.
- Each question gives one line on what the issue is and one on the choice,
  then the options, your pick and why. Flag a pick you changed from the
  triage agent's. The owner never needs to open a ticket.
- Put the most important questions first, and end with "accept my picks for
  the rest".
- Ask only about issues in §1's set; the ones the sweep skipped wait for a
  run that picks them up. Leave out `blocked` issues; the report lists them
  with their blocker.
- Include Public issues (a Trusted user's yes is the approval ADR-0020
  requires) and proposals to close an issue as obsolete or superseded. Close
  only on a yes.
- Answers may raise new questions. Keep each follow-up round to those alone,
  with its own push notification.

The answers are the owner's confirmation. Record an answer on its issue
only when it changes the issue's state or scope, and set the label it
implies (`docs/agents/triage-labels.md`, `docs/agents/issue-tracker.md`).

**Done:** every question is answered, and every issue in §1's set is
`ready-for-agent`, closed, or parked by the owner.

## 3. Build and review

Run `clear-backlog-build` with `{ session, branches: [...] }`, one entry
per branch: `name`, `issues`, `brief`, the agreed `picks` (only that branch's
own, never the whole owner reply), `model: "sonnet"` for a change under the
size ceiling the brief sets (`dispatch-subagents` §3), and `cherryPick` when a
closed, unmerged PR already implements the agreed pick. Running it satisfies
the `dispatch-subagents` trigger: it isolates, briefs and reviews its agents
itself. Each branch is built in its own worktree off `origin/main`, then reviewed
on both `code-review` axes and fixed until only judgement calls remain. Its
review rounds are the review before the first push (`pr-workflow.md`).

Act on each branch's `status`:

- `needs-owner`: an interrupt (the script lists the conditions). Send a push
  notification, ask its `question` in the running `Q` numbering, and re-run
  just that branch with its `question`, the `answer`, and its `worktree` if
  it returned one (without, the branch restarts from `origin/main`). The rest
  keep going.
- `failed`: read the journal for the cause, then fix the brief and re-run the
  branch, or report it. `failed` with `openFindings` means the review cap was
  reached with small findings left: fix them by hand in its `worktree`, run
  `pnpm gate:scoped`, and treat the branch as `ready-to-push`; re-run only for
  other failures.
- `ready-to-push`: check its `commits` against
  `git log origin/main..HEAD` in its `worktree`, and each claimed fix and
  decision in its diff, before you trust it: past runs relayed subagent
  claims unchecked.

After a session resume or restart, check the run journal's mtime before you
call a build live: a restart kills running workflows and gate runs (exit 137).
A `resumeFromRunId` resume must pass the original `args`.

An issue that can't start yet (time-gated, or its output is not a PR) goes to
the report.

**Done:** every startable `ready-for-agent` issue has a `ready-to-push`
branch, or its question or failure is in the report.

## 4. Land and report

Push each `ready-to-push` branch from its worktree and open its PR with the
branch's decisions, its remaining judgement calls, any cherry-picked PR, and
the Human-only paths that `pnpm exec tsx scripts/human-only-paths.ts
<worktree>` prints (a non-zero exit means the list couldn't be read: stop
and report it); at the first PR open, invoke `close-session`
(`in-review`). Land it with `docs/agents/pr-workflow.md`. For a later
fix (CI, a PR comment), re-run that branch with its `worktree` and the fix
in its `brief`. A PR built from a Public issue waits for a human merge
(ADR-0020), even though `scripts/merge-pr.ts` would accept it. Merge
the rest unless ADR-0004 reserves it for a human; `merge-pr.ts` checks only
some of its exceptions.

**Done:** every PR is merged or waiting for a human merge, and
`pnpm check:worktrees` exits 0.

Report one line per issue: `#N | outcome | PR or "no PR: why" | merged / waits
for you (why)`. Then re-invoke `close-session`, passing every workflow agent's
`verdicts` merged into its own `ruleVerdicts` and `docsRead`, one entry per
path (log-session step 3). Its log's `summary` carries one line
per merged or opened branch: what it changed (from that branch's `decisions`)
and any judgement calls left open. In a workflow run the orchestrator's log is
the Journal's only record of what its agents built.
