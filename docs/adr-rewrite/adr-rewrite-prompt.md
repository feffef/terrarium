# Rewrite one ADR

You rewrite **ADR-{NNNN}** (`docs/adr/{file}`) in `/home/user/terrarium` into
the shape ADR-0030 sets. This is a test of this prompt: the core decision stays
the same and stays clear; details may go.

Your reader is an agent or reviewer asking "why is this so, and may I change
it?", then the owner keeping an overview.

Work read-only: read files, and run only `git log`, `git show`, `git blame` and
`grep`. Other agents rewrite other ADRs at the same time. Write exactly two
files, `docs/adr-rewrite/rewrites/{NNNN}.md` (the rewrite) and
`docs/adr-rewrite/rewrites/{NNNN}-report.md`. If a Write is refused, return
both files' full text in your final message instead.

## 1. Read

Read each in full with the Read tool:

- `docs/adr-rewrite/decisions.md`: the owner's answers. They override the
  sources.
- `docs/adr/0030-adrs-document-a-decision-not-its-history.md` and
  `docs/adr/TEMPLATE.md`: the format. ADR-0030's *Scope* is your spec.
- The target ADR and its summary rules, `.claude/rules/adr-{NNNN}*.md`.
- Every ADR it cites or that cites it:
  `grep -l "ADR-{NNNN}\|{NNNN}-" docs/adr/*`.
- `docs/adr-rewrite/expectations/{NNNN}.md`: what live code and docs need from
  this ADR, built without reading it. The raw references are in
  `docs/adr-rewrite/refs/{NNNN}.md`.
- The parts of `docs/adr-rewrite/background/session-log-usage.md` about this
  ADR: why agents opened it.

`CONTEXT.md` is the glossary; use it to read the sources.

## 2. Trace each part to its reason

Take every Decision bullet, section and amendment of the ADR. For each, find
why it was added: the amendment's text, `git log --follow -p` on the ADR, and
the PR or issue it names. Then check whether that reason still holds today,
against the code and against what ADR-0003, ADR-0004 and `CLAUDE.md` allow
now. Many ADRs were written when agents were allowed far less.

Each part ends in one outcome:

- **live:** what it allows or forbids still holds. It goes in the rewrite.
- **mechanics:** a number, procedure, command or file list. Name the file that
  enforces or holds it, and check that it does.
- **leftover:** its reason is gone, such as an older, stricter rule or a
  replaced mechanism. Drop it.
- **policy question:** it is unclear whether it still holds, and the answer
  changes what agents may do. The owner decides; give your recommendation.

A part can split. ADR-0003's ledger of jobs that may merge their own PRs was
added when that was the exception; now every agent merges its own, so the
ledger is a leftover. But the `visitor-loop` row also bounded what that run may
build, and that part is live, so it needs a home in the Skill.

Done when every part has an outcome and a one-line reason.

## 3. Map the callers

Give every item in the callers' checklist one outcome:

- **answered:** a live part covers it.
- **added:** a live decision only callers state, and still true in the code.
  Add it.
- **mechanics:** name its home, as in step 2.
- **fix the caller:** the caller is stale or wrong, or quotes or restates the
  ADR. It will point to the ADR instead. Give the edit.

How a caller words something never shapes the ADR's wording. Done when every
checklist item has an outcome.

## 4. Write the rewrite

Follow the template, heading included: `# ADR-{NNNN}: <title>`. A title that
states the decision beats one that names a topic.

- **Summary:** 2–3 sentences covering the whole decision.
- **Scope:** the live parts: what the decision covers, who may do what, and the
  exceptions that change that. Keep a detail only when a reader of some code or
  doc needs this ADR to understand it.
- **Why:** the reasons that still hold, briefly, with no story of PRs, sessions
  or dates. A decision that was simply the owner's call says so.
- **Rejected alternatives:** options the sources considered that someone could
  plausibly propose again today.
- **When to revisit:** only conditions the sources give.
- **Consequences:** only effects that aren't obvious.
- **See:** the homes of the mechanics, as pointers. The ADR never repeats a
  value they hold.

Plain language:

- Short sentences, one idea each, in plain, common words.
- Say what happens rather than name it. Use a glossary term only when no plain
  phrase is as clear, and then the glossary's own term. "The slow test steps",
  not "Heavy"; "a scheduled run", not "a chartered job".
- Coined phrases ("standing green-light", "the one relaxation") become what
  actually happens, however often callers quote them.
- Cross-references go at the end of a sentence or in *See*.

Aim for 40–70 lines. Then invoke the `writing-for-agents` Skill and prune
sentence by sentence.

Done when every live part is in the rewrite, no mechanic's value is repeated,
and a reviewer who reads only the summary and *Scope* knows what they may
change.

## 5. Draft the follow-ups

Draft these in the report. Apply none of them.

- **Summary rule:** the full new text of `.claude/rules/adr-{NNNN}.md`. It says
  when to read the ADR in full and gives its key actionable parts as
  instructions (ADR-0029). It decides nothing the ADR doesn't.
- **Caller edits:** file:line → the new text.
- **New homes:** for anything a Skill or doc relied on that left the ADR, the
  file and the text to add.
- **Other ADRs:** facts the rewrite states that another ADR owns, and whether
  that ADR agrees.

## 6. Report

Write `{NNNN}-report.md` with:

1. **Parts:** each part of the old ADR → outcome, reason, and where it went.
2. **Callers:** each checklist item → outcome.
3. **Follow-ups:** the drafts from step 5.
4. **Policy questions:** each with your recommendation.
5. **Split:** if the rewrite is over 70 lines, which decisions could become
   their own ADRs.
6. **Prompt friction:** where this prompt or the template was unclear or
   didn't fit.
7. **Lines:** old vs new.

Reply with the two paths and a five-line summary.
