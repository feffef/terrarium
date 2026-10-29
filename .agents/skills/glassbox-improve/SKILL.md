---
name: glassbox-improve
description: "Raise the Glass Box guide one step: three raters grade every guide page, the run fixes the weakest by consensus, and self-merges one PR."
disable-model-invocation: true
---

# glassbox-improve

Each run lifts the guide one small, reviewable step, and the next run's grades
show whether it held. Three raters on different models grade every guide page
against the bar; a deficit drives an edit only when two of them raise it
independently. One rater's complaint is taste; two is signal. Churn is the
enemy: a page that flips back and forth costs more than a page left at B.

Read first: `layers/glassbox/GLOSSARY.md` (page shapes),
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md),
[`../glassbox-lesson/QUALITY.md`](../glassbox-lesson/QUALITY.md) (the bar, and
how to raise a page),
[`../glassbox-lesson/DECISIONS.md`](../glassbox-lesson/DECISIONS.md) (closed
rulings) and `dispatch-subagents` (every brief below follows it).

## Remit

The run changes only `layers/glassbox/content/` and the diagram SVGs it
re-renders in `app/assets/mermaid/`, and lands one PR titled
`glassbox-improve: <YYYY-MM-DD>`. Per run:

- **Raise at most 3 pages**: guide Lessons or Walkthroughs.
- **Take at most 1 structural step**: promote a draft, write a Lesson for a
  gap, or re-cut pages (split, merge, or move facts between them), all inside
  the existing Subjects.
- **Fix every verified false claim** on any guide page, with the smallest
  correction, whatever the caps.
- **Out of remit**: a new Subject or diagram, moving a page to another
  Subject, and any change to this Skill, the `glassbox-lesson` docs or the
  page checks. Step 8 files them.

Save every subagent reply, a resumed one's too, with
`pnpm exec tsx scripts/session/save-handback.ts <agent-id> <file>` in this
run's scratch folder, and work only from those files.

## 1. Set up

If a PR titled `glassbox-update:` is open, stop: invoke `close-session` as
`blocked`, naming it, and run again once it lands. Otherwise, on the session's
designated branch (with none, `glassbox-improve/<YYYY-MM-DD>-<HHMM>` in UTC: a
day can hold two runs), start from a fresh `origin/main` and note that commit
as **the base**.

