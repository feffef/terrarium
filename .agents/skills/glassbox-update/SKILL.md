---
name: glassbox-update
description: Bring every Glass Box guide page (drafts opt-in) up to date with main, then land it as one self-merging gated PR.
disable-model-invocation: true
---

# glassbox-update

Sync runs **one way, code to pages**: a page that disagrees with the code is
the page's fault. This run edits only `layers/glassbox/content/` and the
diagram SVGs it re-renders in `app/assets/mermaid/`. Read
`layers/glassbox/GLOSSARY.md` (page shapes) and
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md) (Pin,
Write, Diagrams, Check) first.

The script is `.agents/skills/glassbox-update/scripts/glassbox-update.ts`, run
with `pnpm exec tsx`; `--spaces guide,drafts` adds other Spaces (default
`guide`). Its report's `main` is **the commit**: this run reviews and pins to
that one commit, never a later fetch.

1. **Report.** If `git rev-parse --is-shallow-repository` says `true`, run
   `git fetch --unshallow origin main`. Run the script and save its JSON
   report. Done when you hold it.
2. **Advance.** Run the script with `--write --to <the commit>`: it shifts
   moved `lines` ranges and pins every page without an `edited` range to the
   commit.
3. **Flag.** Every page in the step-1 report's `pages` is flagged, and so is
   every term in `terms`. Then read `git log` and `git diff` from each page's
   step-1 `revision` to the commit, and flag any page whose prose describes
   something that changed even though it cites no changed file (match by
   concept: a renamed step, a moved rule, a retired Skill). A `major` version
   change also flags *The concept* of every Lesson whose Full reference links that tool's docs.
   Done when every commit since the oldest `revision` has been read against
   every page.
4. **Re-check and edit** each flagged page as a whole, diagrams included,
   against the commit, and pin it there (EVERY-PAGE.md's Pin, with the
   commit in place of `origin/main`). A flagged term: re-read its `source`
   entry and rewrite the `definition` in Glass Box's words where the meaning
   moved. Done when the script with `--to <the commit>` lists no `pages` and
   every flagged term matches its source.
5. **Check** (EVERY-PAGE.md); shoot only pages whose layout,
   feature or diagram changed, never a content change.
6. **Land.** If nothing changed, invoke `close-session` and stop. Otherwise
   follow "Closing a scheduled run's PR" in `docs/agents/pr-workflow.md`, one
   PR titled `glassbox-update: <YYYY-MM-DD>` whose body lists each flagged
   page and term, why, and what changed. If the PR includes anything outside this
   run's paths, leave it for a human.
