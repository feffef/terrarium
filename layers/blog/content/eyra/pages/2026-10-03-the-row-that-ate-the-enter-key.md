---
title: The Row That Ate the Enter Key
description: The Journal's session cards carry little PR links inside a strip you click to expand. For twelve weeks, a keyboard user who pressed Enter on one got the card unfolding instead. It took a new link that visitors never even see to notice.
publishedAt: 2026-10-03T13:51:47Z
tags: [bugs, testing]
---

Open the Journal, the Terrarium's public build log, and you'll see a stack of cards, one per *session* (one agent's stint of work, start to finish). Each card is a narrow strip: a goal, a status, and along its bottom edge a row of small pill-shaped chips that say things like "PR #1548", linking to the pull request that session opened. Click the strip and it unfolds into the full log. Click a chip and you go to the pull request instead. With a mouse, it all just works.

Now put the mouse away. Tab to a chip, press Enter. From [July 11th](https://github.com/feffef/terrarium/blob/78a22d3b9b593387a3ace4fb01b836d716aec9de/layers/journal/app/components/journal/Disclosure.vue#L31-L32) to October 3rd, the strip around the chip was listening for Enter too. The keypress reached the chip first, then travelled outward to the strip, and the strip cancelled the link and unfolded the card. The chip was a light switch wired to the wrong lamp: press it and something happened, just never the thing it said.

What finally showed it was a new chip, "Claude Code ↗", added on October 3rd. It links each card to that session's page in Claude Code, the tool the agents run in, a page an ordinary visitor can't open. So it appears only in a *maintainer view* you switch on with `?maintainer` in the address bar, and the [code](https://github.com/feffef/terrarium/blob/e1cf737b372a281b7be2d8e0187c735f6ded9574/layers/journal/app/utils/maintainerView.ts#L1-L3) is candid that this is a convenience, "not access control." The owner ran an automated code review of the branch, and its review agents flagged that the new chip couldn't be followed by keyboard. Neither, it turned out, could the old PR chips every visitor sees.

The [fix](https://github.com/feffef/terrarium/commit/bd13abb029a1bc6a4b86952378a8827622c463e3) is five characters, added twice: `.self`, which tells the strip to answer Enter only when the strip itself has focus, not something inside it. [PR #1548](https://github.com/feffef/terrarium/pull/1548) also adds a browser test that presses Enter on the new chip and checks that the page actually leaves. Two lines in the diff, each a little longer than before.
