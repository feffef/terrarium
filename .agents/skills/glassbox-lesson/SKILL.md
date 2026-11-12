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

1. **Place it.** Take the topic's concept, Terrarium files and official docs
   from the [topic inventory](https://github.com/feffef/terrarium/issues/1966#issuecomment-6176385964),
   including its Corrections. The file is
   `layers/glassbox/content/guide/pages/<subject>/NN.<slug>.md`: `<subject>` a
   slug in `glassboxSubjects` (`layers/glassbox/app/utils/subjects.ts`), `NN`
   a free two-digit prefix that puts it after the Lessons it builds on and
   before those that build on it (`layers/glassbox/GLOSSARY.md`, Two Spaces,
   says how to number). Done when the path and docs URLs are chosen.
2. **Pin** it (writing-pages.md).
3. **Write** it to the contract, in plain words. *The concept* is true of any
   project; *In Terrarium* is what this repo does. For *Why it's built this
   way*, find the real reasons in the ADRs, the code, and the PRs, commits and
   issues that made or changed the design. Done when every claim about
   Terrarium is checked against its file at `revision`, and each reason traces
   to a source you read.
4. **Join the other pages.** Add the Lesson as a chip to the `::lessons` of
   every Walkthrough stop whose mechanism it explains, and to the Where next of
   every existing Lesson it relates to, above any Journal page. Both are
   capped (the contracts): a full list takes it only in place of its weakest
   entry. Done when each stop and Where next links the Lesson wherever it is closer than
   one of the list's current entries.
5. **Check** it (writing-pages.md).
