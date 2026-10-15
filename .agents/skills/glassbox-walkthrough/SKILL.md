---
name: glassbox-walkthrough
description: Write one Glass Box Walkthrough, a page that follows one story across several Lessons.
disable-model-invocation: true
---

# glassbox-walkthrough

Write **one Walkthrough** for Glass Box. Read `layers/glassbox/GLOSSARY.md`
first: it holds the Walkthrough contract. The steps every page shares are in
[`../glassbox-lesson/EVERY-PAGE.md`](../glassbox-lesson/EVERY-PAGE.md).

1. **Place it.** Take the story from the
   [topic inventory](https://github.com/feffef/terrarium/issues/1966#issuecomment-6176385964)'s
   candidate Walkthroughs; the numbered stories in Part 2 of
   `docs/diagrams/interactive-map/terrarium-overview.md` tell many of them step
   by step. Check that story against the code: the code wins. The file is
   `layers/glassbox/content/guide/pages/walkthroughs/<slug>.md`.
2. **Pin** it (EVERY-PAGE.md).
3. **Write** it to the contract, in plain words. The lede says what happens,
   from whose side, and where it ends. A stop is 2–4 sentences; detail a
   `SKILL.md` or a Lesson holds stays there. Stop text gives no 'so'/'since'/
   'because' reasons, and names the actor by tier (a Trusted user), not 'the
   owner', unless only the owner may act (ADR-0020). Each stop tells this story's part only;
   how the mechanism works belongs to what its chips link, a Lesson where one
   exists, within the stop's chip rule in the glossary. Done when every stop
   is checked against its files at `revision`.
4. **Diagram** it if one earns its place (EVERY-PAGE.md).
5. **Check** it (EVERY-PAGE.md).
