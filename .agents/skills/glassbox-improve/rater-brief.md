You are rater {RATER} of the Glass Box guide, a textbook that teaches the
concepts Terrarium is built on with Terrarium as the worked example. You grade
pages through your lenses only: {LENSES}. Two other raters cover the others.

Work in the repository at commit {COMMIT}, read-only: modify no repository file
and post nothing. Write any file you create, page dumps included, in
{SCRATCH}. Read in full first:

- `layers/glassbox/GLOSSARY.md`: the Lesson and Walkthrough shapes;
- `.agents/skills/glassbox-lesson/EVERY-PAGE.md`: titles and writing rules;
- `.agents/skills/glassbox-lesson/QUALITY.md`: the lenses and the grades;
- `.agents/skills/glassbox-lesson/DECISIONS.md`: closed rulings (a point one
  settles is never a finding);
- `.claude/rules/glassbox-content.md`.

<!-- rater A C -->
Then read each page below in full, as it is at {COMMIT}
(`git show {COMMIT}:<path>`):

{PAGES}
<!-- /rater -->
<!-- rater B -->
Overlaps only show across pages, so you read every guide page each run, from
{TRIMMED}: each page's title, description and prose, with code cut to its line
count and long lines cut. Read a full page with `git show {COMMIT}:<path>` only
to back a finding. Every guide page and draft, by title and description:

{CATALOG}

Besides grades, raise **steps**: a page that should merge into another or
become a section of it (`merge`, `section`), split (`split`), lose facts to
another (`move`) or be cut (`cut`), a draft to promote (`promote`), and a
concept Terrarium relies on that no Lesson teaches (`lesson`). Each step names
its `pages` and, when it moves content, where it goes (`into`); a `lesson` or
`promote` names the new guide path as `into`. {RELEVANCE}
<!-- /rater -->
<!-- rater C -->
**The claim check is your main task.** On each page, check every concrete
claim (a flag, a file, a function, a Skill name, a count, a behaviour) against
the file it cites at {COMMIT}, and the tool's claims against its docs URL
(fetch it) or, when that fails, its package in `node_modules`. A claim the
source contradicts goes under `falseClaims`, quoted, with the `path:line` or
URL that contradicts it. Report the claims you checked on each page (`claims`,
one short line each) and the docs URL or fallback you used (`docs`).

For Evidence, look for a better place in the repo to see the concept than the
page's examples; a finding names it by file and line.
<!-- /rater -->

Grade each page on each of your lenses: B, C or D (QUALITY.md, Grades), or
`n/a` for Reasoning and Transfer on a Walkthrough; only the run awards A. For
each grade below B, list each finding: a quote from the page and the fix. For
a B, list any gap to A: the section, a page holding A on that lens that does
it better, and what to take from it. Pages holding A, by lens: {HELD}.

Then name your **top 3** per lens: the pages you graded B with no finding or
gap that are best on that lens, best first. Name every page by its path under
`layers/glassbox/content/guide/pages/` without `.md`, and every draft by its
path under `layers/glassbox/content/drafts/pages/` the same way.

Return your report as one fenced `yaml` block at the end of your final
message, in this shape (omit an empty list; the tally rejects a lens that
isn't yours and a C or D without a finding):

```yaml
rater: {RATER}
pages:
  - page: claude-code/04.hooks
    lenses:
{EXAMPLE}
top3:
{TOP3}
```

Before the block, for each rule and doc you loaded or read: its path, why it
loaded or was read, and whether it was useful (yes, partly, no).
