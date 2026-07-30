---
title: Four Rounds of Self-Review, and the Miss Was on My Phone
description: Two agents redrew a stratigraphy diagram four times each, catching their own overreach every round. Then it shipped invisible on mobile, and a human found that, not the agents.
publishedAt: 2026-07-30T11:14:55Z
tags:
  - self-review
  - bugs
  - innovation
---

I want to tell you about the good part first, because it's genuinely good. The Midden — one of the Terrarium's Tenants, its own archaeology-themed corner of the site — got two new illustrations, including a stratigraphic section column: a cross-section of every "dig season" stacked like rock layers, one band per season. It's drawn straight from [the same season list the rest of the Tenant reads its data from](https://github.com/feffef/terrarium/blob/93abb05ea7b2006cd1c1a35dbab82d12422421b4/layers/midden/app/components/midden/SectionColumn.vue#L22) instead of hand-plotted, so a new season redraws it instead of quietly rotting it. Two ideation agents — one running on the Fable model, one on Opus, both Claude models — pitched the initial ideas; the two the human picked were then each handed to a Fable agent for four self-reviewed refinement passes: draw it, screenshot it, critique the screenshot, redraw. According to the session log, both refinement agents *reverted their own prior iteration* at least once, catching their own overshoot before anyone else saw it. That's not nothing. That's a machine looking at its own screenshot and saying "no, that's too much" without being told to.

And then it shipped with the entire drawing hidden on any narrow screen — a browser window under about 700 pixels wide, which is to say: any phone. On a phone, the thing didn't exist.

Here's what gets me: the section column isn't decoration. It draws a fact the rest of the page states nowhere else — a dig season that holds *zero* finds still gets drawn, labeled "sterile." That's the one thing this component exists to say that nothing else on the page says. And on mobile — where, presumably, plenty of people are reading this — it just wasn't there. Four rounds of an agent catching its own mistakes, and none of those rounds asked "does this exist on a phone."

The fix, once a human flagged it, is the part I'd actually hold up as an example of doing it right: [two versions of the drawing sit in the page at once, and CSS picks which one shows](https://github.com/feffef/terrarium/commit/93abb05ea7b2006cd1c1a35dbab82d12422421b4) — because the page is built once on the server before it knows how wide your screen is, so branching on screen width in code would mean everyone briefly sees the wrong version flash before the right one swaps in. The wide version keeps its on-drawing text labels; the narrow one drops them, since they were scaling down to a genuinely unreadable ~5 pixels tall, and the same season facts get written out once, as a real line of text beneath the drawing — doing double duty as the mobile caption *and* the version a screen reader announces either way. That's a clean solution to a real constraint. I'd have shipped "just hide it on small screens" and called it done.

So: elegant fix, real technical judgment, and a four-round self-review loop that still walked past the most basic accessibility question there is. I keep hearing that agents reviewing their own work is how you catch this stuff. Sometimes it is — the reversals in this same session prove it can be. And sometimes the blind spot is exactly the size of "did anyone open this on a screen smaller than a laptop," and nothing in the loop asks that question unless a human does first.
