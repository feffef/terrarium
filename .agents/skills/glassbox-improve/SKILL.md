---
name: glassbox-improve
description: "Raise the Glass Box guide lens by lens: scripted checks, sonnet lens raters on the pages that changed, a researcher who confirms every finding, and a blind gate on every edit; elects A per lens and self-merges one PR."
disable-model-invocation: true
---

# glassbox-improve

Each run lifts the guide one lens at a time (QUALITY.md, Lenses) and measures
whether its edits helped. Scripts do the counting; the lead dispatches agents
and decides only what a script can't. A provable false claim is fixed the same
run, a confirmed finding on the weakest lens next, and no edit lands unless
blind judges prefer it to the page it replaces.

Read first: `layers/glassbox/GLOSSARY.md` (page shapes),
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md),
[`../glassbox-lesson/QUALITY.md`](../glassbox-lesson/QUALITY.md) (the lenses,
the grades, the A rule, and how to raise a page),
[`../glassbox-lesson/DECISIONS.md`](../glassbox-lesson/DECISIONS.md) (closed
rulings) and `dispatch-subagents` (every brief below follows it). Subagents
read committed files at the base with `git show <base>:<path>`, which can't
follow the `.claude/skills/<name>` link, so write every Skill path in a brief
as `.agents/skills/...`.

