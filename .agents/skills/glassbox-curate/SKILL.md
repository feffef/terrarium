---
name: glassbox-curate
description: Make the Glass Box guide easier to learn from, then fill gaps; one focus per run, one self-merged PR. With a focus from the owner it runs interactively.
disable-model-invocation: true
---

# glassbox-curate

**Goals.** Make the guide easier to learn from, page by page and as a whole.
Second, fill gaps: a technology or process Terrarium relies on that no Lesson
teaches. You are an opus lead and choose the steps; improvise.

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
`.claude/rules/glassbox-content.md`, the workshop page and its run entries.
Subagents can't follow the `.claude/skills` link: write Skill paths in their
briefs as `.agents/skills/...`.

## How a run goes

- **Orient.** Run `pnpm exec tsx layers/glassbox/page-checks.ts`: its warnings
  and orphans are one source of focus. Read the memory page, the last few run
  entries and `git log` of the guide. Leave alone every page an open PR touches
  and every focus another open curate run has claimed.
- **Claim.** Right after choosing, push the run branch with its run entry, so a
  concurrent run sees the focus.
- **Diagnose.** Fresh readers (sonnet, no repo access) get each page as plain
  text: MDC stripped, each term followed by its definition, each Excerpt as code
  with its file path. They report where a newcomer gets lost. For structure, read
  the pages involved in full; for a gap, the sources the new Lesson would cite.
  For a Subject focus, check each Why bullet against its cited ADR or file.
- **Churn guard.** Before a structural step or a retitle, read
  `git log --oneline origin/main -- <page>` and the run entries that name the
  page. Never reverse a change from the last 5 runs unless it made the page false.
- **Fix.** The writer quotes the `path:line` behind every sentence it adds or
  changes.
- **Check.** A separate sonnet claim checker checks the changed sentences;
  `glassbox-update` owns the claim check of unchanged text, so do none of it.
  The page checks and `validate:content` pass (EVERY-PAGE.md, Check), and a
  fresh reader re-reads the changed pages. One retry, then drop the change.
- **Land.** Merge `origin/main` and keep the newer pin. Rewrite the memory page,
  complete the run entry, open one self-merged PR (`docs/agents/pr-workflow.md`).

## State

All in `layers/glassbox/content/workshop/`:

- `pages/index.md`, the memory page: each run rewrites it with facts and leads,
  never procedures, within 1,500 words (`layers/glassbox/tests/unit/workshop.spec.ts`
  enforces the cap).
- `runs/<YYYY-MM-DDTHHMM>.yml`: one entry per run, named by its UTC start time.
  Its shape is the `runs` Collection in `layers/glassbox/tenant.config.ts`. A
  `changes` entry is `page | what changed | why`, `page` being the guide page's
  stem (its path under `layers/glassbox/content/guide/pages/` without `.md`,
  `index` for the overview).
- `checks/update.yml` belongs to `glassbox-update`; never write it.
