---
name: glassbox-improve
description: "Raise the Glass Box guide toward its best pages: three raters read every guide page, the run fixes what two of them agree on, elects the best pages, and self-merges one PR."
disable-model-invocation: true
---

# glassbox-improve

Each run lifts the guide toward its best pages, and the next run's grades show
whether the edits held. Three raters on different models read the guide every
run; an edit needs two of them to agree, so one rater's taste never drives
one, while a false claim needs only to be confirmed in the source. A few
pages hold A, best in class (QUALITY.md, Grades): the rest are compared with
them.

Read first: `layers/glassbox/GLOSSARY.md` (page shapes),
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md),
[`../glassbox-lesson/QUALITY.md`](../glassbox-lesson/QUALITY.md) (the grades,
and how to raise a page),
[`../glassbox-lesson/DECISIONS.md`](../glassbox-lesson/DECISIONS.md) (closed
rulings) and `dispatch-subagents` (every brief below follows it). Subagents
read committed files at the base with `git show <base>:<path>`, which can't
follow the `.claude/skills/<name>` link, so write every Skill path in a brief
as `.agents/skills/...`.

`scripts/grades.ts` does the counting: `plan` splits the pages among the
raters, `tally` merges their reports and runs the election, `tally --write`
writes [`grades.yml`](grades.yml), the one home of each page's grades, and
`drafts` lists each draft's promotion blockers. Run it
with `pnpm exec tsx`; its header gives the flags.

## Remit

The run changes only `layers/glassbox/content/`, the diagram SVGs it
re-renders in `app/assets/mermaid/` and `grades.yml`, and lands one PR titled
`glassbox-improve: <YYYY-MM-DD>`, even when only `grades.yml` changed. It raises
every page the tally selects and takes every structural step two raters raise
(promote a draft, write a Lesson for a gap, or re-cut pages inside the existing
Subjects), and fixes every confirmed false claim with the smallest correction.
Out of remit: a new Subject or diagram, moving a page to another Subject, and
any change to this Skill, the `glassbox-lesson` docs or the page checks; step
8 files them.

Save every subagent reply, a resumed one's too, with
`pnpm exec tsx scripts/session/save-handback.ts <agent-id> <file>` in this
run's scratch folder, and work only from those files.

## 1. Set up

If a PR titled `glassbox-update:` or `glassbox-improve:` is open, stop: invoke
`close-session` as `blocked`, naming it. Otherwise, on the session's designated
branch (with none, `glassbox-improve/<YYYY-MM-DD>-<HHMM>` in UTC), start from a
fresh `origin/main` and note that commit as **the base**. Save
`grades.ts plan --base <base>` to the scratch folder, and list the guide pages
any other open PR touches: the run edits those only to fix a confirmed false
claim. Done when both are saved.

## 2. Rate

Dispatch three raters **in one message**, one per model (`sonnet`, `fable`,
`opus`), each with [`rater-brief.md`](rater-brief.md) filled in: the model,
the base, the plan's all-three pages and that model's lone pages, the plan's
catalog, and a scratch subfolder per rater. Done when all three hand-backs are
saved and `grades.ts tally` accepts them; on a parse error, fix only the line
it names in the saved hand-back. Resume a stalled rater once with
`SendMessage`; if it still returns nothing, dispatch a fresh one on the same
model and log a Friction.

## 3. Tally

Run `grades.ts tally --base <base> <sonnet> <fable> <opus>`: it prints the
grades, the election, every item each rater raised (grouped by page and
criterion), the lone pages that go to all three next run, and the structural
raises ranked. Then:

- **Cluster** each page's reports of one deficit or gap, however worded. An
  item two raters raise is **consensus**; check each against the page and drop
  a misreading with its reason. A lone page never reaches consensus: the
  script sends it to all three next run.
- **False claims** need one rater: confirm each in the source, and it is fixed
  this run. Drop one you can't confirm, with its reason.
- **Titles.** A title deficit is consensus only when two raters cite the same
  clause of EVERY-PAGE's title rule; the new title is one two of them propose,
  else the retitle becomes an idea (step 8).
- **Filters.** Drop every item a `DECISIONS.md` line settles. Drop a fix that
  would undo a change from the last 2 runs unless that change made the page
  false: read those runs' PR bodies and, for a title or link,
  `git log -p origin/main -- <page>`. A dropped undo becomes a proposed
  `DECISIONS.md` line.
- **Churn.** A page whose `gapEdit` in `grades.yml` is one of the last 2 runs
  takes no gap edit; note each consensus gap dropped this way for step 7's
  `--read-by-all`. Deficits are always fixed.
