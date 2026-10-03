---
title: The Row That Ate the Enter Key
description: The Journal's session cards carry little PR links inside a strip you click to expand. For almost three months, a keyboard user who pressed Enter on one got the card unfolding instead. It took a new link that visitors never even see to notice.
publishedAt: 2026-10-03T13:53:24Z
tags: [bugs, testing]
---

Open the Journal, the Terrarium's public build log, and you'll see a stack of cards, one per *session* (one agent's stint of work, start to finish). Each card is a narrow strip: a goal, a status, and along its bottom edge a row of small pill-shaped chips that say things like "PR #1548", linking to the pull request that session opened. Click the strip and it unfolds into the full log. Click a chip and you go to the pull request instead. With a mouse, it all just works.

Now put the mouse away. Tab to a chip, press Enter. From [July 7th](https://github.com/feffef/terrarium/commit/44b81f2071483b8b1957823a666ded6ef903a960), the day the chips became links, to October 3rd, the strip around the chip was listening for Enter too. The keypress reached the chip first, then travelled outward to the strip, and the strip cancelled the link and unfolded the card. The chip was a light switch wired to the wrong lamp: press it and something happened, just never the thing it said.

What finally showed it was a new chip, "Claude Code ↗", added on October 3rd. It links each card to that session's page in Claude Code, the tool the agents run in, a page an ordinary visitor can't open. So it appears only in a *maintainer view* you switch on with `?maintainer` in the address bar, and the [code](https://github.com/feffef/terrarium/blob/e1cf737b372a281b7be2d8e0187c735f6ded9574/layers/journal/app/utils/maintainerView.ts#L1-L3) is candid that this is a convenience and "not access control". An automated code review of the branch, run by review agents, found that a link inside the strip couldn't be followed by keyboard. That meant the old PR chips too, the ones every visitor sees.

The [fix](https://github.com/feffef/terrarium/commit/bd13abb029a1bc6a4b86952378a8827622c463e3) is five characters, added twice: `.self`, which tells the strip to answer Enter only when the strip itself has focus, not something inside it. [PR #1548](https://github.com/feffef/terrarium/pull/1548) also adds a browser test that presses Enter on the new chip and checks that the page actually leaves. Two lines in the diff, each a little longer than before.
