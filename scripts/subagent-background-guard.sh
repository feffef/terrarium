#!/bin/sh
# Hot-path pre-filter for scripts/subagent-background-guard.ts (issue #694).
# `Bash` is the highest-frequency tool, so its PreToolUse hook must not pay a
# tsx cold start on every call: only a payload that textually carries
# `"run_in_background": true` — the rare case — is forwarded to the guard;
# every foreground call exits after one grep. A textual false positive (the
# key quoted inside a command string) is harmless: the guard re-checks the
# parsed `tool_input` properly. The residual fail-open — a harness rename or
# re-serialization of the key stops this filter forwarding — is accepted and
# recorded in docs/agents/subagent-background-guard.md.
payload=$(cat)
printf '%s' "$payload" | grep -qE '"run_in_background"[[:space:]]*:[[:space:]]*true' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/subagent-background-guard.ts
