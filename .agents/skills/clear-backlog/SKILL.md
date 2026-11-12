---
name: clear-backlog
description: Clear the open-issue backlog in one run — explore the issues its sweep picks up, grill the owner once in plain words, then build, review and land the PRs unattended.
disable-model-invocation: true
---

Take every issue the sweep picks up (§1) to a merged PR, a closed issue, or
a decision only the owner can make. The owner is present twice: at the start
and for one **grilling** in the middle. Everything else runs unattended.

Whenever you wait on an answer (the grilling, a follow-up round, a §3 interrupt),
send the push notification first, then only the questions, with no tool calls.

Keep the chat readable: while agents work, write no status lines or per-agent
news. Write to the owner only to ask a question, to raise what needs them (a
`needs-owner`, a failure you can't fix, a PR only they may merge), and for the
report. Each time you write to them, repeat in full, under its `Q` number,
every question of theirs still unanswered.

Two saved workflows do the agent work, so their steps can't be skipped:
`clear-backlog-explore` (§1) and `clear-backlog-build` (§3). Invoking this
Skill is the opt-in: run each by name with the Workflow tool, pass `args` as
a JSON value, and act on the structured result. Pass `session` (this
session's id, `session_…`) in both: every GitHub write carries it as the
ADR-0017 header. A workflow can't ask the owner, wait on CI or merge, so you
do those, and you resume the build workflow's agents for each fix, re-check
and gate (§3). To see what a run's agents did, read its `journal.jsonl`.

## 1. Explore

If `git rev-parse --is-shallow-repository` prints `true`, run
`git fetch --unshallow` first: triage reads the history.

Resolve the set with step 1 of `.agents/skills/auto-triage/SKILL.md` (Read
it; it is user-invoked) in its default mode, and add every open
`ready-for-agent` issue. Only when that set is empty, resolve it in
`full-sweep` mode instead; the owner starting this run is the human direction
that mode needs. Either way, leave out every issue with a `wayfinder:*` label;
the `wayfinder` Skill drives those with the owner.

Run `clear-backlog-explore` with
`{ session, issues: [{ number, mode, notes?, reserved? }] }`. `mode` is
`ready-recheck` for a `ready-for-agent` issue, `blocked-check` for one
blocked outside the chat (an upstream release, a date, an owner action), and
`full` for the rest, deferred ones included. Set `reserved: true` on an issue
the owner reserved ("I decide this one", directly or relayed).

`pnpm exec tsx .agents/skills/clear-backlog/scripts/run-summary.ts <output>
--triage` prints each issue's result, the `missing` ones and a `grouping`: one
branch per group of issues in which every pair shares a file or is clearly
related. Adjust the grouping where you know better; a grouping you are unsure of is a grilling question. Then start §3
for the groups whose issues are all `build`, and grill while it runs. The
summary runs several thousand characters per issue and ends with the
workflow's `logs`, which carry harness warnings about an agent's output: write
it to a file and `Read` it in parts, and relay each warning to the owner.

**Done:** every issue has a result, or is in `missing` and goes to the
report with that word.

## 2. Grill in one sitting

With no `grill` results, skip this section.

Send a push notification with the `PushNotification` tool:
`grilling ready: N questions`. Then run the `grilling` Skill on one list,
built from the `grill` results. Before asking, verify each pick's claim against
its source (CLAUDE.md), via `inspect-session` for a regression report; say so
on any pick you could not verify. Where its format differs, this list wins:

- Keep the `Q` numbering running across the whole run: follow-up rounds and
  §3 interrupts continue the count. Label every option `a)`, `b)`, `c)`, so
  the owner can answer `1a, 2c, 3b`.
- Each question gives one line on what the issue is and one on the choice,
  then the options, your pick and why. Flag a pick you changed from the
  triage agent's. The owner never needs to open a ticket.
- Ask each issue's key `question` first, then pick from its `followUps` the ones
  still worth asking, in the order that suits the answers; an answer outside
  the options may call for a question of your own.
- **An issue that adds or changes what visitors or the owner see** gets these
  questions before its pick (`CLAUDE.md`, "Ask before building"): (1) which
  pages or Spaces show it, (2) what it displays and what each value follows,
  (3) the look, described in words for approval. Explore returns it as a `grill`
  with these as `followUps`; ask any it missed. The pick follows the answers.
  If a concrete design is essential, offer a prototype (`prototype` Skill, in
  this session, after the grilling and before §3).
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

Run `clear-backlog-build` with `{ session, dir, branches: [...] }`: `dir` is
`<scratchpad>/clear-backlog`, where each branch keeps its decisions, gate log
and findings in a folder of its own. One entry per branch: `name`, `issues`,
`brief`, the agreed `picks` (only that branch's own, never the whole owner
reply), and `cherryPick` when a closed, unmerged PR already implements the
agreed pick. It builds each branch in its own worktree off `origin/main`, with
fast checks and no gate, then runs one fresh review round: a Standards and a
Spec reviewer, each giving every finding a `kind`. This loop's rounds and
re-checks are the review before opening the PR (`pr-workflow.md`).

Write each `brief` from the explore result, with only claims you verified
against source: the Spec reviewer takes the brief as the spec, so a wrong claim
becomes binding. Give it the result's `staleClaims` (what the issue gets wrong
now), the picked option's `optionChecks` (premises already settled, and the
`unverified` ones the agent settles first), its `files`, and a trimmed
`background` of what was tried and dropped. Add a `sideFinding` only when it
touches the branch's files. Take the decision from the owner's pick, not from
the triage agent's `pick` and `why`.

