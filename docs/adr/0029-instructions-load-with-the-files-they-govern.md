# ADR-0029: Instructions load with the files they govern

An instruction about certain files lives in a rule in `.claude/rules/`, which
Claude Code adds to the agent's context when it reads or edits those files.
Every ADR has a short summary rule that gives its key parts and says when to
read it in full. Instructions for every session, or for an action such as a
commit or a PR, stay in `CLAUDE.md`.

## Scope

- **Which home.** An instruction goes in a rule when a glob can match the
  files it is about. One that matters on an action, whatever files it touches,
  stays in `CLAUDE.md`. So does one that every session needs, unless it is an
  ADR summary.
- **ADR summary rules.** Every ADR has one, `adr-NNNN.md`, plus optional
  `adr-NNNN-<topic>.md` rules for one part of it. It says when to read the ADR
  in full and gives its key actionable parts as instructions, deciding nothing
  the ADR doesn't (ADR-0030). One rule holds a fact itself: the human-merge
  rule's `paths` are the Human-only list, and ADR-0004 says what belongs on
  it. It loads at
  session start only when the ADR binds every session; otherwise its `paths`
  list the files the ADR governs. When an ADR changes, the gate fails until
  its summary is re-checked.
- **Other rules** always have `paths`. A short instruction lives in the rule
  alone. A long one stays in its doc, and the rule states the goal and points
  there.
- **Every how-to doc in `docs/agents/`** is reached from `CLAUDE.md`'s
  read-first list or from a rule. Dated notes in `docs/research/` are not.
- **A rule reaches a Skill** by naming the Skill's folder in its `paths`.
- **Rules stay a few lines,** so broad `paths` are fine.
- **A rule says what to know, not when to act.** It arrives after the read or
  edit that loads it, so it can't order a step before that or make the agent
  read its source. Such steps stay in `CLAUDE.md`. A rule that loads at
  session start may say when to act.

## Why

Prose pointers such as "before you edit X, read Y" were skipped. A rule
arrives by itself, when the files matter.

Copies drift. A summary rule is the one deliberate copy of an ADR, kept honest
by the gate's re-check and by deciding nothing itself. Other rules hold their
instruction or point to it, so nothing needs syncing.

`CLAUDE.md` loads in every session, and no glob can match an action, so it
holds those instructions. With ADR summaries the only session-start rules,
each kind of instruction has one home.

## Rejected alternatives

- **Keep file-bound "read first" lines in `CLAUDE.md`.** Sessions skip them.
- **A session-start hook that prints the summaries.** Hook output is capped
  below what the summaries add up to.
- **A rule that imports its full ADR with `@`.** The import isn't expanded
  when a path-scoped rule loads, yet the imported file loads in every session.
- **Copy the ADR's text into its rule.** The owner's call: a rule summarises
  its ADR in its own words.

## Consequences

- When sessions miss a file-bound line in `CLAUDE.md`, the default fix is to
  move it into a rule.
- A plan often comes before any file is opened, so `CLAUDE.md` keeps the step
  to search `docs/adr/` before recommending a change.
- A rule that loads where it doesn't apply is logged as a Friction, so a
  too-broad glob gets narrowed.

## See

- `scripts/validate-adr-rules.ts`: the gate's checks on rules.
- `scripts/skill-rules-hint.ts`: adds a Skill's rules when it runs.
- `scripts/bash-rules-hint.ts`: which Bash reads load rules.
- `scripts/read-first-hint.ts`: points to a doc at a matching action.
- `.agents/skills/audit-docs/SKILL.md`: checks that `docs/agents/` is reached.
- `.agents/skills/log-session/SKILL.md`: logging an unrelated rule.
