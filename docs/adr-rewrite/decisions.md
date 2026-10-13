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

From the grilling round at the end of the prep session:

- **Readers.** An ADR is written first for agents or reviewers asking "why is
  this so, and may I change it?", then for the owner keeping an overview.
- **Core of an ADR:** the decision, its Why and the rejected alternatives.
  Limits only where they define the decision. Agents often don't read the full
  ADR, so it is the wrong place to enforce limits and exceptions.
- **Where limits go.** Skills and docs hold the details. The summary rule
  makes agents aware of the ADR and gives the key instructions at the right
  moment, mainly for sessions not following a Skill; it names limits only where
  they are key to those instructions. A limit that leaves an ADR gets its home
  in a Skill or doc in the same PR.
- **Length.** 40–70 lines is a guide. Don't push splitting now. An ADR still
  longer after compacting says under *When to revisit* that it should be
  revisited (split) when the ADRs are reorganised.
- **Decision changes.** Obsolete leftovers of old, stricter rules go during the
  rewrite. Much of what looks like a behaviour change is such a leftover. A real
  policy question is decided by the owner, per ADR, in that ADR's PR.
- **First pass is 1:1.** No merging, splitting or retiring yet: doing both at
  once makes repointing the callers much harder.
- **Summary rules are rewritten** in the same PR as their ADR.
- **Callers are repointed** in the same PR as their ADR.
- **PR size:** 2–3 related ADRs per PR; each needs decisions, so a PR may take
  days.
- **Two generations side by side.** The heading shows which is which
  (`# ADR-0022: …` new, `# 22. …` old), and a gate check is to be built: an ADR
  with the new heading has no dates, status lines or amendment banners.
- **The exact workflow per PR** is decided in a fresh session.
- **This branch** (`claude/adr-rewrite-prep-b8fijv`, PR #1892) stays open and
  unmerged; it is the base for the next session.
