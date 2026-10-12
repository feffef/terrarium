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

## 1. Explore

Run `auto-triage full-sweep`. Re-checking older issues is the point.

- Give every `ready-for-agent` brief a premise check: should this exist, and
  how big does it need to be? A wrong premise costs a whole build-and-review
  cycle.
- For each issue that is not clearly ready, dispatch one read-only design
  subagent. It reads the binding ADRs, git history and session logs. It
  returns a recommended solution and its options in plain words.
- Start building issues that are clearly ready right away (§3).

**Done:** every open issue is in one of three states: building, closed as
duplicate or already done, or holding a question for the grilling.

## 2. Grill once

Send a push notification: `grilling ready: N questions on M issues`. Then use
the `grilling` Skill on one list, with these changes:

- Key each question by issue (`#1803a`, `#1803b`), so numbers stay put
  across rounds.
- Each question gives one line on what the issue is and one on the choice,
  then the options, your pick and why. The owner never needs to open a
  ticket.
- Put the most important questions first, and end with "accept my picks for
  the rest".
- Include `ready-for-human` items, real design forks inside
  `ready-for-agent` briefs, and Public issues. Approving a Public issue is the
  green-light ADR-0020 requires, and its PR waits for a human merge. Also
  include proposals to close an issue as obsolete or superseded. Close only
  on a yes.

Record each answer on its issue and set the label it implies.

**Done:** every question is answered, and every issue the answers settled
is `ready-for-agent` or closed.

## 3. Build

Use `dispatch-subagents`. Give each change its own branch and worktree.
Group issues only when they are clearly related or share files; put any
grouping you are unsure of into the grilling. Dispatch in waves of at
most 3 build agents.

**Interrupt the owner only** for these:

- a new dependency
- a change to stored data or the content schema
- a decision big enough for an ADR
- deleting content visitors can see
- a change to which Tenant's data a request can reach
- reversing a grilling answer

Pause just that PR and send a push notification; the rest keep going. Any
other decision the agent makes itself, and records in the PR description.

## 4. Review

Run `code-review` on each PR, with simplicity as the focus. The build agent
that wrote the PR fixes the findings. Check every fix yourself before you
report it.

**Done:** a review round finds only judgement calls not worth fixing.

## 5. Land and report

Land each PR with `docs/agents/pr-workflow.md`. Merge what
`scripts/merge-pr.ts` allows, and leave the rest for a human merge.

Report one line per issue: `#N | outcome | PR | merged / waits for you (why)`.
Then run `close-session`.
