#!/bin/sh
# Pre-filter for scripts/hooks/rule-use-ask.ts (#3020): only a command holding
# the marker pays the tsx start; the .ts decides whether it was a call.
payload=$(cat)
printf '%s' "$payload" | grep -q 'rule-use:' || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/hooks/rule-use-ask.ts
