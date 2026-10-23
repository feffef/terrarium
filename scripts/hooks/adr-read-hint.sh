#!/bin/sh
# Pre-filter for scripts/hooks/adr-read-hint.ts: only a `tool_input` naming an ADR, or a
# `file_path` under some ADR rule glob's first segment, pays the tsx start. It reads
# from the first "tool_input" key up to "tool_response", whose `originalFile` would
# match any file citing an ADR, and errs toward running tsx, which re-checks.
# tests/unit/adr-read-hint.spec.ts fails when a rule glob's first segment is missing.
payload=$(cat)
input=$(printf '%s' "$payload" | awk '!f && (i = index($0, "\"tool_input\"")) { $0 = substr($0, i); f = 1 }
  f && (j = index($0, "\"tool_response\"")) { print substr($0, 1, j - 1); exit } f')
file=$(printf '%s' "$input" | grep -oE '"file_path" *: *"([^"\\]|\\.)*"' | head -n1)
segs='\.agents|\.claude|\.githooks|\.github|app|deploy|docs|layers|modules|scripts|shared|tests|CLAUDE\.md|GLOSSARY(-MAP)?\.md|(content|nuxt|vitest)\.config\.ts|package\.json|skills-lock\.json|tsconfig\.node\.json'
printf '%s' "$input" | grep -qE 'ADR-[0-9]{4}|docs/adr/' ||
  printf '%s' "$file" | grep -qE "/($segs)(/|\"|\$)" || exit 0
printf '%s' "$payload" | node_modules/.bin/tsx scripts/hooks/adr-read-hint.ts
