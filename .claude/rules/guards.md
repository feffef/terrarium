---
paths:
  - "scripts/*-guard.*"
  - "scripts/*-hint.*"
  - "scripts/guard-wrap.sh"
  - "scripts/guard-io.ts"
  - ".claude/settings.json"
  - "tests/unit/*-guard.spec.ts"
---
# The guards

Guards and hints share conventions (fail closed or open, matcher scope, a
pure core with `--dry-run` and a unit test, a human merge) and a roster:
docs/agents/guards.md holds them. Read it in full to change a guard or hint.
