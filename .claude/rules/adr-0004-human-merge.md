---
adr: 6674c5bec316
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
  - "scripts/hooks/**"
  - "scripts/gate/gate.ts"
  - "scripts/github/merge-pr.ts"
  - "scripts/lib/author-trust.ts"
  - "package.json"
---
# ADR-0004: Files that need a human merge

You just touched a Human-only file: this rule's `paths` are the list. If your
PR changes one of them, a human merges it. Open the PR as usual and say in its
description that it waits for a human merge; `scripts/github/merge-pr.ts` refuses to
merge it.
