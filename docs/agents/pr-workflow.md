# Landing a gated PR

Who merges, and what needs a human merge: ADR-0004, with
`.claude/rules/adr-0004-human-merge.md` for the paths. What a scheduled run may
change: its Skill (ADR-0003). `main`'s branch-protection state:
`docs/research/github-branch-protection-vs-autonomous-log-commits.md` (issue #348).
The `mcp__github__*` tool surface (retries, polling, overflow traps):
[`github-integration.md`](./github-integration.md).

## Review before the first push

Opening the PR follows the push at once (ADR-0003), so review first. Before a
branch's first push: check that no PR exists for it, commit, run the
[`code-review`](../../.agents/skills/code-review/SKILL.md) Skill on the
committed diff against `origin/main` in the checkout that holds it, fix the
findings, then run `pnpm gate:scoped` last on the final head and edit nothing
until it ends, even when the Stop hook asks you to push. A session-log commit
needs none, nor does a Skill whose own steps review the diff before the push
(`midden-catalogue` §4).

**A simple change** gets your own read of its full diff instead of `code-review`.
Count; don't judge by how plain it looks. It is simple when it is a typo,
rewrap, broken link or path, or a rule's `adr:` hash or token-estimate restamp,
or when it changes at most 10 lines in at most 2 files. In every case it adds,
renames or moves no file, changes no code logic, hook, workflow script, Skill's
or rule's frontmatter (bar that hash), and no meaning of a Skill, rule, ADR or
agent doc.
The same test applies to a follow-up commit after a review; a larger follow-up
gets `code-review` on its own diff, not the whole branch.

A later push that changes only prose or docs may skip `gate:scoped` and rely on
CI's gate; run it first for any other change. If `gate:scoped` passed but CI
failed, check for base drift, then log a `major` Friction.

## Assembling several stories into one integration PR

Before opening an integration PR that stacks already-reviewed stories, run
`code-review` once more on the whole diff, with the branch's base as its fixed
point: per-story review can't see how correct stories interact (#1421). Don't
re-review each story or repeat its findings.

## The recipe

1. Run `pnpm gate:scoped` and wait (skip rule: "Review before the first push").
   A red gate never merges.
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
   as-is": the merge must never be the only trace. End it with a line
   `Reviewed: <sha>` naming the head commit your `code-review` run (or your
   Skill's own review step, or your self-read of a simple change) covered;
   after any later push, review the new commits (per the follow-up rule above)
   and post a new verdict. Use `event=COMMENT` or `add_issue_comment`, never
   an APPROVE review: it fails on our own PRs, and on a fork PR it would fake
   the human merge authority
   [`guest-contributions.md`](./guest-contributions.md) reserves.
5. Land through `scripts/github/merge-pr.ts <pr-number>`, the only merge path; never
   call `enable_pr_auto_merge`. The script refuses what it can see (ADR-0004, ADR-0020, ADR-0023): a
   Human-only path, a fork or Public author, the `guest-pipeline` label, closing
   keywords on an open `ready-for-human` issue, and a PR without your step-4
   verdict naming its head (why: #1276). Check the other ADR-0004 exceptions (untested
   behaviour, Tenant-reach logic, a PR built from a Public request) yourself first.
6. Escalate a PR that needs a human merge or is out of scope instead of merging
   it.

Use a closing keyword (`Closes`/`Fixes`/`Resolves #N`) only for an issue the PR
completes; GitHub matches it loosely, so a quoted or negated mention closes too
(#2104). Otherwise write "relates to #N". `merge-pr.ts` closes any named issue
GitHub left open (it also refuses a keyword naming an open `ready-for-human` issue: step 5); on any other merge
path, check each with `issue_read`.

Before pushing a follow-up to an existing PR branch, check with
`pull_request_read` that it isn't already merged, or the push silently recreates
the branch. A branch restarted after the merge is fine: push plainly, without
`--force-with-lease`.

Reply on a review thread before calling `resolve_review_thread`: a resolved
thread with no reply leaves no record.

**Keep the PR's title and description in sync with its content.** When a push
changes what the PR does, update both in the same push: reviewers gate on the
description.

## Who merges

`frictions-to-fixes`, `guest-build` and `midden-catalogue` narrow ADR-0004's
rule in their SKILL.md. Dependabot PRs go through `dependabot-sweep`;
`merge-pr.ts` merges only a plain minor or patch bump and refuses the rest.

## Closing a scheduled run's PR

Scheduled Skills that merge their own PR (not `frictions-to-fixes`, which opens
many per run) close with these steps once their work is staged. Each SKILL.md
adds only its delta: what its diff is limited to, and what to do when something
outside that scope rides in.

1. Commit, review ("Review before the first push"), then run `pnpm gate:scoped`
   on the final head. Done when it's green.
2. Push with retry and open **one gated PR** scoped to the Skill's own diff
   (more only if its SKILL.md says so).
3. Subscribe on open and land via this doc's recipe once green.
4. **Before the turn that opens the PR ends, invoke `close-session`** — your first log (`in-review`).
5. If the gate is red for a reason that isn't yours, or anything outside the
   Skill's own scope rode into the diff, leave the PR open and escalate to a
   human instead of merging: a scheduled run merges only what its SKILL.md
   allows (ADR-0003).

Once the PR is merged or honestly left open, re-invoke `close-session` to update
that log (the ADR-0009 rule, `.claude/rules/adr-0009.md`).
