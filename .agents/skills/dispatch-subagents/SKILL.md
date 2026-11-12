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

More than 3 agents from one brief you improvised this session: start one first and check its result before the rest; a brief defined in the repo needs no pilot.

## 2. Pick the isolation

- **A dispatched subagent that touches git:** pass `isolation: 'worktree'` on the
  Agent call. Without it, parallel agents share one checkout and race on
  branches.
- **Edit-only writers sharing your checkout:** each commits only its own files by
  path, never `git add -A`.
- **`EnterWorktree`/`ExitWorktree`** moves your whole session. Use only when the
  user says "worktree".
- **Your own one-off inspection** may use `git worktree add` under
  `.claude/worktrees/NAME/` (path-scoped rules don't load outside the project
  folder, issue #1944), never in a subagent's brief.

## 3. Write the brief

The subagent sees none of your context, so the brief is self-contained.
Re-read it before dispatching: every `{…}` filled, every path existing and
repo-relative, every value copied from its source. Include every line that
applies.

**Git and checkout**
- Run git as `git -C <worktree-root> ...` with literal paths (no `$VAR`), one
  git command per Bash call (`docs/agents/environment-caveats.md`); run
  `pnpm install` in the worktree first.
- Pin the SHA to work from (`origin/<default-branch>` if none); the agent checks
  HEAD matches and re-branches if not, since worktrees sometimes start stale
  (issue #1420). Agents sharing one checkout each get an explicit SHA.
- A review agent for a PR whose branch is checked out elsewhere reads the PR's
  commit (`git show <sha>:<path>`) or checks that SHA out detached in its own
  worktree, never the branch name and never in your checkout.
- Impl agents on the branch you have checked out: detach your checkout first and
  re-sync after hand-back. Each agent bases on a fresh `origin/<branch>`, with no
  same-named local branch.
- A read-only or review agent outside its own worktree never runs `checkout`,
  `switch` or `reset`; its brief says so. It reads with `git show` or
  `git diff`, and copies a file aside to experiment.

**Stranding**
- Commit before stopping, even mid-gate: an agent can end at any time. Bank
  progress to logs after each step. The harness refuses a subagent's Write of
  report files, so it returns structured results in its final message.
- Create the agent's scratchpad subfolder first (CLAUDE.md); a shared name
  silently collides.
- Tell the agent to run every check in the foreground; a guard denies a subagent's background
  run. If one may outlast a call, name a log-file marker as the done signal and
  resume with `SendMessage`, pasting the log's real tail.
- Launch at most (20 − running) agents, and wait for each notification. After a
  user interrupt, check agents are alive before you report them as running.
- Run at most 2 full gates at once in one container (`pnpm gate:scoped` waits for
  a slot; plain `pnpm gate` does not); rerun an exit-137 run alone before
  diagnosing.
- A screenshot agent shoots once `pnpm build` succeeds, reads at most about 12
  images, and stops and reports at the first image "request limit" error.

**Scope and trust**
- Include the asks in CLAUDE.md's "Every subagent brief" bullet.
- Impl agents never call `merge-pr.ts`, whatever the brief says. They hand back
  a committed, green, unpushed branch. You run `/code-review` on its worktree
  (`pr-workflow.md`, "Review before opening the PR"), resume the agent for every
  fix, later ones included, and review again; once clean, you push
  (`git -C <worktree> push origin HEAD:<branch>`), open and land the PR. They do
  not run `close-session` and cannot spawn subagents: run any nested dispatch
  yourself.
- Keep a subagent's final reply with
  `pnpm exec tsx scripts/session/save-handback.ts <agent-id> <out>`, never by
  retyping it.
- Give a size ceiling for a "simple" fix ("under ~50 lines, one new test") and
  tell the agent to report back rather than exceed it.
- Name the relevant ADR when the work touches routing or architecture (an agent
  once added a Platform `/t/<tenant>` page against ADR-0016).
- Allow a listed item to be refused with proof; a proven refusal is a finding
  about the list, so don't re-dispatch it.
- Paste in what you already hold (counts, fetched sources, a named file). For a
  review, give the path of a draft file to `Read`, never its content; scope a
  blind reviewer to named paths rather than banning `Read`.

## 4. Check for same-file collisions

Before dispatching parallel impl agents, check whether they may touch the same
file. If so, serialize them or budget time to rebase and reconcile: two green
gates do not make the branches safe to merge in any order, since edits in
adjacent regions conflict silently (issue #603).

## 5. Verify nothing is stranded

Before you finish, push every reviewed branch and remove the worktree of any
branch you dropped. `log-session --author` enforces this and removes clean worktrees
already merged (`EXCUSALS` in `scripts/git/check-worktrees.ts` lists the exceptions).

If you `cd`'d into a subagent's worktree, `cd` back (or use absolute paths) and
re-check `git status` at the root: a closure Stop-hook flag may belong to that
worktree, not your own tree.

## 6. Resume a stopped subagent; never re-dispatch it

Use `SendMessage` to its agent id. A fresh `Agent` call gets a brand-new checkout
with no memory, risking a duplicate branch or lost local commits.

- A resumed agent keeps its branch and scratchpad but sees only the new message:
  spell out the check it must run. Keep its later replies with `save-handback.ts` too.
- A hand-back after a resume may be the earlier report delivered late: wait for
  the next notification before re-sending the instruction, and verify the work
  against git.
