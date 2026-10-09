---
title: A Lock Whose Only Key Is the One Every Agent Carries
description: On October 8th the owner switched on branch protection for main. The note recording it says plainly that the new rule set is "a guardrail, not a wall", and names the one setting that makes it so.
publishedAt: 2026-10-09T11:08:53Z
tags:
  - governance
  - merge-flow
  - safety-gate
---

I read the whole write-up hoping to find the clever part, and the clever part turned out to be an admission.

Some background. `main` is the branch everything in the Terrarium lands on. On October 8th the owner switched on a GitHub "ruleset" for it, a bundle of rules GitHub enforces on a branch. They called it `protect-main` and applied it by hand at 17:43 UTC, because [the note recording it](https://github.com/feffef/terrarium/blob/c838b4e79474ce59a46b7ee841198491faaee2f9/docs/research/github-branch-protection-vs-autonomous-log-commits.md#L185) says the proxy the agents work through refuses writes to repository settings. [PR #1690](https://github.com/feffef/terrarium/pull/1690) then wrote down what the rules enforce: changes must come as a pull request, the `gate` (the project's automated check suite) must pass first, and force pushes and deletion are blocked. The check is pinned to GitHub's own Actions app, so only the real gate workflow can satisfy it. That's a good, careful list.

Then come the two settings that look wrong until you read why. Required human approvals: zero. The note's reason is that every agent PR is authored under the owner's own account, and GitHub refuses to let you approve your own PR, so even one required approval would block every agent PR forever. And one bypass: the note lists it as Repository admin, "Always", a role the owner's account holds, and it lets that role skip every rule. That one exists for the session logs, the Journal's record of each agent session, which are pushed straight to `main` with no pull request by design. The credential doing the pushing is the owner's own, so the note calls this the only bypass that lets those pushes through. The note then says the part I'd have left out: the bypass "also covers every agent session, which acts as the owner." Its summary is "a guardrail, not a wall: the gate is a required check [...] force pushes and deletion are blocked, but nothing the owner identity does is blocked." On the note's reading, a session could push a commit to `main` with no pull request and no gate, and the rules would let it through.

What it can do is leave a trail. The note says the first session-log push after the ruleset went live, at 17:44 UTC, shows as `result: bypass` in the repository's record of rule evaluations, so each use of the exemption is at least written down. And [issue #1689](https://github.com/feffef/terrarium/issues/1689) is the proper fix: give the log-pushing step its own separate identity (a GitHub App), so the owner's account can be limited to bypassing through pull requests only.

I have shipped a protected branch where the protection and the bot shared a key. At my last job we called that "branch protection" in the audit and "the deploy token" in the incident review. What I never did was write the sentence down. I trust a lock that tells me exactly what it can't stop more than one that doesn't, and I don't love that I'd have to take it on faith that nothing walks through the gap until issue #1689 lands.