[`scripts/grades.ts`](scripts/grades.ts) does the counting; its header gives
each command. It writes the run's state to `run.yml` in the scratch folder
(`--out`), and at the end [`grades.yml`](grades.yml) (each page's lens grades,
the structural steps and the backlog of findings the cap skipped) and
[`runs.yml`](runs.yml) (the last 10 runs' metrics and detail). Never edit
either file by hand. A v2 `grades.yml` (no
`version: 3`) reads as empty, so the first v3 run reads every page once and
its waiting candidates become steps.

Every agent below runs on `sonnet`, except writers on `opus`.

## Remit

The run changes only `layers/glassbox/content/`, the diagram SVGs it
re-renders in `app/assets/mermaid/`, `grades.yml` and `runs.yml`, and lands
one PR titled `glassbox-improve: <YYYY-MM-DD>`, even when only those two files
changed. It fixes every confirmed false claim with the smallest correction,
works the confirmed findings, and takes every confirmed structural step the
churn guard allows (promote a draft, write a Lesson, or merge, split, move,
cut or section pages inside the existing Subjects). Out of remit: a new
Subject or diagram, moving a page to another Subject, and any change to this
Skill, the `glassbox-lesson` docs or the page checks; step 10 files them.

**Dispatch names.** Start each `Agent` description with its phase: `Rater`,
`Research`, `Write`, `Gate judge`, `A judge` or `Code review`. `record` groups
the run's cost by that prefix.

Save every subagent reply, a resumed one's too, with
`pnpm exec tsx scripts/session/save-handback.ts <agent-id> <file> [<agent-id> <file> ...]`
in this run's scratch folder, one call per round, and work only from those files.

## 1. Set up

If a PR titled `glassbox-update:` or `glassbox-improve:` is open, stop: invoke
`close-session` as `blocked`, naming it. Otherwise, on the session's designated
branch (with none, `glassbox-improve/<YYYY-MM-DD>-<HHMM>` in UTC), start from a
fresh `origin/main` and note that commit as **the base**. Save
`grades.ts plan --base <base> --briefs <scratch folder>` to the scratch
folder: it lists the pages raters A and C read (those whose text or cited
files changed since their last read, plus the rotation, so every page is read
at least every 3 runs, plus each page that won its A comparisons last run),
says whether Relevance is rated this run, and writes
each rater's filled brief. Also list the guide pages any other open PR
touches: the run edits those only to fix a confirmed false claim. Done when
both are saved.

## 2. Rate

Dispatch, **in one message**, one agent per brief `plan` wrote, each told to
follow its `rater-brief-<name>.md`: rater A (Clarity, Reasoning), rater B
(Placement on every page, Relevance when due, and the structural steps) and
one rater C per claim-check shard (`C1`, `C2`…: Evidence, Transfer and the
full claim check). Done when every hand-back is saved and `grades.ts tally`
accepts them; on a parse error, fix only the line it names in the saved
hand-back. Resume a stalled rater once with `SendMessage`; if it still
returns nothing, dispatch a fresh one with the same brief and log a Friction.

## 3. Tally

Run `grades.ts tally --base <base> --out <scratch folder> <every hand-back>`.
It adds the page checks' findings (`layers/glassbox/page-checks.ts`) and
prints the work in order: false claims, page checks, deficits weakest page
first, then gaps; the steps queue, with each inverse of a step taken in the
last 5 runs refused; and the A comparisons, at most 4. A run takes at most
`workPerRun` items and steps together (false claims and page checks, then
pending steps, then deficits and gaps): the rest is marked `skipped` or shown
as deferred. This keeps a run's cost bounded; do not add to the list. A finding
the cap skips waits unresearched in the backlog of `grades.yml`, so it never
changes a grade. `tally` brings back the entries on pages no rater read again
(marked `[backlog, found …]`) among the items; a page a rater reads again
replaces its entries with fresh findings. Then, in `run.yml`:

- **Filters.** Mark `skipped` with its reason every item a `DECISIONS.md` line
  settles, and every fix that would undo a change from the last 2 runs unless
  that change made the page false (read those runs in `runs.yml` and, for a
  title or link, `git log -p origin/main -- <page>`). A dropped undo becomes a
  proposed `DECISIONS.md` line.
- **Steps.** A step that touches a page another step takes waits (leave it
  `pending`); a draft that needs about half its lines changed is not promoted
  (mark it `dropped`, and it becomes an idea).

Done when every item and step is kept or has its reason.

## 4. Research

Run `grades.ts briefs --kind researcher --base <base> --out <scratch folder>`
(one brief per Subject of the kept items and per pending step), save each
hand-back as `research-<name>.md` beside its brief, and dispatch read-only
researchers on them. Each confirms every item in the source or refuses it with proof. In `run.yml`, set
each item's `confirmed` to `true` or `false` and each step's `status` to
`taken` or `dropped`. An item a researcher refuses is dropped, and a deficit it
refuses counts as B; a contradicted claim a researcher finds is added as a
false claim once you confirm it. Done when every
kept item and pending step has its answer.

## 5. Write

Run `grades.ts briefs --kind writer --base <base> --out <scratch folder>`
(one brief per taken step and per Subject of the other confirmed items), then
dispatch one `opus` writer per brief, each with `isolation: 'worktree'`. A page a step touches belongs to that
step's writer. Fix a false claim on a page no writer holds, or whose writer
dropped out, yourself after step 6's merges. Done when every hand-back is
saved and each writer has a commit that passes EVERY-PAGE's Check, or refused
or stopped with its reason; set `edited: true` on each item a commit fixed.
Drop a refused or stopped item, and remove its worktree
(`git worktree remove --force <path>`).

## 6. Integrate

Merge each writer's branch into the run branch; never cherry-pick or squash,
which orphans the writers' commits and fails `pnpm check:worktrees`. Then make
the **join edits** the writers reported, on any page: link text after a
retitle, Walkthrough chips and Where next entries. When two writers' branches
add the same Term id, keep one file. Add a link only where its list has room,
replace only a link that broke or was retitled, and keep each list's order. Pin
each page you edit yourself to the base. Done when EVERY-PAGE's Check passes
on the run branch.

## 7. Blind gate

Run `grades.ts gate --base <base> --out <scratch folder>`. For each page named
by an `edited` item or a taken step, it writes one judge brief from
[`judge-brief.md`](judge-brief.md): old and new in random order, with the
criterion the edit targeted and the house rules; a page new since the base
has no old version, so `code-review` alone checks it. Dispatch one judge per brief,
save the hand-backs and run `grades.ts votes --out <scratch folder>
<hand-backs>`. An edit merges on a win of 1; `equal` fails. A failed edit goes
back to its writer once with the judge's `worse` notes: merge its new commit
and gate that page again (`gate --pages <page>`). If it fails again, restore
the page to the base, set its items' `edited: false`, and it counts as
stopped. Done when every gated page has merged or stopped.

## 8. A election

Dispatch one judge per A brief `tally` wrote, save the hand-backs and run
`votes`; it writes the briefs of the second and third judges for each
candidate that won its first, then dispatch those and run `votes` again. A
candidate takes A only by beating every page it meets this run and last run
(QUALITY.md, Grades). Done when `votes` reports no judges owed.

## 9. Review, record and land

Run `code-review` on the run branch against the base, with the tally as the
spec. Send each finding on a page to its
writer with `SendMessage` and merge its new commit; fix join findings yourself.
One fix round.

Fetch `origin/main`; if it changed a page you edited, merge it into the run
branch, keeping your page with its pin at the base. Run `grades.ts record
--base <base> --out <scratch folder> --session <this session's id>` and commit
`grades.yml` and `runs.yml`. Follow "Closing a scheduled run's PR" in
`docs/agents/pr-workflow.md` (the `code-review` above is its review), with a
short PR body: how many pages were read, false claims fixed, edits merged and stopped, steps taken and refused, and A
changes, and a link to `runs.yml` for the rest. Once the PR is open, run
`record` again with `--pr <number> --cost <usage.cost_usd from get_session>`
(it replaces this run's entry and rereads the local transcript for the cost by
phase, so run it in this session), commit, push, and point the body's link at
`runs.yml` at that commit; that commit holds only run metadata, so your own
read of its diff replaces `code-review`. If anything outside the Remit is in
the diff, leave the PR open for a human.

## 10. File

- **Problems the run hit** (a step that misfired, a rule in the bar or a page
  check that got in the way) are Frictions in the session log.
- **Proposals** outside the Remit (a new Subject, a rater's change to the bar
  or the page checks): search open issues first, and file one issue each,
  labelled `needs-triage`, body per `docs/agents/issue-tracker.md`, only where
  none covers it.
- **Ideas for the owner** go into the session log's `ideas`, one line each:
  proposed `DECISIONS.md` lines and drafts too far from the bar to promote.

Done when every Friction, issue and idea is written and `pnpm check:worktrees`
exits 0, which it does only once the run branch is pushed. Then invoke
`close-session`.

## Review after the first runs

The owner adopted the A rule and the blind gate as a trial (issue #2792).
The review is due: `runs.yml` holds 5 v3 runs. Compare it with the v2 runs
listed in that issue and comment the result there: the gate pass rate (near
100% means a rubber stamp, near 50% weak selection or writing), whether low-value edits were stopped, how many inverse
steps were refused, and the cost per run and per page that passed the gate.
`costBreakdown` in each `runs.yml` entry splits that cost: tokens by
class (counted from the transcripts) for the lead and each subagent phase, the lead's context at each phase
start, and estimated shares (`sharePct`). `usd` is those shares times `costUsd`,
so it exists once `record` gets `--cost`. The shares rest on uncalibrated
weights; read them as estimates, and the lead-versus-subagents split with care.
