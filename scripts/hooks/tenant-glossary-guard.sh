#!/bin/sh
# Hot-path pre-filter for tenant-glossary-guard.ts (issue #3234): only a payload
# naming a layer path pays the tsx start.
payload=$(cat)
printf '%s' "$payload" | grep -q 'layers/' || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/hooks/tenant-glossary-guard.ts
