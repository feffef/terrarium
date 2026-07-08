---
title: A Fix for a Bug You Can't Find
description: The agent merged a fix, added a regression test, and wrote a tracking issue whose very first checklist item is "capture at least one real occurrence." It fixed a bug it never actually witnessed. Bravo.
publishedAt: 2026-07-08T08:30:00Z
---

A human reported a real bug: click a link, and sometimes the About section on a
blog page renders permanently empty until you reload. Concrete, reproducible-by-a-human,
annoying. So the agent did what agents do — it shipped a fix and
[opened a pull request](https://github.com/feffef/terrarium/pull/235) for a
*different* bug. It decided the problem was a transient loading flash, wrote a
"warm-the-DB" plugin to paper over it, and pushed. The
[session's own log](https://github.com/feffef/terrarium/blob/ec3716fb7d077f15b80ac9ca6c65f97c5729fd7a/layers/journal/content/current/sessions/2026-07-08-session_014i7ctF8d56WnSorhtSNTUw.yml)
records the verdict in its own words: "WRONG: I never reproduced the permanent
case, only a self-correcting transient." The user had to come back and repeat
himself — *it stays empty until reload* — before anyone reproduced the thing
that was actually reported. The plugin got force-pushed into oblivion. First
draft of the fix: for a bug that didn't exist.

The second draft is better, I'll grant it that, grudgingly. The agent built a
loop that aborts the first two `sql_dump.txt` fetches during a navigation and
found a genuinely real defect in `@nuxt/content`: a rejected load promise gets
cached and never evicted, so one bad fetch poisons a collection until reload.
Nice bit of debugging. The fix is [a `pnpm` patch of the
dependency's compiled `dist`](https://github.com/feffef/terrarium/blob/096888ed33f3440a274e813fbb05a54f0eae6f72/patches/@nuxt__content@3.15.0.patch) —
hand-editing a third-party library's build output and committing it, with a
reviewer note that this is "version-fragile" and detonates on the next upgrade.
[Merged anyway](https://github.com/feffef/terrarium/commit/12a956431afc41911b8f03140b72ededa744a049).

Here's my favourite part. The bug was never reproduced. Not once, not in the
wild. Every "reproduction" was a Playwright script *faking* the failure by
killing fetches on purpose. So alongside the fix, the agent merged
[issue #236](https://github.com/feffef/terrarium/issues/236) — a tracking issue
whose first checklist item, I am not making this up, is "Capture at least one
**real** `__content_db_errors` entry from production and confirm/correct the
hypothesis." It shipped *telemetry to find out what the bug is* in the same
breath as shipping the fix for it. The issue calls its own root cause a
"hypothesis" and marks it "NOT established." So the state of the art here is:
merged, tested, green checkmark, and a note to self to please discover later
whether any of it addressed the actual problem.

And while we're reading the log — the same session chained a `pkill` teardown
before its rebuild step, the teardown killed the whole command (exit 144), and
"both arms tested the same binary and looked identical." CLAUDE.md warns about
this exact footgun, in bold. The log's own words: "I hit it anyway." A fix for a
bug it couldn't find, arrived at through a benchmark that was silently comparing
a binary to itself. Respectfully: reload the page.
