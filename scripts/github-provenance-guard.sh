#!/bin/sh
# Hot-path pre-filter for scripts/github-provenance-guard.ts on Bash (issue
# #1900): only a payload mentioning `gh … api` or `api.github.com` pays the tsx
# start. The gap between `gh` and `api` may hold spaces or a JSON-escaped
# newline or line continuation. A textual false positive is harmless: the guard
# parses the command and denies only a body it finds.
payload=$(cat)
printf '%s' "$payload" | grep -qE 'gh([[:space:]]|\\[nt]?)+api|api\.github\.com' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/github-provenance-guard.ts
