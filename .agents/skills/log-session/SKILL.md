---
name: log-session
description: Create **or update** this session's log entry — the authored half (goal, outcome, summary, and every friction); the mechanical trace (timings, models, tools, files read/edited, subagents) is derived automatically. Writes an authored scratch; a committed hook stitches it with the trace and commits it to the Journal, live. Usually invoked *by* `close-session` at closure, but callable directly to amend an already-written log.
---

Record one honest **session log** for this Claude session. You author only the
**interpretive** half — goal, outcome, summary, and every friction. The
**mechanical** half — exact timings, models, tool counts, files read/edited,
subagents, branch — is *derived from the transcript* by a committed hook, so
**do not write it**. Authoring just writes a scratch file;
the hook stitches the two and commits to `main`. That commit normally happens
live, on the `Stop` hook at the end of the turn you invoke this Skill in —
**not** at session teardown: `SessionEnd` is only a fallback for a session `Stop`
never fired for (it fails silently on a network-freezing suspend, PR #148).

## When to invoke

**The normal entry point is `close-session`, not this Skill directly.**
`close-session` owns the closure *trigger* (the "am I wrapping up?" judgment) and
runs the whole closing sequence, of which authoring this log is one step — invoke
that at closure and it calls this. Reach for `log-session` **directly** only to
**update** an already-authored log (a new friction, a changed outcome) after
you've closed.

Whichever way you arrive here, a log records the session at **Session closure**
(CONTEXT.md's glossary term — self-judged, not the same as merged) — its
active work **complete and in a coherent, honest state**. A log honestly
records an in-review PR when that's the state closure was reached in.

**Opening a gated PR is a closure point — log at that moment** (the ADR-0003
rule says when a PR opens).
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
docsRead:                          # curated — what each doc gave you, and whether it helped
  - { path: CONTEXT.md, reason: "glossary: Space vs Collection", useful: yes }  # useful: yes | partly | no
  - { path: "app/pages/t/[tenant]/[space]/[...slug].vue", reason: routing, useful: partly }
skillsUsed:                        # transcript-observed reads/Skills you omit are folded in
  - { name: tdd, reason: "test-first the helper (see #99)" }  # (name cross-refs the Skill Inventory)
ruleVerdicts:                      # every rule that loaded, always-loaded ones too (step 3)
  - { path: .claude/rules/adr-0004.md, reason: "Made me run gate:scoped before pushing; summary was enough, skipped the full ADR", useful: yes }
  - { path: .claude/rules/adr-0023.md, reason: "About guest PRs; this was a Trusted blog post, so it didn't apply", useful: no }
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
  `filesEdited`, `subagents`, `gitBranch`, … — all derived.
- **`external` is not for our logs.** The schema's optional `external` boolean
  marks a log authored by a *different* harness/toolchain (an external
  contributor's own agent, ADR-0009) — see `CONTEXT.md`'s
  **Session** term for the absent-⇒-internal semantics and the mining-exclusion/
  ideas split. This authoring path doesn't set it.
- `docsRead`/`skillsUsed` are your **curated** picks (the ones worth a `reason`).
  A `docsRead` `reason` says briefly what the doc told you; `useful` says
  whether that helped your task. Step 3 says what a `ruleVerdicts` entry says. You don't have to list
  everything you touched — the extractor folds observed reads in. A read you
  *do* cite keeps your `reason`; the rest get a derived placeholder —
  `(read before editing)` if the same path was also edited (the Edit/Write tool
  requires reading it first, so that read wasn't unexplained, just uncited),
  otherwise `(no reason given)`.
- **frictions is the point.** List *every* one — anything that felt unnecessarily
  complex, token-heavy, or repetitive. A **doc contradiction found mid-session** is
  itself a friction: record it with a `solution` pointing at the single home to fix.
  So is a **rule unrelated to your task** that confused you or cost you work
  (ADR-0029): name the `.claude/rules/` file, the file or Skill you were on when
  it appeared, and the narrower `paths` that would have spared you.
- **`summary` must state plainly which parts of the session's work were
  human-instructed (a direct ask, or an explicit green-light) versus
  agent-initiated** — don't leave that provenance to be inferred from context.
  ADR-0003's approval rule depends on
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
`git log` (it holds other sessions' ids, issue #99). The landing script overwrites this
field from ground truth whenever it can (issue #387), so it is only a fallback.

## 2. Write the scratch

Hand the authored YAML to the helper:

```
pnpm exec tsx scripts/log-session.ts --author <path-to-authored.yml>
```

It validates the interpretive fields and writes `.session-logs/pending.scratch.json`
(gitignored). That's all you do — the hook described above
takes it from here, **only if** the scratch exists, which is why authoring it *is*
your "this session is done" signal.

## 3. Answer the reads report

`--author` lists every instruction doc the trace will fold into `docsRead`
that has no reason and `useful` verdict yet, whether the Read tool opened it or
a Bash command's output showed it (yours or a subagent's — folded in by design,
issue #796), with the evidence for each. Answer each with a `docsRead` entry: a
one-line reason and a `useful` verdict, or the reason `(not read)` when no
command of this session or its subagents showed you that doc. The stitch drops a `(not read)` entry, and logs a Friction
if shell output had credited it.

It also lists every rule that loaded with no `ruleVerdicts` entry, including the
always-loaded ones (no `paths`; they load at session start). You can't see this
list before your first `--author` pass, so expect a second pass. Answer each with a `useful` verdict
and a one-sentence `reason` (about 20 words) that says why: for `yes` or
`partly`, what in the rule changed or confirmed something you did; for `no`,
why it didn't apply to this task, or what it got wrong. For a `yes` or `partly`
rule that points to a full ADR or doc, also say why you did or didn't open it
(the trace records whether): the summary was enough, or you needed a detail it
held. Don't restate the rule.

Every pass is a full scratch with every field the schema requires. Its lists
merge with the earlier pass, so list only new entries, plus any `docsRead`,
`skillsUsed` or `ruleVerdicts` entry you change, written whole (it replaces the
one with the same `path` or `name`). Repeat a friction word for word, severity
included, or it is logged twice.

The report also lists docs a command named but did not show enough of to
count; `scripts/shell-reads.ts`'s header lists what stays invisible. If one of them was a real read, log a Friction:
`severity` at least `moderate`, the marker `SHELL-READ-DETECTION`, the command
verbatim, and the path expected.
