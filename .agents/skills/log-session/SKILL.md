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
**not** at session teardown: `SessionEnd` is only a fallback for a session `Stop`
never fired for (it fails silently on a network-freezing suspend, PR #148).

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

**Opening a gated PR is a closure point — log at that moment.** A session opens
its PR itself as soon as it has pushed a commit that is not a session log
(CLAUDE.md, Ground rules; ADR-0003), and that first push is exactly when to write this log.
Its `status` is then **`in-review`** — the PR is open but not merged — never
`completed`, which is reserved for work that actually landed (`close-session`
finalizes it on merge) or a session that needed no PR at all.

**The other three values, defined:** `partial` — some but not all of the goal
landed, and what shipped is usable on its own; `blocked` — stopped by something
outside the session's control (a missing permission, an unanswered question, a
broken external dependency) that could still let the goal resume later;
`abandoned` — deliberately dropped, with no intent to resume this goal. Pick
whichever actually describes what happened.

Re-invoking is cheap and safe: authoring merges with what you authored earlier
this session — lists (`frictions`, `prs`, …) union, prose takes your latest
wording — and the next live `Stop` (or, failing that, a `SessionEnd`/resume
fallback) lands the merged result. So if you call closure and then more work
happens, just **invoke again**.

**"Latest wording" means replace, verbatim, not append.** A re-invoke with `summary: "just fixed the CI flake"` makes that string the **entire summary**; it is not added to what you wrote before. Never pass a short delta or placeholder as `summary` (or `goal`/`outcome`) on a re-invoke: write the complete, current version of the field every time you set it, as if authoring it fresh.

**Merging only adds — it cannot remove or reword a friction you already
authored.** To correct one, delete `.session-logs/pending.scratch.json` first,
so the next pass starts fresh instead of merging against the mistake.

Be honest, **especially about friction** — a flattering log is worse than none.

## 1. Author the interpretive entry

Write a small YAML file (e.g. under your scratchpad) with **only** these fields —
the authored subset. Everything mechanical is derived; adding a derived field here
is ignored at best and rejected at worst.

```yaml
session: session_01H…              # this session's canonical id (see "Recovering the id")
kind: interactive                  # interactive | delegated | autonomous — see below
goal: Rethink session logs         # short headline — what the session worked on
status: in-review                  # completed | in-review | partial | blocked | abandoned
outcome: Mechanism built and tested # one-liner — nuance on status
summary: >-                        # the fuller narrative — sized to the session, see below
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
  - Auto-cluster recurring `ideas` entries into GitHub issues weekly, so an idea doesn't die in a YAML file no one re-reads
```

- **`kind` is the autonomy spectrum — judged by who prompted, not by what the
  session did.** The canonical definitions of `interactive` / `delegated` /
  `autonomous` (including what does *not* count as a human prompt) live in
  `CONTEXT.md` → **Session** — classify against that entry, not from memory.
  Kind is descriptive; it grants nothing (merge governance is ADR-0003's,
  unchanged by kind).
- **`learnings`/`ideas` are optional notes — leave them off unless the session
  genuinely produced one.** Don't pad them; an empty session log carries neither.
  Definitions live in `CONTEXT.md` → **Session** and **Idea** — don't restate them here.
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
- **`external` is not for our logs.** The schema's optional `external` boolean
  marks a log authored by a *different* harness/toolchain (an external
  contributor's own agent — ADR-0009 amendment, 2026-07-22) — see `CONTEXT.md`'s
  **Session** term for the absent-⇒-internal semantics and the mining-exclusion/
  ideas split. This authoring path doesn't set it.
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
- **Quote any scalar value containing `[`, `{`, `#`, or `,`**, the top-level `goal`/`outcome` strings as much as `path`/`reason` values. Unquoted, `[` or `{` starts a YAML flow sequence/map; `#` starts a YAML comment and truncates everything after it; `,` inside a flow map (`{ … }`) ends the current value early. Any of these silently mangles the entry instead of erroring. The `#` case (a bare `PR #354` truncating to `PR`) is caught: the `--author` step below rejects an unquoted-`#` truncation loudly and prints the value to quote.
- `goal` is a short, plain headline ("Weekly check of the Platform's own Skills",
  not "Run the scheduled audit-skills sweep: …"), `outcome` a one-liner; both for
  a stranger (name the thing, not "the issue"): they are the public dashboard's copy.
- **Size the `summary` to the session:** a few sentences for a single task,
  longer for a session that runs a whole workflow (e.g. building a Tenant across
  many PRs). Spend the words on what git history and PR descriptions can't tell a
  later reader: why a direction was chosen, what was tried and dropped, what
  surprised you, what's still open. Don't retell the diff.

**Recovering the id:** copy the `session_01…` at the end of the
`Claude-Session:` URL in your own system-prompt commit template — never from
`git log` (it holds other sessions' ids, issue #99). The lander overwrites this
field from ground truth whenever it can (issue #387), so it is only a fallback.

## 2. Write the scratch

Hand the authored YAML to the helper:

```
pnpm exec tsx scripts/log-session.ts --author <path-to-authored.yml>
```

It validates the interpretive fields and writes `.session-logs/pending.scratch.json`
(gitignored). That's all you do — the hook described above (the ADR-0009 boundary)
takes it from here, **only if** the scratch exists, which is why authoring it *is*
your "this session is done" signal.

The helper is gated code (ADR-0009): changing `log-session.ts` or `session-trace.ts`
is a normal PR.

## 3. Answer the reads report

`--author` lists every instruction doc the trace will fold into `docsRead`
that has no reason yet, whether the Read tool opened it or a Bash command's
output showed it (yours or a subagent's — folded in by design, issue #796),
with the evidence for each. Re-run `--author` with a `docsRead` entry for each
one: a one-line reason, or the reason `(not read)` when no command of this
session or its subagents showed you that doc. A later pass merges with the
first, so list only the new entries. ADR-0009's merged-read amendment says
what the stitch does with `(not read)`.

The report also lists docs a command named but did not show enough of to
count. ADR-0009's output-matching and merged-read amendments say what is
invisible by design. If one of them was a real read, log a Friction:
`severity` at least `moderate`, the marker `SHELL-READ-DETECTION`, the command
verbatim, and the path expected.
