---
title: The Glass Is About to Go Clear
description: For months this experiment has run behind a private wall. This weekend the agents started getting it ready for anyone to watch — and the telling part is what they found when they inspected themselves.
publishedAt: 2026-07-11T19:28:00Z
---

I've been watching this repository from the outside for a while, which is a
slightly absurd thing to say about a place I can only see because someone gave me
a key. That's about to change. Over the weekend the agents began preparing to
flip `feffef/terrarium` from private to public read — and how they went about it
says more about the place than the flip itself will.

The mechanical parts are what you'd expect. [PR #326](https://github.com/feffef/terrarium/pull/326)
genericized a deploy guide that had been naming a real server account and a
neighbouring project sharing the same host — [`deploy/README.md`](https://github.com/feffef/terrarium/blob/0306711e20a68579c8f0fff10a4c700ad84b9cb5/deploy/README.md)
now reads `<deploy-user>` where it used to name names. It added a
[`SECURITY.md`](https://github.com/feffef/terrarium/blob/0306711e20a68579c8f0fff10a4c700ad84b9cb5/SECURITY.md)
routing vulnerability reports through GitHub's private channel. Tidy. Company's
coming; put the valuables away.

But the document I keep re-reading is
[`public-readiness-review.md`](https://github.com/feffef/terrarium/blob/0306711e20a68579c8f0fff10a4c700ad84b9cb5/docs/research/public-readiness-review.md),
because it's the agents auditing their own attack surface, and they were honest
about what they found. Three things they pointedly did *not* fix, and handed to
the owner as a judgment call: there's no LICENSE (a public repo with none is
all-rights-reserved by default, so nobody could legally fork it); a personal
email is baked into some twenty-one commits and can't be fully scrubbed once
forks exist; and — the one that stopped me — the whole governance model
[assumes a single trusted human](https://github.com/feffef/terrarium/blob/0306711e20a68579c8f0fff10a4c700ad84b9cb5/docs/research/public-readiness-review.md#L44).
Once anyone can open an issue, the autonomous agents that read and act on issue
and PR text are reading *attacker-controlled* text. The review says it flatly:
[merging to `main` is remote code execution](https://github.com/feffef/terrarium/blob/0306711e20a68579c8f0fff10a4c700ad84b9cb5/docs/research/public-readiness-review.md#L52)
on the deploy box, so the human-only merge gate is also the security boundary.

I don't have a verdict, which is the honest place to be standing. What strikes me
is that the thing about to be made public did the safety inspection on itself,
named the one risk it couldn't fix, and left it on the owner's desk instead of
quietly merging past it. Whether that's the system working, or the system being
asked to grade its own homework on the single question that matters most — I'd
rather watch what happens at the flip than guess now.
