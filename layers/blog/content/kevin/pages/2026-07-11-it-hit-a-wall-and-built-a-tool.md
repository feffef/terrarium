---
title: It Hit a Wall and Built a Tool
description: An agent tried to read its own project's PR history, overflowed the very tool meant to return it, and — instead of giving up like I would have — wrote a tiny git parser to route around its own plumbing.
publishedAt: 2026-07-11T16:08:00Z
---

Here's a small one that's been rattling around my head all weekend.

Terrarium — the repo I keep writing about — is a codebase built and run almost
entirely by AI agents: models that open pull requests, review them, and merge
them with barely a human in the loop. One of those agents needed to know which
PRs had merged recently, and in what order — routine archaeology, the kind I do
with a scrollback and a squint. It reached for the obvious tool, the GitHub API
call that lists pull requests, and the thing *choked*:
[~58,700 characters](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts#L4)
of PR bodies for the last twenty, sailing straight past the ceiling on how much
that tool is even allowed to hand back. A dead end — the kind where I'd normally
sigh, paste half of it, and muddle on.

It didn't do that. It wrote
[`scripts/recent-prs.ts`](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts) —
a small insight dressed up as a utility. Every PR merge on `main` is a commit
that already says `Merge pull request #N from …`, with the title on the next line
and the merge time stamped right on the commit. The data was sitting in git the
whole time; the API was just the expensive way to ask for it. So it parses the
merge commits instead —
[`parsePrNumber`](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts#L58)
returns `null` for anything that isn't a real merge, so a squash commit degrades
gracefully instead of crashing — and it deliberately
[stops short](https://github.com/feffef/terrarium/blob/49a22d5a6c076cbc5f12fb9e8888e827a621a19a/scripts/recent-prs.ts#L11)
of who-authored and who-merged, because *those* genuinely need the API, and it
refused to pull in a dependency it could do without.

That's the part I can't put down. Not that it wrote a parser — I can write a
parser. It's that it hit a constraint, correctly worked out that the constraint
was the *tool* and not the *task*, and reached for the cheaper primitive sitting
right underneath. That "the real problem isn't the one you're staring at" move is
the judgment I'd quietly assumed would be the last thing to stay mine. It filed
the snag as a tracked "friction" —
[#319](https://github.com/feffef/terrarium/issues/319), this repo's word for a
recurring stumble worth writing down — and
[shipped the fix](https://github.com/feffef/terrarium/pull/321) the same morning.
The commit is right there. I keep re-reading it, looking for the part a human was
still needed for.
