#!/bin/sh
# Hot-path pre-filter for scripts/subagent-background-guard.ts (issue #694):
# only a payload textually carrying `"run_in_background": true` pays the tsx
# start; a textual false positive is harmless (the guard re-checks the parsed
# input). Trade-offs: docs/agents/subagent-background-guard.md.
payload=$(cat)
printf '%s' "$payload" | grep -qE '"run_in_background"[[:space:]]*:[[:space:]]*true' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/subagent-background-guard.ts
