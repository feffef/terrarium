#!/bin/sh
# Hot-path pre-filter for scripts/bash-rules-hint.ts (issue #1764): only a
# reader verb in a command that can be compound or multi-file pays the tsx
# start; a one-word read is the harness's job. It errs toward running tsx.
# It reads the first `command` after the last bare `"tool_input"` key, never
# the response text, which would match almost every call; inside a JSON
# string that key would be escaped. tsx is called directly because
# `pnpm exec` adds about a second per Bash call.
payload=$(cat)
command=$(printf '%s' "$payload" | sed 's/.*"tool_input"//' | grep -oE '"command" *: *"([^"\\]|\\.)*"' | head -n1)
verb='(^|[^[:alnum:]_.-]|\\[nt])(cat|bat|head|tail|sed|awk|grep|rg|less|more|diff)'
printf '%s' "$command" | grep -qE "$verb([^[:alnum:]_-]|\$)" || exit 0
# Compound: a pipe, list, background, substitution or (JSON-escaped) newline.
# Otherwise two or more non-flag words after the verb.
printf '%s' "$command" | grep -qE '[|;&`]|\$\(|\\n' ||
  printf '%s' "$command" | grep -qE "$verb( +-[^ ]*)* +[^ -][^ ]*( +-[^ ]*)* +[^ -]" || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/bash-rules-hint.ts
