---
name: log-session
description: Create **or update** this session's log entry — the authored half (goal, outcome, summary, and every friction); the mechanical trace (timings, models, tools, files read/edited, subagents) is derived automatically. Writes an authored scratch; a committed hook stitches it with the trace and commits it to the Journal, live. Usually invoked *by* `close-session` at closure.
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

**At closure, invoke `close-session`, not this Skill**; it judges closure and
calls this one.

**`status`:** `in-review` — PR open, not merged (never `completed` then);
`completed` — the work landed, or the session needed no PR; `partial` — some but not all of the goal landed,
and what shipped is usable on its own; `blocked` — stopped by something outside
the session's control (a missing permission, an unanswered question, a broken
external dependency) that could still let the goal resume later; `abandoned` —
deliberately dropped, with no intent to resume. Pick whichever actually
describes what happened.

Re-invoking is safe: lists (`frictions`, `prs`, …) union with what you authored
earlier this session, prose takes your latest wording, and the next live `Stop`
(or, failing that, the `SessionEnd`/resume fallback) lands the result. If more
work happens after closure, **invoke `close-session` again**.

**"Latest wording" means replace, not append.** On a re-invoke, write `summary`, `goal` and `outcome` whole and current, never a short delta or placeholder: `summary: "just fixed the CI flake"` becomes the **entire summary**.

**Merging only adds — it cannot remove or reword a friction you already
authored.** To correct one, delete `.session-logs/pending.scratch.json` first,
so the next pass starts fresh instead of merging against the mistake.

Be honest, **especially about friction** — a flattering log is worse than none.

## 1. Author the interpretive entry

Never filter `log-session.ts` output (`grep`, `head`): its refusals and warnings print there.

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
skillsUsed:                        # transcript-observed Skills you omit are folded in
  - { name: tdd, reason: "test-first the helper (see #99)" }  # (name cross-refs the Skill Inventory)
reported:                          # REQUIRED (may be []) — what changed or confirmed something you did (step 3)
  - { path: .claude/rules/adr-0004.md, value: changed, why: "ran gate:scoped before the PR" }  # why: optional, up to 8 words
  - { path: .claude/rules/adr-0003.md, value: confirmed }  # value: rules only, changed | confirmed | none | unsure
  - { path: docs/agents/pr-workflow.md }                   # docs take no value
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
  - `learnings` — a fact you read from a file is not a learning. Some things you'd log as a `nit` friction are better here —
    research/interactive sessions often end with learnings and no friction at all.
  - `ideas` — be creative and concrete: name the thing to build and why it's
    worth doing, so a later reader could file it as a GitHub issue without
    re-deriving your reasoning. A quick win and a big structural bet are equally
    welcome; "someone should look into X" is too vague.

- **Don't set `external`.** That optional boolean marks a log from a *different*
  harness (an outside contributor's own agent); absent means internal, and
  ADR-0009 says what it changes for mining.
- `skillsUsed` holds your **curated** picks (worth a `reason`); the extractor
  folds in the Skills you omit. `docsRead` is derived only: don't author it.
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
`Claude-Session:` URL in your own system-prompt commit template (a local session has no such
URL: use its raw UUID, `docs/agents/environment-caveats.md`) — never from
`git log` (it holds other sessions' ids, issue #99). The landing script overwrites this
field from ground truth whenever it can (issue #387), so it is only a fallback.

## 2. Write the scratch

First print the rules that loaded for you and the docs you read, to pick
`reported` from (step 3):

```
pnpm exec tsx scripts/session/log-session.ts --pending
```

Then hand the authored YAML to the helper:

```
pnpm exec tsx scripts/session/log-session.ts --author <path-to-authored.yml>
```

It validates the interpretive fields and writes `.session-logs/pending.scratch.json`
(gitignored). The hook lands it only if the scratch exists, so authoring it *is*
your "this session is done" signal.

## 3. Report what changed or confirmed something

`--pending`, and `--author` again, list the path-scoped rules that loaded for
you and the instruction docs you read. In `reported`, list those that changed
or confirmed something you did. Give each rule a `value`: `changed` if you did,
avoided or decided something differently because of it, `confirmed` if it
matched what you were already doing; you may also mark one `none` or `unsure`.
A doc takes no value. A rule or doc you leave out is "no claim", not
"unhelpful". Write `reported: []` when nothing applies. A subagent answers for
itself (the SubagentStart note), so don't collect its view.

Every pass is a full scratch with every field the schema requires. Its lists
merge with the earlier pass, so list only new entries, plus any `skillsUsed`
or `reported` entry you change, written whole (it replaces the one with the same
`name` or `path`). Repeat a friction word for word, severity included, or it
is logged twice.

The report also lists docs a command named but did not show enough of to
count; `scripts/session/shell-reads.ts`'s header lists what stays invisible. If one of them was a real read, log a Friction:
`severity` at least `moderate`, the marker `SHELL-READ-DETECTION`, the command
verbatim, and the path expected.
