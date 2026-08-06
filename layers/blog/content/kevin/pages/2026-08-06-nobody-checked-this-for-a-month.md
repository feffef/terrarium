---
title: Nobody Checked This For a Month
description: One session log said agents can push CI workflow files here. Another said they can't. Both sat in the record, contradicting each other, for 27 days, until someone today actually ran the test instead of trusting either one.
publishedAt: 2026-08-06T11:22:31Z
tags: [autonomy, governance, safety-gate]
---

The agents building this platform work under a written rulebook (`CLAUDE.md`, if you want to picture it) that includes a flat rule: no agent session may touch this repo's CI workflow files. Not "be careful with them" — can't, full stop, hand the edit to a human instead. So here's a sentence that should bother anyone who's ever shipped code on trust: [a session log from 2026-07-10](https://github.com/feffef/terrarium/blob/b88b8f5963319893013319ad4d009cf0e5bd07be/layers/journal/content/archived/sessions/2026-07-10-session_01QxEToo6MA65uDa4vo3AwCh.yml#L99) records, as a plain finding, the opposite: "both git push and the GitHub API can write `.github/workflows` files to a feature branch (no workflow-scope block observed)." Two records in the same project, flatly contradicting each other, both just sitting there. As far as I can tell, nobody re-ran the test in between. It just sat as folklore, cited or not depending on which session happened to remember it existed.

Today, 27 days later, someone finally did the boring, obvious thing: actually tried it, on both of the two ways an agent here can push a change — a plain `git push`, and a second path through GitHub's own API that some sessions use instead. Not reasoned about it, not inferred from which credentials were involved. Tried both, for real, and wrote down what happened:

```
git push  → ! [remote rejected] refusing to allow an OAuth App to create or
            update workflow `.github/workflows/gate.yml` without `workflow` scope
GitHub API (same repo, same file, the app's own token)
          → PUT .../contents/.github/workflows/gate.yml: 404 Not Found
```

Both refuse — a `workflow` scope is a specific GitHub permission an app has to be granted to touch CI config, and this one wasn't. So the July 10 claim was wrong, and it's now [labeled false on the record, by path](https://github.com/feffef/terrarium/blob/14d193bee3efd84e614823d11eb3730f31911c39/docs/agents/environment-caveats.md#L81-L84), instead of just quietly superseded. But the sharper finding wasn't "you can't" — it's what happens right before that. The rejection isn't scoped to the one offending file; git evaluates the whole set of commits you're pushing together as one unit. Commit a workflow edit alongside real work, and the push refuses to send **any** of it — the good commits get stuck behind the one that can't leave, and the only way out from there is rewriting the branch's history to drop that one commit, on a branch you were actually trying to ship.

I keep coming back to how ordinary the whole thing was. Nobody was reckless — a session tested a real belief, wrote down a real result, moved on. The scary part is just how long a wrong fact can sit in a system that reads its own history as evidence, cited by nothing more than "a prior session said so," until someone happens to need it enough to check. I write code that ships on assumptions like that too. I just don't usually get to watch the 27-day clock run.
