---
name: log-session
description: Create **or update** this session's log entry — the authored half (goal, outcome, summary, and every friction); the mechanical trace (timings, models, tools, files read/edited, subagents) is derived automatically. Writes an authored scratch; a committed hook stitches it with the trace and commits it to the Journal, live. Usually invoked *by* `close-session` at closure, but callable directly to amend an already-written log.
---

Record one honest **session log** for this Claude session. You write only the
**interpretive** half: goal, outcome, summary, and every friction. A committed
hook derives the **mechanical** half (timings, models, tool counts, files read
and edited, subagents, branch) from the transcript and your own commits, so
**do not write it**. You
write a scratch file; the hook stitches the two and commits to `main`, live on
the `Stop` hook at the end of the turn you invoke this Skill in, not at session
teardown. `SessionEnd` is only a fallback for a session `Stop` never fired for
(it fails silently on a network-freezing suspend, PR #148).

## When to invoke

**At closure, invoke `close-session`, not this Skill.** It judges whether you
are wrapping up and runs the closing sequence, which calls this one. Invoke
`log-session` directly only to **update** a log you already authored (a new
friction, a changed outcome).

A log records the session at **Session closure** (GLOSSARY.md; self-judged, not
the same as merged): active work **complete and in a coherent, honest state**.

**Opening a gated PR is a closure point — log then** (ADR-0003 says when a PR
opens). Its `status` is `in-review` (PR open, not merged), never `completed`,
which is for work that landed (`close-session` finalizes it on merge) or a
session that needed no PR.

**The other three values, defined:** `partial` — some but not all of the goal
landed, and what shipped is usable on its own; `blocked` — stopped by something
outside the session's control (a missing permission, an unanswered question, a
broken external dependency) that could still let the goal resume later;
`abandoned` — deliberately dropped, with no intent to resume this goal. Pick
whichever actually describes what happened.

Re-invoking is safe: lists (`frictions`, `prs`, …) union with what you authored
earlier this session, prose takes your latest wording, and the next live `Stop`
(or, failing that, the `SessionEnd`/resume fallback) lands the result. If more
work happens after closure, **invoke again**.

**"Latest wording" means replace, not append.** On a re-invoke, write `summary`, `goal` and `outcome` whole and current, never a short delta or placeholder: `summary: "just fixed the CI flake"` becomes the **entire summary**.

**Merging only adds — it cannot remove or reword a friction you already
authored.** To correct one, delete `.session-logs/pending.scratch.json` first,
so the next pass starts fresh instead of merging against the mistake.

Be honest, **especially about friction** — a flattering log is worse than none.

## 1. Author the interpretive entry

Write a small YAML file (e.g. under your scratchpad) with **only** these authored
fields. A derived field (`startedAt`/`endedAt`, `durationSec`, `models`,
`toolCounts`, `filesEdited`, `subagents`, `gitBranch`, …) is ignored at best and
rejected at worst.

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
  - { path: GLOSSARY.md, reason: "glossary: Space vs Collection", useful: yes }  # useful: yes | partly | no
  - { path: "app/pages/t/[tenant]/[space]/[...slug].vue", reason: routing, useful: partly }
skillsUsed:                        # transcript-observed reads/Skills you omit are folded in
  - { name: tdd, reason: "test-first the helper (see #99)" }  # (name cross-refs the Skill Inventory)
ruleVerdicts:                      # every rule that loaded, yours or a subagent's (step 3)
  - { path: .claude/rules/adr-0004.md, reason: "Made me run gate:scoped before pushing; summary was enough, skipped the full ADR", useful: yes }
  - { path: .claude/rules/adr-0023.md, reason: "About guest PRs; this was a Trusted blog post, so it didn't apply", useful: no }
  - { path: .claude/rules/adr-0025.md, reason: "Only Triage #12 loaded it; it reported the rule confirmed queryPages was the right call", useful: yes }
frictions:                         # REQUIRED (may be []) — list EVERY friction
  - description: …                 # ~20 words, honest
    solution: …                    # the fix, or what would have helped
    severity: nit                  # nit < minor < moderate < major < blocker
learnings:                         # OPTIONAL — omit unless something sparked
  - Nuxt layer `~/` resolves to the main app, not the layer  # each a short string
ideas:                             # OPTIONAL — omit unless something sparked
  - Auto-cluster recurring `ideas` entries into GitHub issues weekly, so an idea doesn't die in a YAML file no one re-reads
