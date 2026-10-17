#!/bin/sh
# Pre-filter for scripts/read-first-hint.ts (issue #1754): only an mcp__github__
# call or a command with a `git`, `gh` or screenshot script word pays the tsx start. It reads
# `command` after the first "tool_input" key, as scripts/bash-rules-hint.sh does,
# and errs toward running tsx, which re-checks.
payload=$(cat)
command=$(printf '%s' "$payload" | awk '!f && (i = index($0, "\"tool_input\"")) { $0 = substr($0, i); f = 1 } f' |
  grep -oE '"command" *: *"([^"\\]|\\.)*"' | head -n1)
printf '%s' "$payload" | grep -qE '"tool_name" *: *"mcp__github__' ||
  printf '%s' "$command" | grep -qE '(^|[^[:alnum:]_.-]|\\[nt])(git|gh)([^[:alnum:]_-]|$)' ||
  printf '%s' "$command" | grep -qE '(preview|screenshot)\.ts' || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/read-first-hint.ts
