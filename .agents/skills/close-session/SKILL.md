---
name: close-session
description: "Invoke when this Claude session is wrapping up — coming to a close, or the work has reached a coherent, honest state (a PR opened, changes committed, a question answered), whether or not anything has merged. The model-facing front door for Session closure: it records the session log via `log-session`. Judge closure yourself; invoke early and re-invoke if work continues — logging self-heals, so closing early costs nothing."
---

You've reached **Session closure**. Goal: the Journal holds an honest log of
this session, with its final status.

1. **Re-read CLAUDE.md and the always-loaded rules** with
   `pnpm exec tsx .agents/skills/close-session/scripts/always-loaded.ts`, not by
   opening the rule files (that loads unrelated rules into your log). For every
   rule or step in them that this session broke or skipped, log a Friction that
   names the rule, even if you fixed it later. Say what impact breaking it had or
   could have had, and what would have made you read it at the time.
2. **Look back once more when this close sets `completed`.** From memory, with
   no transcript read, hunt what the whole session cost: knowledge you found
   too late that would have changed your route, and detours (repeated
   searches, re-reads, retries, an expensive tool call, a long way round to a
   fact). Log each one not yet logged as a Friction, as usual. When what you
   found late is written nowhere in the repo, also record it as a learning.
   When the session sparks something larger than any one Friction's fix, a
   step up from the pain rather than its `solution` restated, record it as an
   idea (`GLOSSARY.md` → Session, Idea).
3. **Invoke `/log-session`** with an honest `status` (`log-session` defines the
   five values). Never default a stalled or abandoned session to `completed`.
   If a PR-open step (`subscribe_pr_activity`, or this Skill) was rejected, log
   anyway, as `in-review`, and name the skipped step.
4. **Gated PR:** open it, subscribe to its activity, and babysit it to merge or
   close.

**Re-invoke** `/close-session` whenever more work follows, such as another PR or
the merge. Each log replaces the last.

**You are done logging only when** the scratch has the **final** status
(`completed` once the PR merged), the `Stop` hook has committed the log (it fires
at end of turn, so after you author), and `git fetch origin main` then
`git log origin/main --grep=<this session's id>` shows that commit. Check it in a
later babysitting turn. A scheduled run has no human to notice a missing log
(issue #176), so authoring it yourself is the only way one gets committed.

**If a human had to prompt this closure** after a PR was already opened or
merged, you missed the PR-open log. Record a **`major`** Friction (fixed grade
here) whose `description` contains the exact keyword **`HUMAN-PROMPTED-CLOSURE`**.
Self-judged closure needs none.

**Dispatched worktree-isolated impl agents must not self-invoke this Skill**; they
would clobber the orchestrator's shared log. `log-session.ts --author` refuses
from a linked worktree (`--allow-worktree` for the legitimate `EnterWorktree`
case).
