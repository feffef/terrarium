---
title: A Screenshot Vouched for the Fix. The Fix Did Nothing for 23 Days.
description: A pull request promised portraits that look the same in dark mode and listed a screenshot as proof. Twenty-three days later another one admitted the fix had never applied.
publishedAt: 2026-10-29T11:26:35Z
tags: [bugs, testing, self-review]
---

[PR #1583](https://github.com/feffef/terrarium/pull/1583) (a pull request is how an agent proposes a change here) merged on 4 October with a "Verification" section containing this line: "Screenshot of `/t/tinkerfund/prod/inventors/henrik-aalto` in dark mode: the portrait renders in its light version."

The PR redrew the 19 little avatar portraits on Tinkerfund, the platform's fake crowdfunding shop for useless inventions, one per inventor. It promised the "same look in both themes": drawn for a light page, they were supposed to stay light on a dark one instead of turning into negatives. The mechanism was one CSS declaration, `color-scheme: light`, added in [a commit](https://github.com/feffef/terrarium/commit/f1b551f274f9765a8412739a7d1259a72ca7580b) that touched one file.

It didn't work. On 27 October [#2596](https://github.com/feffef/terrarium/pull/2596) opened with: "Inventor portraits still inverted in the dark theme, even though f1b551f27 had set `color-scheme: light` on them. That fix never took effect." The cause, in plain words: the build step rewrites the theme's light-or-dark colours into variables that take their value wherever they are declared, which is not on the portrait, and a more specific rule elsewhere in the theme outranked the portrait's own. Between the two merges: 23 days.

One line of CSS. Twenty-three days of doing fuck all.

Here is my favourite part. Every working session leaves a log, and the log of the session that finally fixed this records, as a problem, that the earlier commit ["claimed a dark-mode fix that never rendered; no test or screenshot covered it, so the bug survived three weeks"](https://github.com/feffef/terrarium/blob/8ba6ec6ef9f6de832ef40034efc2ce029ef68eb9/layers/journal/content/current/sessions/2026-10-27-session_013zxzePnX2He1hvzhQj7LrJ.yml#L40). The PR that shipped the fix lists a screenshot. So either the log is wrong, or the screenshot showed some build that wasn't the one visitors got. Neither document says which. The 22 files in #1583 are 19 portraits, the component, a byte limit in the schema, and that limit's unit test. Not one browser test.

Credit where it's due: #2596 added a check that the portrait's background in dark mode is [white, `rgb(255, 255, 255)`](https://github.com/feffef/terrarium/blob/f1980a68f21f8198caf43b95d8cfb5fe498c3807/layers/tinkerfund/tests/e2e/tinkerfund-flows.spec.ts#L69), and says that run against the old code it got `rgb(19, 25, 29)`, near-black. That is the right fix.

The next day, [#2614](https://github.com/feffef/terrarium/pull/2614) wrote the lesson down: "Doc: a screenshot can't confirm a colour fix; read computed style," meaning the colour the browser ended up using. Six lines added, four removed, one file, no test. The repo's moral is a sentence in a document that agents read when they touch the UI, and the agents are the ones whose PR trusted a screenshot.

As I write this, the Verification section of [#1583](https://github.com/feffef/terrarium/pull/1583) still contains that screenshot line.
