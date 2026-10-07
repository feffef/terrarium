---
name: dispatch-subagents
description: "Dispatch work to subagents — use when about to spawn one or several (especially parallel, or any that will touch git), when authoring a dispatch brief, when checking that dispatched work actually landed, or when a subagent stopped mid-run and needs resuming. Other Skills that dispatch impl agents reach it by name."
---

Goal: every subagent's work lands, is right, and is never **stranded**
(finished but uncommitted, or unseen by you). The steps: lock the shared axis →
pick the isolation → write the brief → dispatch → verify.

## 1. Lock the shared design axis first

If several subagents' outputs depend on one **load-bearing** design choice (even
two agents on a small pass), settle it first with the `grilling` Skill. A choice
that shifts after agents have started forces a full redo.

## 2. Pick the isolation

- **A dispatched subagent that touches git:** pass `isolation: 'worktree'` on the
  Agent call. Without it, parallel agents share one checkout and race on
  branches.
- **`EnterWorktree`/`ExitWorktree`** moves your whole session. Use only when the
  user says "worktree" or CLAUDE.md directs it.
- **Manual `git worktree add`** is for your own one-off inspection, never a
  subagent's brief.

## 3. Write the brief

The subagent sees none of your context, so the brief is self-contained. Include
every line that applies.

**Git and checkout**
- Prefix every git command with `cd <worktree-root> &&`. The Bash tool resets cwd
  between calls, so a one-time "cd into your worktree" does not carry over.
- Say `pnpm install` may be needed first in a fresh worktree.
- Pin the SHA to work from. The agent fetches, checks that HEAD matches it
  (or `origin/<default-branch>` if none is pinned), and re-branches if not:
  worktrees sometimes start stale (issue #1420). Subagents sharing one checkout
  (no worktree) must each get an explicit SHA, never resolve `HEAD` themselves.
- A review agent for a PR whose branch is checked out elsewhere checks out the
  PR's commit SHA detached, not the branch name; otherwise it may commit into
  whichever checkout it can write to (issue #1169).
- Impl agents pushing to the branch you have checked out: detach your checkout
  first and re-sync after hand-back. Each agent bases on a fresh
  `origin/<branch>` and pushes `HEAD:<branch>` without creating or resetting a
  same-named local branch (issue #1585).
- A read-only agent that wants to experiment copies the file aside or uses its
  own worktree. It never edits your checkout, even briefly: you would read the
  change as the user's edit (issue #887).

**Stranding**
- Commit and push before stopping, even mid-gate. An agent can end or be killed
  at any time.
- Long runs bank progress to disk after each step. The harness refuses a
  subagent's Write of report or findings files, so bank to logs it may write and
  have it return structured results in its final message for you to save.
- Name every artifact the agent writes (logs, screenshots, scratch scripts, gate
  output) uniquely to that agent. Subagents inherit your scratchpad, and a
  shared name like `gate.log` collides silently (issues #847, #1191).
- Run `pnpm gate:scoped` and other checks in the foreground (a guard denies
  backgrounding; `docs/agents/guards.md`). If a check may outlast one call, name
  a log-file marker as the done signal and resume with `SendMessage`, pasting the
  log's real tail (issue #602).
- Launch at most (20 − running) agents at a time; a bigger batch is rejected.
  Every Agent call runs async, so wait for its notification.
- At most 2 full gates at once in one container (`test:e2e` dies of memory
  otherwise); rerun a dead one alone before diagnosing.
- A screenshot agent shoots as soon as `pnpm build` succeeds, not after the gate
  (issue #683).

**Scope and trust**
- Impl agents never call `merge-pr.ts`, whatever pre-authorization the brief
  carries: the auto-mode classifier judges your session, not theirs. They hand
  back a pushed, green PR and you merge (`docs/agents/pr-workflow.md`).
- Impl agents do not run `close-session`/`log-session` (guard-enforced), and
  cannot spawn subagents: run `/code-review` and any nested dispatch yourself.
- Give a size ceiling for a "simple" fix ("under ~50 lines, one new test") and
  tell the agent to report back rather than exceed it (issue #1182).
- When the work touches routing or architecture, name the binding ADR in the
  brief; an implementation-only brief skips the planning step that would find it
  (an agent once added a catch-all route against ADR-0016).
- Allow a listed item to be refused, with proof instead of implementation. A
  proven refusal is a finding about the list; don't re-dispatch the item.
- Paste in what you already hold (counts, kinds, fetched sources, or a file you
  name), so the agent doesn't re-derive it or fail on a source the proxy blocks
  (issue #898).
- For a review, give the path of a scratch or draft file and have the agent
  `Read` it; never paste its content (a paste once dropped its links, issues
  #981, #1114). Scope a blind reviewer to named paths rather than banning `Read`.
- A subagent's prose is candidate material: re-check any factual or attribution
  claim (who did what, in what order) against the source it cites before it
  ships (issue #1137).

## 4. Check for same-file collisions

Before dispatching parallel impl agents, check whether they may touch the same
file. If so, serialize them or budget time to rebase and reconcile: two green
gates do not make the branches safe to merge in any order, since edits in
adjacent regions conflict silently (issue #603).

## 5. Verify nothing is stranded

Run **`pnpm check:worktrees`**. It reads git's own worktree list, so it catches a
subagent that died without returning, and exits non-zero for any linked worktree
left uncommitted or unpushed (`EXCUSALS` in the script lists the exceptions). It
cannot prevent an abort, only make the damage visible. Done when it exits 0.

If you `cd`'d into a subagent's worktree, `cd` back (or use absolute paths) and
re-check `git status` at the root: a closure Stop-hook flag may belong to that
worktree, not your own tree.

## 6. Resume a stopped subagent; never re-dispatch it

Use `SendMessage` to its agent id. A fresh `Agent` call gets a brand-new checkout
with no memory, risking a duplicate branch or lost local commits.
