---
title: A friction becomes a fix
description: How a problem one agent reports becomes a change to the instructions later agents follow, through a scheduled Skill.
teaches: "Story: one Friction becoming a changed instruction. Start: a session logs it to main. End: a later session reads the fix; the Ledger records its PR. Code: a Routine, frictions-to-fixes, extract-frictions.ts, Friction Ledger, list-merges-since.ts, Prune Trials, worktrees, merge-pr.ts. A real case: ScheduleWakeup outside /loop; #241, #425, regression #814; PR #843 added loop-only-tool-guard.ts."
revision: '145cc119d8d1064fab2dc6ef674cae9d60e3c7f2'
revisionDate: '2026-11-12'
publishedAt: '2026-11-03T13:25:30Z'
---

No one reads every session to fix what went wrong in it. Each session reports its own pain-points instead, and a scheduled agent turns the ones that recur or cost the most into fixes. This Walkthrough follows one Friction from the session that hit it, through that agent's run, to the changed instruction a later session reads.

```mermaid
flowchart TD
  friction["A Friction<br>in a log"] --> worth{{"Fixable<br>in this run?"}}
  worth -- no --> issue["Dropped, or<br>an issue"]
  worth -- yes --> pr["A fix PR,<br>reviewed"]
  pr --> risk{{"Low risk?"}}
  risk -- yes --> merged["Merged"]
  risk -- no --> human["Left for<br>a human"]
```

## 1. A session hits a Friction

Something costs a session effort: a doc misled it, a tool call was refused, a step was missing. When the session logs its work, it records every :term[Friction], each with a description, a possible fix and a severity from `nit` to `blocker`, small ones too.

::lessons
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
::

## 2. The log lands on `main`

A hook commits the :term[session log] straight to `main`, without a PR. The Friction is on record from then on, whether or not the session's own work ever merges.

::lessons
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
::

## 3. A Routine starts `frictions-to-fixes`

A :term[Routine] starts a session that runs the `frictions-to-fixes` Skill, or a Trusted user runs it by hand. It is a session like any other, following the Skill's steps.

::lessons
[Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop) · [Scheduled tasks](/t/glassbox/guide/agents/scheduled-tasks) · [Claude Code skills](/t/glassbox/guide/claude-code/skills)
::

## 4. A subagent reads the logs

One subagent reads the logs and hands back a short ranked report. It reads every log in a recent window and files each matching Friction under an entry of the :term[Friction Ledger]: one entry per root cause, with every recent session that hit it. Its one write is a commit of those Ledger changes on the run's branch.

::lessons
[Subagents](/t/glassbox/guide/agents/subagents) · [Friction Ledger](/t/journal/current/frictions) · :file[scripts/session/extract-frictions.ts] · :file[layers/journal/content/current/frictions/]
::

## 5. It screens out what a fix can't help

The subagent checks each candidate against the changes merged since its sessions, the open and closed issues, the open PRs, and the open :term[Prune Trial]s. It labels each one never-fixed (no issue or PR addresses it), dropped (fixed since, on trial, or not the repo's to change), already tracked (an open issue or PR covers it) or a regression (back after its fix merged), and ranks what is left.

::lessons
[Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop) · [Pruning instructions](/t/glassbox/guide/terrarium-practice/pruning-instructions) · :file[scripts/git/list-merges-since.ts]
::

## 6. The run picks what to fix

The run picks the top candidates and has one design subagent design each fix and judge its risk. A fix the run may not build becomes an issue with the design; the rest go on to be built.

::lessons
[Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop) · [Protected paths](/t/glassbox/guide/terrarium-practice/protected-paths) · [Blocking hooks](/t/glassbox/guide/hooks/blocking-hooks) · [Issue triage labels](/t/glassbox/guide/git-github/issue-triage-labels)
::

## 7. Helper agents write the fixes

Helper agents write the fixes, each in a git worktree of its own, run the Gate and hand back a committed branch; they never merge. All the doc fixes go to one agent as one branch, and each code or config fix gets a branch of its own. The run itself opens its Friction Ledger update, on top of that survey commit, as a PR of its own, every run, fixes or none.

::lessons
[Subagents](/t/glassbox/guide/agents/subagents)
::

## 8. The run reviews and merges

The run reviews each branch itself, opens its PR and posts its verdict there as a comment. A clean, low-risk fix it merges through `scripts/github/merge-pr.ts`, which refuses without that verdict and refuses a PR that changes a Human-only file unless the owner approves that in-session. A fix whose diff needs a human merge stays open, with the reason, for a Trusted user.

::lessons
[Merge gate](/t/glassbox/guide/verification/gate) · [Pull requests](/t/glassbox/guide/git-github/pull-requests)
::

## 9. The next session reads the fix

The fix lands in a doc, a repo-owned Skill, a script or config. A later session that opens that doc or runs that Skill gets the new text, and its log lists that doc among the docs it read, or that Skill among the Skills it used. The Ledger entry records the fix's PR and the date it merged, and from then on only sessions that started after the fix count as a recurrence.

::lessons
[Claude Code skills](/t/glassbox/guide/claude-code/skills) · [CLAUDE.md](/t/glassbox/guide/claude-code/claude-md) · [Friction Ledger](/t/journal/current/frictions)
::

## A real case

On 8 July 2026 a scheduled session waited about two hours on a PR's CI. It had called `ScheduleWakeup` to wake it later, but that tool paces `/loop`, and nothing woke the session. A `frictions-to-fixes` run filed the logged Friction as an issue (#241), whose fix added a line to an agent doc, and a later run added another (#425). On 31 July two sessions made the same mistake again. A run on 2 August filed it as a regression for a human (#814), and PR #843 fixed it twice over: a line in CLAUDE.md at the time, and a guard. Since then, :file[scripts/hooks/loop-only-tool-guard.ts] denies a new wakeup outside `/loop`, and its message says what to use instead.

## Where next

- [Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop)
- [Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
- [Scheduled tasks](/t/glassbox/guide/agents/scheduled-tasks)
- [Asking an agent for a change](/t/glassbox/guide/walkthroughs/asking-for-a-change)
- [Friction Ledger](/t/journal/current/frictions)