Then run `run-summary.ts <output> --build --run <run id>`, with the run id
from the Workflow result. Per branch it prints the status, the builder's and
each reviewer's agent id, and each review's findings file with one numbered
`kind: title` line per finding. Keep each builder's id: a later round's run
prints only its reviewers. Read nothing more (no findings file, diff, agent
report, `decisions.md` or `triage.md`) until §4: the builder and reviewers read those, and
every turn of yours re-reads your whole context.

Resume an agent with `SendMessage` to its id. Send the resumes of all
branches in one message, except gates: at most 2 at once. Each agent replies
with one line; check what it claims with `git -C <worktree> log --oneline -3`
before you go on. If an agent can't be resumed (a session restart may lose
it), dispatch a plain `Agent` with the same message, the branch's entry as you
passed it to the workflow (with its `picks` and any `answer`), its `worktree`,
the run's `dir`, this session's id, and, for a reviewer, its findings file.
Tell it to read `.claude/workflows/clear-backlog-build.js` and follow `rules()`
(a builder) or `reviewPrompt()` (a reviewer) as if called with that entry and
`args`. It takes that role from then on.

Act on each branch's `status`:

- `needs-owner`: an interrupt (the script lists the conditions). Send a push
  notification and ask its `question` in the running `Q` numbering. The rest
  keep going. With the answer, resume the builder to go on, run the fast
  checks, commit, and reply with one line: `BUILT <HEAD sha>`. Then run the
  workflow on that branch with `review: true` and `round: 1`. A builder
  with no `worktree` yet re-runs instead, with its `question` and the `answer`.
- `failed`: read the journal for the cause, then fix the brief and re-run the
  branch, or report it.
- `reviewed`: the loop below.

For each `reviewed` branch, in round N:

1. **Findings?** If neither review has a finding, go to step 5.
2. **Fix.** Resume the builder: "Triage and fix the findings in `<files>` by
   your rules. Run the fast checks, commit, and reply with one line:
   `FIXED <sha before> <sha after>`" (the same sha twice if nothing changed).
   The builder decides what to fix, by kind, and records each finding in its
   folder's `triage.md`. It may instead reply `NEEDS-OWNER` with a question,
   an owner-call's included: ask it, and resume the builder with the answer
   as a fix.
