---
name: glassbox-lesson
description: Write one Glass Box Lesson, a page about one concept with Terrarium as the worked example, when a Trusted user asks for it.
disable-model-invocation: true
---

# glassbox-lesson

Write **one Lesson** for Glass Box, only when a Trusted user asks for it
(ADR-0003). Read `layers/glassbox/GLOSSARY.md` first: it holds the Lesson
contract and the Subject, Excerpt and Term rules. The steps every page shares
are in [`EVERY-PAGE.md`](EVERY-PAGE.md).

1. **Place it.** Take the topic's concept, Terrarium files and official docs
   from the [topic inventory](https://github.com/feffef/terrarium/issues/1966#issuecomment-6176385964),
   including its Corrections. The file is
   `layers/glassbox/content/guide/pages/<subject>/NN.<slug>.md`: `<subject>` a
   slug in `glassboxSubjects` (`layers/glassbox/app/utils/subjects.ts`), `NN`
   the next free two-digit prefix. Done when the path and docs URLs are chosen.
2. **Pin** it (EVERY-PAGE.md).
3. **Write** it to the contract, in plain words:
   - The lede names the problem the concept solves.
   - *The concept* is true of any project and names no Terrarium file; a fence
     there is an example, and the prose says which file of the reader's it
     belongs in.
   - *In Terrarium* shows what Terrarium does, naming its files inline. *Why
     it's built this way* links the ADR and never restates it; *What to watch
     for* gives limits and traps.
   - *Try it in your project* is one step a reader can take today.
   Done when every claim about Terrarium is checked against its file at
   `revision`.
4. **Join the Walkthroughs.** Add the Lesson as a chip to the `::stop-links` of
   every Walkthrough stop whose mechanism it explains. Done when each such stop
   in `walkthroughs/` links it.
5. **Check** it and land it (EVERY-PAGE.md).
