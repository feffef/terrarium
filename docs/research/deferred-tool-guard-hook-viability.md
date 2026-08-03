# Deferred-tool `PreToolUse` hook: does it actually intercept the bad call in this cloud env?

Grounding note for issue #612 (modeled on #318/#320's sibling provenance work).
This is a one-off reference note, not a living convention — the guard mechanism
itself is single-homed in `docs/agents/deferred-tool-guard.md`.

## The question

Does a `PreToolUse` hook intercept a deferred-tool call carrying another tool's
argument shape (the recurring `TaskCreate`-called-with-`Agent`'s-shape failure,
#386, #432, #612) in this remote execution environment?

## Findings, in three parts

1. **Hooks run in this cloud environment — observed, not assumed.** This repo's
   own `SessionStart` / `Stop` / `SessionEnd` hooks in the same
   `.claude/settings.json` demonstrably fire in cloud sessions (e.g.
   `session-end.ts` runs on resume). So the hook *infrastructure* is active
   here — unlike `permissions.allow`, which is dropped in untrusted cloud
   workspaces (#288, `docs/agents/environment-caveats.md`). The hook mechanism
   is not subject to that drop.
2. **The contract matches exactly (verified against the official docs).** The
   [Claude Code hooks reference](https://code.claude.com/docs/en/hooks)
   confirms `PreToolUse` fires *before a tool call executes and can block it*,
   receives `tool_name` + `tool_input` on stdin, and denies via
   `hookSpecificOutput.{hookEventName, permissionDecision: "deny",
   permissionDecisionReason}` — precisely what `denyOutputFor()` emits, and a
   `"TaskCreate|Monitor"` list is valid matcher syntax.
3. **Residual unknown — ordering vs. schema validation — recorded, not papered
   over.** Whether `PreToolUse` fires *before* the harness rejects a
   schema-invalid **deferred**-tool call (the `InputValidationError` path) is a
   property of the host, not of this repo, and could not be definitively
   live-tested in the session that authored this: hooks load at session start,
   so a mid-session install does not activate in the same session. The
   definitive confirmation is the next session that *starts* with this hook
   installed and reproduces the `TaskCreate`-with-`Agent`-shape call.

See `docs/agents/deferred-tool-guard.md` for how the guard is built to stay the
strongest reachable mechanism regardless of how (3) resolves.
