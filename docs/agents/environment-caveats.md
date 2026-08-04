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
  survived the resume (issues #571, #794).
- **Any `mcp__Claude_Code_Remote__*` call — not just `send_later` — can fail
  with a transient "permission stream closed before response received"
  error.** Converged workaround (mirrors the poll-until-green pattern in
  [`github-integration.md`](./github-integration.md), issue #145): retry the
  same call once after reconnect; if it fails again, route around it — for
  `send_later` specifically, fall back to the built-in `ScheduleWakeup` tool
  instead of retrying further (issue #229).
- **`AskUserQuestion` (a core tool, not a `Claude_Code_Remote` MCP tool) can hit
  the same transient "permission stream closed" error.** Retry once; if it
  fails again, don't retry-loop — fall back immediately to the safer default
  option and note the fallback explicitly in the resulting output (issue #359).
- **A fired self-bind Routine's output may not surface as a visible turn in
  the session.** Before concluding a Routine "didn't run" or "didn't fire,"
  check `last_fired_at` via `list_triggers` rather than relying on turn
  visibility (issue #834).
