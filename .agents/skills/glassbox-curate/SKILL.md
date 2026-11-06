---
name: glassbox-curate
description: Make the Glass Box guide easier to learn from, then fill gaps; one focus per run, one self-merged PR. With a focus from the owner it runs interactively.
disable-model-invocation: true
---

# glassbox-curate

**Goals.** Make the guide easier to learn from, page by page and as a whole.
Second, fill gaps: a technology or process Terrarium relies on that no Lesson
teaches. You lead and choose the steps; improvise.

**Shape.** One focus per run (a Subject, a structural question or a gap), about
$20. Read your spend with `get_session` called with no session id, and stop at
the budget. Several runs a day must work.

**Modes.** *Autonomous* (no focus given, e.g. a Routine): decide everything
yourself, ask nothing, and say in the run entry why you chose the focus.
*Interactive* (the owner gives a focus): settle every decision with the owner
via `grilling`. Their decision there counts as ADR-0003 approval for Glass Box
content only, so a step beyond the remit, such as a new Subject, is allowed;
changes to this Skill, the page checks or the rules still go through their own
PRs.

**Hard rules.** Never make a page false. Never undo an earlier change without
new evidence. `DECISIONS.md` rulings are closed. One PR per run, within the
remit.

**Remit.** Edit `layers/glassbox/content/guide/`,
`layers/glassbox/content/drafts/`, the diagram SVGs you re-render and your own
workshop files. A gap needing a new Lesson goes into an existing Subject, or
into drafts if it isn't central. A gap needing a new Subject, and any change to
this Skill, the `glassbox-lesson` docs or the page checks, become issues.

**Read first.** `layers/glassbox/GLOSSARY.md`,
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md),
[`../glassbox-lesson/QUALITY.md`](../glassbox-lesson/QUALITY.md) (Lenses only),
[`../glassbox-lesson/DECISIONS.md`](../glassbox-lesson/DECISIONS.md),
`.claude/rules/glassbox-content.md`.
Subagents read committed files at the base with `git show <base>:<path>`,
which can't follow the `.claude/skills/<name>` link, so write every Skill path
in a brief as `.agents/skills/...`.

## How a run goes

- **Orient.** This is the orientation step: run
  `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts` and read all
  of its output, then `git log` of the guide since the last run. Leave alone every page an open PR touches and every
  focus another open curate run has claimed.
- **Choose.** Take the focus from memory leads, the owner's review notes,
  page-check warnings, problems the orientation shows, or gaps; when nothing is
  pressing, from pages no fresh reader has seen lately (`pagesRead`). The run
  entry says why.
- **Gaps.** Compare what Terrarium relies on (`package.json`, the ADRs, the
  Skills, `scripts/`) with what the Lessons teach. The memory page keeps known
  gaps, those left uncovered on purpose too. Fix what makes pages hard to learn
  from first; take a gap when no page problem outweighs it.
- **Claim.** Right after choosing, push the run branch with its run entry, so a
  concurrent run sees the focus.
- **Diagnose.** Fresh readers (sonnet, no repo access) get each page as plain
  text: MDC stripped, each term followed by its definition, each Excerpt as code
  with its file path. They report where a newcomer gets lost. For structure,
  read the pages involved in full; for a gap, the sources the new Lesson would
  cite.
  For a Subject focus, check each Why bullet against its cited ADR or file.
- **Churn guard.** Before a structural step or a retitle, read
  `git log --oneline origin/main -- <page>` and the run entries that name the
  page. Never reverse a change from the last 5 runs unless it made the page
  false.
- **Fix.** An opus writer quotes the `path:line` behind every sentence it adds
  or changes.
- **Check.** A separate sonnet claim checker checks the changed sentences
  and a promoted draft's whole page. `glassbox-update` owns the claim check of
  unchanged text, so leave that to it. Run EVERY-PAGE.md's Check on the
  changed pages, and a fresh reader re-reads them. One retry, then drop the
  change.
- **Land.** Merge `origin/main` and keep the newer pin. Two runs on one day can
  both rewrite the memory page: the later one keeps both runs' leads. Rewrite
  the memory page, complete the run entry, open one self-merged PR
  (`docs/agents/pr-workflow.md`). Done when the PR is open with the memory page
  and run entry current.

## State

All in `layers/glassbox/content/workshop/`:

- `pages/index.md`, the memory page: the guide's current weak spots, the
  owner's direction and the open ideas. Write it in simple, plain words, so a
  person reads it easily and later runs don't copy needlessly complex wording.
  Each run rewrites it and **cuts** whatever its work addressed and whatever it
  judges no longer needed, so the page stays short. What a run did goes in its
  run entry, not here. The word cap in
  `layers/glassbox/tests/unit/workshop.spec.ts` is a ceiling, not a target.
- `runs/<YYYY-MM-DDTHHMM>.yml`: one entry per run, named by its UTC start time.
  Its shape is the `runs` Collection in `layers/glassbox/tenant.config.ts`. A
  `changes` entry is `page | what changed | why`, `page` being the guide page's
  stem (its path under `layers/glassbox/content/guide/pages/` without `.md`,
  `index` for the overview).
- `checks/update.yml` belongs to `glassbox-update`; never write it.
