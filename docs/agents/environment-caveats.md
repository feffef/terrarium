# Environment caveats

Platform/environment limitations observed in this remote execution environment
— not repo bugs. Each was previously diagnosed once and re-surfaced later as if
new; don't re-diagnose any of these as a fresh problem.

- **Don't try to silence a `mcp__Claude_Code_Remote__*` permission prompt by adding a
  `.claude/settings.json` `permissions.allow` entry — it can't work.** In cloud
  (web/mobile) sessions the workspace starts **untrusted** (`~/.claude.json` →
  `hasTrustDialogAccepted: false`), so Claude Code **drops the whole `permissions.allow`
  array at startup**, before matching any rule — and web/mobile expose no trust dialog to
  change that (`mcp__github__*` stays silent only because the platform auto-approves that
  server by a separate path, not the allowlist). And `Claude_Code_Remote` is a cloud-only
  server, so a local CLI never has it to allow either — the four entries were inert
  everywhere and were removed from that file (full diagnosis: #288). This caveat is
  `Claude_Code_Remote`-specific: in a **trusted local CLI**, `permissions.allow` entries
  for MCP servers that are actually present *do* work.
- **`docs.github.com` returns 403 through the agent proxy.** Use
  `raw.githubusercontent.com/github/docs/...` as the primary source instead
  when verifying GitHub's own documentation — it has hit the same session
  twice independently (main session and its own subagent) and once produced a
  false "unverified" finding when the 403 was mistaken for the fact actually
  being unconfirmable (issue #888).
- **`commit_signing_key.pub` (`~/.ssh/commit_signing_key.pub`) can be
  unprovisioned (0 bytes) in this environment.** When it is, `git commit -S` —
  and the Stop hook's suggested `--reset-author` remedy for an "Unverified"
  commit — can silently fail to produce a signature regardless of
  author-email correctness.
- **Session-only, in-memory state can silently empty across a session-resume
  event**, with no error and no notification. Observed in two independent
  forms: `CronCreate`/`CronList` state dropping a recurring `/loop` job mid-run
  (a `/guest-build` loop, issue #571), and a **backgrounded `Agent`-tool
  subagent** being silently killed by the orchestrating session's own resume
  event — the #773 impl agent's backgrounded process died ~4h after dispatch,
  with no error and no notification, only discovered because a human asked
  whether it was still running (issue #794). A session relying on a
  `/loop`/`CronCreate` job should periodically re-verify it's still registered
  via `CronList` rather than assuming it persists for its full stated
  lifetime; likewise, after a session resumes, proactively re-verify any
  outstanding backgrounded subagent's liveness rather than assuming it
  survived the resume (issues #571, #794). The same emptying hits **scratchpad
  files on disk**, distinct from the already-fixed cross-agent-filename-collision
  issue #847: a worker-process restart has deleted or truncated scratchpad
  files mid-session (a docs copy shrunk to 14 bytes, session-log scratches
  vanishing outright). Treat a scratchpad file as non-durable across a
  restart/resume too — re-fetch or re-verify its content rather than trusting
  a cached read (issue #891).
- **Any `mcp__Claude_Code_Remote__*` call — not just `send_later` — can fail
  with a transient "permission stream closed before response received"
  error.** Converged workaround (mirrors the poll-until-green pattern in
  [`github-integration.md`](./github-integration.md), issue #145): retry the
  same call once after reconnect; if it fails again, route around it — for
  `send_later` specifically, fall back to
  `mcp__Claude_Code_Remote__create_trigger` with a `run_once_at` timestamp,
  which is the same mechanism (`send_later`'s own tool description states it is
  a thin wrapper over a self-bind `run_once_at` Routine), so the fallback is
  capability-equivalent rather than a different tool doing a different thing
  (issue #229).

  **Withdrawn 2026-08-04 (issue #814): the original wording named
  `ScheduleWakeup` as this fallback.** It is not one — the recommendation was
  pointing sessions at the exact misuse #814 tracks, and a `PreToolUse` guard
  now refuses that call (`scripts/loop-only-tool-guard.ts`). There is no
  carve-out: this fallback is gone, not narrowed. (CLAUDE.md owns the
  `ScheduleWakeup` rule itself; `docs/agents/guards.md` the mechanism,
  issue #814.)
- **`AskUserQuestion` (a core tool, not a `Claude_Code_Remote` MCP tool) can hit
  the same transient "permission stream closed" error.** Retry once; if it
  fails again, don't retry-loop — fall back immediately to the safer default
  option and note the fallback explicitly in the resulting output (issue #359).
- **A fired self-bind Routine's output may not surface as a visible turn in
  the session.** Before concluding a Routine "didn't run" or "didn't fire,"
  check `last_fired_at` via `list_triggers` rather than relying on turn
  visibility (issue #834).
- **An agent session cannot write `.github/workflows/*` here — no `workflow`
  OAuth scope — and `workflow-edit-guard` ([guards](./guards.md)) now refuses
  the write itself, before it ever reaches a commit.** If it's ever bypassed:
  the sharp edge is the **commit**, not the push (the rejection covers the
  whole ref update, stranding everything else in it too) — the guard's own
  deny message is the teaching surface for that, read it rather than
  re-deriving it. `docs/proposals/` ([README](../proposals/README.md)) is the
  handoff convention for the edit itself (issue #659, #897).
- **A local-only typecheck/build failure is usually stale install state, not a
  repo bug.** A past instance is on record in issue #940 for the curious, but
  it traced to a Tenant since removed, so that exact error can no longer
  recur. The lesson outlives the instance, because the failure mode is the *environment*, not the
  component: before asserting "X is broken on main" from a local repro — especially a typecheck/build failure —
  reset the *full* install state (`rm -rf node_modules .nuxt && pnpm install
  --frozen-lockfile`) to mirror CI's `--frozen-lockfile` path rather than only
  reverting tracked files; a `git stash` or `rm -rf .nuxt && nuxt prepare`
  alone won't clear `node_modules`/`.nuxt`. Skipping this once produced a
  false public issue (#923, closed `not_planned`) plus a proactive push
  notification claiming main was broken, based on a repro that never actually
  cleaned `node_modules`/`.nuxt` (issue #928).
- **The container's worktree-isolation guard can false-positive on an ordinary
  command and block it outright.** Known trigger shapes: a redirected
  `pnpm`/`git push` command, a command whose text happens to contain both the
  literal strings "Bash" and "pnpm", and a heredoc that merely mentions `git`.
  Each cost a round trip across three separate implementers in one session.
  **Workaround:** write the command to a script file and execute the script
  file instead of the raw inline command (issue #1180).
- **A scheduled/autonomous session can find `mcp__github__*` tools unauthenticated
  and no `gh` CLI on PATH** — the GitHub MCP server needs an OAuth flow a
  non-interactive session can't run, and there is no code-level fix from inside
  the repo (a session can't grant itself OAuth credentials). Left undetected,
  finished, gate-green work sits silently stranded on a pushed branch with no PR
  opened and no signal a human needs to step in. **Fallback procedure:** push the
  branch as usual, then say so explicitly and unambiguously in the session log's
  `outcome`/`summary` — e.g. "branch pushed, PR NOT opened — no GitHub write
  access this run" — so it surfaces to a human instead of reading as ordinary
  completion (issue #982).
- **A dispatched subagent's tool call that needs human permission approval
  blocks indefinitely in an unattended/scheduled run, and nothing surfaces
  that to the orchestrating session.** Observed directly: a scheduled
  `frictions-to-fixes` run with no human watching dispatched an impl agent
  whose `.claude/settings.json` edit (wiring a guard into `hooks.PreToolUse`
  for issue #1208) hit an approval prompt; the agent stalled for **~3 hours**,
  discovered only because the user happened to open the web UI for something
  unrelated and approved it by hand (issue #1215). Confirmed: `PreToolUse`
  hooks do fire for a dispatched subagent's own tool calls, same as for the
  orchestrator (`guards.md`'s "Probed live" section) — but a *permission
  approval* prompt is a different mechanism from a hook, one that waits on an
  actual human click in the UI, not on hook resolution. **Not confirmed, and
  not found documented anywhere in this repo:** any proactive wake-on-pending-
  approval signal that could reach the orchestrating session while a dispatched
  subagent sits blocked like this. Treat that as a real gap, not an
  unconfirmed guess — the incident itself is the negative evidence: a chance
  human glance at the web UI is what ended the stall, not any signal from the
  orchestrator's own tools. This is a structural risk for any scheduled Skill
  that dispatches subagents whose edits could need approval — not specific to
  `.claude/settings.json` — so an unattended dispatcher should not read a
  dispatched subagent's silence as merely "still working."
