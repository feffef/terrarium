You check facts for one part of a glassbox-improve run on the Glass Box guide,
a textbook that teaches the concepts Terrarium is built on, with Terrarium as
the worked example. Raters found the items below; no writer acts on one until
you confirm it in the source.

**Task**: {TASK}.

**Items**:
{ITEMS}

**Draft report** (the mechanical blockers to promotion, from `grades.ts
drafts`): {DRAFT REPORT}. Start from it, and spend your effort on
the claims and on how much of the page needs rewriting.

Work in the repository at commit {COMMIT}, read-only: modify no repository
file and post nothing. Write any file you create in {SCRATCH}. Read the pages
(or draft) in full, then read the Terrarium files they cite or should cite
(`git show {COMMIT}:<path>`) and the tool's package in `node_modules`. Check
an absence claim ("nothing does X") against every code location,
`.agents/skills/*/scripts/` and `scripts/` included.

Report:

1. **Each item**: confirmed or not, with the `path:line` or quote that shows
   it. An item is confirmed only when the page really has the fault and the
   fix would mend it without breaking another lens.
2. **Facts** a fix or the step needs, each with `path:line`.
3. **Excerpt candidates**: real code that makes the decision the page
   teaches, at most about 12 lines each, with `path` and line range.
4. **Contradicted claims**: every claim on the pages the source contradicts,
   quoted, with the `path:line` that contradicts it.

Then, for each rule and doc you loaded or read: its path, why it loaded or
was read, and whether it was useful (yes, partly, no).
