# The subagent background guard (issue #694)

The single home for the `PreToolUse` guard that denies a **dispatched
subagent** any Bash call with `run_in_background: true`
(`scripts/subagent-background-guard.ts`, pre-filtered by
`scripts/subagent-background-guard.sh`, wired in `.claude/settings.json`).

## Why

A subagent's own backgrounded command can never wake it — the
task-notification wake exists only for the main session, and `Monitor`
doesn't resume a stopped subagent; only an orchestrator `SendMessage` does.
Four recorded impl agents stalled this way on backgrounded `pnpm gate:scoped`
runs, across three wording passes (#602, #712, the consolidated
`dispatch-subagents` bullet — the last recurrence had a compliant brief the
subagent ignored). Per the owner's standing rule on #694, this guard removes
the choice at call time instead of wording it a fourth time. Orchestrators
are untouched; the rule a subagent follows instead is foreground with an
explicit `timeout` (≤ 600000 ms), split into separate calls if a step exceeds
10 minutes — the deny message carries this in full.

## Mechanism

- **Matcher `Bash`, hot path pre-filtered.** `Bash` is the highest-frequency
  tool, so the hook entry is the `sh` pre-filter: it forwards to the tsx
  guard only when the payload textually carries `"run_in_background": true`
  (whitespace-tolerant); everything else pays one `grep`.
- **Deny predicate.** `Bash` + `run_in_background: true` is denied unless the
  payload positively identifies the main session. *All* backgrounding is
  denied in subagent context — a command registry would invite rephrasing.
- **Fail closed, bounded.** Undeterminable context, unparseable payload, or a
  guard crash denies — and can't wedge foreground use, since the pre-filter
  never forwards it.

## Detection contract (probed live, 2026-08-06, CLI 2.1.42)

Established empirically in session `session_01K3VWusiRRa6ngZZKMJphvp`:

- `PreToolUse` hooks **do fire for a dispatched subagent's tool calls**
  (observed: the provenance guard blocked a probe subagent's MCP call).
- A subagent's payload carries **`agent_id`/`agent_type`**; a main-session
  payload carries neither. Either present ⇒ `subagent`; session identity
  without them ⇒ `main`; neither ⇒ `undeterminable` (denied).
- Nothing else distinguishes the contexts: the subagent's env and
  `transcript_path` are the *parent's*.
- `ScheduleWakeup`/`TaskCreate` are unavailable inside subagents (why the
  probe had to use a provenance-guarded MCP tool).

## Residual limits

- **Textual pre-filter:** a harness rename/re-serialization of the key stops
  forwarding — fails open. Closing it means tsx on every Bash call.
- **`|| true` invocation:** missing pnpm/tsx dies before the guard runs, as
  with the sibling guards.
- **`Bash`-matcher-in-subagent is inferred** from the probed MCP matcher, not
  yet live-observed (hooks load at session start, so the authoring session
  couldn't watch its own hook). The first hook-installed session confirms it;
  if this class recurs after merge, check this residual before assuming the
  guard failed.
- **Payload fields are harness-owned:** dropping `agent_id`/`agent_type`
  would read subagent calls as `main` — silent fail-open.

## Exercising it by hand

```
tsx scripts/subagent-background-guard.ts --dry-run --tool Bash \
    --context subagent --input '{"run_in_background":true}'   # deny
tsx scripts/subagent-background-guard.ts --dry-run --tool Bash \
    --payload '{"session_id":"s"}' --input '{"run_in_background":true}'  # main → allow
```

Unit tests: `tests/unit/subagent-background-guard.spec.ts` (pure core, CLI,
pre-filter, `--dry-run` — the ADR-0004 reviewability bar for an unattended
hook).
