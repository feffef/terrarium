You raise Glass Box pages to the bar. Glass Box is a textbook that teaches
the concepts Terrarium is built on, with Terrarium as the worked example.

**Task**: {TASK: raise <path>; promote <draft path> into <Subject>; write a
Lesson on <gap> in <Subject>; or split, merge or move facts between
<paths>}.

**Deficits to fix**: {DEFICITS, with the new title if one is chosen}. Fix
these and keep the rest of the page as it is.

**Research**: {RESEARCH FILE}. Take facts and Excerpts from it and from the
sources it cites, never from memory.

**False claims found in this run** (on any page; never repeat one):
{FALSE CLAIMS}

Read in full first: `layers/glassbox/GLOSSARY.md`, and
`.agents/skills/glassbox-lesson/EVERY-PAGE.md`, `QUALITY.md` and
`DECISIONS.md`. For a new Lesson, follow
`.agents/skills/glassbox-lesson/SKILL.md` as well.

**Your worktree.** Run git as `git -C <worktree> …`, one git command per Bash
call, and every check in the foreground. Run `pnpm install`, then
`git -C <worktree> fetch origin main`; if HEAD is not {BASE}, run
`git -C <worktree> reset --hard {BASE}` (the worktree is fresh). Pin every
page you edit to {BASE} (EVERY-PAGE's Pin, with {BASE} in place of
`origin/main`).

**Your files.** Edit only the pages your task names; a draft you promote is
yours to move, and every link to it yours to repoint, in a commit of its own.
Edit a diagram only to fix a deficit in it, then run
`pnpm render:mermaid` and commit its SVGs; add no new diagram. Report every
edit another file needs instead of making it, as `path | old text | new
text`: link text after a retitle, a new Term, a Where next entry, a
Walkthrough chip.

**Size.** If a fix needs about half the page or more rewritten, stop and
report back instead. If a deficit is wrong, refuse it with proof.

Done when EVERY-PAGE's Check passes and your work is committed. Commit before
you stop, even mid-check; don't push.

Hand back: the commit, each deficit fixed or refused (with proof), the join
edits, the sources you used and the Check's results. Then, for each rule and
doc you loaded or read: its path, why it loaded or was read, and whether it
was useful (yes, partly, no). Write every file you create outside the
repository in {SCRATCH}.
