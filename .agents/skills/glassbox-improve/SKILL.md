---
name: glassbox-improve
description: Raise the Glass Box guide one step: three raters grade every guide page, the run fixes the weakest by consensus, and self-merges one PR.
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
how to raise a page) and
[`../glassbox-lesson/DECISIONS.md`](../glassbox-lesson/DECISIONS.md) (closed
rulings).

## Remit

The run changes only `layers/glassbox/content/` and the diagram SVGs it
re-renders in `app/assets/mermaid/`, and lands one PR titled
`glassbox-improve: <YYYY-MM-DD>`. Per run:

- **Raise at most 3 pages**: guide Lessons or Walkthroughs.
- **Take at most 1 structural step**: promote a draft, write a Lesson for a
  gap, or split or merge pages, all inside the existing Subjects.
- **Out of remit**: a new Subject or diagram, moving a page to another
  Subject, and any change to this Skill, the `glassbox-lesson` docs or the
  page checks. Step 8 files them.

Save every subagent's reply with
`pnpm exec tsx scripts/session/save-handback.ts <agent-id> <file>` in this
run's scratch folder and work only from those files: a report not saved does
not exist.

## 1. Set up

If a PR titled `glassbox-update:` is open, stop: invoke `close-session` as
`blocked`, naming it, and run again once it lands. Otherwise branch the
session's designated branch from a fresh `origin/main` and note that commit as
**the base**.

Write the **cooling-off pages** to the scratch folder: every page that the
last 2 merged runs changed (`git log origin/main --merges --grep
'glassbox-improve:'`, then `git diff --name-only --no-renames <merge>^1
<merge>` for each). Until two such runs exist, use instead every page any
commit changed in the last 14 days, except commits titled `glassbox-update:`.
Add every page an open PR touches. Done when the list is written.

## 2. Rate

Dispatch three raters **in one message**, one per model (`sonnet`, `fable`,
`opus`), each with [`rater-brief.md`](rater-brief.md) filled in: the base, the
list of guide pages (`git ls-tree -r --name-only <base>
layers/glassbox/content/guide/pages`, without `index.md`), the list of drafts,
and a scratch subfolder per rater. Done when all three hand-backs are saved
and each grades every listed page. Resume a stalled rater once with
`SendMessage`; if it still returns nothing, dispatch a fresh rater on the same
model and log a Friction.

## 3. Tally

Merge the three reports into one tally file:

- **Deficits.** Cluster reports of the same deficit on the same page, however
  worded. A cluster two or three raters raise is **consensus**. A title
  deficit is consensus only when two raters cite the same clause of
  EVERY-PAGE's title rule. Verify each consensus deficit against the page and
  its sources, and drop an unverified one with the reason. A false claim one
  rater found counts once you verify it.
- **Filters.** Drop every Optional item and every deficit a `DECISIONS.md`
  line settles. Drop a fix that undoes an earlier change, unless that change
  made the page false: check the last 3 `glassbox-improve:` PR bodies (find
  their numbers in the merge commits) and, for a title or link, `git log -p
  origin/main -- <page>`; a dropped undo becomes a proposed `DECISIONS.md`
  line. On a cooling-off page, keep only verified false claims.
- **Pages.** Each page's grade is the middle of its three. Select up to 3
  pages that keep a consensus deficit: C before B, then most consensus
  deficits.
- **Structural step.** Take the gap, split or merge that most raters raise,
  at least two; a gap a draft fills is filled by promoting that draft, and on
  a tie a promotion wins. Read a candidate draft first: one that needs about
  half its lines changed or more is not promoted this run (an idea, step 8).
  A gap that needs a new Subject is out of remit.

Done when every page has its three grades, every consensus deficit is
verified or dropped with its reason, and the selection says why each item beat
the next. If nothing is selected, invoke `close-session` and stop.

## 4. Research

For each selected page and the structural step, dispatch one read-only
`sonnet` researcher. It reads the page (or draft, or gap) and its consensus
deficits, then reads the Terrarium source at the base and `node_modules` for
the facts and Excerpt candidates (at most about 12 lines each) the fix needs,
and lists every claim on the page the source contradicts, each with
`path:line`. Done when every hand-back is saved and every contradicted claim
is in the tally, verified as a false claim or dropped with its reason.

## 5. Write

Dispatch one `opus` writer per selected page and one for the structural step,
each with `isolation: 'worktree'` and [`writer-brief.md`](writer-brief.md)
filled in. Every brief carries the run's whole list of verified false claims,
so no writer repeats one. When a title deficit is selected, you pick the new
title and put it in the brief. Done when every hand-back is saved and, in each
writer's worktree, `git -C <worktree> log -1` shows its commit and the page
test and `pnpm validate:content` pass.

## 6. Integrate

Merge each writer's branch into the run branch, never cherry-pick, and never
squash the run branch later: either orphans the writers' commits and fails
`pnpm check:worktrees`. Then make the **join edits** the writers reported:
link text after a retitle, new Terms (once each, per EVERY-PAGE's Terms),
links to a moved draft, Walkthrough chips and Where next entries. Add a link
only where its list has room, replace only a link that broke or was retitled,
and keep each list's order. Done when
`pnpm exec vitest run layers/glassbox/tests/unit/glassbox-pages.spec.ts` and
`pnpm validate:content` pass on the run branch.

## 7. Review

Run `code-review` on the run branch against the base, with the tally file as
the spec. Send each finding on a page to its writer with `SendMessage`, merge
the writer's new commit, and fix join findings yourself. Then dispatch three
fresh raters (same models, same brief) on only the changed pages at the run
branch's tip. A changed page that fewer than two of them grade A gets one more
fix round on its consensus deficits. Stop after 2 fix rounds; a page still
below A stays as the last round left it, and the PR body says why. Done when
the last `code-review` has no finding left unfixed and every changed page has
its final grades.

## 8. Land and file

Fetch `origin/main`. If it changed a page you edited, merge it into the run
branch, keeping your page with its pin at the base. Then follow "Closing a
scheduled run's PR" in `docs/agents/pr-workflow.md`. The PR body lists each
change as `page | deficit | change`, then each page's grades before and after
and the structural step with why it won. If anything outside the Remit is in
the diff, leave the PR open for a human.

File the rest:

- **Out-of-remit findings** (a new Subject, a change to the bar or the page
  checks) go into the open issue titled
  `glassbox-improve: out-of-remit findings`: one comment per run listing the
  new ones. If that issue isn't open, open it labelled `needs-triage`, body
  per `docs/agents/issue-tracker.md`.
- **Proposed `DECISIONS.md` lines** (an undo you refused, a rater split you
  settled, a retitle the raters split on) and drafts too far from the bar to
  promote go into the session log's `ideas`, one line each, for the owner.

Done when both are written and `pnpm check:worktrees` exits 0. Then invoke
`close-session`.
