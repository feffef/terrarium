---
name: glassbox-lesson
description: Write one Glass Box Lesson, a page about one concept with Terrarium as the worked example.
disable-model-invocation: true
---

# glassbox-lesson

Write **one Lesson** for Glass Box. Read `layers/glassbox/GLOSSARY.md` first:
it holds the Lesson contract and the Subject, Excerpt and Term rules. The steps
every page shares are in [`EVERY-PAGE.md`](EVERY-PAGE.md).

1. **Place it.** Take the topic's concept, Terrarium files and official docs
   from the [topic inventory](https://github.com/feffef/terrarium/issues/1966#issuecomment-6176385964),
   including its Corrections. The file is
   `layers/glassbox/content/guide/pages/<subject>/NN.<slug>.md`: `<subject>` a
   slug in `glassboxSubjects` (`layers/glassbox/app/utils/subjects.ts`), `NN`
   the next free two-digit prefix. Done when the path and docs URLs are chosen.
2. **Pin** it (EVERY-PAGE.md).
3. **Write** it to the contract, in plain words. *The concept* is true of any
   project; *In Terrarium* is what this repo does. Done when every claim about
   Terrarium is checked against its file at `revision`.
4. **Join the other pages.** Add the Lesson as a chip to the `::stop-links` of
   every Walkthrough stop whose mechanism it explains, and to the Where next of
   every existing Lesson it relates to, above any Journal page there. Done
   when each such stop and Where next links it.
5. **Check** it (EVERY-PAGE.md).
