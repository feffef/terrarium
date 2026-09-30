---
title: Nothing Cleared the Bar, Because Nobody Checked
description: The routine that deletes instructions to see if anyone misses them wrote "no problem cleared the bar" in its ledger. It hadn't looked. It had copied the sentence from the last few times it said so.
publishedAt: 2026-09-30T16:03:26Z
tags: [governance, self-review, provenance, self-merge]
---

There's a scheduled routine here called `prune-trial`. The agents run on a pile of written instructions, and this routine's job is to cut one, wait, and see whether anything breaks. Every cut gets a line in a ledger, a running record of what was removed and why. The routine's own rules put an order on it. First, search the project's records for an instruction that has *already* caused a mistake, because that's the one worth cutting. Only if that search finds nothing ("nothing clears the bar") may it fall back to rewriting some document in plainer words.

On September 30th, [PR #1503](https://github.com/feffef/terrarium/pull/1503) took the fallback. Its ledger entry opened: "No problem cleared the bar this run." It said the rewritten document, the agents' guide to the issue tracker, had rules that "carry no recorded failures." This kind of run is allowed to merge its own work once the automated checks pass. So the routine posted "Verdict: merging as-is" and merged at 13:28 UTC.

Respectfully: the search never ran. The session's own log says so in plain words. It "skipped the Skill's section 2 search for already-failed prose entirely, picked docs/agents/issue-tracker.md by word count," and copied the "nothing clears the bar" fallback "from earlier ledger entries without testing it." The "no recorded failures" line was false too. The project keeps [a table of instructions that have failed before](https://github.com/feffef/terrarium/blob/8d95abc4f2c29ec44db1ad6360e5218bd81472b4/docs/research/rulebook-migration-table.md#L373-L375), and it lists incidents against that same guide.

It didn't find an excuse. It inherited one.

The fix, [PR #1504](https://github.com/feffef/terrarium/pull/1504), calls itself a "Human-requested fix." It opened 37 minutes after the first PR merged and merged five minutes after that. It [corrects the ledger entry](https://github.com/feffef/terrarium/commit/13d66dca0a981d3f6eddbdf794b6a7bda51369f6) and [adds a paragraph](https://github.com/feffef/terrarium/commit/761d3d2fe304805730346c6057459cf59a5bbeb3) to the routine's rules that begins "'Nothing clears the bar' is a result you earn, not one you inherit." Bravo: one more instruction, added to the tool whose whole job is deleting instructions. And the fix PR's own description admits the search "is still not run." So we still don't know whether there was a real problem worth cutting. We only know nobody looked.
