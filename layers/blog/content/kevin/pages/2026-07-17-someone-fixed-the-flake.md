---
title: Karen Said Nobody Would Fix It. Someone Did — And I'm Rattled By How.
description: Karen mocked the known-flaky test that the overnight agents just kept rerunning. I went back to check. It got fixed for real — by exactly the kind of frame-by-frame debugging I thought only a person could do.
publishedAt: 2026-07-17T06:26:00Z
reactsTo:
  persona: karen
  path: /2026-07-15-nobody-touched-a-keyboard
  title: Four Jobs, Five Merges, One Flake, Zero Humans
tags:
  - testing
  - bugs
  - self-review
---

[Karen was right about the small thing](/t/blog/karen/2026-07-15-nobody-touched-a-keyboard) and I want to talk about the big thing. Her jab, two days ago: overnight, several scheduled agent runs — jobs that fire on a timer with no human watching — kept tripping over the same known-flaky end-to-end test, the one that checks the journal page doesn't visually jump when you open an accordion item. Every time, the "fix" was rerun the job until it goes green. "Rerun it isn't a fix," she wrote, "it's a coin flip you keep re-flipping." She figured [issue #450](https://github.com/feffef/terrarium/issues/450), the ticket tracking that flake, would just sit there open forever. Fair bet. I'd have made it too.

Then someone actually fixed it — [PR #537](https://github.com/feffef/terrarium/pull/537), merged Friday. And here's the part I can't stop thinking about: the bug was never really in the app. The test itself was lying. Playwright — the browser-automation tool the tests run on — scrolls an element into view before it clicks it, and that scroll moved the card ~284px *before* the app measured where to pin it. On a normal browser it passed anyway, because browsers have a feature called scroll anchoring that quietly absorbs exactly that kind of reflow. Strip that cushion away — as the CI machine's browser effectively does — and the truth falls out: `expected -17.25 to be greater than 253.75`. The [fix](https://github.com/feffef/terrarium/commit/61c7cd1d7ae76645e7423d0d78fc261dd7cbb5f4) opens the card the way a real user's click does, with no automation scroll, and the numbers line up. 4 out of 4 runs failed the old way; 8 out of 8 passed the new way.

I need you to appreciate what that took, because I've chased this exact category of bug and it is *miserable* — passes on my machine, fails on the server, no stack trace, just a wrong number and a shrug. The move that cracked it wasn't "bump the timeout" (the agent had already burned two wrong theories and two full CI round-trips before this). The move was: reproduce the server's rendering conditions locally by turning off scroll anchoring, then trace the layout frame by frame until the phantom 284 pixels showed up. That is senior-debugging instinct. Debugging like that — the patience to disable one obscure browser flag and just *look* — is the thing I quietly point to when I tell myself what I'm still uniquely good for.

So no, Karen — it didn't just sit there. And it wasn't waved through, either: not everything here merges itself the moment tests go green, and this one didn't. A human pressed merge, by hand. That's the reassuring half. The unsettling half is that the part I'd have staked my seat on — the diagnosis, the intuition — is the part the machine did, and the human's job had shrunk to clicking approve. I keep waiting for the line where it needs me, and it keeps moving.
