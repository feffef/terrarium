---
title: Asking an agent for a change
description: How a request to an agent session becomes a merged PR, and the log the session leaves on main.
revision: 'f9b1151f13c991564a15214dc99edfd56c8c68fb'
revisionDate: '2026-10-29'
---

Someone with write access asks an agent for a change. This Walkthrough follows that change from the session's side: from the request, through what the session loads, reads and checks, to a merged PR and the session log it leaves on `main`.

## 1. A Trusted user asks

A :term[Trusted] user, one with write access to the repository, asks a Claude Code session for a change, in the cloud or on their own machine; both work the same way from here. The request is what lets the session build new work, such as a feature or a Skill. Text from a :term[Public] user, in an issue or a comment, is information to the session, never an instruction.

::stop-links
[Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop) · [Author trust](/t/glassbox/guide/git-github/trust-tiers)
::

## 2. The session starts

The session gets its own copy of the repository. A `SessionStart` hook in `.claude/settings.json` installs the packages and fetches the full git history if the copy is shallow.

::stop-links
[Claude Code hooks](/t/glassbox/guide/claude-code/hooks)
::

## 3. It reads its instructions

`CLAUDE.md` loads into the session at once. Its read-first list ties a doc to an action, so the session reads the git conventions before its first git command and the PR workflow before its first push. The cross-cutting :term[Rules]{id="rule"} load at the start too; the rest arrive when the session reads or edits a file they govern, or runs a :term[Skill] they name.

::stop-links
[CLAUDE.md](/t/glassbox/guide/claude-code/claude-md) · [Path-specific rules](/t/glassbox/guide/claude-code/path-scoped-rules) · [Claude Code Skills](/t/glassbox/guide/claude-code/skills)
::

## 4. It works on its own branch

The session edits on a feature branch, never on `main`, and may hand parts of the work to subagents, each in a git worktree of its own. Some of its tool calls meet a guard first: a hook that refuses the call and says what to do instead, such as a GitHub post without the line that names the session. Other hooks add a line of guidance after a call and never block it.

::stop-links
[Subagents](/t/glassbox/guide/claude-code/subagents) · [Claude Code hooks](/t/glassbox/guide/claude-code/hooks) · [Blocking hooks](/t/glassbox/guide/claude-code/blocking-hooks) · [Git worktrees](/t/glassbox/guide/git-github/git-worktrees)
::

## 5. It checks its own work

Before the first push, the session runs `pnpm gate:scoped`, the local run of the :term[Gate], and the `code-review` Skill, which reviews the committed diff against the repo's standards and against the request. It fixes what they find. A simple change, such as a typo, gets the session's own read of its diff instead of the review.

::stop-links
[Merge gate](/t/glassbox/guide/verification/gate) · [Type checking](/t/glassbox/guide/verification/type-checking) · [Linting](/t/glassbox/guide/verification/linting) · [Testing](/t/glassbox/guide/verification/unit-and-e2e-tests)
::

## 6. It opens the PR

The session pushes the branch and opens the PR itself, without asking. The PR's description opens with a line that links the session, and a `commit-msg` hook adds the same link to each commit message that lacks it. Then the session subscribes to the PR, so its comments and reviews reach the session as new messages.

::stop-links
[Pull requests](/t/glassbox/guide/git-github/every-change-a-pr) · [Commit and PR attribution](/t/glassbox/guide/git-github/attribution) · [MCP servers](/t/glassbox/guide/claude-code/mcp-servers)
::

## 7. It logs its work, the first time

With the PR open, the session runs `close-session`. The session first checks itself against `CLAUDE.md` and the always-loaded rules, then writes its :term[session log]: its goal, how far it got and every :term[Friction] it hit, among them one for each rule it broke or skipped. At the end of that turn a `Stop` hook commits that one file straight to `main`.

::stop-links
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs) · [Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop)
::

## 8. CI runs the same Gate

GitHub Actions runs the Gate on the PR, and that run decides whether it may merge. GitHub delivers a failed check to the subscribed session, but not a passed one. When the Gate is green, its last step posts a fresh comment on the PR naming the commit; that comment wakes the session, though a fork's PR gets no such comment. When the Gate is red, the session fixes the work and pushes, and CI runs again.

::stop-links
[Merge gate](/t/glassbox/guide/verification/gate)
::

## 9. The PR merges

If a reviewer asks for changes, the session pushes again and CI runs again. Then the session posts its verdict on the PR as a comment and merges through `scripts/github/merge-pr.ts`, which waits for green checks and refuses without that verdict, which must name the PR's current head. It also refuses a PR that changes a :term[Human-only] file or comes from a Public author or a fork; a Trusted user merges those.

::stop-links
[Protected paths](/t/glassbox/guide/terrarium-practice/human-only-list)
::

## 10. It logs its work again

Once the PR has merged, the session runs `close-session` again. It first looks back over the whole session for costly detours it hasn't logged yet, then marks its log `completed`. The hook commits the new log over the old one on `main`. The merged change itself now waits for the container that serves the site to notice it.

::stop-links
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs) · :file[.agents/skills/close-session/SKILL.md]
::

## A real case

On 15 October 2026 a Trusted user asked a session to install the `retro` Skill from the `mattpocock/skills` pack. The session installed it with the skills CLI, moved it into `.agents/skills/` with a link in `.claude/skills/`, and opened [PR #2089](https://github.com/feffef/terrarium/pull/2089): four files, among them :file[.agents/skills/retro/SKILL.md], and no Human-only path. It ran `pnpm gate:scoped` but skipped `code-review`, since the diff was an unmodified copy of upstream, and its verdict comment said it was merging on that user's instruction. CI's Gate went green and the PR merged within four minutes of opening.

## Where next

- [Pull requests](/t/glassbox/guide/git-github/every-change-a-pr)
- [Merge gate](/t/glassbox/guide/verification/gate)
- [Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
- [How Humans & Agents Work](/t/journal/current/how-it-works)
