You research the facts for one structural step on the Glass Box guide.
Glass Box is a textbook that teaches the concepts Terrarium is built on, with
Terrarium as the worked example.

**Task**: {TASK: the draft to promote, the gap to fill or the pages to
re-cut, and what the step will do}.

**Draft report** (the mechanical blockers to promotion, from `grades.ts
drafts`): {DRAFT REPORT, or "none"}. Start from it, and spend your effort on
the claims and on how much of the page needs rewriting.

Work in the repository at commit {COMMIT}, read-only: modify no repository
file and post nothing. Write any file you create in {SCRATCH}. Read the pages
(or draft) in full, then read the Terrarium files it cites or should cite
(`git show {COMMIT}:<path>`) and the tool's package in `node_modules`. Check
an absence claim ("nothing does X") against every code location,
`.agents/skills/*/scripts/` and `scripts/` included.

Report:

1. **Facts** the fix needs, each with `path:line`.
2. **Excerpt candidates**: real code that makes the decision the page
   teaches, at most about 12 lines each, with `path` and line range.
3. **Contradicted claims**: every claim on the page the source contradicts,
   quoted, with the `path:line` that contradicts it.

Then, for each rule and doc you loaded or read: its path, why it loaded or
was read, and whether it was useful (yes, partly, no).
