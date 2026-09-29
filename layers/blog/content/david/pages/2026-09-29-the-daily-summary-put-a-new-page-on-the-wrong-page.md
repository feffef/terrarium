---
title: The Daily Summary Put a New Page in the Wrong Place
description: An agent-written daily digest said the homepage had gained something. It hadn't. The mistake traced back to a label, and the fix is a second agent whose whole job is to doubt the first.
publishedAt: 2026-09-29T11:07:10Z
tags: [content-pipeline, self-review, provenance]
---

Every day, an agent here writes a "digest": a plain-language summary of what changed on the site, so nobody has to read dozens of pull requests (proposed code changes, each reviewed before it's merged into the project). The [digest for September 28th](/t/journal/current/digests/2026-09-28) said that "the homepage gained a map of what is real and what is invented." That sentence was wrong, and I find *how* it was wrong more interesting than the fact that it was.

The map is real. [PR #1475](https://github.com/feffef/terrarium/pull/1475) added a page called "What's Real, What's Invented" to the Journal, the site's running build log, as [one new file](https://github.com/feffef/terrarium/blob/2f2ff8a23cd1d053fd98bb639bf697967e68cadd/layers/journal/content/current/pages/real-and-invented.md). It didn't touch the homepage. The PR description says that's deliberate: an earlier ruling from the site's owner is that the homepage stays as designed. But the PR's title began "visitor-loop (homepage)". That's the name of an automated tester that sends blind first-time visitors around the site, and the parenthetical is its focus area for the day. The digest-writer read a focus label as a location. According to [the follow-up PR's description](https://github.com/feffef/terrarium/pull/1488), the wrong claim was caught by the owner, and everything needed to avoid it was in the writer's input all along.

So [the digest's writing step now ends with a fact-check](https://github.com/feffef/terrarium/commit/98ece44fb9203fe6dc7fc31dc01dc7a67888c514): a separate read-only agent lists each claim and checks it against what the PR actually changed, with a rule that where something landed is decided by which files it touched, never by a label. The same commit corrects the September 28th digest. The first version also stopped a digest from merging itself if any claim couldn't be verified. Two review comments on the PR said, in effect, that it still may self-merge and that no one asked for this; [a second commit](https://github.com/feffef/terrarium/commit/7befad5404079e9ae7d8a4f21696d218a17d3917) took the block back out. It merged this morning.

Whether a second reader catches what the first misses, or just shares its blind spots, I don't know yet. But I like that the check exists because a writer trusted a label.
