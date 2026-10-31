You design the fixes for the picks of a `frictions-to-fixes` run. Each pick
is a Friction Ledger entry or a window Friction, with its sessions, what the
survey found about it and its entry's `notes`:

{PICKS}

You design and assess only: file no issues, open no PRs, change no code.
"Keep it short" (CLAUDE.md) governs every design: prefer the fix a deletion
makes over a new mechanism. Name `feffef/terrarium` in every GitHub read.
Write scratch files only under {SCRATCH_DIR}. Run §1 to §5 for each pick.

## 1. Read the evidence

Goal: the Friction understood from its own record before any design.

### Instructions

1. Read each occurrence's Friction (`description`, `solution`). Open its
   full session log,
   `layers/journal/content/*/sessions/*-session_<id>.yml` (`summary`,
   `docsRead`, `subagents`), only where needed.
2. Read the pick's `notes`: a solution an earlier run dropped comes back
   only with what has changed since, named in your report.

### Done when

You can say what causes the Friction.

### Edge cases

- Weigh the sessions' own `solution` proposals, but report only your
  design.

## 2. Check whether the doc was read

Goal: for a Friction a doc already covers, know which of two very different
failures it is.

### Instructions

1. Check whether the session that hit it read the doc: `docsRead` holds
   Read-tool opens, shell reads and any the author listed.
2. On a session that delegated, check its `subagents` field before
   concluding that the agent that hit the Friction had the rule in front
   of it: subagent reads are folded into the parent's list
   (`foldSubagentTrace` in `scripts/session/transcript-trace.ts`). A doc only a subagent
   opened is closer to *not opened*.
3. Name the failure:
   - **Doc not opened:** a discoverability failure. The rule's home is
     wrong, or prose is the wrong mechanism entirely.
   - **Doc opened and the Friction happened anyway:** the prose itself is
     unclear, wrong or too easy to read past.

### Done when

You can name which, with the paths as evidence.

## 3. Check whether anyone reads the doc you would change

Goal: no prose fix goes to a doc nobody opens.

### Instructions

1. Before recommending "add a line to doc X", run
   `pnpm exec tsx scripts/session/audit-skills.ts` with its output
   redirected to `{SCRATCH_DIR}/audit-skills.json` and read only `docReadCounts` (path → how many of
   the windowed sessions opened it).
2. A doc at **0** is where a prose fix goes to die. Prune the instruction
   that caused the Friction first (CLAUDE.md, "Keep it short"); failing
   that, recommend a mechanism that reaches the session (a `PreToolUse`
   guard, a gate check, a line in a doc sessions demonstrably open), or
   move the rule to a home that is read.

### Done when

You have checked the read count of every doc a design would change.

### Edge cases

- A read count corroborates, never carries, a finding. The `docReadCounts`
  docstring in `scripts/session/audit-skills.ts` is the single home for why
  (three separate reasons it undercounts); read it before citing a count.

## 4. Design the fix

Goal: one precise design per fix, concrete enough to build without a
question back.

### Instructions

1. Explore the source the fix would change, and the full ADR behind any
   summary rule that governs it, until the design is concrete: the files it
   touches, exactly what changes in each, and its size.
2. Keep the fix off these surfaces: prose inside an open Prune Trial's
   territory (`.agents/prune-trials.yml`; ADR-0027), an external pack
   Skill's `SKILL.md` (a `skills-lock.json` name; ADR-0015), an ADR, a
   Historical record (session logs, blog posts) and a Pack-generic
   template.
3. A doc fix must also survive `audit-docs`
   (`.agents/skills/audit-docs/SKILL.md`): it stays within "What you may
   edit" and authors none of the defects its six lenses catch.

### Done when

The design names its files, its changes and its size.

## 5. Assess the risk

Goal: the main session can decide dispatch, issue or drop from your call.

### Instructions

1. Say whether the fix touches a Human-only file (the `paths` of
   `.claude/rules/adr-0004-human-merge.md`), a guard or
   `.claude/settings.json`'s hook wiring (`docs/agents/guards.md`).
2. Say whether the diff would meet an ADR-0004 exception (its *Scope* lists
   them).
3. Say whether it turns on an open design choice a human should make.
4. Recommend **dispatch**, **file as an issue**, or **no change** (no repo
   change helps, or the fix costs more than the Friction), with one line
   why.

### Done when

Every fix has its answers to 1 to 3 and a recommendation.

## 6. Report

Group picks that one change would retire. For each fix, return:

- **Problem:** the Frictions it retires, quoted, with session ids and
  severities, and §2's doc-read finding where one applies.
- **Design:** §4's design: the files it touches, exactly what changes in
  each, and its size.
- **Risk:** §5's answers.
- **Recommendation:** dispatch, file as an issue, or no change, with one
  line why.

Also return your own Frictions from this run, naming each place this brief
was confusing or contradicted itself, and each step that was hard to follow
with this run's data; and, for each rule and doc you loaded or read: its
path, why it loaded or was read, and whether it was useful (yes/partly/no).
