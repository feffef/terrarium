#!/bin/sh
# Hot-path pre-filter for scripts/double-background-guard.ts (issue #1208):
# only a payload textually carrying BOTH `"run_in_background": true` and a
# bare `&` pays the tsx start; a textual false positive is harmless (the
# guard re-checks the parsed input with a real quote-aware scan before
# denying).
payload=$(cat)
printf '%s' "$payload" | grep -qE '"run_in_background"[[:space:]]*:[[:space:]]*true' || exit 0
printf '%s' "$payload" | grep -q '&' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/double-background-guard.ts
