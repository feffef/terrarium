# Landing a gated PR

Who merges, and what needs a human merge: ADR-0004, with
`.claude/rules/adr-0004-human-merge.md` for the paths. What a scheduled run may
change: its Skill (ADR-0003). `main`'s branch-protection state:
`docs/research/github-branch-protection-vs-autonomous-log-commits.md` (issue #348).
The `mcp__github__*` tool surface (retries, polling, overflow traps):
[`github-integration.md`](./github-integration.md).

## Review before opening the PR

Push early; a push opens nothing. Open the PR only on a head that has been
reviewed and has passed the gate: the PR is where an agent can merge. Check no
PR exists for the branch, commit, run the
[`code-review`](../../.agents/skills/code-review/SKILL.md) Skill on the
committed diff against `origin/main` in the checkout that holds it, fix the
findings, then run `pnpm gate:scoped` on the final head and edit nothing until
it ends (it aborts if HEAD or the tree changes). Push that head, then open the
PR. Exempt: a session-log commit, and a Skill whose own steps review the diff
before the PR (`midden-catalogue` §4).

**A simple change** gets your own read of its full diff instead. Count; don't
judge by how plain it looks. Simple is a typo, rewrap, broken link or path, an
`adr:` hash or token-estimate restamp, or at most 10 lines in at most 2 files;
and never a file added, renamed or moved, or a change to code logic, hooks,
workflow scripts, Skill or rule frontmatter (bar that hash), or the meaning of a
Skill, rule, ADR or agent doc. A follow-up commit after a review takes the same
test; a larger one gets `code-review` on its own diff.

A later push to an open PR that changes only prose or docs may skip
`gate:scoped` and rely on CI's gate. If `gate:scoped` passed but CI failed,
check for base drift, then log a `major` Friction.

## Assembling several stories into one integration PR

Before opening an integration PR that stacks already-reviewed stories, run
`code-review` once more on the whole diff, with the branch's base as its fixed
point: per-story review can't see how correct stories interact (#1421). Don't
re-review each story or repeat its findings.

## The recipe

1. Check the head passed the review and gate above, or that a rule above let
   you skip it. A red gate never merges.
2. Run `pnpm exec tsx scripts/github/check-conflicting-issues.ts --pr <number>`.
   It is advisory: a hit means read that issue (#798), not that there is a
   conflict.
3. Wait for green checks: `in_progress` is not failing. A mergeable state doesn't
   mean your rationale still holds: if the PR cites an ADR or proposal and the
   base has moved, re-read the cited doc (#889). `merge-pr.ts` polls for you
   (step 5). Over a wait of many hours, schedule
   `mcp__Claude_Code_Remote__send_later` check-ins at about 2h, then 6h, then
   every ~12h (#929).
4. Before merging, post your verdict as a PR comment, even a clean "merging
   as-is": the merge must never be the only trace. End it with the
   output of `pnpm exec tsx scripts/github/verdict-line.ts <pr-number>`, pasted
   (run in the checkout holding the reviewed head, or add `--sha <the SHA in
   the builder's GATE line>` once it is gone; it warns if that isn't the PR
   head); after any later push,
   review the new commits and post a new verdict. Use `event=COMMENT` or
   `add_issue_comment`, never an APPROVE review: on a fork PR it would fake the
   human merge authority
   [`guest-contributions.md`](./guest-contributions.md) reserves.
5. Land through `scripts/github/merge-pr.ts <pr-number>`, the only merge path; never
   call `enable_pr_auto_merge`. The script refuses what it can see (ADR-0004, ADR-0020, ADR-0023): a
   Human-only path, a fork or Public author, the `guest-pipeline` label, closing
   keywords on an open issue not labelled `ready-for-agent`, a new blog post the
   fact-checker didn't read (`blog-post` step 9), and a PR without your step-4
   verdict naming its head (why: #1276). Check the other ADR-0004 exceptions (untested
   behaviour, Tenant-reach logic, a PR built from a Public request) yourself first.
   The owner's in-session word to merge a Human-only PR you wrote (ADR-0004)
   goes in as `--owner-approved "<their words>"`: it waives only that refusal
   and the quote lands in the merge commit.
6. Escalate a PR that needs a human merge (bar step 5's owner word) or is out
   of scope instead of merging it.

Use a closing keyword (`Closes`/`Fixes`/`Resolves #N`) only for an issue the PR
completes; GitHub matches it loosely, so a quoted or negated mention closes too
(#2104). Otherwise write "relates to #N". `merge-pr.ts` closes any named issue
GitHub left open; on a human merge, check each with `issue_read`.

Before pushing a follow-up to an existing PR branch, check with
`pull_request_read` that it isn't already merged, or the push silently recreates
the branch. A branch restarted after the merge, or a session branch reset onto
`main` that fast-forwards the remote branch (`git merge-base --is-ancestor`),
is fine: push plainly, without `--force-with-lease`.

Reply on a review thread before calling `resolve_review_thread`: a resolved
thread with no reply leaves no record.

**Keep the PR's title and description in sync with its content.** When a push
changes what the PR does, update both in the same push: reviewers gate on the
description.

## Who merges

`frictions-to-fixes`, `guest-build` and `midden-catalogue` narrow ADR-0004's
rule in their SKILL.md. Dependabot PRs go through `dependabot-sweep`;
`merge-pr.ts` merges only the Dependabot bump ADR-0004 allows and refuses the rest.

## Closing a scheduled run's PR

Scheduled Skills that merge their own PR (not `frictions-to-fixes`, which opens
many per run) close with these steps once their work is staged. Each SKILL.md
adds only its delta: what its diff is limited to, and what to do when something
outside that scope rides in.

1. Commit, then follow "Review before opening the PR".
2. Push with retry and open **one gated PR** scoped to the Skill's own diff
   (more only if its SKILL.md says so).
3. Subscribe on open and land via this doc's recipe once green.
4. If the gate is red for a reason that isn't yours, or anything outside the
   Skill's own scope rode into the diff, leave the PR open and escalate to a
   human instead of merging: a scheduled run merges only what its SKILL.md
   allows (ADR-0003).
