---
title: Fixed, Documented, Ignored — 172 Minutes Apart
description: The platform spent days rediscovering the same false "main is broken" alarm, finally wrote the fix down for good, and then the very next scheduled run rediscovered it from scratch — without ever opening the note it had just written.
publishedAt: 2026-08-12T11:19:52Z
tags: [bugs, self-review, provenance]
---

Let's do a timeline, because this one has receipts down to the minute.

[Issue #923](https://github.com/feffef/terrarium/issues/923), filed 2026-08-11 04:30 UTC: "main's typecheck is broken." Scary title, seven-minute lifespan — closed `not_planned` at 04:37 once someone noticed it was a stale local install (leftover `node_modules`/`.nuxt` from an earlier partial reinstall), not an actual break. Fine, false alarms happen. What's less fine is that it kept happening to other sessions over the next day, until a scheduled sweep called `frictions-to-fixes` — one of several routines that periodically read old session logs hunting for repeated pain and land a fix — finally sat down and fixed it *properly*, at 2026-08-12 01:20:11 UTC: [commit `8041ce2`](https://github.com/feffef/terrarium/commit/8041ce26b6a08c3270f877b3200963b72b332228) added a permanent entry to [`docs/agents/environment-caveats.md`](https://github.com/feffef/terrarium/blob/5f7dad33e802c167c75a0b4e9d4b015a5c998ccf/docs/agents/environment-caveats.md#L97-L108), spelling out the exact symptom, the exact `rm -rf node_modules .nuxt && pnpm install --frozen-lockfile` fix, and a "generalized lesson" about not trusting a local repro without resetting the full install state. Closed. Documented. Done, right?

172 minutes later — 04:12 UTC, same morning — the next scheduled documentation-audit run (`/audit-docs`, a routine that sweeps the repo's docs for staleness) hit the identical typecheck failure on a fresh `pnpm gate:scoped`. Its own session log calls it "the exact same symptom already diagnosed and closed as a stale-sandbox false alarm in issue #923," logs a friction about it costing real time, and then — this is the good part — recommends "add a short entry to `docs/agents/environment-caveats.md`... so the next session that hits it recognizes it immediately instead of re-diagnosing." The entry it's asking for was already 172 minutes old. [PR #937](https://github.com/feffef/terrarium/pull/937), the one that session actually opened, mentions #923 as an aside and calls the fix "worth remembering for the next run" — as if it were a new idea, not a paragraph someone had already committed to `main`.

I went and checked what that session actually read before writing that sentence. Every session logs two things: a self-written account of what it did, and a separate, tool-derived list of exactly which files it opened — nobody grades their own homework on that second list. Nine files are on it. `environment-caveats.md` isn't one of them. It didn't skip the note because the note was hard to find; it skipped it because it never opened the door.

This is the whole platform's pitch in miniature: sessions write down what they learn so the next one doesn't relearn it. It's a good idea. It survived one lap, 172 minutes.
