# Environment caveats

Platform limits of this remote environment, not repo bugs; don't re-diagnose
them as new. Incident detail lives in the cited issue.

- **Don't add a `Claude_Code_Remote` `permissions.allow` entry; it does
  nothing in our cloud sessions.** A multi-repository cloud session reads only
  `enabledPlugins` and `extraKnownMarketplaces` from `.claude/settings.json`
  ([settings](https://code.claude.com/docs/en/settings)), and an untrusted
  workspace drops `permissions.allow` before matching any rule
  ([permissions](https://code.claude.com/docs/en/permissions#project-allow-rules-and-workspace-trust)).
  A local CLI has no such server to allow. `mcp__github__*` stays silent
  through a separate auto-approve path, not the allowlist. A real MCP server in
  a trusted local CLI works normally. (issue #288)
- **`docs.github.com` 403s through the agent proxy.** Fetch
  `raw.githubusercontent.com/github/docs/...` to check GitHub's own docs.
  (issue #888)
- **`github.com/user-attachments` (403), `content.nuxt.com` and `zod.dev` are
  also blocked.** Don't retry; ask the owner to paste the content into the
  issue or chat.
- **`~/.ssh/commit_signing_key.pub` can be empty (0 bytes) here.** Then
  `git commit -S`, and the Stop hook's `--reset-author` remedy for an
  "Unverified" commit, can fail to sign without an error, even with the right
  author email.
- **Session-only state can vanish across a resume, with no error:** a
  `/loop` or `CronCreate` job, a backgrounded `Agent` subagent, a scratchpad
  file. After a resume, check that each is still registered, alive or intact.
  (issues #571, #794, #891)
- **Any `mcp__claude-code-remote__*` call (`mcp__Claude_Code_Remote__*` in some
  sessions) and `AskUserQuestion` can fail once with "permission stream
  closed".** Retry once only. If that fails: for `AskUserQuestion`, take the
  safer default option and say so in the output; for `send_later`, use
  `create_trigger` with `run_once_at`. A "user sent a message instead" result
  is not a failure: the text arrives next turn, so don't re-ask.
  (issues #145, #229, #359)
- **A fired self-bind Routine's output may not show as a turn.** Check
  `last_run.fired_at` via `list_triggers` before deciding it didn't fire.
  (issue #834)
- **A cloud session cannot write `.github/workflows/*`: its token lacks the
  `workflow` OAuth scope.** `workflow-edit-guard` ([guards](./guards.md)) denies
  the write. A local session with the owner's key can push it; one pushing over
  HTTPS with a token lacking the scope is rejected, and a rejected push strands
  every commit in it. To recover on a branch you created, drop the workflow
  commit rather than revert it (the check reads every commit):
  `git rebase --onto <sha>^ <sha>`, or for the tip `git reset --soft HEAD~1`,
  `git reset -- <path>`, then re-commit without it. Put the edit in
  `docs/proposals/` ([README](../proposals/README.md)).
  (issues #659, #897, #1955, #2174)
- **The agent proxy denies writes to repository-settings endpoints and any
  path not scoped to the repo.** `POST repos/{owner}/{repo}/rulesets` returns
  403 "Write access to this GitHub API path is not permitted through this
  proxy"; `apps/...` and `/app/...` return 403 "sessions are bound to their
  configured repositories". Put a ruleset or other settings change in
  `docs/proposals/` for a human. (issue #1689)
- **A failure only in your local typecheck or build is usually stale install
  state, not a repo bug.** Before saying "X is broken on main", reset the
  *full* install state as CI does
  (`rm -rf node_modules .nuxt && pnpm install --frozen-lockfile`); `git stash`
  or `rm -rf .nuxt && nuxt prepare` alone leaves `node_modules`.
  (issues #923, #928, #940)
- **The container's worktree-isolation guard can wrongly block an ordinary
  command.** Known triggers: git chained with other commands (the `cd <root> &&`
  prefix passes), a redirected `pnpm` or `git push`, command text that merely
  contains both "Bash" and "pnpm", a heredoc mentioning `git`, a command naming
  git twice. Run one git command per call and the rest from a script file, not
  inline. (issues #1180, #1499)
- **A scheduled or autonomous session can find `mcp__github__*` unauthenticated
  and no `gh` CLI.** Nothing in the repo fixes that. Push the branch as usual,
  then say so in the session log's `outcome` and `summary` (for example
  "branch pushed, PR NOT opened — no GitHub write access this run") so it
  doesn't read as ordinary completion. (issue #982)
- **In an unattended run, a dispatched subagent's tool call that needs human
  approval blocks forever, and the orchestrator gets no signal** (`PreToolUse`
  hooks still fire for subagent calls). Treat long subagent silence as possibly
  stuck, not slow. (issue #1215; [guards](./guards.md) has the hook probe and
  the rule against dispatching an unattended session to change a guard.)
- **The harness's instruction-shaped-content scanner can false-positive on
  benign text** that mentions "settings.json" or "settings-json", such as a
  subagent's report on `.claude/settings.json` hook wiring. If a flagged
  result is benign discussion, not an injection attempt, treat it as this
  quirk. (sessions session_0174Bf4itHjWjJ3yMKmRd1KM,
  session_019QghEUG36tGWuhPUdM4t5Q)
- **The container's git (2.43) differs from CI's (~2.55), so a git-based test
  fixture can pass here and fail in CI.** Set the precondition yourself (for
  example, delete the ref) instead of relying on defaults: `init`, `remote add`
  and `fetch` left `origin/HEAD` unset locally but not in CI. (commit 2b85df96)
- **A cloud session's `CLAUDE_CODE_REMOTE_SESSION_ID` is `cse_<id>`, but
  claude.ai/code opens that session at `session_<id>`: same id, other prefix.**
  Swap the prefix before you link the session or write its ADR-0017 header;
  `normalizeRemoteSessionId` in `scripts/session/transcript-trace.ts` does it.
  A local CLI session has no claude.ai/code link; its id is the transcript's raw
  UUID. (issue #387)
- **A headless `claude -p` probe inherits the parent's session id and writes its
  tool calls into the parent transcript.** Run it with
  `env -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_REMOTE_SESSION_ID`, and send
  stderr to `/dev/null` when parsing `--output-format json`.
- **A stale `TMPDIR` makes every guard crash.** A resumed terminal can keep
  `TMPDIR` pointing at another user's folder (such as `/var/folders/zz/...`), so
  every `tsx` guard exits with EACCES, its `"onFailure": "block"` blocks the
  call, and nearly every tool call is blocked. Not a repo bug: ask the owner to
  restart Claude Code from a shell with a fresh `TMPDIR`. (session 92148909)
