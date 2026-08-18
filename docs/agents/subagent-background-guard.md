# The subagent background guard (issue #694, #964)

The single home for the `PreToolUse` guard that denies a **dispatched
subagent** any way of backgrounding a command or waiting on one instead of
running it in the foreground: a Bash call with `run_in_background: true`, a
Bash command whose text itself backgrounds via a trailing `&` or a `nohup …
&` idiom (issue #964), or a `Monitor` tool call (issue #964)
(`scripts/subagent-background-guard.ts`, pre-filtered by
`scripts/subagent-background-guard.sh`, wired in `.claude/settings.json`).
The command-text and `Monitor` checks close two bypass shapes the original
deny message already warned about ("do not work around this with a trailing
`&`", "`Monitor` notifications do not resume a stopped subagent either") but
never mechanized — a dispatched impl agent found and used exactly this gap
(session `01NYhzwn6avFfVwgdPi2uNnw`, 2026-08-14).

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

- **Matcher `Bash` only, hot path pre-filtered.** `.claude/settings.json`
  wires this guard's `sh` pre-filter to the `Bash` matcher alone: it forwards
  to the tsx guard only when the payload textually carries
  `"run_in_background": true` or any `&` character (whitespace-tolerant);
  everything else pays one `grep`. **No wired hook entry currently forwards a
  `Monitor` call to this guard** — `Monitor` is matched only by the separate
  `TaskCreate|Monitor` entry, which routes to `scripts/deferred-tool-guard.ts`
  instead. `checkMonitorCall` below is implemented and unit-tested but
  presently unreachable via the live hook chain (issue #964 scoped its fix to
  the script only, not the hook wiring — tracked as a gap in a follow-up
  issue).
- **Deny predicate — three signals, one deny (once reachable).** In subagent
  (or undeterminable) context: `Bash` + `run_in_background: true`; `Bash`
  whose command text ends with a bare `&` job-control operator or invokes
  `nohup … &` (a quote-aware scan — `findUnquotedAmpersands` — skips `&&`
  chaining, `&>`/`>&`/`2>&1` redirection, and any `&` inside a quoted string
  or backslash-escaped); or any `Monitor` call. The first two are live today;
  the third (`Monitor`) is denied by the guard's own logic whenever it's
  invoked, but per the bullet above nothing currently invokes it for a real
  `Monitor` call — a command registry would invite rephrasing.
- **The command-text scan is not a full shell parser (issue #964's accepted
  trade-off):** it does not resolve command substitution (`$(...)`/backticks),
  here-docs, or ANSI-C quoting (`$'...'`), so a `&` inside one of those can
  still false-positive or false-negative.
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
- **Command-text scan residuals (issue #964):** a `&` reached only through
  command substitution, a here-doc, or ANSI-C quoting is outside the
  quote-aware scan's model and can false-positive or false-negative; the
  pre-filter's `&`-anywhere check is broader than the guard's own
  job-control-only scan, so a quoted or escaped `&` still pays the tsx start
  even though the guard then allows it — a correctness/perf trade-off, not a
  bug.

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
