# Landing a gated PR

Who merges, and what needs a human merge: ADR-0004, with
`.claude/rules/adr-0004-human-merge.md` for the paths. What a scheduled run may
change: its Skill (ADR-0003). `main`'s branch-protection state:
`docs/research/github-branch-protection-vs-autonomous-log-commits.md` (issue #348).
The `mcp__github__*` tool surface (retries, polling, overflow traps):
[`github-integration.md`](./github-integration.md).

## Review before opening the PR

Push early; a push opens nothing. Open the PR only after these steps, in this
order. Exempt: a session-log commit, and a Skill whose own steps review the diff
before the PR (`midden-catalogue` §4).

1. Name the test or gate step that fails if this change regresses. If none
   would, add a test, or the PR needs a human merge (ADR-0004).
2. Check no PR exists for the branch, then commit.
3. Review the commit. Run
   `pnpm exec tsx scripts/github/verdict-line.ts --review-call` and make the
   [`code-review`](../../.agents/skills/code-review/SKILL.md) call it prints,
   in the checkout that holds the commit: `merge-pr.ts` looks for its sha in
   your transcript (recipe step 5). A simple change gets your own read of its
   full diff instead.
4. Fix the findings, then review each fix as in step 3.
5. Run `pnpm gate:scoped` on the final head; edit nothing while it runs.
6. Push that head, then open the PR.

**Done when** the PR is open on a head that `code-review` reviewed (or that
passed your own read of a simple diff) and `gate:scoped` passed.

The gate skips `test`, `build` and `test:e2e` for some Markdown-only changes
(`scripts/gate/gate.ts` has the exact paths), so a unit test that reads a
Markdown file can fail first on `main`.

**A simple change.** Count it; don't judge by how plain it looks. It is simple
only when all of these hold:

- at most 2 files and 10 lines, each file counting the larger of its added and
  deleted lines;
- no file added, renamed, copied or moved;
- no `.ts`, `.js` or `.vue` file, and nothing under `scripts/hooks/` or
  `.claude/workflows/`;
- no change to code logic, a hook, Skill or rule frontmatter (bar an `adr:` hash
  or token-estimate restamp), or the meaning of a Skill, rule, ADR or agent doc
  (a typo, rewrap, or broken link or path is fine).

`merge-pr.ts` checks the first three bars. A follow-up commit after a review
takes the same test; a larger one gets `code-review` on its own diff.

A later push to an open PR that changes only prose or docs may skip
`gate:scoped` and rely on CI's gate. If `gate:scoped` passed but CI failed,
check for base drift, then log a `major` Friction.

## Assembling several stories into one integration PR

Before opening an integration PR that stacks already-reviewed stories, make
step 3's `code-review` call once more on the whole diff (put the call's fixed
point at the branch's base if it isn't `origin/main`): per-story review can't
see how correct stories interact (#1421). Don't re-review each story.

## The recipe

1. Check the head passed the review and gate above, or that a rule above let
   you skip it. A red gate never merges.
2. Run `pnpm exec tsx scripts/github/check-conflicting-issues.ts --pr <number>`.
   It is advisory: a hit means read that issue, not that there is a conflict.
3. Wait for green checks (`in_progress` is not failing; `merge-pr.ts` polls for
   you). If the PR cites an ADR or proposal and the base has moved, re-read the
   cited doc. Over a wait of many hours, schedule
   `mcp__Claude_Code_Remote__send_later` check-ins at about 2h, 6h, then every ~12h.
4. Before merging, post your verdict as a PR comment, even a clean "merging
   as-is": the merge must never be the only trace. End it with the pasted output
   of `pnpm exec tsx scripts/github/verdict-line.ts <pr-number>`, run in the
   checkout holding the reviewed head (or add `--sha <the SHA in the builder's
   GATE line>`). Its `Reviewed:` line names the sha `code-review` ran on. After
   only your own read of a simple diff, add `--own-read`; `merge-pr.ts` refuses it
   unless the diff passes the simple-change test. If you pushed after
   the review, end with `Reviewed: <reviewed sha>` (`--sha`, without the PR
   number) and `Own-read: <head>`, accepted when the review is in your
   transcript and the fix is simple; a fix that isn't simple needs a new
   `code-review` and verdict. Post it as `event=COMMENT` or `add_issue_comment`,
   never an APPROVE review: on a fork PR that would fake the human merge
   authority [`guest-contributions.md`](./guest-contributions.md) reserves.
5. Land through `scripts/github/merge-pr.ts <pr-number>`, the only merge path;
   never call `enable_pr_auto_merge`. It refuses what it can see (its header
   lists each), among them a PR without your step-4 verdict naming its head, and
   a new blog post the fact-checker didn't read (`blog-post` step 9). A
   `Reviewed:` line needs that review in your own session's transcript: a
   `code-review` call, a `clear-backlog-build` review round, or a `SendMessage`
   naming the sha to that run's reviewer. A plain `Agent` reviewer doesn't
   count, so run `merge-pr.ts` in the session that reviewed. A plain Dependabot
   bump needs no proof. Check the other ADR-0004 exceptions (untested
   behaviour, Tenant-reach logic, a PR built from a Public request) yourself.
   The owner's in-session word to merge a Human-only PR you wrote goes in as
   `--owner-approved "<their words>"`: it waives only that refusal and the
   quote lands in the merge commit.
6. Escalate a PR that needs a human merge (bar step 5's owner word) or is out
   of scope instead of merging it.

Use a closing keyword (`Closes`/`Fixes`/`Resolves #N`) only for an issue the PR
completes; GitHub matches it loosely, so a quoted or negated mention closes too.
Otherwise write "relates to #N". `merge-pr.ts` closes any named issue GitHub
left open; on a human merge, check each with `issue_read`.

Before pushing a follow-up to an existing PR branch, check with
`pull_request_read` that it isn't already merged, or the push silently recreates
the branch. A branch restarted after the merge, or a session branch reset onto
`main` that fast-forwards the remote branch (`git merge-base --is-ancestor`),
is fine: push plainly, without `--force-with-lease`. To reuse a merged session
branch, check it out and `git merge --ff-only origin/main` (only when its tip is already in `main`). The Stop hook may
then flag the merged history as unpushed: see `git-conventions.md`.

Reply on a review thread before calling `resolve_review_thread`. Keep the PR's
title and description in sync with its content: update both in the push that
changes what the PR does.

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
