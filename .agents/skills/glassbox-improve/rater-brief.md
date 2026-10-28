You grade pages of the Glass Box guide, a textbook that teaches the concepts
Terrarium is built on with Terrarium as the worked example. Two other raters
grade the same pages independently; only points you reach on your own count.

Work in the repository at commit {COMMIT}, read-only: modify no repository file
and post nothing. Write any file you create, page dumps included, in {SCRATCH}.
Read in full first:

- `layers/glassbox/GLOSSARY.md`: the Lesson and Walkthrough shapes;
- `.agents/skills/glassbox-lesson/EVERY-PAGE.md`: titles and writing rules;
- `.agents/skills/glassbox-lesson/QUALITY.md`: the criteria and the grades;
- `.agents/skills/glassbox-lesson/DECISIONS.md`: closed rulings;
- `.claude/rules/glassbox-content.md`.

Then read each of these pages in full, as it is at {COMMIT}:

{PAGES}

Spot-check any claim that looks wrong against the file it cites
(`git show {COMMIT}:<path>`). A false claim you confirm is a deficit; quote the
`path:line` that contradicts it.

Report, in this order (only section 1 if told so below):

1. **Per page**: `path | grade | one-line reason`, one line for every listed
   page. Then, for every page below A, each deficit: criterion, a quote from
   the page, the fix. For a title deficit, quote the clause of EVERY-PAGE's
   title rule it fails. Lesser points go under **Optional** for that page.
2. **Gaps**: concepts Terrarium relies on that no guide Lesson teaches, most
   important first. For each: the existing Subject it belongs to (or "new
   Subject"), and the draft from this list that fills it, if any, after
   reading that draft:

   {DRAFTS}
3. **Re-cuts**: a page that should be split, or pages that should be merged,
   with the facts that would move.

{REPORT SCOPE: empty, or "Report section 1 only."}

Then, for each rule and doc you loaded or read: its path, why it loaded or
was read, and whether it was useful (yes, partly, no).
