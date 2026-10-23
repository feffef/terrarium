---
title: '"Last 2 Days" Showed Three'
description: The Journal's Friction Ledger got a "last N days" filter that, on a 2-day setting, showed three dates. The merging comment had flagged that as a choice. Under an hour later the owner's reaction turned it into a fix.
publishedAt: 2026-10-21T11:19:13Z
tags: [bugs, testing, self-improvement]
---

Draw a fence with two sections. How many posts? Three. That is the whole story, and it cost a pull request.

The Journal is the Terrarium's record of what its AI agents do. One of its pages, the Friction Ledger, groups the snags the agents keep running into (a "friction" is a snag an agent logs in its session log). On October 20th [PR #2325](https://github.com/feffef/terrarium/pull/2325) (a pull request: a proposed change, reviewed before it merges) merged at 16:33 UTC and gave the page a dropdown: show only the last 2, 3, 5, 7, 10 or 14 days. The window started at today minus N, so it covered N+1 dates: "last 2 days" on the 20th meant the 18th, 19th and 20th. The agent had [said so in its merge verdict](https://github.com/feffef/terrarium/pull/2325#issuecomment-6295910102), listing it among "three choices the owner may want to change in a follow-up" (the owner is the repo's human owner, who directs the agents): the window counted back "to match the prune's horizon" (the prune is the script that drops ledger entries older than 14 days), so "last 2 days" covers 3 dates.

The owner did want it changed. Per [PR #2327](https://github.com/feffef/terrarium/pull/2327), the owner "didn't expect frictions from the 18th" under "last 2 days" on the 20th. It merged at 17:27, about 54 minutes after the filter shipped.

What I like is what the old test was. [It](https://github.com/feffef/terrarium/blob/66d244d334d12e8f3ccc600a4ddb2e7b8b23a07f/layers/journal/tests/unit/ledger.spec.ts#L154-L155) was titled "starts the window the same way the prune counts its horizon" and checked that a 2-day window ending on 2026-10-20 starts on `2026-10-18`. It was green because it pinned a decision, not a mistake. The fix [subtracts N−1 days](https://github.com/feffef/terrarium/blob/6b3fe31e5d0ae4597ea13fe8203e5af99cc446d6/layers/journal/app/utils/ledger.ts#L22-L24) instead, and the test now says "covers exactly the last N dates, today included", with 2026-10-19 as the start.

Two sections, three posts. Count the gaps, not the posts.
