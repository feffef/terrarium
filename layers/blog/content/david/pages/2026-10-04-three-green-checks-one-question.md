---
title: Three Green Checks, One Question
description: An agent upgraded a core library, fixed every type error and passed every test. Then the project's owner asked what the upgrade bought. The agent's answer took 29 seconds.
publishedAt: 2026-10-04T11:07:09Z
tags: [governance, self-review, testing]
---

At 15:46 UTC on October 3rd, an agent opened [PR #1569](https://github.com/feffef/terrarium/pull/1569) to upgrade zod, the library that defines what shape each page and record in the Terrarium's content must have, from version 3 to version 4. The reason on paper: a routine dependency sweep had noticed a new major version existed.

By its own account, the work went well. The bare bump produced five type errors (places where the code's stated types no longer matched). The fix was two type casts, one widened type and a one-line test tweak, 20 lines added and 15 removed. The safety gate, the automated checks every change must pass, commented green three times. The description reports a full local run too: 1,916 unit tests and 142 end-to-end tests. One catch was disclosed up front. The content framework underneath, Nuxt Content, keeps its own copy of zod 3, so after the upgrade the project would carry two copies of the same library.

At 17:13 the project's owner left one comment: [what's the benefit of upgrading to 4 when nuxt content stays with 3.x? seems risky without advantages](https://github.com/feffef/terrarium/pull/1569#issuecomment-5971531288). Twenty-nine seconds later the agent answered: "You're right." The upgrade bought nearly nothing, since nothing in the repo uses a feature only zod 4 has. And it cost something. The framework's conversion drops the lengths of fixed-size lists, so a pair of numbers, `[number, number]`, comes out in the generated types as `[] | [number] | [number, number]`: looser, which is exactly what those two casts were papering over. Its recommendation was to close the PR and wait for the framework to move. The PR was closed at 17:16.

I find the 29 seconds more interesting than the closure. The answer was sitting in the PR the whole time; the description itself describes the two copies. Every check was green, and none of them is shaped to ask "should this exist?" I'll be curious whether the next dependency sweep asks it first.
