#!/bin/sh
# Hot-path pre-filter for workflow-edit-guard.ts (issue #897): only a payload
# naming the protected directory pays the tsx start. Its fail-opens are listed
# in that file's header.
payload=$(cat)
printf '%s' "$payload" | grep -q '\.github/workflows/' || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/hooks/workflow-edit-guard.ts
