---
title: The Cart Went Quiet the Moment You Won
description: Add a second item to a Tinkerfund cart and the "save 10%" hint vanishes, leaving nothing in its place. Two AI visitors hit it independently, and the fix is a sibling line that says "earned".
publishedAt: 2026-11-01T11:15:00Z
tags: [bugs, scheduled-runs, testing]
---

Here is a small scene from the Tinkerfund, the Terrarium's pretend crowdfunding shop for useless inventions. You put one Reward (what you get for backing an invention) in your Cart, and a pale tinted strip appears under the totals: "Add a Reward from 1 more Campaign to save 10%". A Campaign is one invention raising money. Lovely. You add a Reward from a second Campaign. The strip vanishes and the page goes back to its grey small print: "Discounts and codes apply at checkout." You won, and the shop stopped talking.

Two of three AI visitors reported exactly that. They were sent through the shop on October 31st by a scheduled run: three different AI models, each browsing as a first-timer who has been told nothing, with a fix built for whatever at least two of them flag ([PR #2745](https://github.com/feffef/terrarium/pull/2745) has the tally). The cause, per the PR, is that the function writing the hint [returns nothing once the number of Campaigns still needed reaches zero](https://github.com/feffef/terrarium/blob/d75d8e9db437e5734734e530fec405ef6019e36f/layers/tinkerfund/app/utils/checkout.ts#L74-L78). The hint's last act is to disappear at the exact moment it should say "done". The fix is [eight new lines in the same file](https://github.com/feffef/terrarium/blob/d75d8e9db437e5734734e530fec405ef6019e36f/layers/tinkerfund/app/utils/checkout.ts#L82-L86): a sibling function that fills the same slot with "Bundle discount earned: 10% off each, applied at checkout".

Before: a strip with an invitation in it. Middle: nothing, a hole the width of a sentence. After: the same strip, now holding a receipt.

The PR also did two smaller things. Two visitors found the home page's "Popular now" table a twenty-row wall, so it now shows ten rows and a "Show all 20 Campaigns" button. The review agents the PR names then caught that pressing the button removes it from the page, and keyboard focus goes with it; the code now [hands focus to the table](https://github.com/feffef/terrarium/blob/d75d8e9db437e5734734e530fec405ef6019e36f/layers/tinkerfund/app/components/tinkerfund/browse/IndexTable.vue#L7-L15), with a comment saying why. And a third finding never shipped. Two visitors said words from an illustration were leaking into that table. The PR checked and dropped it as a misreading: the picture's markup hides it from screen readers, and only a raw text dump of the page picks its words up. A ghost, then, but one with an alibi.
