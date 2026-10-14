---
# PROTOTYPE (ticket #1968)
title: A friction becomes a fix
description: How a pain-point one agent hits ends up changing the instructions every later agent works under.
---

# A friction becomes a fix

No human reads every session and fixes what went wrong. Instead, each session
reports its own pain-points, and a scheduled agent turns the recurring ones
into fixes. This Walkthrough follows one pain-point from the moment it happens
to the change that stops it happening again.

*Each stop tells only this story's part and links the Lesson that explains the
mechanism. Read the Lessons when you want the depth.*

## 1. An agent hits a Friction

A session wastes effort: a tool call is refused, a doc is wrong, a step is
missing. Before it ends, the session records each **Friction** with a
description, a possible solution and a severity, from `nit` to `blocker`, and
records every one, even nits.

→ Lesson: [Session logs](#) · Glossary: Friction

## 2. The log goes straight into the Journal

The session log is committed straight to `main`, without a PR, so the record
exists even when the session's own work never merges. It appears in the Journal
like any other page.

→ Lesson: [The Journal](#) · Why no PR: [ADR-0009](../../docs/adr/0009-session-logs-commit-directly-to-main.md)

## 3. A scheduled agent groups Frictions by cause

On a schedule, the `frictions-to-fixes` Skill reads recent session logs. It
files each Friction under an entry in the **Friction Ledger**, one entry per
root cause, so a problem that hit many sessions on different days counts as one
problem that recurs. Recurrence and severity together decide what gets fixed.

→ Lessons: [The Friction Ledger](#) · [Routines and Skills](#)

## 4. The fix: usually smaller, rarely new

The cheapest fix comes first. Terrarium prefers, in order:

1. **Cut or simplify** the instruction that caused the problem. A cut runs as a
   trial, and later sessions' Frictions are its verdict.
   → Lesson: [Test an instruction by removing it](#)
2. **Move it to where it's seen.** A line agents skipped in a doc they had no
   reason to open moves into a rule that loads with the files.
   → Lesson: [Path-scoped rules](./lesson-path-scoped-rules.md)
3. **Hold it mechanically.** When prose keeps failing, a guard refuses the
   tool call and its message says what to do instead.
   → Lesson: [Guards](#)

The fix lands as an ordinary PR and must pass the gate like any other change.

→ Lesson: [The gate](#)

## 5. The ledger closes the loop

When the fix merges, its ledger entry is marked fixed with the date. From then
on, only sessions that started after the fix count as recurrence. If the
Friction comes back, the entry shows it, and the next run tries a stronger fix.

## A real case

A session waited two hours for CI because it believed a pacing tool would wake
it; outside `/loop` that tool does nothing. The first fix was prose in a doc
([#241](https://github.com/feffef/terrarium/issues/241)). The Friction recurred:
sessions had no reason to open that doc. A guard now refuses the call outside
`/loop` and says what to use instead ([#814](https://github.com/feffef/terrarium/issues/814)).
Step 4's escalation, from prose to guard, in one story.

## Where next

- Lesson: [Path-scoped rules](./lesson-path-scoped-rules.md)
- Walkthrough: An idea becomes a merged PR (not drafted)
