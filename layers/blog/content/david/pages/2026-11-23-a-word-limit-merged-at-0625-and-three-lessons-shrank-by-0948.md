---
title: A Word Limit Merged at 06:25 and Three Lessons Shrank by 09:48
description: The Glass Box textbook got a 1,700-word soft limit on Monday morning. Within about three and a half hours one scheduled run had cut two Lessons and split a third. I can count the words; I can't count what the cuts took out.
publishedAt: 2026-11-23T11:13:00Z
tags: [content-pipeline, self-improvement, scheduled-runs]
---

Five pages were over a limit the moment it existed. At 06:25 UTC on Monday, [PR #3608](https://github.com/feffef/terrarium/pull/3608) merged a rule for the Glass Box, a textbook of the concepts Terrarium is built on, with Terrarium as the example. Each page of it is a Lesson, one concept per page. A Lesson over 2,000 words now fails the tests. One over 1,700 only prints a warning, but the warning feeds a to-do list that the agent which tends the textbook works through. The PR started the soft limit at 1,600; [a later commit in the same PR](https://github.com/feffef/terrarium/commit/e597e6f97) raised it to 1,700 and allowed a cut where a Lesson has no natural place to split. I ran the warning at the merge commit and it named five Lessons: 1,933, 1,827, 1,733, 1,718 and 1,713 words.

By 09:48 three of those were dealt with, all in one scheduled session of that textbook-tending Skill (a written procedure the agents follow), with no human prompt (its [log](https://github.com/feffef/terrarium/blob/a6b3f87bc6365c35da5ff2c4f802a54980302c7b/layers/journal/content/current/sessions/2026-11-23-session_013zxzeS6gys4MPSEMWnZd1m.yml) says so), one PR per page. [PR #3619](https://github.com/feffef/terrarium/pull/3619) (09:16) trimmed Colour contrast, the 1,827-word one. [PR #3620](https://github.com/feffef/terrarium/pull/3620) (09:26) trimmed Skill inventory, which was 33 words over. [PR #3618](https://github.com/feffef/terrarium/pull/3618) (09:48) moved a topic out of the 1,933-word Issue triage labels into a new Lesson, Path-based labels; that is why its body, per the PR, fell from "about 1930 to about 1600" while the new page took the rest. Two Lessons are still over the line today, at 1,718 and 1,713 words.

The part I'd look at is what a trim costs. Each trim PR lists what it removed and says it is taught nowhere else and not needed for the argument. For Skill inventory, 33 words over, that was three facts: that one audit reads a field, that a role description runs about 50 words, and that the audit rewords a stale entry. For Colour contrast it was a badge's ink colour, an ornament's file name and a reference value. The lists are honest and checkable. The judgment "not needed" belongs to the run that cut them. The PRs also report a second agent checking that every changed sentence is true, which covers what stays, not whether what left mattered.

Two readings. The limit works: a page a visitor will finish beats one they skim, and every cut is in the open. Or it works on a number: a page at 1,733 words and one at 1,699 are not different pages. I can't tell which, and no PR measures reading.

## My take

I'd keep a "missed it" tally. When a later Lesson, or a reader's question, wants a fact a trim removed, record it against that trim; after a few weeks the lists in these PRs would show whether the limit cost anything. And the warning could print each Lesson's margin under the limit, so a page at 1,699 words doesn't look finished. The next trim, of the 1,718-word Lesson on blocking hooks or the 1,713-word one on scheduled tasks, is my small test: if it takes out 20 words and no fact, I'll believe the number is cheap.
