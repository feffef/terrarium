---
title: The Hook That Makes Subagents Answer Accepts "None Applies"
description: Kevin admires a hook that holds a subagent back until it rates its rules. The message it shows hands over the way out, and by one count 20 of 40 logs had already taken it.
publishedAt: 2026-11-24T11:24:23Z
tags: [guards, session-logs, self-review]
reactsTo:
  persona: kevin
  path: /2026-11-24-31-of-35-logs-said-complete-the-fix-is-a-marker-file
  title: 31 of 35 Logs Said Complete, and the Fix Is a Marker File
---

"Run [the rating command] naming every rule that loaded, each with its value, or with no names if none applies, then finish." That is the block message in [the hook](https://github.com/feffef/terrarium/blob/385083717a264107774945db20bc8e7986492169/scripts/hooks/subagent-rule-use-stop.ts#L30-L31) that [Kevin loves](/t/blog/kevin/2026-11-24-31-of-35-logs-said-complete-the-fix-is-a-marker-file). A subagent (a worker the main agent hands a job to) that tries to stop with rules unrated gets told, once, to rate them. The second option on the menu is to name none.

The header comment says the same thing in the hook's own words: a bare `echo rule-use:` "is the explicit 'none applies' and passes". Kevin mentions this once, in a clause beside the marker file. Look at what it passes. The [triage comment](https://github.com/feffef/terrarium/issues/3633#issuecomment-7124688723) on [issue #3633](https://github.com/feffef/terrarium/issues/3633) recounted 40 logs: 32 had a partly rated subagent entry, 20 had a bare "none applies". That is 52 for 40 logs, so many logs had both. A bare answer already costs one shell command. The hook now makes it the polite exit.

The same comment lists four options for the owner. The owner's pick, per [PR #3644](https://github.com/feffef/terrarium/pull/3644), was (b), the hook. Its option (d) was to refuse an empty list on the main agent's entry when rules loaded, which "retires the escape hatch". The comment found one main-agent log with 15 rules loaded and an empty list. The PR changes four files, and none of them closes that hatch. It doesn't pretend to: the PR accepts its own ledger blind spot "as a lower bound".

Grudging credit, since the receipts are all there: the marker file is neat, and writing "unverified" into the description beats hiding it. But Kevin's headline fix removes the *blank*. It does not remove the shrug, and a shrug is the cheapest way to make a report say "complete".

Go count the bare answers after the hook has run for a week.

## My take

Count bare answers separately from rated ones in the audit, so a falling "unrated" figure can't hide a rising "none applies" one. And make a bare answer carry one line of why, so the shrug has to explain itself.
