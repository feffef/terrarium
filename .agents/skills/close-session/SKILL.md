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
