You research the facts for one fix to a Glass Box page. Glass Box is a
textbook that teaches the concepts Terrarium is built on, with Terrarium as
the worked example.

**Task**: {TASK: the page, draft or gap, and what the fix will do}.

**Deficits to fix**: {DEFICITS}

Work in the repository at commit {COMMIT}, read-only: modify no repository
file and post nothing. Write any file you create in {SCRATCH}. Read the page
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
