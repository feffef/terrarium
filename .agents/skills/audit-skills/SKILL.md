---
name: audit-skills
description: Tune the Skill Inventory to match real usage and watch for behavior regressions after a Skill's SKILL.md changes — re-grade importance/role from session history, self-merging bright-line-evidenced Inventory edits. A frontmatter concern with citable evidence gets a filed/commented issue; anything resting on softer evidence becomes this run's own learning/idea instead — never a direct edit.
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
- a **filed or commented `needs-triage` issue**, only for step 3's bright-line
  signal (≥2 sessions, citable evidence) — search first, comment on a match
  instead of re-filing (step 5);
- a **learning**, when the regression watch (step 4) turns up a plausible but
  low-confidence behavioral signal — never enough on its own to file or comment;
- an **idea**, when the evidence suggests a new Skill, or splitting/retiring an
  existing one (step 6) — concrete enough to become an issue, but not one you
  open yourself.

**Never edit `.agents/skills/` or any other doc.** This Skill writes *only*
Inventory `.yml` entries and, per step 5's evidence bar, issues — never a
Skill's `SKILL.md` or any other doc. That's `audit-docs`'s (drift/contradiction)
and `frictions-to-fixes`'s (friction-driven) surface.

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
- **`regressionChecks`** — for each of our own (non-external) Skills' single
  most recent `SKILL.md` edit commit, the ids of the sessions immediately
  before and after that commit's date (independent of the primary window
  above — an edit can be older than the newest 40 sessions). Resolve ids
  against **`regressionSessions`** — a deduped pool, since the same session
  commonly brackets more than one Skill's edit.

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

Read `regressionChecks`, resolving `before`/`after` ids against
`regressionSessions`. For each bracketed edit, compare the `before`/`after`
sessions' use of that Skill (did it fire in the sessions where its kind of work
recurred?) and judge whether the edit plausibly **helped, hurt, or is
inconclusive**.

**This is a hypothesis, not a fact, and it never files or comments on an issue
by itself — false positives here are cheap to make and expensive to act on.**
The brackets are small (5 sessions a side) and confounded (other things changed
too in that window); this signal is deliberately *not* the bright-line rule
step 3 uses, and it never gates a grade change either. If a bracket turns up a
credible concern, **record it as this run's own `learnings` entry** (CONTEXT.md
→ Session glossary — "useful knowledge the session inferred... a Friction's
positive twin") naming the edit and sessions — a note for a future reader, full
stop. The one exception is step 5: if this signal corroborates a concern that
already has an **open, bright-line-originated issue**, add a comment there
instead of a fresh `learnings` note.

Done when every bracketed edit with a real signal has a hedged `learnings` note
or a corroborating comment (step 5), or was judged inconclusive (most will be —
that's fine, say so silently by writing nothing).

## 5. File — or comment on — an issue for a frontmatter concern

Only **step 3's bright-line rule** (≥2 windowed sessions, absent from work
clearly in its domain) may **originate** a new issue — that's the one signal
here with citable, objective evidence. Step 4's regression watch alone never
originates one; it may only add a corroborating comment to an issue step 3
already opened (see step 4).

**This step is for our own (`external: false`) Skills only.** A pack Skill's
SKILL.md is not ours to patch (ADR-0005) — for an under-used *external* Skill,
the only lever we own is its Inventory `role` (step 3).

For each own Skill step 3 flags:
- **Search first** (`search_issues`, `is:issue is:open audit-skills <name>`).
- **Found** — add a comment citing this run's fresh evidence. A concern that
  keeps recurring across runs is itself the strongest evidence it's real; that
  history belongs on one thread, not a pile of near-duplicate issues.
- **Not found** — file one `needs-triage` issue naming the session ids as
  evidence and your best-guess hypothesis. `triage` picks up any issue
  regardless of source; you're not filing into a void.

Never patch `.agents/skills/` or any other doc yourself, and never file an
issue for step 4's signal alone.

Done when every step-3-flagged Skill has an issue filed or commented on (and
every step-4 corroboration that found a matching open issue is a comment, not
a new issue).

## 6. Suggest new Skills or Skill splits/cuts, as ideas

When steps 3-5's evidence (or the shape of an existing Skill — grown large,
covering several distinct jobs, or genuinely no longer earning its keep) suggests
a new Skill would help, or an existing one should split or retire, **record it
as this run's own `ideas` entry** (CONTEXT.md → Session glossary — "ambitious,
concrete... specific enough that a later reader could turn it straight into a
GitHub issue, not a vague hunch"). Name the evidence, not just the hunch.

This Skill never creates, splits, or retires a Skill itself — that is net-new /
creative work and stays human-green-lit (ADR-0003's two-tier autonomy split).
`ideas` are read by the future `consolidate`/`codify` jobs — this is a distinct
signal from step 5's issue, not a duplicate of it.

Done when every credible new/split/retire signal from this run is captured as
an idea (most runs will have none — that's fine).

## 7. Clear the safety gate

Run `pnpm gate` (ADR-0004; CLAUDE.md's **Self-verification** section owns what
it runs). Done when it's green.

## 8. Commit, push, open the gated PR — self-merge Inventory-only changes on green

- **The PR must touch only `layers/journal/content/current/skills/*.yml`** —
  confirm with `git diff --stat` before pushing. Step 5's issue and steps 4/6's
  learnings/ideas never ride in this PR's diff (an issue is on the tracker, not
  this repo; learnings/ideas belong in the session log) — keeping them apart is
  what makes the self-merge check a trivial file-list comparison.
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
escalated. Then invoke `close-session` — this run's own `learnings`/`ideas` from
steps 4 and 6 belong in its log, and its own frictions (if it hit any doing this
work) belong there too.
