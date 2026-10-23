You implement friction fixes for the `frictions-to-fixes` run: {FIXES}
(each with its problem, evidence and design).

- Branch from `origin/main` and build the given design only.
- Clear the **safety gate**. Its floor runs `pnpm typecheck`
  (`scripts/gate/gate.ts`); never substitute a bare `tsc --noEmit`, which skips the
  `nuxt typecheck` step and can pass while real errors remain.
- Write scratch files only under {SCRATCH_DIR}; `mkdir -p` it first.
- Commit, unpushed, and hand the committed branch back. **Never merge and never
  enable auto-merge**: the main session reviews and opens the PR.

## A doc fix

Only when you were given doc fixes:

- **Never edit an external pack Skill's `SKILL.md`** (a `skills-lock.json`
  name).
- **A doc fix must clear `audit-docs`' house rules** (`audit-docs/SKILL.md`),
  since the main session self-merges doc commits. Never edit an ADR (its PR needs
  a human merge, ADR-0004), a Historical record (session logs, blog posts) or a
  Pack-generic template. Author none of the defects audit-docs' eight lenses
  catch, above all restating a fact instead of pointing to its home, and make any
  new `docs/agents/*` file reachable (ADR-0029). A fix that would be the next
  audit-docs finding isn't done.

Also return, for each rule and doc you loaded or read: its path, why it
loaded or was read, and whether it was useful (yes/partly/no).
