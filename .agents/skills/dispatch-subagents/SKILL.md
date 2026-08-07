---
name: dispatch-subagents
description: "Dispatch work to subagents — use when about to spawn one or several (especially parallel, or any that will touch git), when authoring a dispatch brief, when checking that dispatched work actually landed, or when a subagent stopped mid-run and needs resuming. Other Skills that dispatch impl agents reach it by name."
---

A dispatch is a **procedure**, not a tool call: lock the shared axis → pick the
mechanism → author the brief → dispatch → verify no work was **stranded**. Every
rule below is a repair for an observed failure, not a precaution.

## 1. Lock the shared design axis first

Before dispatching subagents whose outputs share a **load-bearing** design axis —
the thing every one of their outputs depends on — grill it to a locked answer,
using the `grilling` Skill by name. The trigger is the shared dependency, not
headcount or pass size: even two subagents on a small pass need this if the axis
is genuinely load-bearing across their outputs. An axis that shifts mid-build,
after subagents have already authored against the old answer, forces a full
re-authoring pass.

Done when the axis has a locked answer, or you've established the outputs share
no such axis.

## 2. Pick the isolation mechanism

Three distinct mechanisms exist in this environment — pick the one that matches
the task, don't conflate them.

1. **`EnterWorktree`/`ExitWorktree`** (interactive, session-level) — switches
   *this whole session's* working directory into a new git worktree. Use it only
   when the user explicitly says "worktree", or CLAUDE.md/memory directs the
   current task to run in one — never proactively for routine work.
2. **The Agent tool's `isolation: 'worktree'` parameter** (per-subagent) — the
   mechanism for dispatched subagents, especially parallel ones, that will touch
   git. Pass it **explicitly**: it is an Agent-tool parameter, not implied by the
   prompt. Without it, "parallel" agents share one checkout and race on branches.
3. **Plain manual `git worktree add`** — an ordinary git operation with no
   session-switching or Agent-tool wiring. Use it only for an ad-hoc, one-off
   worktree you'll manage by hand yourself (e.g. inspecting another branch's tree
   side by side). A brief that tells a subagent to run `git worktree add` is doing
   mechanism 2's job with the wrong mechanism.

Done when the mechanism is named — and, for mechanism 2, `isolation: 'worktree'`
is actually in the Agent call.

## 3. Author the brief

The subagent cannot see this session's context, so the brief is self-contained:

- **Prefix every git-touching command with `cd <worktree-root> &&`.** A dispatched
  subagent's Bash tool does not preserve working directory across separate tool
  calls — each starts from whatever cwd the harness resets to, so an early `cd`
  does not carry over. Never phrase it as "cd into your worktree, then run these
  git commands": that reads as one-time setup, which the subagent will
  (correctly, given how the tool actually behaves) fail to repeat.
- **Say `pnpm install` may be needed first.** A freshly provisioned mechanism-2
  worktree may not have dependencies installed, so `pnpm gate:scoped` — or any
  other pnpm script — won't actually work there.
- **Verify HEAD before any commit.** Mechanism-2 worktrees have been observed
  starting from a stale or unrelated HEAD instead of `origin/<default-branch>`,
  hitting multiple parallel subagents in the same session. Don't assume the fresh
  worktree is on top of it: check that the worktree branch's HEAD matches
  `origin/<default-branch>`, and rebranch explicitly if it doesn't.
- **Commit + push before stopping, even mid-gate.** A subagent can end its turn —
  or die to an external "session limit" abort — leaving finished work **stranded**:
  uncommitted, and invisible to the orchestrator.
