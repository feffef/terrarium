#!/bin/sh
# Hot-path pre-filter for scripts/subagent-background-guard.ts (issues #694,
# #964): only a payload textually carrying `"run_in_background": true`, or
# any `&` at all (the trailing-`&`/`nohup … &` command-text bypass), pays the
# tsx start; a textual false positive is harmless (the guard re-checks the
# parsed input with a real quote-aware scan). Trade-offs:
# docs/agents/guards.md.
payload=$(cat)
printf '%s' "$payload" | grep -qE '"run_in_background"[[:space:]]*:[[:space:]]*true|&' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/subagent-background-guard.ts
