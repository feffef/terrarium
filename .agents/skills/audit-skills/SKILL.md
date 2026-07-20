---
name: audit-skills
description: Tune the Skill Inventory to match real usage and watch for behavior regressions (usage AND friction-severity signals) after a Skill's SKILL.md changes — re-grade importance/role from session history, self-merging bright-line-evidenced Inventory edits. A suspected regression gets a full-log deep-read before any issue is filed/commented; a frontmatter concern rests as a learning/idea until it clears that bar — never a direct edit.
disable-model-invocation: true
---

# Audit Skills

Keep the **Skill Inventory** (`layers/journal/content/current/skills/`) honest
against how Skills are *actually used*, and watch whether a Skill's own recent
`SKILL.md` edits (yours, another human's, or `audit-docs`'s) actually changed
behavior for the better. This is a self-improvement maintenance Skill (sibling of
`digest`/`audit-docs`, ADR-0003/0015). A thin, tested helper
(`scripts/audit-skills.ts`) does the deterministic gathering; **you make every
judgement.**

> Runs via a scheduled Routine, same as `digest` — also runnable on demand.

Every run produces up to four things, only the first of which is ever a code
change:
- an **Inventory PR** — `importance`/`role` edits that cite the bright-line
  evidence rule (step 3) — **self-merged on a green gate** (step 7, ADR-0004's
  low-risk content tier, ADR-0015);
- a **filed or commented `needs-triage` issue** — for step 3's bright-line
  signal (≥2 sessions, citable evidence), or for a step 4 regression that
  survived a full-log deep-read — search first, comment on a match instead of
  re-filing (step 5);
- a **learning**, when the regression watch's initial screen (step 4) is
  suggestive but the deep-read didn't turn up enough to act on;
- an **idea**, when the evidence suggests a new Skill, or splitting/retiring an
  existing one (step 6) — concrete enough to become an issue, but not one you
  open yourself.

**Never edit `.agents/skills/` or any other doc for a semantic change** — a
Skill's description, role, or behavior. This Skill writes *only* Inventory
`.yml` entries and, per step 5's evidence bar, issues; a semantic edit is
`audit-docs`'s (drift/contradiction) and `frictions-to-fixes`'s
(friction-driven) surface, gated by human judgement. **Narrow exception — a
purely mechanical fix** (invalid YAML/frontmatter, a broken markdown fence, a
stale link, a zero-ambiguity typo) **may be proposed as a small,
clearly-labeled inline patch suggestion for direct human approval**, instead
of the full issue → later-session → branch → gate → PR round trip. Anything
carrying the slightest semantic ambiguity is not mechanical — file it per
step 5 instead.

## 1. Branch off `origin/main`

Branch off `origin/main` (CLAUDE.md's chartered-job branch convention — the
name doesn't matter, a caller-pinned designated branch takes precedence), so
the PR is independent of any work branch.

Done when you are on a fresh branch off the latest `origin/main`.

## 2. Gather the scorecard

```
pnpm exec tsx scripts/audit-skills.ts
```

It prints JSON:
- the **window** (the 40 newest sessions by `endedAt`, each with
  `kind`/`goal`/`summary`/`skillsUsed`, and `frictions` — that session's
  friction **severities only**, e.g. `["minor","blocker"]`, not the full
  description/solution text) and, per Skill, `onDisk`, `inventoried`,
  `external`, current `importance`/`role`/`observations` (prior runs' own
  citable findings — read them before judging; this step only ever appends to
  them, never edits or drops one), its SKILL.md `description`, and `usedIn`
  (every windowed session that invoked it). Pass `--window N` to widen/narrow.
- **`regressionChecks`** — for each of our own (non-external) Skills' single
  most recent `SKILL.md` edit commit, the ids of the sessions immediately
  before and after that commit's date (independent of the primary window
  above — an edit can be older than the newest 40 sessions). Resolve ids
  against **`regressionSessions`** — a deduped pool, since the same session
  commonly brackets more than one Skill's edit.
