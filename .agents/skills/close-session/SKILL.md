---
name: close-session
description: Invoke when this Claude session is wrapping up — you're finishing, coming to a close, or the active work has reached a coherent, honest state (a PR opened, changes committed, a question answered), whether or not anything has merged yet. The single front door for closing a session properly: it runs the closing sequence — authoring the session log (calls `log-session`) and following CLAUDE.md's gated-PR and watch-to-merge discipline. Closure is yours to judge; invoke early and re-invoke if work continues — logging is idempotent and self-heals, so closing early costs nothing.
---

Bring this Claude Session to a proper **close**. This is the single model-facing
front door for the moment the domain calls **Session closure** (`CONTEXT.md`) —
its active work is complete and in a coherent, honest state. It does **not** do
the closing itself so much as make sure the closing *sequence* actually runs;
each step's detail is single-homed elsewhere and pointed at from here.

## When to invoke

Invoke the moment you sense the session is **wrapping up** — you're finishing,
winding down, or the work has reached (or is reaching) a coherent state. This is
a deliberately **loose, early** trigger: fire it while you still can act, not
after you've mentally checked out. You **self-judge** this — no "are we done?"
ask.

Closure does **not** mean merged (a PR usually merges later, in another session)
— a log honestly records an in-review PR. And it applies to sessions that open
**no** PR at all: a research or Q&A session reaches closure too.

**Invoke early and re-invoke freely.** Closing is cheap and self-healing — if
more work happens after you close, just invoke `close-session` again. Nothing
here is a one-shot.

## The closing sequence

1. **Make the work coherent.** Ensure what you did is in an honest, consistent
   state — nothing half-applied, the PR description matching what the PR actually
   does (CLAUDE.md).

2. **If the session produced a gated PR, follow the PR discipline.** Opening the
   gated PR is automatic once the work is coherent (ADR-0003); when you open it,
   **subscribe to its activity and babysit it to merge/close** — don't ask first.
   The full rule set (when to open, watch-to-merge, keeping the description in
   sync) lives in **CLAUDE.md** — follow it there, this only reminds you to.

3. **Record the session log — invoke `log-session`.** Author the interpretive
   half (goal, outcome, summary, **every** friction); the mechanical trace is
   derived and a committed `Stop` hook lands the log to `main`, live (ADR-0009).
   Its `status` is **`in-review`** if a PR is open (never `completed` — that's for
   work that actually landed, or a session that needed no PR). `log-session` holds
   the authoring detail and the field template; this step just makes sure it runs.

That's the whole ritual: coherent state → PR discipline (if any) → logged. The
committed hook does the committing; `close-session` and `log-session` only get
the scratch authored so it has something to land.
