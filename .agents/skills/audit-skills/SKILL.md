---
name: audit-skills
description: Tune the Skill Inventory to match real usage and watch for behavior regressions after a Skill's SKILL.md changes — re-grade importance/role from session history, self-merging bright-line-evidenced Inventory edits. Anything needing a doc/frontmatter change, or resting on softer evidence, becomes this run's own friction/learning/idea instead — never a direct edit.
disable-model-invocation: true
---

# Audit Skills

Keep the **Skill Inventory** (`layers/journal/content/current/skills/`) honest
against how Skills are *actually used*, and watch whether a Skill's own recent
`SKILL.md` edits (yours, another human's, or `audit-docs`'s) actually changed
behavior for the better. This is a `sync`-family maintenance Skill (sibling of
`digest`/`audit-docs`, ADR-0003/0015). A thin, tested helper
(`scripts/audit-skills.ts`) does the deterministic gathering; **you make every
judgement.**

> Runs via a scheduled Routine, same as `digest` — also runnable on demand.

Every run produces up to four things, only the first of which is ever a code
change:
- an **Inventory PR** — `importance`/`role` edits that cite the bright-line
  evidence rule (step 3) — **self-merged on a green gate** (step 7, ADR-0004's
  low-risk content tier, ADR-0015);
- a **friction** in this run's own session log, when a Skill's frontmatter or
  another doc genuinely looks like it needs to change (step 5) — never a direct
  edit and never an issue you file yourself;
- a **learning**, when the regression watch (step 4) turns up a plausible but
  low-confidence behavioral signal — a note for a future reader, not a verdict;
- an **idea**, when the evidence suggests a new Skill, or splitting/retiring an
  existing one (step 6) — concrete enough to become an issue, but not one you
  open yourself.

**Never edit `.agents/skills/` or any other doc.** This Skill writes *only*
Inventory `.yml` entries. A Skill's own `SKILL.md` and every other live doc are
`audit-docs`'s (drift/contradiction) and `frictions-to-fixes`'s (friction-driven
fixes) owned surfaces — you *refer*, via a friction in your own log (step 5),
you never patch them yourself.

## 1. Branch off `origin/main`

Branch `journal/audit-skills-<today-UTC>` off `origin/main` (CLAUDE.md's
chartered-job branch convention — a caller-pinned designated branch overrides
this default name), so the PR is independent of any work branch.

Done when you are on a fresh branch off the latest `origin/main`.

## 2. Gather the scorecard

```
pnpm exec tsx scripts/audit-skills.ts
```

It prints JSON:
- the **window** (the 40 newest sessions by `endedAt`, each with
  `kind`/`goal`/`summary`/`skillsUsed`) and, per Skill, `onDisk`, `inventoried`,
  `external`, current `importance`/`role`, its SKILL.md `description`, and
  `usedIn` (every windowed session that invoked it). Pass `--window N` to
  widen/narrow.
- **`regressionChecks`** — for each of our own (non-external) Skills' most
  recent `SKILL.md` edit commits, the sessions immediately before and after
  that commit's date (independent of the primary window above — an edit can be
  older than the newest 40 sessions).

Done when you hold the scorecard.

## 3. Re-grade importance and refresh role

`importance` is **conditional essentialness** — *never* raw frequency. The four
grades (`essential | specialist | supporting | peripheral`) are defined in
`CONTEXT.md` (the single home) — read them there. For each Skill, read `usedIn`
**and the `goal`/`summary`/`kind` of the sessions that used it** (and the sessions
that plausibly *should* have), then set the grade per those definitions.

**Rules:**
- **Rarity alone never lowers a grade.** A Skill unused only because *its kind of
  session did not occur* keeps its grade — frequency lives in the `role` prose, not
  the grade.
- **The bright-line evidence rule — symmetric for promote and demote:** a grade
  change is only ever justified by **≥2 windowed sessions of the kind the Skill
  serves where it was absent** (a demotion signal, also step 5's signal) or **≥2
  windowed sessions that clearly show it earning a higher grade** (a promotion
  signal) — cite the session ids either way. A `role` refresh is justified by
  plainly matching `usedIn`. **This citation is also what makes a change
  self-merge-eligible (step 7)** — a change you can't point at ≥2 session ids
  for doesn't belong in this PR (see step 4 instead).
- **Create a missing entry** for any `onDisk && !inventoried` Skill you observed in
  use: `name` is the Skill's directory name; `category` is `general-engineering`
  when `external`, else `platform-operation`; write the `role` + grade from what the
  sessions show. Leave *never-observed* un-inventoried Skills alone (that coverage is
  other `sync` work).
- **External (`external: true`) Skills are tuned too.** Their Inventory grade + role
  record their *fit to this project*, which drifts like any other — grading a pack
  Skill's importance-here is not *evolving the Skill*, so "used, not evolved here"
  holds. (Steps 4 and 5 differ for them — see there.)
- Refresh `role` when usage contradicts it. **Keep `role` ≤ ~50 words** (schema
  guideline): role + importance-to-project, not a copy of the Skill's own description.

Edit the `.yml` files in place. Done when every entry's grade + role matches the
evidence, and observed-but-un-inventoried Skills have entries.

## 4. Watch for behavior regressions after a Skill's own edits

Read `regressionChecks`. For each bracketed edit, compare the `before`/`after`
sessions' use of that Skill (did it fire in the sessions where its kind of work
recurred? did logged frictions involving it change?) and judge whether the edit
plausibly **helped, hurt, or is inconclusive**.

