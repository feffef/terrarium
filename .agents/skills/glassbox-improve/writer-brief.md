You raise Glass Box pages to the bar. Glass Box is a textbook that teaches
the concepts Terrarium is built on, with Terrarium as the worked example.

**Task**: {TASK: raise <paths>; promote <draft path> into <Subject>; write a
Lesson on <gap> in <Subject>; or split, merge or move facts between
<paths>}.

**Items to fix**: {ITEMS: per page, each deficit, each gap to A with the A page
it cites, and the new title if one is chosen}. Fix these and keep the rest of
each page as it is. Confirm each deficit in the source before you fix it; if
one is wrong, refuse it with proof. A gap is fixed by taking what the cited A
page does better, not by copying it.

**Research**: {RESEARCH FILE, or "none: check every fact you write in the
source yourself"}. Take facts and Excerpts from the source, never from memory.

**False claims found in this run** (on any page; never repeat one):
{FALSE CLAIMS}

Read in full first: `layers/glassbox/GLOSSARY.md`, and
`.agents/skills/glassbox-lesson/EVERY-PAGE.md`, `QUALITY.md` and
`DECISIONS.md`. For a new Lesson, follow
`.agents/skills/glassbox-lesson/SKILL.md` as well. The Check enforces the caps
in `layers/glassbox/page-checks.ts`: `lengths` (title and description),
`lessonTitleWords` and `ownWords` (each Why bullet's words); meet them before
you run it. Before you add or edit a Why bullet, read the Why section of every
Lesson that cites the same ADR (`git grep -l ADR-NNNN
layers/glassbox/content/guide`): a reason another Lesson owns gets one sentence
and a link.

**Your worktree.** Run git as `git -C <worktree> …`, one git command per Bash
call, and every check in the foreground. Run `pnpm install`, then
`git -C <worktree> fetch origin main`; if HEAD is not {BASE}, run
`git -C <worktree> reset --hard {BASE}` (the worktree is fresh). Pin every
page you edit to {BASE} (EVERY-PAGE's Pin, with {BASE} in place of
`origin/main`).

**Your files.** Edit only the pages your task names. A draft you promote is
yours to move, and in a commit of its own you repoint the links to it in every
draft that has one; a links-only edit keeps that draft's pin. Edit a diagram
only to fix a deficit in it, then run `pnpm render:mermaid` and commit its
SVGs; add no new diagram. Report every edit another file needs instead of
making it, as `path | old text | new text`: link text after a retitle, a new
Term, a Where next entry, a Walkthrough chip.

**Size.** If a fix needs about half a page or more rewritten, stop and report
back instead.

Done when EVERY-PAGE's Check passes and your work is committed. Commit before
you stop, even mid-check; don't push.

Hand back: the commit, each item fixed or refused (with proof), the join
edits, the sources you used and the Check's results. Then, for each rule and
doc you loaded or read: its path, why it loaded or was read, and whether it
was useful (yes, partly, no). Write every file you create outside the
repository in {SCRATCH}.
