#!/bin/sh
# Pre-filter for scripts/bash-rules-hint.ts (issue #1764): only a reader in a
# command that may be compound or multi-file pays the tsx start. It reads
# `command` after the first "tool_input" key, which response text cannot fake,
# and errs toward running tsx, which re-checks. tsx runs directly because
# `pnpm exec` adds about a second per Bash call.
payload=$(cat)
command=$(printf '%s' "$payload" | awk '!f && (i = index($0, "\"tool_input\"")) { $0 = substr($0, i); f = 1 } f' |
  grep -oE '"command" *: *"([^"\\]|\\.)*"' | head -n1)
verb='(^|[^[:alnum:]_.-]|\\[nt])(cat|bat|head|tail|sed|awk|grep|rg|less|more|diff)'
sep='( |\\t)+'
printf '%s' "$command" | grep -qE "$verb([^[:alnum:]_-]|\$)" || exit 0
printf '%s' "$command" | grep -qE '[|;&`]|\$\(|\\n' ||
  printf '%s' "$command" | grep -qE "$verb($sep-[^ ]*)*$sep[^ -][^ ]*($sep-[^ ]*)*$sep[^ -]" || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/bash-rules-hint.ts
