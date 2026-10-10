---
adr: f265a3cfb0e6
paths:
  - "content.config.ts"
  - "nuxt.config.ts"
  - "shared/expand.ts"
  - "shared/routing.ts"
  - "shared/kinds.ts"
  - "shared/manifest.ts"
  - "shared/schemas/**"
  - "modules/routing.ts"
  - "modules/catalog.ts"
  - "app/composables/catalog.ts"
  - ".github/workflows/**"
  - ".github/actions/gate/action.yml"
  - "docs/adr/**"
  - ".claude/rules/**"
  - ".claude/settings.json"
  - ".githooks/**"
  - "scripts/*-guard.ts"
  - "scripts/*-guard.sh"
  - "scripts/guard-io.ts"
  - "scripts/guard-wrap.sh"
  - "scripts/skill-rules-hint.ts"
  - "scripts/merge-pr.ts"
  - "scripts/trust.ts"
  - "scripts/gate.ts"
  - "package.json"
---
# ADR-0004: Files that need a human merge

You just touched a Human-only file: this rule's `paths` are the list. If your
PR changes one of them, a human merges it. Open the PR as usual and say in its
description that it waits for a human merge; `scripts/merge-pr.ts` refuses to
merge it. A Prune Trial may still merge its ADR rewrite with
`merge-pr.ts --prune-trial` (ADR-0027).