- **Name every artifact the subagent writes uniquely to that subagent** — logs,
  screenshots, scratch scripts. Dispatched subagents inherit the *orchestrator's*
  scratchpad, not one of their own, so parallel agents all reaching for the
  obvious `gate.log` overwrite each other. The collision does not error: it hands
  an agent a well-formed log describing a **different** worktree's run, which it
  then quotes as its own. Two agents hit this independently in one dispatch, and
  the orchestrator published a wrong root-cause diagnosis built on the clobbered
  output before the second report surfaced the real mechanism (issue #847).
- **Run verification (`pnpm gate:scoped`, and any other check) in the foreground
  and wait** — a dispatched subagent's own backgrounded commands do not wake it
  the way a background `Agent`/`Workflow` call wakes you. Where something must be
  backgrounded anyway, **name the concrete way to confirm it finished** — a
  log-file completion marker, or the `Monitor` tool — not just "run it and wait":
  a subagent that checks once and stops stalls on a still-running job, needing a
  `SendMessage` resume with the log's actual tail pasted in (issue #602).
- **The Agent tool ignores `run_in_background: false`.** Every Agent-tool call
  launches as a background async task regardless of the `run_in_background`
  parameter passed — plan to wait on the automatic task-notification for the
  subagent's result, not a synchronous inline return.
- **Decouple screenshot capture from gate completion.** A screenshot-capture
  agent shoots finals as soon as `pnpm build` succeeds, independent of whether
  `pnpm gate:scoped`/CI has finished — otherwise it blocks on the gate and never
  takes the shot it was dispatched to produce, stranding the deliverable behind
  an unrelated, often slower, gate (issue #683).
- **Grant explicit authority to refuse a listed item — and require proof instead
  of implementation.** Without that, a subagent that can see a listed change is
  wrong implements it anyway and the reasoning never surfaces. A proven refusal
  is a finding about the list: review it, don't re-dispatch the item.
- **Bank progress before continuing.** A long-running subagent persists each
  iteration's artifacts to disk before starting the next step. A transient API
  failure mid-run kills it with no warning, taking everything unbanked — not just
  the in-flight step.
- **Pin an explicit SHA when subagents share one checkout** (concurrent dispatch
  *without* `isolation: 'worktree'`) — never have them independently resolve
  `FETCH_HEAD`/`HEAD`. A sibling's fetch moves the shared ref out from under
  another subagent silently, since each still gets *a* valid answer, just against
  the wrong commit (once, an entirely different PR's head).
- **A read-only/review subagent that needs to experiment against a file must
  copy it aside or use its own isolated worktree — never mutate the
  orchestrator's shared checkout**, even transiently. The orchestrator reads
  whatever diff results as an intentional user edit, with no signal it was a
  subagent's throwaway probe — it can ship gutted or reverted code without
  ever knowing the change wasn't real (issue #887).
- **Front-load grounding data** in an ideation/exploration brief — counts, kinds,
  grades, whatever the domain's cheap grep-able facts are. A subagent that
  develops a flagship idea the data already rules out is effort spent re-deriving
  what the dispatcher had cheap access to.
- **A dispatched worktree-isolated impl agent must not self-invoke
  `close-session`/`log-session`** — see `close-session/SKILL.md` for why, and its
  mechanical enforcement.

Done when every applicable line above appears **in the brief text** — not merely
true in your head.

## 4. Check for same-file collisions before parallel dispatch

Before dispatching several parallel impl agents, check whether their issues
plausibly touch the same file. If they might, either serialize dispatch for that
file or explicitly budget rebase-and-reconcile review time: a green gate on each
branch independently does **not** mean the branches are safe to merge in any
order. The second branch can go stale the moment the first merges — especially
when both touch the same file in adjacent (not overlapping) regions git wouldn't
flag as a conflict (issue #603).

Done when every file two dispatches might both touch is either serialized or has
reconcile time budgeted.

## 5. Verify after dispatch — nothing **stranded**

Run **`pnpm check:worktrees`** (`scripts/check-worktrees.ts`, issue #427). It
enumerates every worktree from git state itself, not from subagent return values
— so it catches the worktree of a subagent that died without ever returning, and
exits non-zero naming any linked worktree left uncommitted or unpushed. It can't
prevent an abort; it ensures the damage is seen.

**Your own `cd` into a subagent's worktree can outlive the inspection.** A
session-closure Stop hook's "uncommitted changes" flag seen afterwards may belong
to that still-in-progress subagent's tree, not your own repo state. After
inspecting via `cd`, `cd` back to the repo root (or use absolute-path-prefixed
one-off commands instead of a standalone `cd`), and re-check `git status`/branch
at the root before trusting the warning as this session's own.

Done when `pnpm check:worktrees` exits 0.

## 6. Resume a stopped subagent — never re-dispatch it

Use **`SendMessage` to its existing agent id**. A fresh `Agent` call provisions a
brand-new checkout with no memory of the prior work, risking a duplicate
branch/push or losing the first attempt's already-committed local work;
`SendMessage` continues the same agent, worktree, and history.
