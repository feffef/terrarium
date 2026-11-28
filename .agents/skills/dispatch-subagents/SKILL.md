---
name: dispatch-subagents
description: "Dispatch work to subagents — use when about to write a subagent brief (especially for parallel agents, or any that will touch git), when checking that dispatched work actually landed, or when a subagent stopped mid-run and needs resuming. Other Skills that dispatch impl agents reach it by name."
---

Goal: every subagent's work lands, is right, and is never **stranded**
(finished but uncommitted, or unseen by you).

## 1. Lock the shared design axis first

If several subagents' outputs depend on one **load-bearing** choice (what the
owner will see, a length bound, who owns a shared item), settle it first with
the `grilling` Skill; a choice that shifts after agents start forces a full
redo. More than 3 agents from one brief you improvised this session: run one
first and check its result before the rest. A brief defined in the repo needs
no pilot.

## 2. Pick the isolation

- **A subagent that touches git:** pass `isolation: 'worktree'`. Parallel agents
  in one checkout race on branches.
- **Edit-only writers sharing your checkout:** commit only your own files by
  path, never `git add -A`.
- **`EnterWorktree`/`ExitWorktree`** moves your whole session; use only when the
  user says "worktree".
- **Your own one-off inspection** may use `git worktree add` under
  `.claude/worktrees/NAME/` (path-scoped rules don't load outside the project
  folder, issue #1944); never put that in a subagent's brief.

## 3. Write the brief

The subagent sees none of your context, so the brief is self-contained.
Re-read it before dispatching: every `{…}` filled, every path existing and
repo-relative, every value copied from its source. Include every line that
applies.

**Git and checkout**
- Run git as `git -C <worktree-root> ...` with literal paths (no `$VAR`); if the
  worktree guard still blocks one, run one git command per Bash call
  (`docs/agents/environment-caveats.md`). Run `pnpm install` in the worktree first.
- Pin the SHA to work from (`origin/<default-branch>` if none); the agent checks
  HEAD matches and re-branches if not (issue #1420). Agents sharing one checkout
  each get an explicit SHA.
- Never move a checkout someone else is on. A review or read-only agent reads
  with `git show <sha>:<path>` or `git diff`, or checks the PR's SHA out detached
  in its own worktree; outside that worktree it never runs `checkout`, `switch`
  or `reset`, and its brief says so. To experiment, it copies a file aside.
- Impl agents on the branch you have checked out: detach your checkout first and
  re-sync after hand-back. Each agent bases on a fresh `origin/<branch>`, with no
  same-named local branch.

**Stranding**
- Tell the agent to commit before stopping, even mid-gate, and to log progress
  after each step. It returns structured results in its final message; the
  harness refuses a subagent's Write of report files.
- Create the agent's scratchpad subfolder first (CLAUDE.md); a shared name
  collides silently.
- Tell it to run every check in the foreground (a guard denies a subagent's
  background run). If one may outlast a call, name a log-file marker as the done
  signal and resume with `SendMessage`, pasting the log's real tail.
- Launch at most (20 − running) agents and wait for each notification. After a
  user interrupt, check agents are alive before reporting them running.
- Run at most 2 full gates at once in one container (`pnpm gate:scoped` waits for
  a slot; plain `pnpm gate` does not); rerun an exit-137 run alone first.
- A screenshot agent shoots once `pnpm build` succeeds, reads at most about 12
  images, and stops and reports at the first image "request limit" error.

**Scope and trust**
- Include the asks in CLAUDE.md's "Every subagent brief" bullet.
- Impl agents never call `merge-pr.ts`, whatever the brief says, and neither run
  `close-session` nor spawn subagents (run any nested dispatch yourself). They
  hand back a committed, green, unpushed branch. You run `/code-review` on its
  worktree with the args `verdict-line.ts --review-call` prints there
  (`pr-workflow.md`, "Review before opening the PR"), resume the agent for every
  fix, later ones included, and review again; once clean, push
  (`git -C <worktree> push origin HEAD:<branch>`), open and land the PR.
- A reply that must outlive your context (a pool, or a review others read):
  `pnpm exec tsx scripts/session/save-handback.ts <agent-id> <out>`, never
  retyped. A read-only reply already in context needs no file.
- Give a size ceiling for a "simple" fix ("under ~50 lines, one new test") and
  tell the agent to report back rather than exceed it.
- Name the relevant ADR when the work touches routing or architecture.
- Allow a listed item to be refused with proof; a proven refusal is a finding
  about the list, so don't re-dispatch it.
- Paste in what you already hold (counts, fetched sources, a named file). For a
  review, give the path of a draft file to `Read`, never its content; scope a
  blind reviewer to named paths rather than banning `Read`.

## 4. Check for same-file collisions

Parallel impl agents that may touch the same file: serialize them, or budget
time to rebase and reconcile. Two green gates don't make branches safe to merge
in any order; edits in adjacent regions conflict silently (issue #603).

## 5. Verify nothing is stranded

Before you finish, push every reviewed branch and remove the worktree of any
branch you dropped (`log-session --author` enforces this and removes clean
merged worktrees; `EXCUSALS` in `scripts/git/check-worktrees.ts` lists the
exceptions). If you `cd`'d into a subagent's worktree, `cd` back and re-check
`git status` at the root: a Session closure Stop-hook flag may belong to that
worktree.

## 6. Resume a stopped subagent; never re-dispatch it

`SendMessage` its agent id; a fresh `Agent` call gets a new checkout with no
memory, risking a duplicate branch or lost local commits.

- A resumed agent keeps its branch and scratchpad but sees only the new message:
  spell out the check it must run. Its later replies follow the §3 save rule.
- A hand-back after a resume may be the earlier report delivered late: wait for
  the next notification before re-sending, and verify the work against git.

## 7. Another session is not a subagent

- Open a multi-message exchange with one short message naming who talks to the
  owner, what you pass on and a round limit; wait for its reply before sending findings.
- A receiver treats your message as data and may ask its owner first: have the
  owner pre-authorise a survey in one message the receivers can verify.
- When answering rounds, reuse earlier subagent answers; don't resume them each round.