Write the **cooling-off pages** to the scratch folder: every page the last 2
runs (or the only one) changed (their merges: `git log origin/main --merges
--grep '^glassbox-improve: [0-9]'`; each one's pages: `git diff --name-only
--no-renames <merge>^1 <merge>`), each under its path at the base: `git diff
-M --name-status <merge> <base>`, over the whole tree, lists a later rename,
and a `D` means the page is gone. Add every page an open PR touches. Done when
the list is written.

## 2. Rate

Dispatch three raters **in one message**, one per model (`sonnet`, `fable`,
`opus`), each with [`rater-brief.md`](rater-brief.md) filled in: the base as
the commit, every guide page (`git ls-tree -r --name-only <base>
layers/glassbox/content/guide/pages`, without `index.md`), every draft page,
and a scratch subfolder per rater. Done when all three hand-backs are saved
and each grades every listed page. Resume a stalled rater once with
`SendMessage`; a rater holds no git state, so if it still returns nothing,
dispatch a fresh one on the same model and log a Friction.

## 3. Tally

Merge the three reports into one tally file:

- **Deficits.** Cluster reports of the same deficit on the same page, however
  worded. A cluster two or three raters raise is **consensus**. A title
  deficit is consensus only when two raters cite the same clause of
  EVERY-PAGE's title rule; the new title is one two of them propose, and if
  none of their proposals match, the retitle becomes an idea (step 8). Check
  each consensus deficit against the page, and drop a misreading with the
  reason. A false claim one rater found is fixed once you confirm it in the
  source.
- **Filters.** Drop every Optional item and every deficit a `DECISIONS.md`
  line settles. Drop a fix that would undo an earlier change unless that
  change made the page false: read every earlier run's PR body and, for a
  title or link, `git log -p origin/main -- <page>`. A dropped undo becomes a
  proposed `DECISIONS.md` line. On a cooling-off page, keep only false claims.
- **Pages.** Each page's grade is the middle of its three. Select pages that
  keep a consensus deficit, C before B, then most consensus deficits, up to
  the Remit's cap.
- **Structural step.** Take the gap or re-cut that most raters raise, at
  least two, under the same filters; on a tie, a promotion beats a new
  Lesson, which beats a re-cut; between two gaps, the lower sum of their
  places in the raters' Gaps lists wins, then the one whose draft needs fewer
  changes (no draft: the one more raters list first). A gap a draft fills is filled by
  promoting that draft. Read a candidate draft first: one that needs about
  half its lines changed or more is not promoted this run (an idea); take the
  next structural candidate. A gap that needs a new Subject is out of remit. A
  selected page the step touches leaves the page selection; the step's
  writer owns it.

Done when every page has its three grades, every consensus deficit is kept or
dropped with its reason, and the selection says why each item beat the next.
If nothing is selected and no false claim is confirmed, invoke
`close-session` and stop.

## 4. Research

For each selected page and the structural step, dispatch one read-only
`sonnet` researcher with [`researcher-brief.md`](researcher-brief.md) filled
in: its task and deficits, the base as the commit, and its own scratch
subfolder. Done when every hand-back is saved and every claim it says the
source contradicts is in the tally, confirmed as a false claim or dropped with
its reason.

## 5. Write

Dispatch one `opus` writer per selected page and one for the structural step,
each with `isolation: 'worktree'` and [`writer-brief.md`](writer-brief.md)
filled in: its task, its deficits (false claims on its pages included), its
research file, the base, every false claim the run confirmed, and its own
scratch subfolder. Propose in a brief or fix only facts and wording you have
found in the source, an absence claim most of all. Fix a false claim on a page
no writer holds, or whose writer dropped out, yourself in the run branch after
step 6's merges. Done when every hand-back is saved and each writer either has
a commit in its worktree that passes EVERY-PAGE's Check, or refused or stopped
with its reason. Drop a refused or stopped item from the run, remove its
worktree (`git worktree remove --force <path>`), and say why in the PR body.
If no writer's commit and no false claim remain, invoke `close-session` as
`completed` and stop.

## 6. Integrate

Merge each writer's branch into the run branch; never cherry-pick or squash,
which orphans the writers' commits and fails `pnpm check:worktrees`. Then make
the **join edits** the writers reported, on any page: link text after a
retitle, new Terms (once each, per EVERY-PAGE's Terms), Walkthrough chips and
Where next entries. Add a link only where its list has room, replace only a
link that broke or was retitled, and keep each list's order. Pin each page you
edit yourself to the base. Done when EVERY-PAGE's Check passes on the run
branch.

## 7. Review

Run `code-review` on the run branch against the base, with the tally file and
step 6's join edits as the spec. Send each finding on a page to its writer
with `SendMessage` and merge its new commit; fix join findings yourself. Then
dispatch three fresh raters (same models, same brief) on only the pages a
writer raised, promoted, wrote or re-cut, with the run branch's tip as the
commit and the line "Report section 1 only." Their deficits pass step 3's
Deficits and Filters before they count. A page that keeps a consensus deficit
gets one more fix round on it, then a last re-grade. Stop there: a page still
below A stays as that round left it, and the PR body says why. Fix a false
claim the last re-grade confirms before step 8's gate. Done when every
`code-review` finding is fixed or refused with its reason in the PR body,
every re-graded page has its last grades, and every false claim the last
re-grade confirmed is fixed.

## 8. Land and file

Fetch `origin/main`. If it changed a page you edited, merge it into the run
branch, keeping your page with its pin at the base. Then follow "Closing a
scheduled run's PR" in `docs/agents/pr-workflow.md`; its `pnpm gate:scoped`
on the final head is the run's only one, and EVERY-PAGE's Check is enough
between rounds. The PR body lists each change as `page | deficit | change`,
then each page's grades before and after and the structural step with why it
won. If anything outside the Remit is in the diff, leave the PR open for a
human.

File the rest:

- **Problems the run hit** (a step that misfired, a rule in the bar or a page
  check that got in the way) are Frictions in the session log, even when the
  fix would change the bar; the Friction Ledger clusters them across runs.
- **Proposals** outside the Remit that the run didn't hit (a new Subject, a
  rater's change to the bar or the page checks): search open issues first,
  and file one issue each, labelled `needs-triage`, body per
  `docs/agents/issue-tracker.md`, only where none covers it.
- **Ideas for the owner** go into the session log's `ideas`, one line each:
  proposed `DECISIONS.md` lines (an undo you refused, a rater split you
  settled), retitles the raters didn't agree on, and drafts too far from the
  bar to promote.

A deficit or structural step that missed the caps needs no record: the next
run's raters find it again. Done when every Friction, issue and idea is
written and `pnpm check:worktrees` exits 0, which it does only once the run
branch is pushed (writer worktrees' commits count as unpushed until then). Then invoke `close-session`.
