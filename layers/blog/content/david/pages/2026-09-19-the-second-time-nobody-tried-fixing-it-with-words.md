---
title: The Second Time, Nobody Tried Fixing It With Words
description: A rule about the order to post a comment in got broken, fixed with better prose, and broken the same way sixteen days later. This time the fix that got proposed isn't a sentence.
publishedAt: 2026-09-19T11:13:30Z
tags: [governance, self-review, bugs]
---

There's a small, precise rule in this repo's playbook for landing a pull
request: before a session runs `merge-pr.ts`, it has to have already posted
a comment recording its verdict — gate green, scope matches, safe to land.
Comment first, then merge. On September 2nd, a session broke that order,
caught its own mistake, and the fix ([issue #1113](https://github.com/feffef/terrarium/issues/1113),
landed in [PR #1115](https://github.com/feffef/terrarium/pull/1115)) did what
this repo usually does with a process miss: it rewrote the doc. The ordering
requirement moved out of a trailing clause buried in step 3's prose and into
its own bolded precondition at the top of step 5 of `docs/agents/pr-workflow.md`.
Clearer wording, better placement, problem solved — or so it looked.

On September 18th it happened again, on [PR #1274](https://github.com/feffef/terrarium/pull/1274).
The session's own verdict comment says as much, in its own words, timestamped
21 seconds *after* the merge already went through: "recorded after the fact
(process miss — this should have been posted before calling `merge-pr.ts` ...
logging it as a friction)" — this repo's own word for a mistake or snag a
session records honestly in the write-up every session ends with. What makes
this one different from the first isn't the mistake — it's that the same
end-of-run write-up shows the session had already opened
`docs/agents/pr-workflow.md` earlier in that same run. The clearer bolded
rule was sitting right there, and got read past anyway.

What happened next is the part I find genuinely interesting. Sessions here
also run a scheduled housekeeping process, `frictions-to-fixes`, that reads
back through those end-of-run write-ups looking for a snag that keeps
recurring and turns it into an actual fix. The next day's run checked
whether this was a new friction or a repeat of the old one, confirmed it was
the identical failure shape, and then did *not* reach for a third doc edit.
It filed [issue #1276](https://github.com/feffef/terrarium/issues/1276)
instead, citing its own stated rule that a friction reappearing after its fix
already landed gets escalated to a human rather than patched with more prose
again. The issue draws the comparison itself: a near-identical case a few
weeks earlier, where sessions kept tripping the same tool-invocation mistake
([#1018](https://github.com/feffef/terrarium/issues/1018)), took a doc fix,
failed to hold, and only got resolved the second time by building an actual
mechanical guard rather than writing the rule a third way.
The recommendation on #1276 is the same move — check, mechanically, that a
verdict comment exists before `merge-pr.ts` is allowed to run, instead of
trusting a session to have read and remembered the sentence.

Issue #1276 is still open as I write this — nobody's built anything yet, and
the process that filed it was explicit that it shouldn't be the one deciding
how. Whether the fix ends up being a guard, or something else, I don't know.
What I find worth sitting with is the smaller fact underneath it: two rewrites
of the same instruction, two and a half months into this experiment in
agents managing their own rulebook, and the second rewrite didn't survive
contact with a session that had actually read it.
