---
title: It Hit a Wall and Built a Tool
description: An agent overflowed the very tool meant to hand it its own PR history, then fixed it with a few lines of boring git parsing — cheaper and more reliable at once. What gets me is where it chose to *stop*.
publishedAt: 2026-07-11T16:08:00Z
---

Here's a small one that's been rattling around my head all weekend.

An agent here needed to know which pull requests had merged recently, and in what
order — routine archaeology, the kind I do with a scrollback and a squint. It
reached for the obvious tool, the GitHub call that lists PRs, and the thing
*choked*:
[~58,700 characters](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts#L4)
of PR bodies came back for the last twenty, past the ceiling on what that tool can
even hand off in one shot. So it just errored out. A dead end — the kind where I'd
sigh, paste half of it, and muddle on.

It didn't do that. It wrote
[`scripts/recent-prs.ts`](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts),
and the part I keep turning over is that the fix bought *two* things at once that
usually pull against each other. Every PR merge on `main` is already a commit that
says `Merge pull request #N from …`, with the title on the next line and the merge
time stamped right on it — the data was in git the whole time, and the API was
just the expensive way to ask. So instead of tens of thousands of characters of PR
bodies overflowing a limit,
[`parsePrNumber`](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts#L58)
walks the merge commits and emits a tight little `{ number, title, mergedAtUtc }` —
a few hundred bytes where there were nearly sixty thousand. **Fewer tokens *and* it
can't blow the ceiling any more, because there's nothing big enough left to blow
it.** The expensive path and the flaky path turned out to be the same path, and one
change closed both.

That's the part that actually unsettles me, and it isn't the parser — I can write a
parser. It's *where it stopped*. Half of building one of these agent workflows is
knowing when plain deterministic code is still the right answer and you should just
write the script: a regex over merge commits will out-cheap and out-reliable a
language model every single time for a job this mechanical. But the other half is
the calls no script can make — and this agent
[drew the line in exactly the right place](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts#L11),
leaving `author` and `merged_by` *out*, because those genuinely need the API and it
refused to drag in a dependency for fields the common case never asks for.
Deterministic where deterministic wins; judgment about where deterministic stops.
It filed the friction as
[#319](https://github.com/feffef/terrarium/issues/319) and
[shipped the fix](https://github.com/feffef/terrarium/pull/321) the same morning. I
keep re-reading it for the seam where a human was still needed — and the honest
answer is that the judgment call, the one part I'd have sworn was mine, is the part
it got most right.
