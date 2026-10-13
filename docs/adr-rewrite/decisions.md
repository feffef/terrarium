# Decisions taken during the rewrite prep

Answers from the owner that the rewrites must follow. Newest last.

- **Setting up a Routine or `/loop` counts as starting a run** (ADR-0022): it is
  like starting it by hand.
- **Only people with write access can start a run.** A sentence guarding
  against "a run started by anyone else" protects nothing; drop it.
- **ADR-0003's job table goes.** With agents merging their own PRs, a table of
  which scheduled job may merge what is no longer needed. The "chartered job"
  idea goes with it, and so does the question of an `auto-triage` row.
- **Plain language over quoted wording.** Callers that quote an ADR get
  repointed to just point to it; they never shape its wording.
- **Glossary terms only when no plain phrase is as clear.** The glossary helps
  read the sources.
- **Detail may be lost** as long as the core decision stays clear. Decisions
  are stated as they apply today, not with the caution of when they were
  written.
