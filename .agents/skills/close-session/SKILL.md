---
name: close-session
description: Invoke when this Claude session is wrapping up — coming to a close, or the work has reached a coherent, honest state (a PR opened, changes committed, a question answered), whether or not anything has merged. The model-facing front door for Session closure: it records the session log via `log-session`. Judge closure yourself; invoke early and re-invoke if work continues — logging self-heals, so closing early costs nothing.
---

You've reached **Session closure** — run the two closing actions:

- **Record the session log: invoke `/log-session`.** Status `in-review` if a PR is
  open, else `completed`.
- **For any gated PR, follow CLAUDE.md's discipline:** open it, subscribe to its
  activity, and babysit it to merge/close.

**Closing isn't one-shot.** If you do more work after closing, invoke
`/close-session` again — re-logging self-heals, overwriting the log with the
fuller state.

**Dispatched worktree-isolated impl agents must NOT self-invoke this Skill.**
Such agents share the parent session id with the orchestrator and with each
other, and this Skill writes to a single shared per-session scratch file — a
second invocation silently clobbers the first, erasing the orchestrating
session's own log content. The orchestrating session is the sole log author for
the run; a dispatched impl agent just implements, pushes, and hands back the PR.
