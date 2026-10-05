# Environment caveats

Platform limitations of this remote execution environment, not repo bugs; don't
re-diagnose them as new. Incident detail lives in the cited issue.

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
  a transient "permission stream closed" error.** Retry once; if it fails
  again, don't retry-loop. For `AskUserQuestion`, take the safer default option
  and say so in the output. For `send_later`, use `create_trigger` with
  `run_once_at`. Never use `ScheduleWakeup`: a `PreToolUse` guard refuses it
  (CLAUDE.md owns the rule, `docs/agents/guards.md` the mechanism). (issues
  #145, #229, #359, #814)
- **A fired self-bind Routine's output may not surface as a visible turn.**
  Check `last_fired_at` via `list_triggers` before concluding it didn't fire.
  (issue #834)
- **An agent session cannot write `.github/workflows/*` here — no `workflow`
  OAuth scope.** `workflow-edit-guard` ([guards](./guards.md)) denies the write;
  its deny message says what to do. A commit that gets past it is rejected at
  push, stranding every other commit in that push. The edit itself goes in
  `docs/proposals/` ([README](../proposals/README.md)). (issues #659, #897)
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
  session** — `PreToolUse` hooks do fire for a subagent's own calls, but
  approval waits on a human UI click, and no wake-on-pending-approval signal is
  known. Treat prolonged subagent silence as possibly stuck, not slow. (issue
  #1215; `docs/agents/guards.md` covers the narrower fix of never autonomously
  dispatching a guard/settings-touching edit)
- **The harness's instruction-shaped-content scanner can false-positive on
  ordinary discussion that merely mentions "settings.json" /
  "settings-json"**, e.g. a subagent's report on `.claude/settings.json` hook
  wiring. When a result is flagged, inspect it: if it is benign discussion
  rather than an injection attempt, treat it as this quirk. (sessions
  session_0174Bf4itHjWjJ3yMKmRd1KM, session_019QghEUG36tGWuhPUdM4t5Q)
- **The container's git (2.43) can differ from CI's (~2.55), so a git-based
  test fixture can pass here and fail in CI.** Force the precondition (e.g.
  delete the ref) instead of relying on default behavior — `init` + `remote
  add` + `fetch` left `origin/HEAD` unset locally but not in CI. (commit
  2b85df96)
