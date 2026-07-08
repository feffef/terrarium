---
name: log-session
description: Create **or update** this session's log entry — the authored half (goal, outcome, summary, and every friction); the mechanical trace (timings, models, tools, files read/edited, subagents) is derived automatically. Writes an authored scratch; a committed hook stitches it with the trace and commits it to the Journal, live. Usually invoked *by* `close-session` at closure, but callable directly to amend an already-written log.
---

Record one honest **session log** for this Claude session. You author only the
**interpretive** half — goal, outcome, summary, and every friction. The
**mechanical** half — exact timings, models, tool counts, files read/edited,
subagents, branch — is *derived from the transcript* by a committed hook, so
**do not write it** (ADR-0009 amendment). Authoring just writes a scratch file;
the hook stitches the two and commits to `main`. That commit normally happens
live, on the `Stop` hook at the end of the turn you invoke this Skill in —
**not** at session teardown: `SessionEnd` is only a fallback, kept because it
can still catch a session `Stop` never fired for, but it was demoted from
primary after PR #148 found it fails silently on a network-freezing suspend.

## When to invoke

**The normal front door is `close-session`, not this Skill directly.**
`close-session` owns the closure *trigger* (the "am I wrapping up?" judgment) and
runs the whole closing sequence, of which authoring this log is one step — invoke
that at closure and it calls this. Reach for `log-session` **directly** only to
**update** an already-authored log (a new friction, a changed outcome) after
you've closed.

Whichever way you arrive here, a log records the session at **closure** — its
active work **complete and in a coherent, honest state**. Closure does **not**
mean the PR is merged (it usually merges later, in another session): a log
honestly records an in-review PR.

**Opening a gated PR is a closure point — log at that moment.** A session that
committed substantive work opens its PR automatically when the work is coherent
(CLAUDE.md / ADR-0003), and that first push is exactly when to write this log.
Its `status` is then **`in-review`** — the PR is open but not merged — never
`completed`, which is reserved for work that actually landed (a later session
flips it to `completed` on merge) or a session that needed no PR at all.

Re-invoking is cheap and safe: authoring only rewrites the scratch, and the next
live `Stop` (or, failing that, a `SessionEnd`/resume fallback) overwrites the
single per-session log with a superset. So if you call closure and then more work happens, just
**invoke again** to refresh the scratch — the last landed state wins.

Be honest, **especially about friction** — a flattering log is worse than none.

## 1. Author the interpretive entry

Write a small YAML file (e.g. under your scratchpad) with **only** these fields —
the authored subset. Everything mechanical is derived; adding a derived field here
is ignored at best and rejected at worst.

```yaml
session: session_01H…              # this session's canonical id (see "Recovering the id")
kind: interactive                  # interactive | delegated | autonomous — see below
goal: Rethink session logs         # ≤ 8 words — what the session set out to do
status: in-review                  # completed | in-review | partial | blocked | abandoned
outcome: Mechanism built and tested # ≤ 8 words — nuance on status
summary: >-                        # ≤ 100 words — the fuller narrative
  What you set out to do and what actually happened.
prs: ["42"]                        # work-PR refs (in-review is fine); [] if none
docsRead:                          # OPTIONAL, curated — the docs that MATTERED, with why.
  - { path: CONTEXT.md, reason: domain model }   # transcript-observed reads you omit
  - { path: "app/pages/t/[tenant]/[space]/[...slug].vue", reason: routing }  # are folded
skillsUsed:                        # in automatically (name cross-refs the Skill Inventory),
  - { name: tdd, reason: "test-first the helper (see #99)" }  # deduped, uncited ones get (no reason given)
frictions:                         # REQUIRED (may be []) — list EVERY friction
  - description: …                 # ~20 words, honest
    solution: …                    # the fix, or what would have helped
    severity: nit                  # nit < minor < moderate < major < blocker
learnings:                         # OPTIONAL — omit unless something sparked
  - Nuxt layer `~/` resolves to the main app, not the layer  # each a short string
ideas:                             # OPTIONAL — omit unless something sparked
  - A consolidate job could cluster frictions into a tag taxonomy
```

- **`kind` is the autonomy spectrum, and the test is who prompted:**
  `interactive` — a human prompted again after kickoff (steered, answered,
  redirected); `delegated` — a human gave exactly **one** prompt, the kickoff,
  and no human prompt followed (such sessions typically run end to end,
  including merging their own PR); `autonomous` — no human prompt at all: fired
  by a Routine/schedule (a scheduled/cold job). Harness-injected user turns are
  **not** human prompts — a `send_later` self check-in, a PR webhook event, or a
  hook reminder arrives as a user message but doesn't make a session
  interactive.
- **`learnings`/`ideas` are optional sparks — leave them off unless the session
  genuinely produced one.** Don't pad them; an empty session log carries neither.
  - `learnings` — useful knowledge you *inferred during the work* that you neither
    knew up front nor read from the repo. A fact you read from a file is a
    `docsRead` entry, not a learning. Some things you'd log as a `nit` friction are
    better here — a learning is a friction's positive twin (what you gained, not
    where it hurt), and research/interactive sessions often end with learnings and
    no friction at all.
  - `ideas` — rough sparks for the Platform's or a Tenant's future: too nascent to
    be a GitHub issue, just something that might grow into a backlog item later.

- **Do NOT write** `startedAt`/`endedAt`, `durationSec`, `models`, `toolCounts`,
  `filesEdited`, `subagents`, `gitBranch`, … — all derived. This kills the old
  hand-estimated `startedAt` friction: the timestamps are now exact.
- `docsRead`/`skillsUsed` are your **curated** picks (the ones worth a `reason`).
  You don't have to list everything you touched — the extractor folds observed
  reads in. A read you *do* cite keeps your `reason`; the rest get a derived
  placeholder — `(read before editing)` if the same path was also edited (the
  Edit/Write tool requires reading it first, so that read wasn't unexplained,
  just uncited), otherwise `(no reason given)`.
- **frictions is the point.** List *every* one — anything that felt unnecessarily
  complex, token-heavy, or repetitive. A **doc contradiction found mid-session** is
  itself a friction: record it with a `solution` pointing at the single home to fix.
- **Quote any scalar value containing `[`, `{`, `#`, or `,`** — this applies to
  the top-level `goal`/`outcome` strings just as much as `path`/`reason` values.
  Unquoted, `[` or `{` starts a YAML flow sequence/map; `#` starts a YAML comment
  and truncates everything after it; `,` inside a flow map (`{ … }`) ends the
  current value early. Any of these silently mangles the entry instead of erroring.
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
(gitignored). That's all you do — the hook described above (the ADR-0009 boundary)
takes it from here, **only if** the scratch exists, which is why authoring it *is*
your "this session is done" signal.

The helper is gated code (ADR-0009): changing `log-session.ts` / `session-trace.ts`
/ `session-end.ts` is a normal PR.
