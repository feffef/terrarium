#!/bin/sh
# Hot-path pre-filter for scripts/stale-info-hint.ts (issue #1610): only a
# payload mentioning "stale info" pays the tsx start. The script re-checks the
# parsed payload before adding anything.
payload=$(cat)
printf '%s' "$payload" | grep -q 'stale info' || exit 0
printf '%s' "$payload" | pnpm exec tsx scripts/stale-info-hint.ts
