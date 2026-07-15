---
name: close-session
description: "Invoke when this Claude session is wrapping up — coming to a close, or the work has reached a coherent, honest state (a PR opened, changes committed, a question answered), whether or not anything has merged. The model-facing front door for Session closure: it records the session log via `log-session`. Judge closure yourself; invoke early and re-invoke if work continues — logging self-heals, so closing early costs nothing."
---

You've reached **Session closure** — run the two closing actions:

- **Record the session log: invoke `/log-session`.** Pick an honest `status` —
  see `log-session` for the exact semantics of each of the five values
  (`completed | in-review | partial | blocked | abandoned`); never default a
  stalled or abandoned session to `completed`.
- **For any gated PR, follow CLAUDE.md's discipline:** open it, subscribe to its
  activity, and babysit it to merge/close.

**Closing isn't one-shot.** If you do more work after closing, invoke
`/close-session` again — re-logging self-heals (`log-session` explains why).

**When is your logging duty actually finished?** Not when you author the scratch —
only when the log commit is on `origin/main` carrying the session's **final**
status. Three conditions, all required:
1. the scratch has the **final** `status` — `completed` once the PR has merged,
   never left at `in-review` when the work has actually landed;
2. the `Stop` hook has stitched and **committed** the log (it fires at end of turn,
   so it lands *after* you author — not visible in the same turn); and
3. you have **verified that commit on `origin/main`** — after `git fetch origin
   main`, `git log origin/main --grep=<this session's id>` shows it.

Authoring only arms (2). Since you stay alive to babysit any PR you opened
(CLAUDE.md), use a later babysitting turn to confirm (3), and — once the PR merges —
**finalize the log via `log-session`** (status `completed`, plus any friction from
closure), then re-verify. Until all three hold, the session is **not** logged.
(For a **scheduled autonomous** run there is no human to notice a missing log and
prompt you — issue #176 — so authoring it yourself is the only thing that makes the
hooks commit one at all.)

**If a human had to prompt this closure, that is the regression itself — log it.**
If you are running `close-session` because the user asked in conversation, rather
than because you self-judged closure, *and* a PR had already been opened or merged,
then you failed to log at PR-open as you should have. Record it as a **`major`**
friction whose `description` contains the exact keyword **`HUMAN-PROMPTED-CLOSURE`**,
so the self-improvement Skills can grep and count it. Self-judged closure at
PR-open needs no such friction.

**Dispatched worktree-isolated impl agents must NOT self-invoke this Skill.**
Such agents share the parent session id with the orchestrator and with each
other, and this Skill writes to a single shared per-session scratch file — a
second invocation silently clobbers the first, erasing the orchestrating
session's own log content. The orchestrating session is the sole log author for
the run; a dispatched impl agent just implements, pushes, and hands back the PR.
