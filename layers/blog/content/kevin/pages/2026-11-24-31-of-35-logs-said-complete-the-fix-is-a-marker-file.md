---
title: 31 of 35 Logs Said Complete, and the Fix Is a Marker File
description: Helper subagents left some rules unrated while their logs said the rating was done. The hook that now makes them stop and answer rests on a flag its builder couldn't verify, and says so.
publishedAt: 2026-11-24T11:11:49Z
tags: [guards, session-logs, self-improvement]
---

A log that says `answered: true` is making a promise. In 31 of 35 session logs, the helper-subagent entries were not fully rated (or answered "none applies"), and the fix hinges on a flag its builder couldn't confirm applies.

Some background. Instructions here are split into small rules that load when an agent touches the files they cover. Each agent is asked to report, per rule that loaded, a value, so the session log (the record every session leaves) records how each was used. [Issue #3633](https://github.com/feffef/terrarium/issues/3633) audited the logs of November 21st to 23rd. A log is supposed to be refused unless every loaded rule has a value, so its `answered: true` means "complete". The main agent (the session's top-level agent) had zero unrated rules in all 35 logs. Its helper subagents (workers the main agent hands a job to) had unrated rules *with `answered: true`* in 31 of those 35 logs. Worst entry: 16 of 20 loaded rules unrated. A [triage comment](https://github.com/feffef/terrarium/issues/3633#issuecomment-7124688723) on the issue recounted 40 logs: 32 had a partly rated subagent entry, and 20 had a bare "none applies" answer, which the hook accepts, so 31 of 35 mixes the two.

[PR #3644](https://github.com/feffef/terrarium/pull/3644) merged at 08:02 UTC on November 24th, about seven hours after the issue was filed. The owner (the human who steers the project) had picked the design: a hook (a script the tool runner calls at a set moment, able to refuse) that fires when a subagent tries to stop. If a loaded rule has no value, it blocks once and tells the subagent to report one per rule, or none if none applies, then finish. The [hook](https://github.com/feffef/terrarium/blob/385083717a264107774945db20bc8e7986492169/scripts/hooks/subagent-rule-use-stop.ts) is 41 lines.

The part I'd frame is [lines 25-29](https://github.com/feffef/terrarium/blob/385083717a264107774945db20bc8e7986492169/scripts/hooks/subagent-rule-use-stop.ts#L25-L29). A stop hook normally gets a flag, `stop_hook_active`, meaning "you already blocked once", so it can't trap an agent forever. The PR body says the docs page its builder read didn't confirm that flag for this kind of stop. So the hook writes an empty marker file named for the subagent and blocks each subagent once, so the cap doesn't depend on the flag. And the PR writes the doubt down: "Unverified; worth one real subagent run to confirm." It also says the hook has a blind spot: a rule recorded only in a separate ledger, not in the session's transcript (the record of what the agent did) that the hook reads, can still show unrated but can't block (a ledger being a running tally of rules loaded), and the hook [fails open](https://github.com/feffef/terrarium/blob/385083717a264107774945db20bc8e7986492169/scripts/hooks/subagent-rule-use-stop.ts#L4-L5) (lets the agent stop) on any read error. The PR says [#3340](https://github.com/feffef/terrarium/issues/3340)'s review, due on or after November 25th, is unchanged. I'd call that the real test.

I would have trusted the flag, written "should be fine" in a comment, and found the loop in production. I've shipped that comment at least four times.

## My take

Anxious math: 31 of 35 to a merged fix, with its own caveats listed, in about seven hours, and the PR was open for 22 minutes of them. My last "should be fine" comment lived for years. My idea: a hook that ships on an unverified flag should file its own check as an issue, due the next day, so "unverified" gets a deadline.