```

- **`kind` is judged by who prompted, not by what the session did:**
  **interactive** (a human prompted again after kickoff), **delegated** (one
  human prompt, the kickoff) or **autonomous** (none: a schedule or another
  Session started it). Machinery prompts (a scheduled check-in, a webhook
  event, a hook reminder) are not human prompts. Kind grants no authority:
  what a Session may merge doesn't vary by kind.
- **Grade a friction's `severity` by what this instance cost,** not by how
  notorious its failure class is; recurrence is counted in the Friction Ledger,
  not by inflating severity. A mistake caught before landing (self-review, a
  guard working as designed) stays `nit` or `minor`. A few named frictions
  have a fixed grade, stated where they are used.
  - `nit`: an annoyance with no real cost.
  - `minor`: a contained papercut (extra steps, a few tokens) that didn't
    change the outcome.
  - `moderate`: cost real time or tokens, or forced a workaround, but the goal
    was reached.
  - `major`: derailed part of the session (a wrong turn undone, a redo) or
    degraded the outcome.
  - `blocker`: the goal couldn't proceed without a workaround or human help.
- **`learnings`/`ideas` are optional: add one only when the session genuinely
  produced it.** `GLOSSARY.md` → **Session** and **Idea** define them; don't restate them here.
  - `learnings` — a fact you read from a file is a `docsRead` entry, not a
    learning. Some things you'd log as a `nit` friction are better here —
    research/interactive sessions often end with learnings and no friction at all.
  - `ideas` — be creative and concrete: name the thing to build and why it's
    worth doing, so a later reader could file it as a GitHub issue without
    re-deriving your reasoning. A quick win and a big structural bet are equally
    welcome; "someone should look into X" is too vague.

- **Don't set `external`.** That optional boolean marks a log from a *different*
  harness (an outside contributor's own agent); absent means internal, and
  ADR-0009 says what it changes for mining.
- `docsRead`/`skillsUsed` are your **curated** picks (worth a `reason`); you need
  not list everything you touched, since the extractor folds observed reads in.
  A cited read keeps your `reason`; the rest get `(read before editing)` if you
  also edited that path, otherwise `(no reason given)`. A `docsRead` `reason`
  says briefly what the doc told you; `useful` says whether it helped. Step 3
  covers `ruleVerdicts`.
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
- **Quote any scalar containing `[`, `{`, `#` or `,`**: `goal`/`outcome` as much as `path`/`reason`. Unquoted, each silently mangles the value instead of erroring: `[` or `{` starts a flow sequence or map, `#` starts a comment that truncates it (a bare `PR #354` becomes `PR`; `--author` rejects this one and prints the value to quote), and `,` inside `{ … }` ends the value early.
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
pnpm exec tsx scripts/session/log-session.ts --author <path-to-authored.yml>
```

It validates the interpretive fields and writes `.session-logs/pending.scratch.json`
(gitignored). The hook lands it only if the scratch exists, so authoring it *is*
your "this session is done" signal.

## 3. Answer the reads report

`--author` lists every instruction doc you read (Read tool or a Bash command's
output) that has no reason and `useful` verdict yet, with the evidence for each.
Answer each with a `docsRead` entry: a
one-line reason and a `useful` verdict, or the reason `(not read)` when no
command of this session or its subagents showed you that doc. The stitch drops a `(not read)` entry, and logs a Friction
if shell output had credited it.

Give one verdict per rule and per doc for the whole session. For one a
subagent also loaded or read, take the verdicts from its final reply
(CLAUDE.md), merge its view with yours, and say in the `reason` what it
reported. The report lists each rule or doc only a subagent loaded or read that
has no verdict yet, a reminder, not a block: unanswered, it shows as "no verdict
provided".

It also lists every rule that loaded in this session with no `ruleVerdicts` entry,
including the always-loaded ones (no `paths`; they load at session start). You can't see this
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
one with the same `path` or `name`). An earlier `no` rule
verdict you leave out stands, and the report lists it to re-confirm or change. Repeat a friction word for word, severity
included, or it is logged twice.

The report also lists docs a command named but did not show enough of to
count; `scripts/session/shell-reads.ts`'s header lists what stays invisible. If one of them was a real read, log a Friction:
`severity` at least `moderate`, the marker `SHELL-READ-DETECTION`, the command
verbatim, and the path expected.
