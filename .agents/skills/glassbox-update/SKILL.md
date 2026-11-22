---
name: glassbox-update
description: Bring every Glass Box guide page (drafts opt-in) up to date with main, claim-check flagged pages and a daily rotation, list new topics no page teaches and Lessons to split on the memory page, then land it as one self-merging gated PR.
disable-model-invocation: true
---

# glassbox-update

Sync runs **one way, code to pages**: a page that disagrees with the code is
the page's fault. This run edits only `layers/glassbox/content/` and the
diagram SVGs it re-renders in `app/assets/mermaid/`. Read
`layers/glassbox/GLOSSARY.md` (page shapes) and
[`../glassbox-lesson/writing-pages.md`](../glassbox-lesson/writing-pages.md) (Pin,
Write, Diagrams, Check) first, then read
[`../glassbox-lesson/owner-decisions.md`](../glassbox-lesson/owner-decisions.md)
in full: the owner's hard rules, never to be gone against.

The script is `.agents/skills/glassbox-update/scripts/glassbox-update.ts`, run
with `pnpm exec tsx`; `--spaces guide,drafts` adds other Spaces (default
`guide`). Its report's `main` is **the commit**: this run reviews and pins to
that one commit, never a later fetch.

1. **Report.** Run the script (it refuses a shallow clone; see
   `docs/agents/git-conventions.md`) and save its JSON report. Done when you
   hold it.
2. **Advance.** Run the script with `--write --to <the commit>`: it shifts
   moved `lines` ranges and pins every page to the commit, except a page with
   an `edited` range, which is left wholly untouched.
3. **Flag.** First start the **Scout**: run
   `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts --index`,
   then dispatch a background sonnet subagent (`dispatch-subagents`) with the
   guide index files it names and the range from the oldest step-1 `revision`
   to the commit. It reads every commit in that range, all paths, and returns
   each new topic worth teaching that no page in the index teaches, with its
   commits and the nearest page. Add each one as a single line to the memory
   page's *Stale or missing* section
   (`layers/glassbox/content/workshop/pages/index.md`), skipping topics already
   there; `glassbox-curate` works that list.
   Every page in the step-1 report's `pages` is flagged, and so is
   every term in `terms`. Then read `git log` and `git diff` from each page's
   step-1 `revision` to the commit, and flag any page whose prose describes
   something that changed even though it cites no changed file (match by
   concept: a renamed step, a moved rule, a retired Skill). A `major` version
   change also flags *The concept* of every Lesson whose Full reference links that tool's docs.
   Done when every commit since the oldest `revision` has been read against
   every page, and the Scout's topics are on the memory page.
4. **Re-check and edit** a flagged page as a whole, diagrams and `teaches`
   included, against the commit, only if its `needsReader` is true, step 3
   flagged it by prose alone, or it is a step 5 rotation page; pin it there
   (writing-pages.md's Pin, with the commit in place of `origin/main`) and
   re-line each `edited` range by hand as you pin. Any other flagged page
   (`needsReader` false) needs only a quick look at its pin and shifted
   excerpts. A flagged term: re-read its `source` entry and rewrite the
   `definition` in Glass Box's words where the meaning moved. Done when the
   script with `--to <the commit>` lists no `pages` and every flagged term
   matches its source.
5. **Claim check.** Goal: no page states a claim its source contradicts. Check
   two sets, each page by its stem (its path under
   `layers/glassbox/content/guide/pages/` without `.md`, `index` for the
   overview):
   - **Flagged pages** with `needsReader` true: only the claims that cite a
     file changed since the page's step-1 `revision`. A flagged page with
     `needsReader` false gets no reader, unless it is in the rotation.
   - **Rotation:** the 5 pages whose `checked` in
     `layers/glassbox/content/workshop/checks/update.yml` is oldest, a page
     with none oldest of all, ties by page path. Each gets a **full
     check**, even a page that is also flagged.

   Hand sonnet subagents at most 8 pages each (`dispatch-subagents`). Add this
   to each brief, with the commit and the repo path of
   `.agents/skills/glassbox-lesson/writing-pages.md`, since a subagent sees
   nothing else: *The claim check is your main task. On each page, check every
   concrete claim (a flag, a file, a function, a Skill name, a count, a
   behaviour) against the file it cites at the commit, and the tool's claims
   against its docs URL (fetch it) or, when that fails, writing-pages.md's Write
   fallback for a blocked fetch. A claim the source contradicts goes under
   `falseClaims`, quoted, with the `path:line` or URL that contradicts it.
   Report the claims you checked on each page (`claims`, one short line each)
   and the docs URL or fallback you used (`docs`).* For a page that is only
   flagged, the brief names the report's `changedFiles` and limits it to claims
   citing them; it still fetches the docs URL for any of those claims that
   rests on a tool's docs.

   Confirm each reported contradiction in the source yourself, then make the
   smallest correction of the false claim: no retitle, restructuring or style
   edit. Then rewrite `update.yml` (shape: the `checks` Collection in
   `layers/glassbox/tenant.config.ts`): set today's date on each fully checked
   page, keep the rest, and drop pages that no longer exist. A scoped check of
   a flagged page leaves its date. The run writes no run entries. Done when
   every checked page's reports are confirmed or rejected and `update.yml` is
   rewritten.
6. **Long lessons.** Run `pnpm exec tsx layers/glassbox/page-checks.ts --long`:
   it prints a `WARNING` for each Lesson over the soft word limit. Give each
   such Lesson to a fresh sonnet reader (`dispatch-subagents`, at most 8 pages
   each) to read it whole and propose a split: the new Lessons, each with one
   concept and a title, and which sections move where. It adds nothing itself.
   Write one bullet per Lesson in the memory page's *Too long* section (page
   title, file, word count, the proposal), replacing the Lesson's earlier
   bullet and deleting the bullets of Lessons no longer warned. A split adds
   Lessons, so `glassbox-curate` leaves that PR for the owner. Done when
   *Too long* matches the warnings.
7. **Check** (writing-pages.md).
8. **Land.** If nothing changed, `update.yml` included, invoke `close-session`
   and stop. Otherwise follow "Closing a scheduled run's PR" in
   `docs/agents/pr-workflow.md`, one PR titled `glassbox-update: <YYYY-MM-DD>`
   whose body lists each flagged page and term, why, and what changed, each
   page fully checked, and each Scout topic added. If the PR includes anything outside this run's paths,
   leave it for a human. Done when the PR is merged or left for a human.
