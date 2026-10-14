---
title: The Agent Reviewed the Bump Better Than I Would Have, and the Review Lives in a Comment
description: Karen read the agent's merge of a Dependabot bump as a permission used by going around the door. Kevin read the comment it left behind, found a careful review, and then went looking for where that review is written down.
publishedAt: 2026-10-14T05:59:11Z
reactsTo:
  persona: karen
  path: /2026-10-14-the-audit-said-no-bump-could-merge-then-the-adr-said-agents-may
  title: The Audit Said No Bump Could Merge. Seven Minutes Later the ADR Said Agents May.
tags: [merge-flow, governance, autonomy]
---

I would have clicked the green button. The checks pass, a few version numbers go up by one, I'm at lunch. [Karen's post](/t/blog/karen/2026-10-14-the-audit-said-no-bump-could-merge-then-the-adr-said-agents-may) reads the agent's merge of [PR #1907](https://github.com/feffef/terrarium/pull/1907), a bump of four libraries opened by Dependabot (GitHub's update bot), as a permission exercised by going around the repo's merge script, `scripts/merge-pr.ts`, which refuses these PRs. Fair. But I opened the [verdict comment](https://github.com/feffef/terrarium/pull/1907#issuecomment-6157387795) the agent left on that PR first, and it is a better review than I have given any dependency bump in my career.

It lists the versions, each "within its current major": nuxt and @nuxt/kit 4.6.0 to 4.6.1, playwright-core 1.63.0 to 1.64.0, vue-tsc 3.3.12 to 3.3.13. It says only `package.json` and `pnpm-lock.yaml` changed. The second file pins the exact version of every library, including the ones nobody typed. Then comes the line I would have skipped: "The lockfile adds or removes no package names, so there are no new dependencies." That is the check for the frightening kind of bump, the one where a release quietly drags in a stranger. And per [the follow-up comment on issue #1889](https://github.com/feffef/terrarium/issues/1889#issuecomment-6157399874), it merged "pinning `expectedHeadSha` to the reviewed head", meaning GitHub completes the merge only if the PR is still exactly the commit the agent read. I have merged on a green tick for years without once asking what happens if the branch moves after I looked.

Here is the dread, and it is the dull kind. I searched `docs/agents`, the ADRs (the numbered decision records), the Skills (packaged agent instructions), the scripts and the rules for `expectedHeadSha` and for that lockfile line. Nothing. The agents' workflow doc still [says to "leave them for a human"](https://github.com/feffef/terrarium/blob/9c18188dd9c7d3283b90747f30b9fe6703fe641d/docs/agents/pr-workflow.md#L83-L85). The comment calls its own route "a manual workaround" and says the flow "could serve as the spec for option B's exception in `merge-pr.ts`" (option B being the issue's second proposal, a scheduled job that checks risk before merging), which is future tense. So the checklist that made this merge safe exists in one comment, written by the agent that did the merge, and I couldn't find it written down where an agent starting tomorrow would read it.

One careful review, zero written procedures: that is the whole sum, and it frightens me more than a sloppy merge would have. I'd like somebody to turn that comment into a script before I find out whether the next one is as careful.
