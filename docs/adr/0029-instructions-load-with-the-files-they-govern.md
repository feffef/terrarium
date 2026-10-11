# 29. Instructions load with the files they govern, via `.claude/rules/`

Date: 2026-10-11
Status: Accepted

> Green-lit by a human in a `/grill-with-docs` session (ADR-0003). It records
> the decision PR #1741 made for ADRs and widens it to every file-bound
> instruction.

## Context

Agent instructions reached sessions through prose pointers: `CLAUDE.md`'s
"before you edit X, read Y" lines and "read every matching ADR in full". Sessions
skipped them, and many ADR bodies state the current rule only after several
amendment banners. PR #1741 gave each ADR a short summary in `.claude/rules/`,
which Claude Code injects into context by itself: a rule without `paths`
frontmatter at session start, a rule with `paths` when the agent touches a
matching file.

PR #1741 rejected two alternatives. A SessionStart hook could not carry the
summaries: hook output is capped at 10,000 characters and they total about
12,000. `@`-importing the full ADR from a rule does not work either: the import
is not expanded when a path-scoped rule loads, yet the imported file loads at
every session start.

Most of `CLAUDE.md`'s remaining "read first" triggers still name files
(`layers/<tenant>/`, `nuxt.config.ts`, guards, a Tenant's `CONTEXT.md`), so
they have the same problem the ADR summaries had.

## Decision

**A file-bound instruction lives in a path-scoped rule.** An instruction is
file-bound when a glob can match the files it is about: it matters when the
agent opens or edits those files. An instruction that matters on an action,
whatever files it touches (a git command, a PR, a Public issue), stays in
`CLAUDE.md`.

- **ADR rules.** Every ADR has a summary rule, `.claude/rules/adr-NNNN.md`, plus
  optional `adr-NNNN-<topic>.md` rules that scope one part of it. It loads at
  session start only when the ADR binds every session; otherwise its `paths`
  name the files the ADR governs. Its `adr:` hash makes the gate fail when the
  ADR changes until the summary is re-checked (`scripts/validate-adr-rules.ts`).
  ADR rules are the one deliberate copy of a fact: the ADR stays the home.
- **Other rules.** A non-ADR rule always has `paths`. A short instruction lives
  in the rule alone and is deleted from its doc; a long one stays in its
  `docs/agents/` doc, and the rule states its goal in a line and points there.
  It is named after that doc (`tenant-layers.md`) or, if it is the instruction's
  only home, after its topic.
- **Cross-cutting instructions stay in `CLAUDE.md`.** Only ADR summaries load at
  session start as rules, so each kind of instruction has one home.
- **Skills.** Invoking a Skill reads no file, so `scripts/skill-rules-hint.ts`
  injects every rule whose `paths` name `.agents/skills/<skill>/`.
- **A rule's `paths` can be a policy.** `adr-0004-human-merge.md`'s `paths` are
  the Human-only list that `scripts/merge-pr.ts` enforces.

Claude Code sees a file touch through Read, Edit and Write, and through a Bash
command that is one simple read of one file (`cat`, `head`, `sed -n`, `grep`).
It misses piped, chained (`cd … && …`) and multi-file commands (tested in this
ADR's session). `CLAUDE.md` asks for the Read tool for that reason.

## Consequences

- Moving an instruction out of `CLAUDE.md` into a rule is the default fix for a
  file-bound instruction that sessions miss. Each migration is its own PR, and
  each needs a human merge because `.claude/rules/**` is Human-only.
- Rules still miss compound Bash reads. A fail-open `PostToolUse` hint on Bash,
  matching a command's file paths against rule `paths` the way
  `skill-rules-hint.ts` does for Skills, should land before rules become the
  main home for non-ADR instructions.
- A plan or an opinion often comes before any file is opened, so `CLAUDE.md`
  keeps the step to grep `docs/adr/` before recommending a change.
- Session logs record which path-scoped rules loaded (`rulesLoaded`) and whose
  ADR the agent then read (`rulesFollowedUp`), so a rule's reach can be
  measured.
- Gate checks for non-ADR rules (they have `paths`; the doc they name exists)
  are a follow-up.
- Issue #1745 stays open as an alternative for ADR rules only: make each trimmed
  ADR its own rule and drop the summary copy.
