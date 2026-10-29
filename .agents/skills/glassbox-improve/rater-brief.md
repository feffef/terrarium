You grade pages of the Glass Box guide, a textbook that teaches the concepts
Terrarium is built on with Terrarium as the worked example. Two other raters
on other models grade alongside you; only points you reach on your own count.

Work in the repository at commit {COMMIT}, read-only: modify no repository file
and post nothing. Write any file you create, page dumps included, in
{SCRATCH}. Read in full first:

- `layers/glassbox/GLOSSARY.md`: the Lesson and Walkthrough shapes;
- `.agents/skills/glassbox-lesson/EVERY-PAGE.md`: titles and writing rules;
- `.agents/skills/glassbox-lesson/QUALITY.md`: the criteria and the grades;
- `.agents/skills/glassbox-lesson/DECISIONS.md`: closed rulings;
- `.claude/rules/glassbox-content.md`.

Then read each page below in full, as it is at {COMMIT}
(`git show {COMMIT}:<path>`).

**Read by all three raters** (the A pages are the guide's best; compare the
others with them):

{ALL THREE}

**Read by you alone:**

{LONE}

Spot-check any claim that looks wrong against the file it cites. A false claim
you confirm goes under `falseClaims`, with the `path:line` that contradicts it.

**Every guide page and draft**, by title and description, for the Missing
Lessons below; read a draft only to back one you name:

{CATALOG}

Grade each page B, C or D (QUALITY.md); only the run awards A. For each page
below B, list each deficit: its criterion, a quote from the page, the fix. For
a title deficit, also quote the clause of EVERY-PAGE's title rule it fails as
`titleClause`, and propose a `title`. For a B page, list any gap to A: the
section, the A page that does it better, and what to take from it. Lesser
points go under `optional`. On a page you read alone, set `aWorthy: true` if it
would hold its own among the A pages.

Then, among the Lessons all three read that you graded B, list your 10 best,
best first, and name the best Walkthrough all three read that you graded B.
Then the **Missing Lessons**: concepts Terrarium relies on that no guide Lesson
teaches, most important first, each with the existing Subject it belongs to
(or "new Subject") and the draft that fills it, if any. Then **re-cuts**: a
page that should be split, or pages that should be merged, with the facts that
would move. Name every page by its path under
`layers/glassbox/content/guide/pages/` without `.md`, and every draft by its
path under `layers/glassbox/content/drafts/pages/` the same way.

Return your report as one fenced `yaml` block at the end of your final
message, in this shape (omit an empty list):

```yaml
rater: {MODEL}
pages:
  - page: claude-code/04.hooks
    grade: C
    deficits:
      - { criterion: Cut, quote: "…", fix: "…" }
    falseClaims:
      - { quote: "…", source: "scripts/hooks/guards.ts:12" }
  - page: claude-code/01.claude-md
    grade: B
    gaps:
      - { section: "Why it's built this way", exemplar: claude-code/03.skills, take: "…" }
    optional: ["…"]
    aWorthy: true
top10: [claude-code/03.skills, claude-code/01.claude-md]
bestWalkthrough: walkthroughs/adding-a-tenant
missingLessons:
  - { concept: "…", subject: claude-code, draft: claude-code/06.hints, rank: 1 }
recuts:
  - { pages: [nuxt-vue/05.vue-components], move: "…" }
```

Before the block, for each rule and doc you loaded or read: its path, why it
loaded or was read, and whether it was useful (yes, partly, no).
