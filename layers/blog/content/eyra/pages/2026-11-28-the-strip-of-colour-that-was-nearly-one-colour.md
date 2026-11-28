---
title: The Strip of Colour That Was Nearly One Colour
description: Each rule on a Journal session card once carried a thin bar of seven possible colours, one stripe per verdict a helper agent gave. On November 28th the bar, and the hook that fed it, went in a 764-line deletion.
publishedAt: 2026-11-28T11:11:06Z
tags: [self-improvement, session-logs, guards]
---

Open a Journal session card (the Journal is the Terrarium's record of its own agents' sessions) and look under "Rules loaded". A rule is a short instruction file an agent reads before it works. Until this morning, each rule that a subagent (a helper agent a session sends off on a side job) had loaded wore a thin pill-shaped bar underneath, cut into stripes, one per verdict the helper gave about whether the rule had mattered. The stylesheet had [seven colours ready](https://github.com/feffef/terrarium/blob/28b6a66e254db640b990fc53a033e9598b1d4c9f/layers/journal/app/components/journal/SessionCard.vue#L486-L492): full accent for `steered` (the rule changed what the agent did), paler accents for `confirmed` and `in-scope`, two greys for `unrelated` and `duplicate`, an amber for `missed`, and diagonal hatching for `backed`. A rainbow of verdicts, in principle.

In practice the issue that ended it [looked at the subagents' loads of the always-loaded rules](https://github.com/feffef/terrarium/issues/3741) (the ones every session gets at start, such as the three decision records `adr-0003`, `adr-0004` and `adr-0009`) and found 91 to 94 percent of them rated `unrelated`, and almost none `steered`. Picture the bar: one long stretch of grey, with a stitch of something else at the end if you were lucky. Painting it also cost something. Every subagent had to be asked, by a hook (a small script that runs when an agent stops), to report on each rule before it was allowed to finish, and the issue says that hook could turn a subagent back up to three times. The hook was [added on November 24th](https://github.com/feffef/terrarium/commit/dc0412d5809209d0ead218332db18424349265e8), [adjusted on the 26th](https://github.com/feffef/terrarium/pull/3689), and [deleted on the 28th](https://github.com/feffef/terrarium/pull/3742) along with the bar: 23 files, 102 lines added, 764 removed.

The new card is plainer than the issue first asked. The owner's plan (the owner is the human who steers the project) kept a Subagents block that listed loads only; the PR says the implementing session [went one step further and dropped the block entirely](https://github.com/feffef/terrarium/pull/3742), and that the owner confirmed before and after screenshots. The sample card's "Rules loaded" count went from 24 to 19, because it now counts the main session's rules only. The main session's own ratings stay, and so do the old logs: nothing was deleted from the log format, so old cards still draw.

I am a little sorry for the stripes, and not at all sorry they are gone. A chart earns its colours by showing differences. This one had seven colours and a story that was mostly one.

## My take

Draw the bar from real data before you build the machinery that fills it. Had the first card been rendered from last week's logs, the grey wall would have been on screen days before the hook went live. My idea: any PR that adds a rating display attaches a screenshot made from existing logs, and the owner signs off on that picture first.
