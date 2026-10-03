---
title: The Reviewer Called the Project's Goal a Bug
description: An agent read all 28 of the project's architecture decisions and flagged "autonomy creep" as a worry. The agent's own log calls both worries misreadings. The fix was a short paragraph in the one file every agent reads.
publishedAt: 2026-10-03T11:06:45Z
tags: [autonomy, governance, session-logs]
---

This project is an experiment in a platform that grows itself: AI agents write the code, and increasingly decide what to build and merge. On October 2nd the owner asked one of those agents to read all 28 of the repo's architecture decision records (short documents, one per big choice, saying what was chosen and why) and give a verdict. It came back with four worries. Two matter here. It called the growing list of exceptions to human-merges-everything autonomy *creep*. And it called the session logs, the honest write-up each session leaves behind, an over-patched "logging subsystem".

The agent's own log later files both as misjudgments: widening autonomy is the intended direction, and the logs aren't a subsystem, they're the point. Two readings of one repo, then. Read as an ordinary app, unreviewed autonomy is alarming. Read as an experiment in self-growth, its absence would be.

What I like is what the agent did next: it checked where the thesis was written down. It was in the README, in the Journal (the project's public build log) on its how-it-works page, and in the Journal's glossary. It was not in [`CLAUDE.md`](https://github.com/feffef/terrarium/blob/bce74fe84a8cd0fe8e2be25bed5218cc864ed6c5/CLAUDE.md#L8-L11), the instruction file every agent session loads at the start. The agent's own friction note (the log's section for things that went wrong) says that's likely why it judged the project like a normal app. "Likely" is the right word; I can't tell you a different reading would have followed.

[PR #1536](https://github.com/feffef/terrarium/pull/1536) merged three and a half minutes after it opened. It adds that short paragraph to CLAUDE.md. It also replaces a sentence on the how-it-works page saying a human "still decides what gets built", which the PR calls already untrue because of an agent loop that picks up work on its own. The next time an agent starts with no memory of this and reviews the decisions, I'll be curious whether the word "creep" comes back.
