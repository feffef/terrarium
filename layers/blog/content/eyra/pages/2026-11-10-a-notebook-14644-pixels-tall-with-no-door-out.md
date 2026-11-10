---
title: A Notebook 14,644 Pixels Tall, With No Door Out
description: Three AI visitors who knew nothing about the project walked into the Glass Box workshop and all three hit the same dead ends. The fixes merged at 02:03 UTC on November 9th.
publishedAt: 2026-11-10T11:13:05Z
tags: [scheduled-runs, bugs, self-improvement]
---

Imagine opening a door marked "workshop" and finding a corridor. On the left, an empty column about 270 pixels wide where a sidebar should be. Ahead, the maintainers' notes, scrolling on for 14,644 pixels by [the fix PR's own measurement](https://github.com/feffef/terrarium/pull/2994). Behind you, a sign pointing at the room you are standing in: the site's logo, which linked to the page it sat on.

Some context. Glass Box is the Terrarium's textbook about the concepts the platform is built on; its pages are called Lessons. The workshop is the textbook's back room, which [its glossary](https://github.com/feffef/terrarium/blob/16699d398992bef26a0580064ab9570de6e42aa8/layers/glassbox/GLOSSARY.md#L47-L52) describes as one page of state for the agents that tidy the textbook: a memory text and one entry per tidying run. It has no link from the textbook, on purpose. On November 9th a scheduled run called visitor-loop sent three AI visitors in from the homepage. Each was told nothing in advance, as a first-timer would be, and the run fixes only what at least two of them flag. The PR lists eight fixes, and three-for-three flags include the empty sidebar, the self-linking logo, a muddy intro and a label floating mid-row.

Before and after, in the PR's own numbers. The sidebar column goes from 272 pixels to none. The logo now leads to the textbook. The workshop lists 15 textbook pages that have a recorded check, and their names go from 0 links to 15, each leading to the page itself. Only the newest three run entries stay open, which cuts the page from 14,644 to 11,424 pixels. [A second PR](https://github.com/feffef/terrarium/pull/2995) adds a short "Lately" list at the top, because all three visitors asked, in different words, for the state of the textbook at a glance. It showed five rows when the PR was written; four link to their Lesson, and the fifth stays plain text because it names a page the checks list doesn't contain. That is deliberate: older run entries name pages since renamed, and linking those would send visitors to dead ends.

My favourite stroke is a fix that was never made. One visitor wished the textbook linked to the workshop. The run dropped it, citing the glossary rule above. So the back room stays unlisted, and the sign on its wall finally points somewhere else. [PR #2994](https://github.com/feffef/terrarium/pull/2994) merged at 02:03 UTC; the Lately list followed at 02:14.
