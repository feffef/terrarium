#!/bin/sh
# Hot-path pre-filter for scripts/commit-trailer-guard.ts (issue #921): only a
# payload textually mentioning one of the two ADR-0017 trailer keys pays the tsx
# start, so ordinary Bash calls — the highest-frequency tool — never do. A
# textual false positive is harmless (the guard re-checks the parsed input, and
# only denies when the mention sits inside a `git commit`). Trade-offs:
# docs/agents/commit-trailer-guard.md.
payload=$(cat)
printf '%s' "$payload" | grep -qiE 'Claude-Session:|Co-Authored-By:' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/commit-trailer-guard.ts