- **`orphanedSessions`** — every session id referenced by a `Claude-Session:`
  commit trailer on `origin/main` in the last `ORPHAN_WINDOW_DAYS` days (4,
  `scripts/audit-skills.ts`) (a calendar window, independent of the primary
  window above — the point is catching **zero**-log sessions, not recent ones)
  with **no** matching file anywhere in the sessions Collection (current or
  archived). Each entry carries the referencing commit sha(s) and date — a
  session that never invoked `close-session`/`log-session` at all (ADR-0009).
- **`humanPromptedClosures`** and **`manuallyRescuedClosures`** — the two
  *manual-nudge-closure* signals, the counterpart to `orphanedSessions` for
  sessions that DID log but only because a human nudged them (so the orphan
  check, which keys on a missing log file, can't see them). The first lists
  sessions whose own log flagged the `HUMAN-PROMPTED-CLOSURE` friction keyword
  (`close-session` mandates it when a human, not self-judgement, triggered the
  close). Two entries already recorded on that standing thread (#483) are
  suppressed via `DISMISSED_HUMAN_PROMPTED_CLOSURES` (issue #540), so a healthy
  future run won't re-show them — a genuinely new human-prompted closure still
  surfaces. The second catches the same regression from *timing* alone — a
  session whose closure (`endedAt`) landed more than `RESCUED_GAP_HOURS` after
  its last work commit on `origin/main` (`gapHours` is that delay) — the shape
  of the motivating orphan (session_019pNrz, #397; see
  `scripts/audit-skills.ts`'s `RESCUED_GAP_HOURS` comment for the timing this
  was tuned against) that idled before a human rescued its log. That exact
  session is now suppressed from this signal via
  `DISMISSED_MANUALLY_RESCUED_CLOSURES` once its fix (#411) landed, so a
  healthy future run won't show it — a genuinely new rescue will surface the
  same way. A session can appear in both, one, or neither.
- **`misclassifiedKind`** — sessions whose authored `kind` contradicts the
  `entrypoint: 'remote_trigger'` derived signal (a Routine/`/loop`-fired
  session implies `kind: autonomous` per CONTEXT.md's Session definitions —
  issue #449 Gap 2). Per #449's own spec this is a reporting/flagging finding,
  **not an auto-correction** — informational only, unlike the four signals in
  step 5 below. Note any flagged session in this run's own summary for
  awareness; no issue-filing is expected for it.
- **`skillSessionFiles`** — Skill name → session log file paths that named it,
  across **all** history (not windowed, not bracketed), capped per Skill at the
  newest `MAX_SKILL_SESSION_FILES` (40) for a very-high-usage Skill (issue
  #426) — cross-check `skillSessionFileTotals[name]` against this list's length
  to tell a capped list from an exhaustive one. Paths only. This is step 4's
  deep-read entry point, not something to read wholesale now.

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
- **Every grade change or `role` refresh gets an `observations` entry** —
  `{ date: <today, UTC>, note: <the citation — session ids, PR/issue numbers,
  usage counts> }`, appended (never overwriting an earlier entry, required on
  every entry — `[]` when there's nothing to cite yet). This is where the
  evidence for the change actually lives; `role` states the conclusion,
  `observations` carries the receipts. The rest of this doc's "append an
  observations entry" instructions (steps 4 and 6) reuse this same shape.
- **Create a missing entry** for any `onDisk && !inventoried` Skill you observed in
  use: `name` is the Skill's directory name; `category` is `general-engineering`
  when `external`, else `platform-operation`; write the `role` + grade from what the
  sessions show, plus an `observations` entry citing that evidence. Leave
  *never-observed* un-inventoried Skills alone (that coverage is other
  maintenance work).
- **The mirror case — `inventoried && !onDisk`** (a phantom entry: the Inventory
  points at a Skill directory that no longer exists). If the entry maps to a
  built-in CLI Skill invisible to the on-disk scan, **leave it and flag it**
  (note the mismatch in your run summary, don't touch the entry); otherwise
  **propose removing** the stale entry.
- **External (`external: true`) Skills are tuned too.** Their Inventory grade + role
  record their *fit to this project*, which drifts like any other — grading a pack
  Skill's importance-here is not *evolving the Skill*, so "used, not evolved here"
  holds. (Steps 4 and 5 differ for them — see there.)
- Refresh `role` when usage contradicts it. **Keep `role` ≤ ~50 words** (schema
  guideline): role + importance-to-project, not a copy of the Skill's own
  description. **`role` stays reference-free** — no PR/issue/session ids
  (ADR-0015 amendment); a citation belongs in `observations` instead (above).

Edit the `.yml` files in place. Done when every entry's grade + role matches the
evidence, and observed-but-un-inventoried Skills have entries.

## 4. Watch for behavior regressions after a Skill's own edits

**Phase A — cheap screen.** Read `regressionChecks`, resolving `before`/`after`
ids against `regressionSessions`. For each bracketed edit, compare the
`before`/`after` sessions': did the Skill fire where its kind of work
recurred, and **did friction severity/count look worse after** (more entries,
or a shift toward `moderate`/`major`/`blocker`)? This screen only catches
*usage-rate* and *coarse friction-count* shifts — it can't tell you the
frictions were actually about this Skill's edited guidance rather than
something unrelated, because it only has severities, not content. Treat a
signal here as **suspected, not confirmed**.

**Phase B — deep-read, only for a suspected Skill.** Before judging anything,
`Read` every file `skillSessionFiles[name]` lists — as much of that Skill's
usage history as the (possibly `MAX_SKILL_SESSION_FILES`-capped, see step 2)
list holds, not just the 5-session bracket — for the fullest record available:
full friction `description`/`solution` text, `outcome`, `status`, `summary`. This is what actually tells you whether the frictions are about
this Skill, and whether the edit plausibly caused them. Never skip straight
from Phase A's coarse signal to a judgement.

**Judging is a guideline, not a formula** — unlike step 3's bright-line rule,
there is no fixed session-count threshold here. Weigh what the deep-read
showed: do the post-edit frictions specifically implicate this Skill (not
coincidental, unrelated pain in the same sessions)? Is the pattern more than
one session's bad luck? Use judgement, but **always cite the specific evidence**
(session ids, quoted friction text) for whatever you conclude — a citation-free
"feels regressed" is not enough to act on, at any confidence level.

- **Confirmed enough to act on** → this Skill is a step-5 candidate, on equal
  footing with step 3's signal (see step 5). Also append an `observations`
  entry (step 3's shape) citing the edit, the sessions, and the quoted
  evidence — this is a citable finding same as a grade change, and it's what
  lets a *future* run's Phase A see this one without re-reading the full
  history.
- **Suggestive but not enough** → record it as this run's own `learnings` entry
  (CONTEXT.md → Session glossary) naming the edit, the sessions, and why you
  stopped short — a note for a future reader (or a future run's Phase A, which
  may catch the same Skill again with more evidence by then). Append the same
  note as an `observations` entry too, so it's not only in this run's own
  session log.
- **Inconclusive** → write nothing; most will land here, and that's fine.

Done when every Phase-A signal has gone through Phase B and landed in one of
the three buckets above.

## 5. File — or comment on — an issue

Four signals may originate a `needs-triage` issue, all requiring citable
evidence: **step 3's bright-line rule** (≥2 windowed sessions, absent from work
clearly in its domain — mechanical, objective), **step 4's regression watch,
after its Phase B deep-read** (judgement-based, but grounded in quoted evidence
from the full logs, not the Phase A screen alone), **step 2's
`orphanedSessions`** (mechanical, objective — a referenced session id with no
matching log file is itself the evidence; no further screen needed), and **step
2's closure-nudge signals `humanPromptedClosures` + `manuallyRescuedClosures`**
(mechanical, objective — the flagged session id, its keyword or its `gapHours`,
is itself the evidence). Phase A's regression screen on its own never reaches
this step — it must clear Phase B first; the step-2 signals have no such gate.
**`misclassifiedKind` (step 2) is not a fifth signal here** — per #449's own
spec it's informational only; a flagged session belongs in this run's summary
for awareness, not a filed issue.

**Step 3 and step 4 are for our own (`external: false`) Skills only.** A pack
Skill's SKILL.md is not ours to patch (ADR-0015) — for an under-used *external*
Skill, the only lever we own is its Inventory `role` (step 3).
`orphanedSessions` and the closure-nudge signals are not about any one Skill
(own or external) — they're closure/journal-completeness gaps, so this scoping
doesn't apply to them.

For each own Skill flagged by step 3 or 4, and for each `orphanedSessions` entry:
- **Search first** (`search_issues`, `is:issue is:open audit-skills <name>` for
  a Skill finding, or the session id for an orphan).
- **Found** — add a comment citing this run's fresh evidence. A concern that
  keeps recurring across runs is itself the strongest evidence it's real; that
  history belongs on one thread, not a pile of near-duplicate issues.
- **Not found** — file one `needs-triage` issue. For a Skill finding, name the
  session ids (and, for a step-4 finding, the quoted friction evidence) plus
  your best-guess hypothesis. For an orphan, name the session id, its
  commit(s), and date. `triage` picks up any issue regardless of source; you're
  not filing into a void.

**For the closure-nudge signals, track the trend on one thread, not one issue
per session.** They measure a *recurring* regression (agents not self-closing),
so a fresh session appearing is evidence to add to the standing thread, not a
reason to open a new issue each run: search for the open manual-nudge-closure
issue and comment this run's counts (which sessions carried the keyword, which
were rescued and by what `gapHours`); open one `needs-triage` issue only if none
is open. A run with empty `humanPromptedClosures` and `manuallyRescuedClosures`
files nothing — that's the healthy state.

Never patch `.agents/skills/` or any other doc yourself for a semantic
concern — file per above (the narrow mechanical-fix exception is at the top
of this doc, and doesn't apply here — a step-4 regression is never purely
mechanical).

Done when every step-3-, step-4-, `orphanedSessions`-, or closure-nudge-flagged
item has an issue filed or commented on.

## 6. Suggest new Skills or Skill splits/cuts, as ideas

When steps 3-5's evidence (or the shape of an existing Skill — grown large,
covering several distinct jobs, or genuinely no longer earning its keep) suggests
a new Skill would help, or an existing one should split or retire, **record it
as this run's own `ideas` entry** (CONTEXT.md → Session glossary — "ambitious,
concrete... specific enough that a later reader could turn it straight into a
GitHub issue, not a vague hunch"). Name the evidence, not just the hunch.

This Skill never creates, splits, or retires a Skill itself — that is net-new /
creative work and stays human-green-lit (ADR-0003's two-tier autonomy split).
`ideas` are read by future self-improvement Skills — this is a distinct
signal from step 5's issue, not a duplicate of it. When the idea concerns an
existing (`onDisk`) Skill, also append an `observations` entry on its `.yml`
naming the same evidence, so a future run sees it without re-reading this
run's session log.

Done when every credible new/split/retire signal from this run is captured as
an idea (most runs will have none — that's fine).

## 7. Clear the safety gate

Run `pnpm gate:scoped` (ADR-0004; CLAUDE.md's **Self-verification** section owns what
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
- **Subscribe to the PR's activity right after opening it** (CLAUDE.md's
  "Pushing is not landing" rule — every opened PR is babysat to merge/close,
  this tier included) and follow `docs/agents/pr-workflow.md`'s
  `enable_pr_auto_merge`-vs-`merge_pull_request` guidance to land it once the
  gate is green — the same
  landing path `digest`/`audit-docs` use (ADR-0004's low-risk content tier,
  ADR-0003/0015 — this Skill is the third name on that exemption list). A red
  gate simply never merges (see the escalation bullet below). Leave a
  one-line PR comment citing the evidence per change — the merge must never
  be the only trace.
- **Escalate instead — leave the PR open for a human** — if the gate is red for
  a reason that isn't yours, or the diff touches anything beyond Inventory YAML
  (a human-only surface, or step 4-6 output that slipped in by mistake).

**At PR-open, invoke `close-session`** — your first log (`in-review`).

Done when the gate is green and the PR is merged (by you), or open and honestly escalated.

**At the very end, invoke `log-session`** with the final `status` (`completed` once merged) and every friction from the run. (See `close-session` for when a session is actually logged.)
