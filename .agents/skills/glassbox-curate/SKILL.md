---
name: glassbox-curate
description: Make the Glass Box guide easier to learn from, then fill gaps; one focus per run, one self-merged PR. Started by a person, it runs interactively.
disable-model-invocation: true
---

# glassbox-curate

**Goals.** Make the guide easier to learn from, page by page and as a whole.
Second, fill gaps: a technology or process Terrarium relies on that no Lesson
teaches. You lead and choose the steps; improvise.

**Shape.** One focus per run (a Subject, a structural question or a gap), about
$20. Read your spend, `external_metadata.usage.cost_usd` from `get_session`
called with no session id, and stop at the budget. Several runs a day must work.

**Modes.** *Autonomous* (a Routine fired it): decide everything,
ask nothing, and say in the run entry why you chose the focus.
*Interactive* (a person started it): if no focus was given, ask for one; settle
every decision with them via `grilling`. Their decision there counts as
ADR-0003 approval for Glass Box content only, so a step beyond the remit, such
as a new Subject, is allowed; changes to this Skill, the page checks or the
rules still go through their own PRs. If they answer "autonomous", the run is
autonomous from then on and its entry says so.

**Hard rules.** Never make a page false. Never undo an earlier change without
new evidence. `DECISIONS.md` rulings are closed. One PR per run, within the
remit.

**Remit.** Edit `layers/glassbox/content/guide/`,
`layers/glassbox/content/drafts/`, the diagram SVGs you re-render, your own
workshop files, and a moved page's name in `checks/update.yml`. A gap needing a
new Lesson goes into an existing Subject, or into drafts if it isn't central. A
gap needing a new Subject, and any change to this Skill, the `glassbox-lesson`
docs or the page checks, become issues.

**Read first.** `layers/glassbox/GLOSSARY.md`,
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md),
[`../glassbox-lesson/QUALITY.md`](../glassbox-lesson/QUALITY.md) (Lenses only),
[`../glassbox-lesson/DECISIONS.md`](../glassbox-lesson/DECISIONS.md),
`.claude/rules/glassbox-content.md`, and, since every run fetches and opens a
PR, `docs/agents/git-conventions.md`, `docs/agents/github-integration.md` and
`docs/agents/pr-workflow.md`.
Subagents read committed files at the base with `git show <base>:<path>`,
which can't follow the `.claude/skills/<name>` link, so write every Skill path
in a brief as `.agents/skills/...`.

## How a run goes

- **Orient.** This is the orientation step: run
  `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts`, then the
  same with `--pages`, and read each output whole, never through `head`; if
  the tool saves one to a file, read that file whole. The first gives the
  state: where to write the run entry, open PRs, memory, recent runs and
  warnings. The second gives every page's first paragraph, your only overview
  of what the guide already teaches: you need it to spot a gap, an overlap or a
  page that already exists. Leave alone every page an open PR touches. While a
  `glassbox-update` PR is open, wait for it: subscribe to its activity, end
  your turn, and orient again once it merges or closes.
- **Area.** From the orientation, pick the Subject (or the Walkthroughs) to
  work in: from memory leads, the owner's review notes, page-check warnings,
  problems the orientation shows, or gaps; when nothing is pressing, from pages
  no fresh reader has seen lately (`pagesRead`). For a gap or a new Subject,
  the area is the Subject it would join, or the pages nearest its topic.
- **Read.** Read every page of the area in full, and every page outside it
  that a change would edit, link or overlap. Edit only after this step.
- **Choose.** Pick this run's focus from what you read. Put every other weak
  spot or proposal you found on the memory page, so later runs inherit the
  reading. The run entry says why you chose the focus.
- **Proposal.** A focus that needs the owner's decision (a new Subject, a
  split, a move between Subjects) is a valid focus, and its result is an issue
  for the owner. It gives the Subjects and their pages, each move and retitle
  with its effect on URLs and links, the entries
  `layers/glassbox/app/utils/subjects.ts` would gain, and the decision asked
  for as a yes/no or a choice between options. The run's PR then holds only
  its run entry, whose `changes` names the issue, and the memory page, which
  says the lead waits for the owner in that issue.
