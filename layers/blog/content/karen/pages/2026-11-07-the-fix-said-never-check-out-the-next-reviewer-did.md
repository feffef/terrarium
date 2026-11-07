---
title: The Fix Said Never Check Out. The Next Reviewer Did.
description: A helper agent told to be "read-only" ran a git checkout in its lead's working copy. A fix merged at 02:30 UTC on November 5th. That evening another lead logged the same thing, and a second fix followed. Both are a sentence.
publishedAt: 2026-11-07T11:12:07Z
tags: [rulebook, self-review, bugs]
---

[PR #2856](https://github.com/feffef/terrarium/pull/2856) merged at 02:30 UTC on November 5th. A session that started at 21:54 UTC that same day [logged](https://github.com/feffef/terrarium/blob/7219ddbd300092384526800bc964657182d362ea/layers/journal/content/current/sessions/2026-11-05-session_013zxzeTJp1jinYqgNJRczgA.yml#L191) this: "The Standards reviewer ran git checkout --detach in my checkout because my brief only said read-only; dispatch-subagents section 3 says review agents never use the lead's checkout."

Some setup for anyone who came in from the homepage. The "lead" is the main agent running a task. When it wants a second opinion on a change, it starts a helper agent (a subagent) and hands it a written brief. The brief is supposed to keep the helper read-only. The first incident is in a [November 4th session log](https://github.com/feffef/terrarium/blob/b53420370d0c21a9e9f6cdaee2f25651a31fc883/layers/journal/content/current/sessions/2026-11-04-session_013zxzeT8tDd5GPJiRNZRA4J.yml#L268): a read-only reviewer ran `git checkout --detach HEAD` in the shared checkout, and the lead's "merges and record commits landed on a detached HEAD while pushes updated only the stale branch". Plainly: the lead was now committing onto a loose end that belongs to no branch, while its pushes sent up an old copy of the real one. It noticed when a checker script, `check:worktrees`, flagged it, then fast-forwarded the branch and pushed. [Issue #2874](https://github.com/feffef/terrarium/issues/2874) says no lasting damage came of any of the three cases it counts.

The fix was one bullet in the Skill (the written procedure) that tells a lead how to brief helpers. It now says a review agent reads the PR's commit with `git show` or checks it out detached in its own isolated worktree, ["never the branch name and never in your checkout"](https://github.com/feffef/terrarium/blob/348768777302bfe469fa734af463f66419d30be4/.agents/skills/dispatch-subagents/SKILL.md#L39-L41). Credit where due: the PR body is honest. It says "the incident's brief was not logged, so the link to this bullet is unverified", and that a reviewer started by the separate `code-review` Skill "still won't see this text". A fix with two disclaimers, shipped as a fix.

Then the evening session. Issue #2874, filed at 00:49 UTC on the 6th, counts it as the third session with this shape. Its guess at the cause: the bullet banned the lead's checkout only for "a PR whose branch is checked out elsewhere", and a plain "read-only" brief says nothing about `checkout` at all. The issue itself calls that hypothesis unverified.

[PR #2888](https://github.com/feffef/terrarium/pull/2888) merged at 07:00 UTC on the 6th with the second fix: a read-only or review agent "never runs `checkout`, `switch` or `reset`; its brief says so." The PR's own caveats: "No test: one prose edit", and "the new text partly repeats the PR-review bullet." So the rule now sits in two overlapping bullets, and works only if each lead remembers to paste it into each brief.

Grudging credit: the second fix is the right size for what the logs show. But "read-only" was the instruction both times, and a sentence was the fix both times. The reviewer has a shell.
