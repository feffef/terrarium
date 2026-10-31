---
name: dispatch-subagents
description: "Dispatch work to subagents — use when about to write a subagent brief (especially for parallel agents, or any that will touch git), when checking that dispatched work actually landed, or when a subagent stopped mid-run and needs resuming. Other Skills that dispatch impl agents reach it by name."
---

Goal: every subagent's work lands, is right, and is never **stranded**
(finished but uncommitted, or unseen by you).

## 1. Lock the shared design axis first

If several subagents' outputs depend on one **load-bearing** choice (what the owner
will see, a length bound, who owns a shared item; even two agents
on a small pass), settle it first with the `grilling` Skill. A choice
that shifts after agents have started forces a full redo.

## 2. Pick the isolation

- **A dispatched subagent that touches git:** pass `isolation: 'worktree'` on the
  Agent call. Without it, parallel agents share one checkout and race on
  branches.
- **`EnterWorktree`/`ExitWorktree`** moves your whole session. Use only when the
  user says "worktree".
- **Manual `git worktree add`** is for your own one-off inspection, never a
  subagent's brief. Put it under `.claude/worktrees/NAME/`: path-scoped rules
  don't load for files outside the project folder (issue #1944).

## 3. Write the brief

The subagent sees none of your context, so the brief is self-contained. Include
every line that applies.

**Git and checkout**
- Run git as `git -C <worktree-root> ...`, never `cd`, one git command per Bash
  call; a heredoc goes in a script file (`docs/agents/environment-caveats.md`).
- Have the agent run `pnpm install` in its worktree first.
- Pin the SHA to work from (`origin/<default-branch>` if none). The agent
  checks that HEAD matches and re-branches if not; worktrees sometimes start
  stale (issue #1420). Agents sharing one checkout each get an explicit SHA.
- A review agent for a PR whose branch is checked out elsewhere checks out the
  PR's commit SHA detached, never the branch name.
- Impl agents pushing to the branch you have checked out: detach your checkout
  first and re-sync after hand-back. Each agent bases on a fresh
  `origin/<branch>` and pushes `HEAD:<branch>`, with no same-named local branch.
- A read-only agent that wants to experiment copies the file aside or uses its
  own worktree.

**Stranding**
- Commit before stopping, even mid-gate: an agent can end at any time. Push
  once its branch is reviewed ("Scope and trust").
- Bank progress to logs after each step. The harness refuses a subagent's Write
  of report files, so have it return structured results in its final message.
- Create the agent's scratchpad subfolder first (CLAUDE.md); a shared name
  silently collides.
- Tell the agent to run `pnpm gate:scoped` and other checks in the foreground
  (`docs/agents/guards.md`). If a check may outlast one call, name a log-file
  marker as the done signal and resume with `SendMessage`, pasting the log's
  real tail.
- Launch at most (20 − running) agents; every Agent call runs async, so wait
  for its notification. After a user interrupt, check agents are alive before
  you report them as running.
- Run at most 2 full gates at once in one container (`pnpm gate:scoped` waits
  for a slot; plain `pnpm gate` does not); rerun an exit-137 run alone before
  diagnosing.
- A screenshot agent shoots once `pnpm build` succeeds, reads at most about 12
  images (more pages, more agents), and stops and reports at the first image
  "request limit" error, not retry.

**Scope and trust**
- Impl agents never call `merge-pr.ts`, whatever the brief says. They hand back
  a committed, green branch, unpushed. You run `/code-review` on its worktree
  (`pr-workflow.md`, "Review before the first push"), resume the agent for
  every fix, later ones included, and review again; it pushes once a review is clean, and you open
  and land the PR.
- Keep a subagent's final reply with
  `pnpm exec tsx scripts/session/save-handback.ts <agent-id> <out>`, never by
  retyping it.
- Impl agents do not run `close-session` and cannot spawn subagents: run
  `/code-review` and any nested dispatch yourself.
- Give a size ceiling for a "simple" fix ("under ~50 lines, one new test") and
  tell the agent to report back rather than exceed it.
- Name the relevant ADR when the work touches routing or architecture (an agent
  once added a Platform `/t/<tenant>` page against ADR-0016).
- Allow a listed item to be refused with proof; a proven refusal is a finding
  about the list, so don't re-dispatch it.
- Paste in what you already hold (counts, fetched sources, a named file) so the
  agent doesn't re-derive it.
- For a review, give the path of a draft file to `Read`; never paste its
  content. Scope a blind reviewer to named paths rather than banning `Read`.
- Before dispatching, re-read the brief: every `{…}` filled, every path
  repo-relative and existing, every value copied from its source.
- A subagent's prose is candidate material: re-check any factual or attribution
  claim against its cited source before it ships.

## 4. Check for same-file collisions

Before dispatching parallel impl agents, check whether they may touch the same
file. If so, serialize them or budget time to rebase and reconcile: two green
gates do not make the branches safe to merge in any order, since edits in
adjacent regions conflict silently (issue #603).

## 5. Verify nothing is stranded

Before you finish, push every reviewed branch and remove the worktree of any
branch you dropped. `log-session --author` enforces this and removes worktrees
already merged (`EXCUSALS` in `scripts/git/check-worktrees.ts` lists the exceptions).

If you `cd`'d into a subagent's worktree, `cd` back (or use absolute paths) and
re-check `git status` at the root: a closure Stop-hook flag may belong to that
worktree, not your own tree.

## 6. Resume a stopped subagent; never re-dispatch it

Use `SendMessage` to its agent id. A fresh `Agent` call gets a brand-new checkout
with no memory, risking a duplicate branch or lost local commits. When its
branch already has a PR, tell it to check the PR is unmerged before it pushes
(`pr-workflow.md`).
