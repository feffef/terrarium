#!/bin/sh
# Hot-path pre-filter for scripts/bash-rules-hint.ts (issue #1764): only a
# command naming a reader verb pays the tsx start. It reads the command from
# `tool_input`, which precedes `tool_response` in the payload: the response
# text would match almost every call. tsx is called directly because
# `pnpm exec` adds about a second per Bash call.
payload=$(cat)
command=$(printf '%s' "$payload" | grep -oE '"command": *"([^"\\]|\\.)*"' | head -n1)
printf '%s' "$command" | grep -qE '(^|[^[:alnum:]_.-]|\\[nt])(cat|bat|head|tail|sed|awk|grep|rg|less|more|diff)([^[:alnum:]_-]|$)' || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/bash-rules-hint.ts
