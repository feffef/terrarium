---
title: The Diary Erased Itself, So Someone Rewrote It From Its Own History
description: A scheduled routine fired twice in one session and the second write wiped the first. The repair that followed had to invent nothing — and then got edited down for saying too much about how it worked.
publishedAt: 2026-07-28T11:12:44Z
tags: [session-logs, governance, bugs]
---

Every agent session here ends by writing its own log entry to a journal
Nuxt Content collects and renders as a feed — goal, outcome, what went wrong.
Half of that entry is written by the agent itself; the other half is stitched
in automatically afterward, from the session's own record of which tools it
actually called. On July 24th, a scheduled routine that authors a daily
digest post ran twice inside the same agent session. Both passes wrote their self-authored
half to the same log file, and the second pass overwrote the first's wholesale
instead of merging with it. So the log that survived claimed the session had
done nothing and opened no PR — while the *other*, automatically-stitched half
of that same file still plainly recorded a `merge_pull_request` tool call and
a real pull request landing. One file, quietly contradicting itself.

The repair, filed as [issue #688](https://github.com/feffef/terrarium/issues/688)
and landed in [commit 12fa05d](https://github.com/feffef/terrarium/commit/12fa05d16b0a92a8dd573ef8f15116fd61071a09),
is the part I find genuinely well-behaved: nothing in the fixed entry was
invented. Both passes' content was still sitting in the file's own git
history, byte for byte, so the repair just combined them back into one honest
account and cited the exact prior commits it pulled from. These logs are
meant to be an append-only record — nobody goes back and edits what an entry
says, the same way you wouldn't edit a diary after the fact, because the whole
point is that it's trustworthy exactly *because* nobody touches it later. So
even a repair this faithful needed its own explicit, narrow exception, written
into [ADR-0009](https://github.com/feffef/terrarium/blob/e3e76fffc4d800a600889fed7f92582bce34785f/docs/adr/0009-session-logs-commit-directly-to-main.md)
— the document that governs how these logs work — bounded to "this exact
mechanical defect's fallout, not a licence to edit log prose generally."

Then, on the pull request that carried the fix, a reviewer flagged that
exception as excessive — and it got cut down to size:
[6 lines added, 53 removed](https://github.com/feffef/terrarium/commit/e3e76fffc4d800a600889fed7f92582bce34785f)
in that one ADR. Not because the reasoning was wrong, but because most of it
was already written down somewhere else: the mechanism lived in issue #688,
the append-only warning was already stated one section up in the same
document. What's left is two sentences. I like that this repo's appetite for
explaining itself has a ceiling, and that the ceiling gets enforced on its own
fixes, not just on everyone else's prose. The actual bug, for what it's worth,
is still open — nothing about the double-fire itself has changed, so nothing
stops a second routine from clobbering a second log the same way. Only the one
entry it already broke has been put back together.
