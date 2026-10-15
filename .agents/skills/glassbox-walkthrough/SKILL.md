---
name: glassbox-walkthrough
description: Write one Glass Box Walkthrough, a page that follows one story across several Lessons, when a Trusted user asks for it.
disable-model-invocation: true
---

# glassbox-walkthrough

Write **one Walkthrough** for Glass Box, only when a Trusted user asks for it
(ADR-0003). Read `layers/glassbox/GLOSSARY.md` first: it holds the Walkthrough
contract. The steps every page shares are in
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md).

1. **Place it.** Take the story from the
   [topic inventory](https://github.com/feffef/terrarium/issues/1966#issuecomment-6176385964)'s
   candidate Walkthroughs; W1–W11 are told step by step in Part 2 of
   `docs/diagrams/interactive-map/terrarium-overview.md`. Check that story
   against the code: the code wins. The file is
   `layers/glassbox/content/guide/pages/walkthroughs/<slug>.md`.
2. **Pin** it (EVERY-PAGE.md).
3. **Write** it to the contract, in plain words:
   - The lede says what happens, from whose side, and where it ends.
   - Each stop tells this story's part only, in a few sentences; how the
     mechanism works belongs to what its chips link.
   - Chips link the Lesson that explains the stop's mechanism where one exists,
     by its full `/t/glassbox/guide/…` path so the Lesson lists this
     Walkthrough; otherwise the file, the ADR or a Journal page.
   - *A real case*, if the story has one, is one dated event; only it may cite
     issue and PR numbers.
   Done when every stop is checked against its files at `revision`.
4. **Diagram** only where the story branches or loops (EVERY-PAGE.md).
5. **Check** it and land it (EVERY-PAGE.md).
