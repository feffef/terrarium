#!/bin/sh
# Hot-path pre-filter for scripts/tail-pipe-guard.ts (issue #873): only a
# payload textually mentioning a pipe into tail/head/echo pays the tsx start,
# so ordinary Bash calls — the highest-frequency tool — never do. A textual
# false positive is harmless (the guard re-checks the parsed command and the
# background/long-runner condition before denying).
payload=$(cat)
printf '%s' "$payload" | grep -qE '\|[[:space:]]*(tail|head|echo)\b' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/tail-pipe-guard.ts
