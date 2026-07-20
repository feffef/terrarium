# Deferred-tool shape guard (issue #612)

A mechanical backstop for CLAUDE.md's rule *"before the first call to any deferred
tool this session, load its schema via `ToolSearch`."* That doc-only rule failed
to hold **three times** for `TaskCreate` — each time by calling it with the `Agent`
tool's argument shape (`prompt` + `subagent_type`) without loading its real schema
(#386, #432, and the third recurrence #612 records). Two prose-only strengthenings
(#386, #432) both failed, so the owner chose a mechanical guard (#612 option 2).

## What it is

- **`scripts/deferred-tool-guard.ts`** — a `PreToolUse` hook. On each matched tool
  call it receives the `tool_name` + `tool_input` on stdin and asks one question:
  *do these arguments carry the distinctive signature of a **different** tool?* If
  so, it blocks the call (`permissionDecision: "deny"`) with a corrective message
  that names the real owner tool and points at `ToolSearch` — instead of letting
  the call fail with a terse `InputValidationError` the agent then has to decode.
- **`.claude/settings.json`** wires it under `hooks.PreToolUse`, matcher
  `TaskCreate|Monitor`.

The signal is deliberately narrow and general at once: a hook holds no list of
which tools are deferred nor their (unloaded) schemas, so the one robust, low-
false-positive signal available is *"these args match some known tool's
signature."* The seed registry (`FOREIGN_SIGNATURES`) carries the `Agent` shape
(`prompt` + `subagent_type`) that every recorded recurrence borrowed. It is **not**
`TaskCreate`-specific — the pure core (`checkToolCall`) flags *any* non-`Agent`
tool wearing that shape, so the rule's real scope ("every deferred tool") is
honoured. A newly-observed confusion is a one-line row in the registry, never a
logic change.

## Viability: does a `PreToolUse` hook intercept the bad call in this cloud env?

This is the empirical question #612 asked for a straight answer on (and that
#318/#320's sibling provenance work modelled). The honest finding, in three parts:

1. **Hooks run in this cloud environment — observed, not assumed.** This repo's own
   `SessionStart` / `Stop` / `SessionEnd` hooks in the same `.claude/settings.json`
   demonstrably fire in cloud sessions (e.g. `session-end.ts` runs on resume). So
   the hook *infrastructure* is active here — unlike `permissions.allow`, which is
   dropped in untrusted cloud workspaces (#288). The hook mechanism is not subject
   to that drop.
2. **The contract matches exactly (verified against the official docs).** The
   [Claude Code hooks reference](https://code.claude.com/docs/en/hooks) confirms
   `PreToolUse` fires *before a tool call executes and can block it*, receives
   `tool_name` + `tool_input` on stdin, and denies via
   `hookSpecificOutput.{hookEventName, permissionDecision: "deny",
   permissionDecisionReason}` — precisely what `denyOutputFor()` emits, and a
   `"TaskCreate|Monitor"` list is valid matcher syntax.
3. **Residual unknown — ordering vs. schema validation — recorded, not papered
   over.** Whether `PreToolUse` fires *before* the harness rejects a schema-invalid
   **deferred**-tool call (the `InputValidationError` path) is a property of the
   host, not of this repo, and could not be definitively live-tested in the session
   that authored this: hooks load at session start, so a mid-session install does
   not activate in the same session. The definitive confirmation is the next
   session that *starts* with this hook installed and reproduces the
   `TaskCreate`-with-`Agent`-shape call.

Because of (3) the module is built to be the **strongest reachable mechanism either
way**, with no regression risk:

- If `PreToolUse` fires at call time, it blocks pre-emptively with a useful message.
- If a schema-invalid deferred call is rejected *before* the hook, the same pure
  `checkToolCall` core is exported for reuse as an **after-the-fact transcript
  detector** (mirroring `session-id-guard.ts`, which post-hoc-checks commit
  trailers).
- It **fails open**: any parse/read failure, or a well-formed call, leaves the call
  untouched — a guard must never wedge normal tool use.

## Matcher scope — a deliberate trade-off

The guard *logic* is general, but the settings `matcher` is scoped to
`TaskCreate|Monitor` (the named repeat offenders), **not** `"*"`. Matching every
tool would run a `tsx` process (~0.29s startup) on the Read/Edit/Bash hot path —
an unacceptable per-call tax across a session. Scoping to the known deferred-tool
offenders makes the cost negligible. Widening coverage to a newly-observed
offender is a one-line matcher edit, parallel to the one-line `FOREIGN_SIGNATURES`
addition — both live next to each other conceptually.

## How to extend

- **A new tool gets repeatedly called with another tool's shape:** add a
  `ForeignSignature` row (owner + the minimal distinctive key set) to
  `FOREIGN_SIGNATURES`, and add the new offender to the `PreToolUse` matcher in
  `.claude/settings.json`.
- Keep `requiredKeys` the *minimal distinctive combination* — a single common key
  like `prompt` alone would over-match; the combination is what makes it
  unambiguous.

## Relationship to the CLAUDE.md rule

This guard does not replace the `ToolSearch`-first rule — it backstops it, exactly
as the `commit-msg` provenance hook (#346) backstops the ADR-0017 footer
convention. The rule remains the primary discipline; the guard catches the
specific, thrice-recurring failure mode when the rule doesn't hold.
