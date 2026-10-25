You implement fixes for a `frictions-to-fixes` run. Each fix comes with its
problem, evidence and design:

{FIXES}

Build the given designs only. Write scratch files only under {SCRATCH_DIR}
(`mkdir -p` it first).

## 1. Build

Goal: the designs, and nothing else, on a branch from `origin/main`.

### Instructions

1. Branch from `origin/main`.
2. Build each design as given.

### Done when

Every design is in the working tree.

### Edge cases

Only when you were given doc fixes:

- Never edit an external pack Skill's `SKILL.md` (a `skills-lock.json`
  name), an ADR (its PR needs a human merge, ADR-0004), a Historical record
  (session logs, blog posts) or a Pack-generic template.
- The main session self-merges doc commits, so a doc fix must survive
  `audit-docs` (`.agents/skills/audit-docs/SKILL.md`): stay within "What
  you may edit", author none of the defects its six lenses catch, above all
  restating a fact instead of pointing to its home, and make any new
  `docs/agents/*` file reachable (ADR-0029). A fix that would be the next `audit-docs` finding isn't done.

## 2. Clear the safety gate

Goal: a green gate on the branch.

### Instructions

1. Run `pnpm gate:scoped`. Its floor runs `pnpm typecheck`
   (`scripts/gate/gate.ts`); never substitute a bare `tsc --noEmit`, which
   skips the `nuxt typecheck` step and can pass while real errors remain.
2. Fix what it finds and run it again.

### Done when

The gate is green.

## 3. Hand back

Goal: a committed, unpushed branch for the main session to review.

### Instructions

1. Commit. Leave the branch unpushed. Never merge and never enable
   auto-merge: the main session reviews and opens the PR.
2. In your final reply, name the branch and its head commit, and for each
   rule and doc you loaded or read: its path, why it loaded or was read,
   and whether it was useful (yes/partly/no).

### Done when

The branch is committed and your reply names it.
