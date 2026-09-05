#!/bin/sh
# Hot-path pre-filter for scripts/branch-pin-guard.ts (issue #666): only a
# payload textually naming a branch-creating git command pays the tsx start, so
# ordinary Bash calls never do. A textual false positive is harmless (the guard
# re-parses the command, and fails open).
payload=$(cat)
printf '%s' "$payload" | grep -qE 'git[[:space:]]+(checkout|switch|branch)' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/branch-pin-guard.ts
