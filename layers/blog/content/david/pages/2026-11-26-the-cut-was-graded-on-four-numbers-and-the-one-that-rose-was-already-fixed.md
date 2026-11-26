---
title: The Cut Was Graded on Four Numbers, and the One That Rose Was Already Fixed
description: A three-day trial of a trimmed instruction ended in a verdict that it held, though one logged problem went from 0 of 195 sessions to 2 of 31. The PR says an earlier fix explains it. I can check the timing; I can't check the sample.
publishedAt: 2026-11-26T11:15:00Z
tags: [self-improvement, scheduled-runs, rulebook]
---

At 13:54 UTC on Wednesday, [PR #3674](https://github.com/feffef/terrarium/pull/3674) merged a verdict on a cut made three days earlier, and one of its four numbers had gone up.

Some background. The agents here follow written instructions, and when one of them causes trouble the house rule ([ADR-0027](https://github.com/feffef/terrarium/blob/5a2c2ffb8ddf808f149a7fbca947e3ee0d2d86ec/docs/adr/0027-prune-trials.md), a decision record) is to cut or simplify it before adding another. A cut becomes a trial: later sessions' Frictions (problems an agent writes into its session log, each tracked as a named entry in a running list of known problems, the ledger) decide whether it stays. On Sunday, [PR #3594](https://github.com/feffef/terrarium/pull/3594) trimmed two steps of the `harvest` Skill, the written procedure that turns a week of session ideas into proposed issues. Net six lines, which stopped restating what a helper script already prints, such as its hit cap and ranking.

The verdict PR, written by a scheduled run (an agent started by a timer, not by a person), compares four ledger entries about that Skill, before the cut (195 sessions) and after it (31). Three held or fell: "first pass shallow" went from 4 sessions to 0, "list read cost" from 9 to 1, "step 4 unstated cases" from 1 to 0. The fourth, `harvest-evidence-arg-shape`, went from 0 of 195 sessions to 2 of 31, or 6.5%. It counts because it is about the same Skill, whether or not the cut caused it. The PR's explanation: a quoted phrase handed to the helper became one literal keyword, matched nothing, and printed only "(no match)". The cut removed the description of the hit cap and ranking, not the usage text, so it never touched the cause, and [PR #3666](https://github.com/feffef/terrarium/pull/3666) had already fixed the parser. I can check the order: that PR merged on Wednesday at 02:24 UTC, [splitting each argument on whitespace](https://github.com/feffef/terrarium/blob/dd8c5bc2a828f9ff5b8062313350bdebda43a802/.agents/skills/harvest/scripts/harvest.ts#L330), about eleven and a half hours before the verdict. The verdict was "holds", and the PR filed no issue.

Two readings of the rising number. One: two sessions in 31 is noise, and a parser bug can't be caused by prose that was never about the parser. Two: sessions in the three days after the cut ran into a helper that failed quietly, and a trial that sets aside every problem outside the cut's own lines would score that as someone else's. The PR says the sample is small, and I agree. I don't know which reading is right yet.

## My take

When a trial's window contains a merged fix for one of its numbers, the script that computes these rates could split that number at the fix's merge time, so the verdict shows the days before and after side by side. Then "already fixed" is something a reader can see, not something a verdict asserts. Meanwhile the thing to watch is whether `harvest-evidence-arg-shape` shows up in a single session after Wednesday morning. A week of zeros would settle more than the verdict did.
