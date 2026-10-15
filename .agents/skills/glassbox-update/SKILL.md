---
name: glassbox-update
description: Bring every Glass Box page up to date with main, then land it as one self-merging gated PR.
disable-model-invocation: true
---

# glassbox-update

Sync runs **one way, code to pages**: a page that disagrees with the code is
the page's fault. This run edits only `layers/glassbox/content/` and the
diagram SVGs it re-renders in `app/assets/mermaid/`. Read
`layers/glassbox/GLOSSARY.md` (page shapes) and
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md) (Pin,
Write, Diagrams, Check) first.

1. **Report.** If `git rev-parse --is-shallow-repository` says `true`, run
   `git fetch --unshallow origin main`. Then run
   `pnpm exec tsx .agents/skills/glassbox-update/scripts/glassbox-update.ts`.
   It fetches `origin/main` and prints, as JSON: `pages` whose cited paths
   changed since their `revision` (with the `lines` ranges it can shift, and
   the `edited` ones it can't), `terms` whose `source` changed, and the
   `package.json` `versions` that changed per `revision`. Done when you hold
   the report.
2. **Flag.** Every page in `pages` is flagged, and so is every term in
   `terms`. Then read `git log` and `git diff` from each page's `revision` to
   `origin/main`, and flag any page whose prose describes something that
   changed even though it cites no changed file (match by concept: a renamed
   step, a moved rule, a retired Skill). A `major` version change also flags
   *The concept* of every Lesson in that tool's Subject. Done when every
   commit since the oldest `revision` has been read against every page.
3. **Re-check and edit** each flagged page as a whole, diagrams included,
   against `origin/main`, then Pin it (EVERY-PAGE.md). A flagged term: re-read
   its `source` entry and rewrite the `definition` in Glass Box's words where
   the meaning moved. Done when every flagged page is pinned to `origin/main`
   and every flagged term matches its source.
4. **Advance the rest.** Rerun the script with `--write`: it shifts the
   remaining `lines` ranges and pins every page without an `edited` range to
   `origin/main`. Done when a plain rerun lists no `pages`.
5. **Check** (EVERY-PAGE.md); shoot only the pages whose body changed.
6. **Land.** If nothing changed, stop. Otherwise follow "Closing a scheduled
   run's PR" in `docs/agents/pr-workflow.md`, one PR titled
   `glassbox-update: <YYYY-MM-DD>` whose body lists each flagged page and
   term, why, and what changed. Anything outside this run's paths rides in:
   leave the PR for a human.
