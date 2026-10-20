You design the fixes for the frictions the `frictions-to-fixes` run picked:
{PICKS}
(each a Friction Ledger entry or a window friction, with its sessions and what
the survey found about it). You
design and assess only: file no issues, open no PRs, change no code. **Keep it
short** (CLAUDE.md) governs every design: prefer the fix a deletion makes over a
new mechanism. Write scratch files only under {SCRATCH_DIR}.

## For each pick

- **Read the full session log of every occurrence**
  (`layers/journal/content/*/sessions/*-<session>.yml`): each friction's
  `description` and `solution`, the session's `summary`, `docsRead` and
  `subagents`. Weigh the sessions' own `solution` proposals, but report only
  your design.
- **For a friction a doc already covers, check whether that session read the
  doc.** `docsRead` holds Read-tool opens plus any the author listed, and since
  2026-10-10 shell reads. On an older log a `cat`/`grep` read shows only in the
  deprecated `docsReadViaShell`, so check it before calling a doc *not opened*.
  This
  splits one question into two very different frictions: **doc not opened** ⇒ a
  *discoverability* failure — the rule's home is wrong, or prose is the wrong
  mechanism entirely; **doc opened and the friction happened anyway** ⇒ the
  prose itself is unclear, wrong, or too easy to read past. Report which, with
the paths as evidence. **"Opened" can mean a subagent opened it:** subagent reads are folded into the parent's list (`transcript-trace.ts`'s `foldSubagentTrace`), so on a session that delegated, check the `subagents` field before concluding the agent that hit the friction had the rule in front of it. A doc only a subagent opened is closer to *not opened*. Example (doc not opened): the #241/#425 fixes landed in `docs/agents/github-integration.md`, which the affected sessions had no reason to open; the friction recurred until a `PreToolUse` guard replaced the prose.
- **Before recommending "add a line to doc X", check that anyone reads doc X.**
  `pnpm exec tsx scripts/session/audit-skills.ts` (about 478 KB: redirect it to a file and read only `docReadCounts`) reports `docReadCounts` — path → how many
  of the windowed sessions opened it. A doc sitting at **0** is where a prose fix
  goes to die. Prune the instruction that caused it first (CLAUDE.md, "Keep it
  short"); failing that, recommend a mechanism that reaches the session (a
  `PreToolUse` guard, a gate check, a line in a doc sessions demonstrably open),
  or move the rule to a home that is read. **A read count corroborates, never
  carries, a finding** — `scripts/session/audit-skills.ts`'s `docReadCounts` docstring is
  the single home for why (three separate reasons it undercounts). Read it before
  citing a count.
- **Read the pick's `agentNotes`**: a solution an earlier run dropped comes
  back only with what has changed since, named in your report.
- **Explore the source** the fix would change, and any ADR that binds it
  (the `adr-check` Skill finds and reads them), until the design is concrete.
- **Off limits:** prose inside an open Prune Trial's territory
  (`.agents/prune-trials.yml`; ADR-0027), an external pack Skill's `SKILL.md` (a `skills-lock.json`
  name; ADR-0015), an ADR, a Historical record (session logs, blog posts) and a
  Pack-generic template. A doc fix must also clear `audit-docs`' house rules
  (`audit-docs/SKILL.md`).

## Report

Group picks that one change would retire. For each fix, return:

- **Problem**: the frictions it retires, quoted, with session ids and
  severities, and the doc-read finding where one applies.
- **Design**: one precise design: the files it touches, exactly what changes
  in each, and its size.
- **Risk**: whether it touches a Human-only file (the `paths` of
  `.claude/rules/adr-0004-human-merge.md`), a guard or `.claude/settings.json`'s
  hook wiring (`docs/agents/guards.md`), whether the diff would meet an ADR-0004
  exception (its *Scope* lists them), and whether it turns on an open design
  choice a human should make.
- **Recommendation**: dispatch, file as an issue, or no change (no repo
  change helps, or the fix costs more than the friction), with one line why.

Also return your own frictions from this run, naming each place this brief was
confusing or contradicted itself, and each step that was hard to follow with
this run's data.

Also return, for each rule and doc you loaded or read: its path, why it
loaded or was read, and whether it was useful (yes/partly/no).