- **Select** every page with a consensus deficit or a consensus gap (both
  raters citing an A page), every page two raters grade below B (its writer
  fixes the deficits it confirms), and every structural step two raters raise,
  plus each `candidates` entry in `grades.yml`. Two steps that touch one page:
  the one more raters raise, then the older entry, goes first; the other
  waits (step 7). A draft that needs about half its lines
  changed is not promoted (an idea). A selected page a structural step touches
  belongs to that step's writer.

Run the tally again with `--selected <pages>` (comma-separated), since a
selected page can't hold A, and save its output: the PR body's tally. Done
when every item is kept or dropped with its reason and the selection says why
each step beat the next. If nothing is selected and no false claim is
confirmed, write the record (step 7) and go to step 8.

## 4. Research

For each structural step, dispatch one read-only `sonnet` researcher with
[`researcher-brief.md`](researcher-brief.md) filled in: its task, the base,
its draft's section of `grades.ts drafts --base <base>` (saved once to the
scratch folder) and its own scratch subfolder. Done when every hand-back is saved and every claim
it says the source contradicts is confirmed as a false claim or dropped with
its reason.

## 5. Write

Dispatch one `opus` writer per structural step, and one per Subject for the
selected pages in it, each with `isolation: 'worktree'` and
[`writer-brief.md`](writer-brief.md) filled in: its task, its items (with the
A page each gap cites), the research file if any, the base, every false claim
the run confirmed, and its own scratch subfolder. Propose or fix only facts
and wording you have found in the source, an absence claim most of all. Fix a
false claim on a page no writer holds, or whose writer dropped out, yourself
after step 6's merges. Done when every hand-back is saved and each writer has
a commit that passes EVERY-PAGE's Check, or refused or stopped with its reason.
Drop a refused or stopped item, remove its worktree
(`git worktree remove --force <path>`) and say why in the PR body.

## 6. Integrate

Merge each writer's branch into the run branch; never cherry-pick or squash,
which orphans the writers' commits and fails `pnpm check:worktrees`. Then make
the **join edits** the writers reported, on any page: link text after a
retitle, Walkthrough chips and Where next entries. Writers add their own Terms
and repoint links to a draft they promote (`writer-brief.md`, Your files), so
don't forbid a writer to edit other drafts; when two writers' branches add the
same Term id, keep one file. Add a link only where its list has room, replace only a
link that broke or was retitled, and keep each list's order. Pin each page you
edit yourself to the base. Done when EVERY-PAGE's Check passes on the run
branch.

## 7. Review

There is no re-grade: the next run's three raters read every changed page.
Run `code-review` on the run branch against the base, with the tally as the
spec and this added to it: for each changed claim, show the cited file at the
base (`git show <base>:<path>`) and quote the `path:line` that backs it, never
accepting a claim on assertion; for each sentence an edit deletes from a page,
name the page and line that now states it (a fact with no home is a finding,
unless the tally asked to drop it); and no section the tally didn't fault got
worse. Send each finding on a page to its writer with `SendMessage` and merge
its new commit; fix join findings yourself. One fix round.

Then write the record: the step-3 tally command with `--write --selected
<pages> --gap-edit <pages a gap edit changed> --read-by-all <pages whose
consensus gap the churn rule dropped>`. It keeps the base's hashes, so every
page this run edited counts as changed and all three read it next run. In
`grades.yml`'s `candidates`, remove each step this run took and add each step
that waited, with its pages, a one-line gist and today's date (or its old
date). Done when every finding is fixed or refused with its reason, and
`grades.yml` is committed (with no edits, only the latter).

## 8. Land and file

Fetch `origin/main`. If it changed a page you edited, merge it into the run
branch, keeping your page with its pin at the base. Then follow "Closing a
scheduled run's PR" in `docs/agents/pr-workflow.md`; its `pnpm gate:scoped`
on the final head is the run's only one. The PR body holds every intermediate
result, so nobody has to read this session's events: each change as
`page | item | change`; step 3's saved tally output (grades before and this
run's, the A set before and after, each rater's top 10, every item raised),
with your reason beside each item you kept or dropped; each structural step
with why it won or waits; and the review findings with what became of each.
If anything outside the Remit is in the diff, leave the PR open for a human.

File the rest:

- **Problems the run hit** (a step that misfired, a rule in the bar or a page
  check that got in the way) are Frictions in the session log.
- **Proposals** outside the Remit (a new Subject, a rater's change to the bar
  or the page checks): search open issues first, and file one issue each,
  labelled `needs-triage`, body per `docs/agents/issue-tracker.md`, only where
  none covers it.
- **Ideas for the owner** go into the session log's `ideas`, one line each:
  proposed `DECISIONS.md` lines, retitles the raters didn't agree on, and
  drafts too far from the bar to promote.

Done when every Friction, issue and idea is written and `pnpm check:worktrees`
exits 0, which it does only once the run branch is pushed. Then invoke
`close-session`.
