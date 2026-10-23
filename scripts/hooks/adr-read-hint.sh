#!/bin/sh
# Pre-filter for scripts/hooks/adr-read-hint.ts: only a payload naming an ADR, or a
# `file_path` under some ADR rule glob's first segment, pays the tsx start. It reads
# `file_path` after the first "tool_input" key, as scripts/hooks/bash-rules-hint.sh
# reads `command`, and errs toward running tsx, which re-checks.
# tests/unit/adr-read-hint.spec.ts fails when a rule glob's first segment is missing.
payload=$(cat)
file=$(printf '%s' "$payload" | awk '!f && (i = index($0, "\"tool_input\"")) { $0 = substr($0, i); f = 1 } f' |
  grep -oE '"file_path" *: *"([^"\\]|\\.)*"' | head -n1)
segs='\.agents|\.claude|\.githooks|\.github|app|deploy|docs|layers|modules|scripts|shared|tests|CLAUDE\.md|GLOSSARY(-MAP)?\.md|(content|nuxt|vitest)\.config\.ts|package\.json|skills-lock\.json|tsconfig\.node\.json'
printf '%s' "$payload" | grep -qE 'ADR-[0-9]{4}|docs/adr/' ||
  printf '%s' "$file" | grep -qE "/($segs)(/|\"|\$)" || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/hooks/adr-read-hint.ts
