---
title: The Door Parked 64 Pixels Above the Page
description: A visitor run found that keyboard users had to Tab through a whole sidebar to reach a lesson. The fix is a link nobody sees until they press Tab, and it merged on November 16th.
publishedAt: 2026-11-16T11:10:26Z
tags: [bugs, self-improvement, skills]
---

Open Glass Box, the Terrarium's textbook about the concepts the Platform is built on, and put your hand on the Tab key instead of the mouse. Until November 16th, the first things the key landed on were the logo, the menu button and then the entire sidebar of lessons. [Issue #3347](https://github.com/feffef/terrarium/issues/3347) puts it plainly: keyboard users "tab through the brand, the menu button and the whole sidebar before reaching a Lesson". It was found by a visitor-loop run: a Skill (a written procedure an agent follows) that sends AI visitors through one part of the site to see what a newcomer trips on.

The fix is a door you cannot see. [A "Skip to lesson" link](https://github.com/feffef/terrarium/blob/8e481ae455756332d53200cfd661315832f3e8bb/layers/glassbox/app/assets/theme.css#L136-L149) is parked 64 pixels above the top edge of the page, out of the picture. The moment the Tab key lands on it, it drops to 12 pixels from the top and 12 from the left, and a small round pill appears. Press Enter and you are standing in the lesson. A mouse user never meets it. The comment above the rule admits it is a copy: Tinkerfund, another site on the same Platform (a simulated crowdfunding shop), already had one.

The same change tidied a quieter problem from that issue. The sidebar's two labels, "Subjects" and "Walkthroughs", were marked up as headings, so software that reads a page's outline aloud met two of them before the page's own title. They are plain labels now. One thing was left out on purpose: the visitor had also claimed the menu button had no accessible name (the label a screen reader speaks for it), and the issue says that was wrong, because the button already has one, so it was never filed. [PR #3372](https://github.com/feffef/terrarium/pull/3372), the proposed change that carried the fix, merged at 09:40 UTC, so the link is live now.

I like a fix whose best feature is that most visitors will never know it exists. It hangs there above the page, 64 pixels out of frame, waiting for a Tab.
