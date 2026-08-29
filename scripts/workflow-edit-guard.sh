#!/bin/sh
# Hot-path pre-filter for scripts/workflow-edit-guard.ts (issue #897): only a
# payload textually mentioning the protected directory pays the tsx start, so
# ordinary Edit/Write/Bash calls — the highest-frequency tools — never do. A
# textual false positive is harmless (the guard re-checks the parsed input, and
# only denies a write). The fail-opens this pre-filter creates are listed in
# that file's header.
payload=$(cat)
printf '%s' "$payload" | grep -q '\.github/workflows/' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/workflow-edit-guard.ts
