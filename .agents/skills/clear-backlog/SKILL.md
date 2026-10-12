---
name: clear-backlog
description: Clear the open-issue backlog in one run — explore every issue, grill the owner once in plain words, then build, review and land the PRs unattended.
disable-model-invocation: true
---

Take every open issue to a merged PR, a closed issue, or a decision only the
owner can make. The owner is present twice: at the start and for one
**grilling** in the middle. Everything else runs unattended.

This Skill only orders other Skills and passes work between them. Their rules
live in those Skills. A phase is done only when its **done** line holds.
Issues move through the phases on their own, so an early build can be in
review while the grilling runs.

## 1. Explore

`auto-triage` is user-invoked, so read `.agents/skills/auto-triage/SKILL.md`
and run its sweep in `full-sweep` mode. The owner starting this run is the
human direction that mode needs. Re-checking older issues is the point.

- Give every `ready-for-agent` brief CLAUDE.md's premise check. A wrong
  premise costs a whole build-and-review cycle.
- For each issue that is not clearly ready, dispatch one read-only design
  subagent. It reads the binding ADRs in full, and returns a recommended
  solution and its options in plain words. That becomes the issue's grilling
  question.
- Plan the PR grouping: one branch per change, grouped only when issues are
  clearly related or share files. A grouping you are unsure of is a grilling
  question.
- Start building issues that are clearly ready right away (§3).

**Done:** every issue the sweep didn't skip is building, closed as a duplicate
or as already done, or holds a grilling question.

## 2. Grill in one sitting

Send a push notification with the `PushNotification` tool:
`grilling ready: N questions on M issues`. Then run the `grilling` Skill on
one list:

- Key each question by issue (`#1803a`, `#1803b`), so numbers stay put
  across rounds.
- Each question gives one line on what the issue is and one on the choice,
  then the options, your pick and why. The owner never needs to open a
  ticket.
- Put the most important questions first, and end with "accept my picks for
  the rest".
- Include `ready-for-human` items, real design forks inside
  `ready-for-agent` briefs, and Public issues (the owner's yes is the
  green-light ADR-0020 requires). Also include proposals to close an issue as
  obsolete or superseded. Close only on a yes.
- Answers may raise new questions. Keep each follow-up round to those alone.

Record each answer on its issue and set the label it implies.

**Done:** every question is answered, and every issue the answers settled
is `ready-for-agent` or closed.

## 3. Build

Use `dispatch-subagents`, one worktree per planned branch. Dispatch in waves
of at most 3 build agents, within its gate cap.

**Interrupt the owner only** for these:

- a new dependency
- a change to stored data or the content schema
- a decision big enough for an ADR
- deleting content visitors can see
- a change to which Tenant's data a request can reach
- reversing a grilling answer

Pause just that PR, send a push notification, and resume it on the answer.
The rest keep going. Any other decision the agent makes itself, and records
in the PR description.

**Done:** every `ready-for-agent` issue is on a pushed branch with a green
`pnpm gate:scoped`.

## 4. Review

Run `code-review` on each PR, with simplicity as the focus. The build agent
that wrote the PR fixes the findings, then review again. Check every fix
yourself before you report it: past runs relayed subagent claims unchecked.

**Done:** a review round finds only judgement calls not worth fixing.

## 5. Land and report

Land each PR with `docs/agents/pr-workflow.md`. A PR built from a Public issue
waits for a human merge (ADR-0020 rule 3), even though `scripts/merge-pr.ts`
would accept it. Merge the rest where `merge-pr.ts` allows.

**Done:** every PR is merged or waiting for a human merge.

Report one line per issue: `#N | outcome | PR | merged / waits for you (why)`.
Then run `close-session`.
