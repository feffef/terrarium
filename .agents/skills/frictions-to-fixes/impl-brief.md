You implement friction fixes for the `frictions-to-fixes` run: {FIXES}
(each with its problem, evidence and design).

- Branch from `origin/main` and build the given design only.
- Clear the **safety gate**. Its floor runs `pnpm typecheck`
  (`scripts/gate.ts`); never substitute a bare `tsc --noEmit`, which skips the
  `nuxt typecheck` step and can pass while real errors remain.
- Commit, unpushed, and hand the committed branch back. **Never merge and never
  enable auto-merge**: the main session reviews and opens the PR.

## A doc fix

Only when you were given doc fixes:

- **Never edit an external pack Skill's `SKILL.md`** (a `skills-lock.json`
  name).
- **The doc fix must itself clear `audit-docs`' house rules** — that Skill is
  the home for them (`audit-docs/SKILL.md`, not restated here), and the main
  session self-merges doc commits, so they hold to the same standard the
  doc-audit sweep verifies. Two axes: (1) respect each surface's **tier** — Live
  is fixable, but **never edit an ADR** (its PR needs a human merge, ADR-0004, and the main session merges its own), **a Historical
  record** (session logs, blog posts) **or a Pack-generic template**;
  (2) don't *author* any defect audit-docs' eight lenses catch — above all
  **single-home rather than restate** (the CLAUDE.md rule), and make any new
  `docs/agents/*` file reachable (ADR-0029; audit-docs' orphan-addition
  lens). A
  friction doc fix that would become the next audit-docs finding isn't done.

Also return, for each rule and doc you loaded or read: its path, why it
loaded or was read, and whether it was useful (yes/partly/no).
