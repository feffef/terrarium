# The subagent background guard (issue #694)

The single home for the `PreToolUse` guard that denies a **dispatched
subagent** any Bash call with `run_in_background: true`
(`scripts/subagent-background-guard.ts`, pre-filtered by
`scripts/subagent-background-guard.sh`, wired in `.claude/settings.json`).

## Why it exists

A dispatched subagent's own backgrounded command can never wake it: the
harness's task-notification wake exists only for the main session, and a
`Monitor` notification does not resume a stopped subagent either — only an
orchestrator `SendMessage` does. Four recorded sessions (2026-07-24 ×2,
2026-07-27, 2026-08-05) each had a worktree-isolated impl agent background
`pnpm gate:scoped`, end its turn "waiting", and stall until manually resumed.
Three wording passes did not hold — #602's dispatch-brief rule, #712's
foreground sentence in `frictions-to-fixes`, and the consolidated 2026-07-31
`dispatch-subagents` bullet (the 2026-08-05 recurrence happened under that
final wording, with a compliant brief the subagent ignored). The owner's
standing rule on #694 (2026-08-04) directed the next recurrence to tooling
that takes the choice away, not a fourth wording. This guard is that tooling.

## What it does

- **Matcher `Bash`, hot path pre-filtered.** `Bash` is the highest-frequency
  tool, so the hook entry is a tiny `sh` script: it forwards the payload to
  the tsx guard only when it textually carries `"run_in_background": true`
  (whitespace-tolerant). Every foreground call — the overwhelming majority —
  pays one `grep`, never a tsx start. A textual false positive (the key quoted
  inside a command string) is harmless: the guard re-checks the parsed
  `tool_input`.
- **Deny predicate.** A `Bash` call with `run_in_background: true` is denied
  unless the payload positively identifies the **main session**. All
  backgrounding is denied in subagent context — not just gate runs — because
  the wake-that-never-comes applies to every backgrounded command, and a
  command registry would invite rephrasing around it.
- **Fail closed.** An undeterminable context, an unparseable payload, or a
  crash inside the guard denies. Bounded: because the pre-filter only forwards
  backgrounded-looking calls, a deny can never wedge ordinary foreground tool
  use.
- **The deny message is the teaching surface.** It carries the working
  alternative in full (foreground with explicit `timeout` up to 600000 ms;
  split steps that exceed 10 minutes; `preview.ts start` self-daemonizes), and
  warns off the trailing-`&` workaround. Every recorded recurrence happened in
  a subagent whose brief already said "foreground" — prose the agent had was
  prose the agent skipped, so the rule now lives at the moment of the mistake.

## The detection contract (established empirically, 2026-08-06)

A feasibility probe run in session `session_01K3VWusiRRa6ngZZKMJphvp`
established, against the live environment (CLI 2.1.42, cloud):

- **`PreToolUse` hooks do fire for a dispatched subagent's tool calls.** A
  probe subagent's `mcp__github__add_issue_comment` call was intercepted by
  the installed provenance guard before reaching GitHub.
- **A subagent's hook payload carries `agent_id` and `agent_type`; a
  main-session payload carries neither.** This is the guard's discriminator:
  either field present ⇒ `subagent`; session identity
  (`session_id`/`transcript_path`) present without them ⇒ `main`; neither ⇒
  `undeterminable` (denied).
- **Nothing else distinguishes the contexts.** The subagent's process env is
  the parent's (`CLAUDE_CODE_SESSION_ID` is the parent's id), and its payload
  `transcript_path` points at the *parent's* transcript — so env- or
  transcript-based detection is structurally unreliable; payload fields are
  the only signal.
- **`ScheduleWakeup` and `TaskCreate` are unavailable inside subagents**
  ("not available inside subagents" / "not enabled in this context") — which
  is why the probe had to use a provenance-guarded MCP tool to observe a
  subagent-context hook firing at all.

## Residual limits (accepted, not hidden)

- **The pre-filter is a textual match.** If the harness renames or
  re-serializes `run_in_background`, the filter stops forwarding and the
  guard silently never runs (fails open). Closing this would mean paying the
  tsx start on every Bash call.
- **`|| true` invocation.** As with the sibling guards: if `pnpm`/`tsx` is
  unavailable the command dies before the guard evaluates, producing no deny.
- **The `Bash`-matcher-in-subagent combination is inferred, not yet
  live-observed.** The probe proved subagent hook firing on an MCP matcher;
  the same infrastructure serves the `Bash` matcher, but hooks load at
  session start, so the authoring session could not observe its own new hook.
  The first session that *starts* with this hook installed and dispatches a
  subagent confirms it definitively — if a subagent is ever again observed
  parking on a backgrounded command, treat it as this residual firing and
  re-verify, rather than assuming the guard covers it.
- **Detection rests on harness payload fields.** If a harness change drops
  `agent_id`/`agent_type`, subagent calls read as `main` and the guard fails
  open silently. The unit tests pin the observed shapes; they cannot pin the
  live harness.

## Exercising it by hand

```
tsx scripts/subagent-background-guard.ts --dry-run --tool Bash \
    --context subagent --input '{"run_in_background":true}'   # deny
tsx scripts/subagent-background-guard.ts --dry-run --tool Bash \
    --payload '{"session_id":"s"}' --input '{"run_in_background":true}'  # main → allow
```

`--dry-run` runs the same pure core the hook runs (ADR-0004's 2026-07-30
amendment: an unattended, un-exercisable hook is human-only to merge; this is
what keeps that review tractable). Unit tests:
`tests/unit/subagent-background-guard.spec.ts` — including end-to-end runs of
the real CLI and the pre-filter script.

## What to do instead (the rule the guard enforces)

A dispatched subagent runs verification **in the foreground and waits**: an
explicit `timeout` up to 600000 ms, split into separate foreground calls
(`pnpm test`, `pnpm build`, `pnpm test:e2e`) if one step can't finish inside
10 minutes. Orchestrators (main sessions) are untouched — their backgrounded
commands wake them via task notifications, which is the sanctioned pattern.
See the `dispatch-subagents` Skill for the surrounding dispatch procedure.
