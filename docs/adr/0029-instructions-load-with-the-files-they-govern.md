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

PR #1741 rejected three alternatives. A SessionStart hook could not carry the
summaries: hook output is capped at 10,000 characters and they total about
12,000. `@`-importing the full ADR from a rule does not work either: the import
is not expanded when a path-scoped rule loads, yet the imported file loads at
every session start. Copying ADR text into rules was rejected by the owner: a
rule summarises its ADR in its own words.

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
  A non-ADR rule never copies its doc, so nothing needs syncing. It is named after that doc (`tenant-layers.md`) or, if it is the instruction's
  only home, after its topic.
- **Cross-cutting instructions stay in `CLAUDE.md`.** Only ADR summaries load at
  session start as rules, so each kind of instruction has one home.
- **Skills.** Invoking a Skill reads no file, so `scripts/skill-rules-hint.ts`
  injects every rule whose `paths` name `.agents/skills/<skill>/`.
- **A rule's `paths` can be a policy.** `adr-0004-human-merge.md`'s `paths` are
  the Human-only list that `scripts/merge-pr.ts` enforces.
- **Rules stay short, so `paths` can be generous.** A rule is a few lines, so
  loading it where it turns out irrelevant costs little; a broad glob is fine.
- **A rule says what to know, not when to act.** It arrives after the touch
  that loads it, as the text and its file path, without its `paths`. It may
  point to its source ("read the full ADR first"), but it cannot make the agent
  read it, and it cannot order steps ("before your first edit"); those stay in
  `CLAUDE.md`. Session-start ADR rules are the exception: they load before any
  action, so a rule like ADR-0003's or ADR-0009's can say when to act.

Claude Code sees a file touch through Read, Edit and Write, and through a Bash
command that is one simple read of one file (`cat`, `head`, `sed -n`, `grep`).
It misses piped, chained (`cd … && …`) and multi-file commands (tested in this
ADR's session). `CLAUDE.md` asks for the Read tool for that reason. Rules load
inside subagents too (PR #1741). Whether a Bash write loads one is untested.

## Consequences

- Moving an instruction out of `CLAUDE.md` into a rule is the default fix for a
  file-bound instruction that sessions miss. Each migration is its own PR, and
  each needs a human merge because `.claude/rules/**` is Human-only.
- Claude Code alone misses piped, chained and multi-file Bash reads. A
  fail-open `PostToolUse` hint on Bash, `scripts/bash-rules-hint.ts` (#1764),
  matches a command's file paths against rule `paths` the way
  `skill-rules-hint.ts` does for Skills.
- A plan or an opinion often comes before any file is opened, so `CLAUDE.md`
  keeps the step to grep `docs/adr/` before recommending a change.
- Action-bound instructions get their own delivery: a fail-open hint,
  `scripts/read-first-hint.ts` (#1754), points to the doc at the first matching
  action.
- Session logs record which path-scoped rules loaded (`rulesLoaded`) and whose
  ADR the agent then read (`rulesFollowedUp`), so a rule's reach can be
  estimated, not measured: an ADR read by a subagent does not credit the
  parent's rule, and Bash edits are missing from `filesEdited`.
- An agent logs a Friction when an unrelated rule confused it or cost it work
  (`log-session`), so a too-broad glob shows up and gets narrowed.
- Gate checks for non-ADR rules (they have `paths`; the doc they name exists)
  run in `scripts/validate-adr-rules.ts` (#1765).
- Making each ADR its own rule (issue #1745) was rejected in ADR-0030.
