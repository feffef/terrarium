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
- **Session-only state can silently vanish across a session resume, with no
  error:** a registered `/loop`/`CronCreate` job, a backgrounded `Agent`
  subagent, a scratchpad file. After a resume, re-verify each is still
  registered/alive/intact. (issues #571, #794, #891)
- **Any `mcp__claude-code-remote__*` call (spelled `mcp__Claude_Code_Remote__*`
  in some sessions), and `AskUserQuestion`, can fail with a transient
  "permission stream closed" error.** Retry once only. If the retry fails: for `AskUserQuestion`, take the
  safer default option and say so in the output; for `send_later`, use
  `create_trigger` with `run_once_at`. (issues #145, #229, #359)
- **A fired self-bind Routine's output may not surface as a visible turn.**
  Check `last_fired_at` via `list_triggers` before concluding it didn't fire.
  (issue #834)
- **An agent session cannot write `.github/workflows/*` here — no `workflow`
  OAuth scope.** `workflow-edit-guard` ([guards](./guards.md)) denies the write.
  A commit that gets past it is rejected at
  push, stranding every other commit in that push. To undo one, drop the
  commit from history, since restoring the file in a new commit still fails the
  push check on every commit: `git rebase --onto <sha>^ <sha>` for a commit
  inside the branch, or `git reset --soft HEAD~1` then re-commit without the
  workflow file for the tip. Only on a branch you created. The edit itself goes
  in `docs/proposals/` ([README](../proposals/README.md)). (issues #659, #897,
  #1955)
- **The agent proxy denies writes to repository-settings endpoints and any
  non-repo-scoped path.** `POST repos/{owner}/{repo}/rulesets` returns 403
  "Write access to this GitHub API path is not permitted through this proxy";
  `apps/...` and `/app/...` return 403 "sessions are bound to their configured
  repositories". A ruleset or other settings change goes in `docs/proposals/`
  for a human (issue #1689).
- **A local-only typecheck/build failure is usually stale install state, not a
  repo bug.** Before asserting "X is broken on main" from a local repro, reset
  the *full* install state (`rm -rf node_modules .nuxt && pnpm install
  --frozen-lockfile`, CI's path); `git stash` or `rm -rf .nuxt && nuxt prepare`
  alone won't clear `node_modules`. (issues #923, #928, #940)
- **The container's worktree-isolation guard can wrongly block an ordinary
  command.** Known triggers: git chained with other commands (the `cd <root> &&`
  prefix passes), a redirected `pnpm`/`git push`, command text that merely
  contains both "Bash" and "pnpm", a heredoc mentioning `git`, a command naming
  git twice. One git command per call; run the rest from a script file, not
  inline. (issues #1180, #1499)
- **A scheduled/autonomous session can find `mcp__github__*` unauthenticated
  with no `gh` CLI fallback** — there's no code-level fix from inside the
  repo. Push the branch as usual, then say so explicitly in the session log's
  `outcome`/`summary` (e.g. "branch pushed, PR NOT opened — no GitHub write
  access this run") so it doesn't read as ordinary completion. (issue #982)
- **In an unattended run, a dispatched subagent's tool call that needs human
  approval blocks forever, and the orchestrator gets no signal** (`PreToolUse`
  hooks still fire for subagent calls). Treat long subagent silence as possibly
  stuck, not slow, and never dispatch an unattended or scheduled session to
  change a guard or its `.claude/settings.json` hook wiring. (issue #1215;
  [guards](./guards.md) has the hook probe.)
- **The harness's instruction-shaped-content scanner can false-positive on
  benign text** that merely mentions "settings.json" / "settings-json", e.g. a
  subagent's report on `.claude/settings.json` hook wiring. If a flagged
  result is benign discussion, not an injection attempt, treat it as this
  quirk. (sessions session_0174Bf4itHjWjJ3yMKmRd1KM,
  session_019QghEUG36tGWuhPUdM4t5Q)
- **The container's git (2.43) can differ from CI's (~2.55), so a git-based
  test fixture can pass here and fail in CI.** Force the precondition (e.g.
  delete the ref) instead of relying on default behavior — `init` + `remote
  add` + `fetch` left `origin/HEAD` unset locally but not in CI. (commit
  2b85df96)
- **A scratchpad script can't `import` repo deps (e.g. `yaml`)** when run as
  `pnpm exec tsx <scratchpad>/x.ts`: it resolves from its own directory. Set
  `NODE_PATH=<repo>/node_modules` or import by absolute path.
- **A headless `claude -p` probe inherits the parent's session id and writes its
  tool calls into the parent transcript.** Run it with
  `env -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_REMOTE_SESSION_ID`, and send
  stderr to `/dev/null` when parsing `--output-format json`.
