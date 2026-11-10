#!/bin/sh
# Pre-filter for scripts/hooks/helped-ask.ts (#3020): only a command naming
# helped.sh pays the tsx start; the .ts decides whether the call was bare.
payload=$(cat)
printf '%s' "$payload" | grep -q 'scripts/session/helped\.sh' || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/hooks/helped-ask.ts
