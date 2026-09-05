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

Whichever way you arrive here, a log records the session at **Session closure**
(CONTEXT.md's glossary term — self-judged, not the same as merged) — its
active work **complete and in a coherent, honest state**. A log honestly
records an in-review PR when that's the state closure was reached in.

**Opening a gated PR is a closure point — log at that moment.** A session that
committed substantive work opens its PR automatically when the work is coherent
(CLAUDE.md / ADR-0003), and that first push is exactly when to write this log.
Its `status` is then **`in-review`** — the PR is open but not merged — never
`completed`, which is reserved for work that actually landed (a later session
flips it to `completed` on merge) or a session that needed no PR at all.

**The other three values, defined:** `partial` — some but not all of the goal
landed, and what shipped is usable on its own; `blocked` — stopped by something
outside the session's control (a missing permission, an unanswered question, a
broken external dependency) that could still let the goal resume later;
`abandoned` — deliberately dropped, with no intent to resume this goal. Pick
whichever actually describes what happened.

Re-invoking is cheap and safe: authoring merges with whatever you authored
earlier this session — `frictions` and `prs` union, `goal`/`status`/`outcome`/
`summary` take your latest wording — so a second pass for genuinely different
work no longer erases the first (issue #688). So if you call closure and then more work happens, just
**invoke again** to refresh the scratch — the next live `Stop` (or, failing
that, a `SessionEnd`/resume fallback) lands the merged result.

**The union only adds — it cannot remove or reword a friction or PR ref you
already authored.** To correct one (not just add to the list), delete
`.session-logs/pending.scratch.json` before re-authoring, so the next pass
starts fresh instead of merging against the mistake.

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
  - Auto-cluster recurring `ideas` entries into GitHub issues weekly, so a spark doesn't die in a YAML file no one re-reads
```

- **`kind` is the autonomy spectrum — judged by who prompted, not by what the
  session did.** The canonical definitions of `interactive` / `delegated` /
  `autonomous` (including what does *not* count as a human prompt) live in
  `CONTEXT.md` → **Session** — classify against that entry, not from memory.
  Kind is descriptive; it grants nothing (merge governance is ADR-0003's,
  unchanged by kind).
- **`learnings`/`ideas` are optional sparks — leave them off unless the session
  genuinely produced one.** Don't pad them; an empty session log carries neither.
  Definitions live in `CONTEXT.md` → **Session** — don't restate them here.
  - `learnings` — a fact you read from a file is a `docsRead` entry, not a
    learning. Some things you'd log as a `nit` friction are better here —
    research/interactive sessions often end with learnings and no friction at all.
  - `ideas` — be creative *and* be concrete: name the actual thing to build and
    say why it's worth doing — a fast tactical win and a big structural bet are
    equally welcome, but "someone should look into X" isn't specific enough.
    Write it so a later reader could turn it straight into a GitHub issue
    without having to re-derive your reasoning.

- **Do NOT write** `startedAt`/`endedAt`, `durationSec`, `models`, `toolCounts`,
  `filesEdited`, `subagents`, `gitBranch`, … — all derived (ADR-0009's amendment).
- **`external` is not for our logs.** The schema carries an optional `external`
  boolean marking a log authored by a *different* harness/toolchain (an external
  contributor's own agent — ADR-0009 amendment, 2026-07-22). Our Claude Code
  sessions **leave it absent** (absent ⇒ internal); this authoring path doesn't
  set it. It exists so an external log can flag itself, which excludes it from
  the self-improvement mining (`frictions-to-fixes`/`audit-skills`) while its
  `ideas` still surface in Sparks.
- `docsRead`/`skillsUsed` are your **curated** picks (the ones worth a `reason`).
  You don't have to list everything you touched — the extractor folds observed
  reads in. A read you *do* cite keeps your `reason`; the rest get a derived
  placeholder — `(read before editing)` if the same path was also edited (the
  Edit/Write tool requires reading it first, so that read wasn't unexplained,
  just uncited), otherwise `(no reason given)`.
- **frictions is the point.** List *every* one — anything that felt unnecessarily
  complex, token-heavy, or repetitive. A **doc contradiction found mid-session** is
  itself a friction: record it with a `solution` pointing at the single home to fix.
- **`summary` must state plainly which parts of the session's work were
  human-instructed (a direct ask, or an explicit green-light) versus
  agent-initiated** — don't leave that provenance to be inferred from context.
  ADR-0003's autonomy gate (net-new work needs a human green-light) depends on
  this being legible to a later reader, not reconstructed after the fact.
- **Quote any scalar value containing `[`, `{`, `#`, or `,`** — this applies to
  the top-level `goal`/`outcome` strings just as much as `path`/`reason` values.
  Unquoted, `[` or `{` starts a YAML flow sequence/map; `#` starts a YAML comment
  and truncates everything after it; `,` inside a flow map (`{ … }`) ends the
  current value early. Any of these silently mangles the entry instead of erroring.
  The `#` case (a bare `PR #354` truncating to `PR`) is now caught: the `--author`
  step below rejects an unquoted-`#` truncation loudly and prints the value to
  quote — but quote up front and you never see it.
- Word limits are intent, not enforced — you hold them. Write `goal`/`outcome` for a
  stranger (name the thing, not "the issue"): they are the public dashboard's copy.

**Recovering the id:** read the canonical `session_01…` id from your **own
system-prompt instructions** — the commit-footer template (`… Claude-Session:
https://claude.ai/code/session_01…`) has it filled in; the `session_01…` after the
final `/` is the id verbatim. **Never** derive it from `git log` trailers (parallel
sessions commit constantly — the latest trailer is routinely another session's id;
issue #99), and **do not** use `CLAUDE_CODE_SESSION_ID` in a CCR/cloud session — it's
a different, non-canonical UUID there (the local CLI transcript's own internal id,
distinct from the CCR-level id this Skill's footer needs). The one exception: a
plain local CLI session with no CCR wrapper has no *other* id to disagree with it,
so there `CLAUDE_CODE_SESSION_ID` genuinely is canonical — see the note below.

**This field is now a fallback, not the source of truth (issue #387/#449).**
`scripts/session-end.ts`'s stitch resolves the ground-truth id itself and
that resolved value always wins over whatever `session:` you typed here — a
wrong typed value can no longer land a mis-filed log, it just gets silently
corrected. Still type it correctly when you can: the two normally agree, and
this field is the only thing used if ground-truth resolution finds nothing.

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

## 3. Check the shell-read report

`--author` prints what the shell-read detector found: the instruction docs it
believes a `cat`/`sed`/`grep` command showed you (`docsReadViaShell`), and the
candidates it *rejected* with the rule that rejected each. Read both lists
against the session you just lived through: a rejected command that really did
show you the file is a **miss**. (ADR-0009's shell-read amendment says why the
rejects are printed at all.)

**You cannot correct the field** — it is derived, and an authored
`docsReadViaShell` is refused by name. A wrong result is reported as a Friction
instead, and the extractor is young enough that this is expected rather than
exceptional:

- `severity` **at least `moderate`** — a deliberate floor, not a cost judgement
  (ADR-0009's shell-read amendment says why).
- `description` contains the marker **`SHELL-READ-DETECTION`**, plus the
  **command verbatim**, the **path** expected, and the **direction** — a miss or
  a false positive. A Friction saying "detection looked off" can't drive a fix.

Nothing to report when both lists are right, and nothing prints when both are
empty.
