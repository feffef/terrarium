# The `/loop`-only tool guard (issue #814)

A mechanical backstop for CLAUDE.md's rule *"`ScheduleWakeup` is valid in exactly
one mode — inside a `/loop` session's dynamic (self-paced) pacing."* CLAUDE.md
owns that rule; this file documents only the mechanism, the deliberate
trade-offs, and how to extend it.

## Why a second layer at all

Two prior fixes wrote the rule into `docs/agents/github-integration.md` — #241
(2026-07-08) and #425 (2026-07-14). It kept recurring anyway, because none of the
affected sessions were doing GitHub work and none had any reason to open that
doc; the file every session *does* read carried no mention of the tool at all.
The owner's decision on #814 was therefore **both** layers, in order: state the
rule where every session reads it (CLAUDE.md), *and* refuse the call
mechanically.

The misfire is not a no-op. Two recorded cases had real consequences: an unwanted
"autonomous loop tick" turn that had to be diagnosed and stopped, and a wakeup
that would have re-sent `/audit-docs` mid-PR-review had it not been cancelled.

## What it is

- **`scripts/loop-only-tool-guard.ts`** — a `PreToolUse` hook. It reads the
  `tool_name` / `tool_input` / `transcript_path` off the payload, derives the
  session's mode from the transcript, and denies the call with a corrective
  message when the tool is registry-listed and the mode is anything but `loop`.
- **`.claude/settings.json`** wires it under `hooks.PreToolUse`, matcher
  `ScheduleWakeup`.
- **`tests/unit/loop-only-tool-guard.spec.ts`** pins the pure core directly and
  exercises the CLI's stdin→deny and `--dry-run` paths end to end.

Everything that decides allow/deny is pure and unit-testable:
`detectSessionMode(records)` and `checkLoopOnlyToolCall(tool, input, mode)`. The
hook shell only does I/O.

## Fail-closed

An undeterminable mode — no `transcript_path`, an unreadable or empty transcript
— **denies**. So does an unparseable payload and a crash inside the guard
itself. This matches `github-provenance-guard.ts` and is the behaviour #814's
brief specifies. It is also cheap to accept: across the whole recorded history of
this repo, every session that called the tool was `autonomous` or `interactive`
with no `/loop` goal, so the mode the guard exists to permit has not yet occurred
even once.

**The residual fail-open it cannot close** (shared with the provenance guard, and
recorded in both): the hook runs as `pnpm exec tsx … || true`. If `tsx` or `pnpm`
is unavailable the command dies before the script is evaluated, producing no
stdout and therefore no deny. Closing that needs a change of invocation, not of
this script.

## How the mode is read

`loop` requires positive evidence in the transcript — either a
`<command-name>/loop</command-name>` slash-command expansion in a user turn, or a
`Skill` tool_use naming the `loop` skill. Slash-command extraction reuses
`commandSkillNames` from `scripts/session-trace.ts` rather than re-deriving it,
which also buys a real safety property for free: it reads only a turn's *own*
text, never `tool_result` blocks, so a session reading a session log *about* this
very trap does not thereby look like a `/loop` session.

Two deliberate imprecisions:

- **Any `/loop` reads as `loop`, not just dynamic mode.** A fixed-interval
  `/loop 5m /foo` is paced by the harness and would not call the tool anyway, so
  widening here only avoids false denials. Narrowing would need the command's
  arguments, which the transcript does not reliably carry.
- **A `/loop` established outside this transcript is invisible**, and would be
  denied. That is fail-closed working as intended; the deny message says so and
  asks for it to be reported on #814 rather than routed around.

## The one carve-out: cancelling

`ScheduleWakeup` with `stop: true` is exempt in **every** mode. A cancel can only
ever *remove* a pending wakeup, so allowing it is harmless — while denying it
would strand a spurious wakeup with no way to stop it, which is exactly the hole
several logged sessions had to dig themselves out of. The exemption is declared
in the registry (`exempt` + `exemptNote`), not hard-coded in the predicate, and
the deny message states it.

## The contradiction this change had to resolve

`docs/agents/environment-caveats.md` used to recommend `ScheduleWakeup` as the
fallback when `send_later` hit a transient "permission stream closed" error
(#229). A blanket blocker plus a live recommendation to use the blocked tool is
the contradictory-guidance failure this repo treats as a behavioural bug, so the
recommendation was **withdrawn, not narrowed**, and replaced with a
capability-equivalent one: `mcp__Claude_Code_Remote__create_trigger` with a
`run_once_at` timestamp, which is the mechanism `send_later` is documented to
wrap. `docs/agents/github-integration.md`'s pointer to that fallback was updated
in the same change.

## Dry run

The hook runs unattended, so the same core is reachable by hand:

```
pnpm exec tsx scripts/loop-only-tool-guard.ts --dry-run --tool ScheduleWakeup \
  [--mode loop|non-loop|undeterminable] [--transcript <path.jsonl>] [--input '{"stop":true}']
```

It prints `{ tool, mode, decision, reason }` and emits no hook control object.
`--mode` forces a branch, which is the only way to exercise the `loop` (allow)
path without a real `/loop` transcript; `--transcript` runs the real detector
against a real session.

## How to extend

Add a `LoopOnlyTool` row to `LOOP_ONLY_TOOLS` — the tool's name, the `instead`
lines the deny message quotes, and an `exempt` predicate if some argument shape
is legal in any mode — and add the tool to the `PreToolUse` matcher in
`.claude/settings.json`. No predicate change is needed; the tests pin that
registry-driven property directly.

The matcher is scoped to the named tool rather than `"*"` for the same reason
`deferred-tool-guard.md` records: matching every tool would run a `tsx` process
on the Read/Edit/Bash hot path.

## Merging

ADR-0004's 2026-07-30 amendment makes a hook that runs unattended **human-only to
merge**. This one will not auto-merge — even though `detectSessionMode` and
`checkLoopOnlyToolCall` are unit-tested and dry-run-able (which is exactly what
the amendment says does *not*, by itself, clear the bar), the thing that still
isn't gate-observable is the *live* hook-interception behaviour: whether
`PreToolUse` actually fires before the harness's own call handling in this
cloud environment (the open question `docs/research/deferred-tool-guard-hook-viability.md`
raises for the sibling guard) is exactly the "external side effect... the
gate's L0–L2 layers structurally cannot observe" the amendment separately
escalates on. The pure-core/dry-run split above keeps *that* review tractable —
it narrows what a human still has to reason about to the untestable slice.
