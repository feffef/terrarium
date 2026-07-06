---
name: log-session
description: Record this Claude session's honest self-report when its work reaches closure. Invoke when the session's active work is complete and coherent — you author the goal/outcome/summary and every friction; the mechanical trace (timings, models, tools, files read/edited, subagents) is derived automatically. Writes an authored scratch; the SessionEnd hook stitches it with the trace and commits to the Journal.
---

Record one honest **session log** for this Claude session. You author only the
**interpretive** half — goal, outcome, summary, and every friction. The
**mechanical** half — exact timings, models, tool counts, files read/edited,
subagents, branch — is *derived from the transcript* by the `SessionEnd` hook, so
**do not write it** (ADR-0009 amendment). Authoring just writes a scratch file;
the hook stitches the two and commits to `main` at session end.

## When to invoke

Invoke when you judge the session has reached **closure** — its active work is
**complete and in a coherent, honest state**. Closure does **not** mean the PR is
merged (it usually merges later, in another session): a log honestly records an
in-review PR. **You decide this yourself** — no need to ask the user "are we
done?".

Re-invoking is cheap and safe: authoring only rewrites the scratch, and the
`SessionEnd` hook overwrites the single per-session log with a superset. So if you
call closure and then more work happens, just **invoke again** to refresh the
scratch — the last state before teardown wins.

Be honest, **especially about friction** — a flattering log is worse than none.

## 1. Author the interpretive entry

Write a small YAML file (e.g. under your scratchpad) with **only** these fields —
the authored subset. Everything mechanical is derived; adding a derived field here
is ignored at best and rejected at worst.

```yaml
session: session_01H…              # this session's canonical id (see "Recovering the id")
kind: interactive                  # interactive | autonomous (a scheduled/cold job)
goal: Rethink session logs         # ≤ 8 words — what the session set out to do
status: completed                  # completed | partial | blocked | abandoned
outcome: Mechanism built and tested # ≤ 8 words — nuance on status
summary: >-                        # ≤ 100 words — the fuller narrative
  What you set out to do and what actually happened.
prs: ["42"]                        # work-PR refs (in-review is fine); [] if none
docsRead:                          # OPTIONAL, curated — the docs that MATTERED, with why.
  - { path: CONTEXT.md, reason: domain model }   # transcript-observed reads you omit
  - { path: "app/pages/t/[tenant]/[space]/[...slug].vue", reason: routing }  # are folded
skillsUsed:                        # in automatically with a (unknown) reason, deduped.
  - { name: tdd, reason: test-first the helper }
frictions:                         # REQUIRED (may be []) — list EVERY friction
  - description: …                 # ~20 words, honest
    solution: …                    # the fix, or what would have helped
    severity: nit                  # nit < minor < moderate < major < blocker
```

- **Do NOT write** `startedAt`/`endedAt`, `durationSec`, `models`, `toolCounts`,
  `filesEdited`, `subagents`, `gitBranch`, … — all derived. This kills the old
  hand-estimated `startedAt` friction: the timestamps are now exact.
- `docsRead`/`skillsUsed` are your **curated** picks (the ones worth a `reason`).
  You don't have to list everything you touched — the extractor folds observed
  reads in. A read you *do* cite keeps your `reason`; the rest get `(unknown)`.
- **frictions is the point.** List *every* one — anything that felt unnecessarily
  complex, token-heavy, or repetitive. A **doc contradiction found mid-session** is
  itself a friction: record it with a `solution` pointing at the single home to fix.
- **Quote any `path`/value containing `[` or `{`** — unquoted it starts a YAML flow
  sequence/map and breaks the entry.
- Word limits are intent, not enforced — you hold them. Write `goal`/`outcome` for a
  stranger (name the thing, not "the issue"): they are the public dashboard's copy.

**Recovering the id:** read the canonical `session_01…` id from your **own
system-prompt instructions** — the commit-footer template (`… Claude-Session:
https://claude.ai/code/session_01…`) has it filled in; the `session_01…` after the
final `/` is the id verbatim. **Never** derive it from `git log` trailers (parallel
sessions commit constantly — the latest trailer is routinely another session's id;
issue #99), and **do not** use `CLAUDE_CODE_SESSION_ID` (a different UUID).

## 2. Write the scratch

Hand the authored YAML to the helper:

```
pnpm exec tsx scripts/log-session.ts --author <path-to-authored.yml>
```

It validates the interpretive fields and writes `.session-logs/pending.scratch.json`
(gitignored). That's all you do. At session teardown the committed `SessionEnd` hook
derives the mechanical trace, stitches it with your scratch, and commits the merged
log directly to `main` (the ADR-0009 boundary) — **only if** the scratch exists,
which is why authoring it *is* your "this session is done" signal.

The helper is gated code (ADR-0009): changing `log-session.ts` / `session-trace.ts`
/ `session-end.ts` is a normal PR.
