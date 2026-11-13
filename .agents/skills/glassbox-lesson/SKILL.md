---
name: glassbox-lesson
description: Write one Glass Box Lesson, a page about one concept with Terrarium as the worked example.
disable-model-invocation: true
---

# glassbox-lesson

Write **one Lesson** for Glass Box. Read `layers/glassbox/GLOSSARY.md` first:
it holds the Lesson contract and the Subject, Excerpt and Term rules. The steps
every page shares are in [`writing-pages.md`](writing-pages.md). Then read
[`owner-decisions.md`](owner-decisions.md) in full: the owner's hard rules for
titles and wording.

1. **Orient.** Run
   `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts --index`,
   never through `head`; if the tool saves its output to a file, read that file
   whole. It prints the open Glass Box PRs and names the guide index files: read
   each whole, one Read per file. Inside a `glassbox-curate`
   run, skip the script, which rewrites the files that run's Scout reads, and
   read the files its orientation named. Done when every index file is read
   whole.
2. **Place it.** Choose the Subject from the index: the one whose Lessons sit
   beside the new one. Take the topic's concept, Terrarium files and official
   docs from the [topic inventory](https://github.com/feffef/terrarium/issues/1966#issuecomment-6176385964),
   including its Corrections. The file is
   `layers/glassbox/content/guide/pages/<subject>/NN.<slug>.md`: `<subject>` a
   slug in `glassboxSubjects` (`layers/glassbox/app/utils/subjects.ts`), `NN`
   a free two-digit prefix that puts it after the Lessons it builds on and
   before those that build on it. Prefixes go up in tens, and a Lesson that
   belongs between two takes the number between them (85 between 80 and 90),
   so adding or moving one renames one file. Done when the path and docs URLs are chosen.
3. **Pin** it (writing-pages.md).
4. **Write** it to the contract, in plain words. *The concept* is true of any
   project; *In Terrarium* is what this repo does. For *Why it's built this
   way*, find the real reasons in the ADRs, the code, and the PRs, commits and
   issues that made or changed the design. Done when every claim about
   Terrarium is checked against its file at `revision`, and each reason traces
   to a source you read.
5. **Join the other pages.** Find them in the index. Add the Lesson as a chip
   to the `::lessons` of every Walkthrough stop whose mechanism it explains, and
   to the Where next of every existing Lesson it relates to, above any Journal
   page. Both are capped (the contracts): a full list takes it only in place of
   its weakest entry. Done when each stop and Where next links the Lesson
   wherever it is closer than one of the list's current entries.
6. **Check** it (writing-pages.md).