3. **Re-check.** Resume each reviewer that has a finding the builder fixed or
   refused, every time: "Read only `git -C <worktree> diff <before>..<after>`
   and your findings' lines in `<dir>/triage.md`. Check each fix is right and
   the change adds no new problem, and judge each refusal's proof; leave
   skipped nits alone, they go to the owner. With Bash, write your findings in
   your review's shape to `<your review's file, with -c<k> before .json>`,
   and reply with one line: `CLEAN` or `FINDINGS <file>`." An owner's answer
   goes to the reviewer whose finding asked it. `run-summary.ts <file>
   --findings` prints a findings file's lines; send them to the builder from
   step 2. After 2 re-checks in a round, what is still open is that round's
   result.
4. **Next round.** If round N had a major (a `defect`, `spec-mismatch` or
   `missing-test` line in its summary or a re-check's), or you judge the
   branch hard or large, and N is below 3, run the workflow on that branch with `review:
   true`, `round: N+1` and its `worktree`: a fresh pair reads the whole diff,
   and the builder stays. Start a branch's round as soon as it is due; if a
   second run is refused while one runs, batch the branches due. A major in
   round 3 still gets its fix and re-check, and the branch's PR waits for the
   owner's merge (§4).
5. **Gate.** Resume the builder: "Run `pnpm gate:scoped` on HEAD with your
   rules' gate command and timeout. If it fails, fix the cause and run it
   again until it exits 0. Reply with one line: `GATE <log> <sha before>
   <HEAD sha>`." Check `tail -n 1 <log>` reads `EXIT=0` and HEAD matches. If
   HEAD moved, resume the latest round's Standards reviewer on `<sha
   before>..<HEAD sha>` as in step 3, then gate once more; if that fails or
   moves HEAD again, report the branch.

After a session resume or restart, check the run journal's mtime before you
call a build live: a restart kills running workflows.
A `resumeFromRunId` resume must pass the original `args`.

An issue that can't start yet (time-gated, or its output is not a PR) goes to
the report.

**Done:** every startable `ready-for-agent` issue has a gated branch, or its
question or failure is in the report.

## 4. Land and report

Push each gated branch from its worktree with
`git push origin HEAD:<branch> && git fetch origin <branch>` (a build whose
branch the main checkout holds commits on a `worktree-wf_…` branch). The fetch
matters: `check:worktrees` counts commits on no remote-tracking ref as
unpushed. Open its PR with the branch's decisions (its folder's
`decisions.md`), its judgement calls (the `skipped` lines of its
`triage.md`), any cherry-picked PR, and the Human-only paths that `pnpm exec tsx .agents/skills/clear-backlog/scripts/list-human-only-paths.ts
<worktree>` prints (a non-zero exit means the list couldn't be read: stop
and report it). Land it with `docs/agents/pr-workflow.md`. For a later
fix (CI, a PR comment), resume the branch's builder with it (it records the
fix in `triage.md`), re-check a code change as in §3 step 3, and gate it as in §3 step 5 unless `pr-workflow.md`
lets the push rely on CI. A PR built from a Public issue waits for a human merge
(ADR-0020), even though `scripts/github/merge-pr.ts` would accept it. So does a
branch with a major in round 3: its PR says why it waits and lists, under
`Remaining findings`, from `triage.md` and the last re-check files, each
finding not resolved by a clean re-check, with its kind, file and title. Merge
the rest unless ADR-0004 reserves it for a human; `merge-pr.ts` checks only
some of its exceptions. Once a PR merges or waits for a human, run
`git worktree remove <worktree>` for its branch.

**Done:** every PR is merged or waiting for a human merge, and
`pnpm check:worktrees` exits 0.

Report one line per issue: `#N | outcome | PR or "no PR: why" | merged / waits
for you (why)`. Then re-invoke `close-session`. Its log's
`summary` carries one line per merged or opened branch: what it changed (from
that branch's `decisions.md`) and any judgement calls left open. In a workflow
run the orchestrator's log is the Journal's only record of what its agents
built.