**This is a hypothesis, not a fact — always hedge it as one.** The brackets are
small (default 10 sessions a side) and confounded (other things changed too in
that window); this signal is deliberately *not* the bright-line rule step 3
uses, and it never gates a grade change on its own. If a bracket turns up a
credible concern (e.g. a Skill that fired reliably before an edit and not since,
in sessions that plausibly needed it), **record it as this run's own `learnings`
entry** (CONTEXT.md → Session glossary — "useful knowledge the session
inferred... a Friction's positive twin") for a future reader to weigh, alongside
which edit and sessions you're pointing at. Do not edit the Inventory or any doc
from this signal alone.

Done when every bracketed edit with a real signal either has a hedged
`learnings` note or was judged inconclusive (most will be — that's fine, say so
silently by not writing a note).

## 5. Note frontmatter/doc concerns as a friction, not an edit

A Skill that was **absent from ≥2 windowed sessions whose work was clearly in
its domain** (step 3's demotion signal), or a `regressionChecks` finding serious
enough to act on (step 4), probably means a `description` or other doc needs a
real edit — but that edit is not yours to make.

**This step is for our own (`external: false`) Skills only.** A pack Skill's
SKILL.md is not ours to patch (a re-install would clobber it, ADR-0005) — if an
*external* Skill looks under-used despite the opportunity, the only lever we own
is its Inventory `role` (already handled in step 3).

For each own opportunity-missed or regression-flagged Skill: **log it as a
friction in this run's own session log** — `description` (what looks wrong and
why), `solution` (your best-guess fix, e.g. "`description` likely mis-triggers,
reword to mention X"), `severity`. Do not file a GitHub issue yourself and do
not patch `.agents/skills/` or any other doc yourself.
`frictions-to-fixes` already mines the newest 20 session logs' frictions on its
own cycle (a Routine also fires it) and owns the file-issue → dispatch →
review-and-merge pipeline for exactly this surface (ADR-0003's mid-term
review-agent, author ≠ merger) — routing through it, instead of a second
issue-filing path, avoids two Skills contending for the same fix.

Done when every own opportunity-missed or regression-flagged Skill has a
friction logged (or was already logged in a very recent prior run — don't
duplicate a friction you already logged for the same Skill within the last few
runs).

## 6. Suggest new Skills or Skill splits/cuts, as ideas

When steps 3-5's evidence (or the shape of an existing Skill — grown large,
covering several distinct jobs, or genuinely no longer earning its keep) suggests
a new Skill would help, or an existing one should split or retire, **record it
as this run's own `ideas` entry** (CONTEXT.md → Session glossary — "ambitious,
concrete... specific enough that a later reader could turn it straight into a
GitHub issue, not a vague hunch"). Name the evidence, not just the hunch.

This Skill never creates, splits, or retires a Skill itself — that is net-new /
creative work and stays human-green-lit (ADR-0003's two-tier autonomy split).
`ideas` are read by the future `consolidate`/`codify` jobs, not
`frictions-to-fixes` — don't also log it as a friction.

Done when every credible new/split/retire signal from this run is captured as
an idea (most runs will have none — that's fine).

## 7. Clear the safety gate

Run `pnpm gate` (ADR-0004; CLAUDE.md's **Self-verification** section owns what
it runs). Done when it's green.

## 8. Commit, push, open the gated PR — self-merge Inventory-only changes on green

- **The PR must touch only `layers/journal/content/current/skills/*.yml`** —
  confirm with `git diff --stat` before pushing. Steps 4-6's friction/learning/idea
  live in this run's own session log, never in this PR's diff — keeping the two
  apart is what makes the self-merge check a trivial file-list comparison.
- **Every grade/role change in the diff must cite the step-3 bright-line rule**
  (≥2 session ids, either direction, or a plain `usedIn` match for a role
  refresh). A change riding on step 4's regression signal alone does not belong
  in this PR.
- Commit (one run rides one commit/PR), push with retry, and open **one gated
  PR** citing the evidence per entry.
- **Watch the gate** (`pull_request_read` `get_check_runs`) and, once green,
  **self-merge** with `merge_pull_request` — repo-level GitHub auto-merge is
  unavailable pending #231 (`CLAUDE.md`), so this session merges directly, the
  same fallback `digest`/`audit-docs` use (ADR-0004's low-risk content tier,
  ADR-0003/0015 — this Skill is the third name on that exemption list). Leave a
  one-line PR comment citing the evidence per change — the merge must never be
  the only trace.
- **Escalate instead — leave the PR open for a human** — if the gate is red for
  a reason that isn't yours, or the diff touches anything beyond Inventory YAML
  (a human-only surface, or step 4-6 output that slipped in by mistake).

Done when the gate is green and the PR is merged (by you), or open and honestly
escalated. Then invoke `close-session` — this run's own frictions/learnings/ideas
from steps 4-6 belong in its log.
