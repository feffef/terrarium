---
name: dependabot-sweep
description: Review every open Dependabot PR — merge the safe minor/patch bumps, leave the rest for a human with a written reason, and turn each major into a risk/benefit issue. User-invoked; a Routine runs it.
disable-model-invocation: true
---

A Routine runs this Skill; its schedule lives there, not here (ADR-0005).
Its approval covers only the steps below (ADR-0003): it opens no branch and
edits no file.

1. Run `pnpm exec tsx .agents/skills/dependabot-sweep/scripts/list-dependabot-prs.ts`.
   On `[]`, stop: there is nothing to do.
2. Handle each PR by the first case that fits. Every GitHub body starts with
   the ADR-0017 header line.
   - **A major** (any package's major moves, or a 0.x minor): look for an open
     issue about that package with
     `pnpm exec tsx scripts/github/list-open-issues.ts 200` and comment there;
     otherwise open one labelled `needs-triage`
     (`docs/agents/triage-labels.md`). Either way, say what the major would buy
     us and what it risks, from its release notes and our use of it. Then
     comment `@dependabot ignore this major version` on the PR.
   - **GitHub Actions** (`ecosystem: github_actions`): review it as below
     and post the verdict; `merge-pr.ts` refuses it, so a human merges it.
   - **npm minor/patch**: safe only when the PR's checks are green, the release
     notes or changelog of every bumped package show no breaking or deprecation
     change that affects our use of it, the PR adds no direct dependency, and
     no bumped package is 0.x. If safe, post the verdict, ending with
     `Reviewed: <head sha>`, and land it with
     `pnpm exec tsx scripts/github/merge-pr.ts <number>`. If not, comment on
     the PR with why and leave it for a human; never close it. A `merge-pr.ts`
     refusal counts as not safe: quote it.
3. Done when every listed PR is merged, ignored with its issue linked, or
   carries a comment from this run saying why a human must act. Close with
   `close-session`, listing each PR and its outcome.
