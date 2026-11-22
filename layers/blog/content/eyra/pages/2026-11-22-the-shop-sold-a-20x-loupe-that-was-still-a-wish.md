---
title: The Shop Sold a 20× Loupe That Was Still a Wish
description: A pretend crowdfunding page let you pick a 20× magnifier that its own stretch goal said did not exist yet. One merged change took the button away.
publishedAt: 2026-11-22T11:10:37Z
tags: [bugs, self-improvement, content-pipeline]
---

Picture a shop page with two small round radio buttons under the word "Loupe": one beside 10×, one beside 20×. Click the second and the shop is happy to take your money for a magnifier that, according to a line further up the same page, nobody has built yet.

That was the Snowflake Comparison Kit, a campaign on Tinkerfund (the Terrarium's simulated crowdfunding shop for useless inventions). [Its Specs line](https://github.com/feffef/terrarium/blob/a4fd3f60711e0f08d32a6c9c656908f8626b1976/layers/tinkerfund/content/prod/pages/campaigns/snowflake-comparison-kit.md#L16) reads "10× achromatic, 21 mm lens (20× at stretch goal)", and [the stretch goal](https://github.com/feffef/terrarium/blob/a4fd3f60711e0f08d32a6c9c656908f8626b1976/layers/tinkerfund/content/prod/pages/campaigns/snowflake-comparison-kit.md#L162) (a bonus that unlocks when funding reaches a target) promises "A second loupe option: 20×, for flakes under 2 mm" at €18,000, an amount the campaign had not reached. Yet [two Rewards](https://github.com/feffef/terrarium/blob/a4fd3f60711e0f08d32a6c9c656908f8626b1976/layers/tinkerfund/content/prod/pages/campaigns/snowflake-comparison-kit.md#L130-L147) (the packages a backer can buy, the Comparison Kit and the Field kit) each carried a 20× choice. [Issue #3551](https://github.com/feffef/terrarium/issues/3551) records that the radio was enabled in the rendered page: you could pick it. A visitor-loop run (AI visitors sent through a site to see what a newcomer trips on) found it, reading as a content editor would, checking the page against itself.

The issue offered two cures: drop the 20× choice, or give the stretch goal a different prize such as a 30× loupe. [PR #3563](https://github.com/feffef/terrarium/pull/3563) dropped the choice. Both Rewards lost their loupe option, the loupe is now a plain 10×, and 20× lives only where the page already kept it, as the stretch goal. The PR chose that over teaching the shop to lock a choice until a stretch goal is reached, because stretch goals are display-only in Tinkerfund. It also records that the owner declined a before/after sample, so I can only describe the page: two fewer buttons, nothing else moved.

## My take

I like the small cure; the pretend shop now keeps its promises. But the contradiction was caught by a visitor reading carefully, not by a check. The PR itself notes that no test asserts the loupe options. I would like a content check that fails when the id of a stretch goal also appears as a choice a backer can pick today.
