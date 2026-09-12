# Environment caveats

Platform/environment limitations observed in this remote execution environment
— not repo bugs. Each was previously diagnosed once and re-surfaced later as if
new; don't re-diagnose any of these as a fresh problem. Full incident detail
lives in the cited issue, not here.

- **A `Claude_Code_Remote` `permissions.allow` entry is dead code — don't add
  one.** A cloud session starts untrusted and drops the whole `permissions.allow`
  array before matching any rule; a local CLI never has this server to allow in
  the first place. `mcp__github__*` stays silent via a separate auto-approve
  path, not the allowlist. Works normally for a real MCP server in a **trusted
  local CLI**. (issue #288)
- **`docs.github.com` 403s through the agent proxy.** Fetch
  `raw.githubusercontent.com/github/docs/...` instead when verifying GitHub's
  own documentation. (issue #888)
- **`~/.ssh/commit_signing_key.pub` can be unprovisioned (0 bytes) here** —
  `git commit -S`, and the Stop hook's `--reset-author` remedy for an
  "Unverified" commit, can silently fail to sign even with a correct author
  email.
- **Session-only, in-memory state can silently empty across a session-resume
  event, with no error** — a registered `/loop`/`CronCreate` job, a
  backgrounded `Agent`-tool subagent, or a scratchpad file on disk. Re-verify
  each is still registered/alive/intact after a resume rather than assuming it
  survived. (issues #571, #794, #891)
- **Any `mcp__Claude_Code_Remote__*` call, and `AskUserQuestion`, can fail with
  a transient "permission stream closed" error.** Retry once; on a second
  failure, route around it rather than retry-looping — for `AskUserQuestion`,
  fall back to the safer default option and say so in the output; for
  `send_later` specifically, `create_trigger` with `run_once_at` is the
  capability-equivalent fallback. Never route around it via `ScheduleWakeup` — a
  `PreToolUse` guard refuses that misuse outright (CLAUDE.md owns the rule,
  `docs/agents/guards.md` the mechanism). (issues #145, #229, #359, #814)
- **A fired self-bind Routine's output may not surface as a visible turn.**
  Check `last_fired_at` via `list_triggers` before concluding it didn't fire.
  (issue #834)
- **An agent session cannot write `.github/workflows/*` here — no `workflow`
  OAuth scope — and `workflow-edit-guard` ([guards](./guards.md)) now refuses
  the write itself, before it ever reaches a commit.** If it's ever bypassed:
  the sharp edge is the **commit**, not the push (the rejection covers the
  whole ref update, stranding everything else in it too) — the guard's own
  deny message is the teaching surface for that, read it rather than
  re-deriving it. `docs/proposals/` ([README](../proposals/README.md)) is the
  handoff convention for the edit itself (issue #659, #897).
- **A local-only typecheck/build failure is usually stale install state, not a
  repo bug.** Before asserting "X is broken on main" from a local repro, reset
  the *full* install state (`rm -rf node_modules .nuxt && pnpm install
  --frozen-lockfile`) to mirror CI's `--frozen-lockfile` path — a `git stash`
  or `rm -rf .nuxt && nuxt prepare` alone won't clear `node_modules`. (issues
  #923, #928, #940)
- **The container's worktree-isolation guard can false-positive on an ordinary
  command and block it outright** — known triggers include a redirected
  `pnpm`/`git push` command, a command whose text merely contains both "Bash"
  and "pnpm", or a heredoc mentioning `git`. Write the command to a script
  file and execute that instead of the raw inline command. (issue #1180)
- **A scheduled/autonomous session can find `mcp__github__*` unauthenticated
  with no `gh` CLI fallback** — there's no code-level fix from inside the
  repo. Push the branch as usual, then say so explicitly in the session log's
  `outcome`/`summary` (e.g. "branch pushed, PR NOT opened — no GitHub write
  access this run") so it doesn't read as ordinary completion. (issue #982)
- **A dispatched subagent's tool call needing human permission approval blocks
  indefinitely in an unattended run, with no signal to the orchestrating
  session** — `PreToolUse` hooks do fire for a subagent's own calls, but a
  permission-approval prompt waits on an actual human UI click, a different
  mechanism entirely, and no proactive wake-on-pending-approval signal is
  known to exist. Treat prolonged subagent silence as possibly stuck, not
  merely slow. (issue #1215; `docs/agents/guards.md` covers the narrower fix
  of never autonomously dispatching a guard/settings-touching edit at all)