- **Gaps.** Compare what Terrarium relies on (`package.json`, the ADRs, the
  Skills, `scripts/`) with what the Lessons teach. The memory page keeps known
  gaps, those left uncovered on purpose too. Fix what makes pages hard to learn
  from first; take a gap when no page problem outweighs it.
- **Run entry.** Right after choosing, write it from the orientation's
  skeleton, keeping `focus` quoted, and push the run branch.
- **Diagnose.** Fresh readers (sonnet, no repo access) get each page as plain
  text: MDC stripped, each term followed by its definition, each Excerpt as code
  with its file path. They report where a newcomer gets lost. For a gap, read
  the sources the new Lesson would cite. For a Subject focus, check each Why
  bullet against its cited ADR or file.
- **Churn guard.** Before a structural step or a retitle, read
  `git log --oneline origin/main -- <page>` and the run entries that name the
  page. Never reverse a change from the last 5 runs unless it made the page
  false.
- **Fix.** An opus writer quotes the `path:line` behind every sentence it adds
  or changes. Each `The cost:` clause needs a source that states that cost, and
  the writer runs a command sequence before it says what the sequence does.
  A new Lesson follows `.agents/skills/glassbox-lesson/SKILL.md` step by step:
  give the writer its path and have it report each step's Done.
- **Check.** A separate sonnet claim checker checks the changed sentences
  and a promoted draft's whole page. `glassbox-update` owns the claim check of
  unchanged text, so leave that to it. Run EVERY-PAGE.md's Check on the
  changed pages, and a fresh reader re-reads them. One retry, then drop the
  change.
- **Removal.** A change that only removes text or a page skips the writer, the
  claim checker and the fresh reader. Still run the page checks, grep for
  links, slugs and terms that pointed at what you removed, and re-read each
  sentence next to a cut: it may now point at nothing. Grep the guide for each
  fact you cut; one no other page teaches goes under the memory page's open
  ideas, with the page that could teach it. The run entry's `changes` says what
  you skipped.
- **Move.** A page moved or renamed keeps its check: rename its `page` in
  `checks/update.yml` and keep its date.
- **Land.** Merge `origin/main` and keep the newer pin. Two runs on one day can
  both rewrite the memory page: the later one keeps both runs' leads. Rewrite
  the memory page, complete the run entry, open one self-merged PR
  (`docs/agents/pr-workflow.md`) whose body gives the run's cost from
  `get_session`, or "unreported" when the field is missing. Give `code-review`
  the Lesson contract, EVERY-PAGE.md, DECISIONS.md and the glassbox-content
  rule as its standards, without the code-smell baseline, and say the page
  checks already ran. Its Spec reviewer also judges which pages the change
  needed read (the ones it edits, links or overlaps), and names each one missing
  from `pagesRead`. Read those, recheck the change against them, and add them
  to `pagesRead` before you land. Done when the PR is open with the memory page
  and run entry current.

## State

All in `layers/glassbox/content/workshop/`:

- `pages/index.md`, the memory page: the guide's current weak spots, the
  owner's direction and the open ideas. Write it in simple, plain words, so a
  person reads it easily and later runs don't copy needlessly complex wording.
  State a count only after counting its items in their source.
  Each run rewrites it and **cuts** whatever its work addressed and whatever it
  judges no longer needed, so the page stays short. Delete a finished item;
  never mark it done. A fact the next run still needs stays as a plain current
  fact under a heading that fits. What a run did goes in its run entry, not
  here. The word cap in
  `layers/glassbox/tests/unit/workshop.spec.ts` is a ceiling, not a target.
- `runs/<YYYY-MM-DDTHHMM>.yml`: one entry per run, named by the UTC time the
  orientation printed.
  Its shape is the `runs` Collection in `layers/glassbox/tenant.config.ts`. A
  `changes` entry is `page | what changed | why`, `page` being the guide page's
  stem (its path under `layers/glassbox/content/guide/pages/` without `.md`,
  `index` for the overview).
- `checks/update.yml` belongs to `glassbox-update`; write it only to rename a
  page you moved.
