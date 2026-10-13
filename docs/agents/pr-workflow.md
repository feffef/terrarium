# Landing a gated PR

The single home for the recipe that lands a low-risk gated PR.

Why a tier merges on green: ADR-0003. What needs a human merge: ADR-0004's
rules, `.claude/rules/adr-0004-human-merge.md` for the paths. `main`'s branch-protection state:
`docs/research/github-branch-protection-vs-autonomous-log-commits.md` (issue #348).

For the `mcp__github__*` tool surface this recipe runs on (retries, polling,
overflow traps), see [`github-integration.md`](./github-integration.md).

## Review before the first push

Pushing opens the PR (ADR-0003), so review first. Before a branch's first
push, invoke the [`code-review`](../../.agents/skills/code-review/SKILL.md)
Skill on its committed diff against `origin/main`, in the checkout that holds
it, and fix the findings. This holds even when the Stop hook asks you to
push. Skip it only where a Skill's own steps already review the diff in a
similar way before the push, as `midden-catalogue` §4 does. A session-log
commit needs none.

## Assembling several stories into one integration PR

Before opening an integration PR that stacks several already-reviewed stories,
run [`code-review`](../../.agents/skills/code-review/SKILL.md) **once more on
the whole diff**, with the branch's base as its fixed point, not a single
story's start. Per-story review can't see how independently correct stories
interact (e.g. both ship the same thing, or stack discounts meant to be
mutually exclusive; issue #1421). Don't re-review each story or repeat its
findings.

## The recipe

1. Run `pnpm gate:scoped` and wait. A red gate never merges.
2. Run `pnpm exec tsx scripts/check-conflicting-issues.ts --pr <number>` and
   read any hits. It is advisory: a hit means read that issue (#798), not that
   there is a conflict.
3. Wait for green checks: `in_progress` is not failing. A clean mergeable state
   says you don't conflict, not that your rationale still holds: if the PR cites
   an ADR or proposal and the base has moved, re-read the cited doc (#889).
   `scripts/merge-pr.ts` does the polling for you (step 5). When babysitting
   across a wait of many hours, schedule `mcp__Claude_Code_Remote__send_later`
   check-ins at about 2h, then 6h, then every ~12h (#929).
4. Before merging, post your verdict as a PR comment, even a clean "merging
   as-is": the merge must never be the only trace. Use `event=COMMENT` or
   `add_issue_comment`, never an APPROVE review. APPROVE fails on our own PRs
   and on a fork PR would fake the human merge authority
   [`guest-contributions.md`](./guest-contributions.md) reserves (#301, #853).
5. Land through `scripts/merge-pr.ts <pr-number>`, the only merge path. It
   refuses without your step-4 verdict (#1276) and refuses fork and
   Public-authored PRs, which a human merges (ADR-0020). Never call
   `enable_pr_auto_merge` (#385).
6. Escalate a high-risk or out-of-scope PR to a human instead of merging it.

Use a closing keyword (`Closes`/`Fixes`/`Resolves #N`) only for an issue the PR
completes; it auto-closes everything it names (#326). Otherwise write
"relates to #N". `merge-pr.ts` closes any named issue GitHub left open
(#983); on any other merge path, check each one with `issue_read`.

Before pushing a follow-up to an existing PR branch, check with
`pull_request_read` that it isn't already merged, or the push silently
recreates the branch. That is fine for a branch restarted after the merge:
push plainly, without `--force-with-lease`.

Reply on a review thread before calling `resolve_review_thread`: a resolved
thread with no reply leaves no record.

**Keep the PR's title and description in sync with its content.** When a push
changes what the PR does, update both in the same push: reviewers gate on the
description.

## Per-tier merge authority

- `digest` / `audit-docs` / `audit-skills` / `blog-post` / `visitor-loop` —
  merge on a green gate alone (ADR-0003/0004).
- `prune-trial` — merge on a green gate alone, and uniquely may rewrite ADRs,
  keeping what they decided, as part of a trial (ADR-0027's narrow amendment to ADR-0004):
  run `merge-pr.ts --prune-trial`, with the trial's ledger entry in the PR.
- `reviewer-agent` (`frictions-to-fixes`) — green gate plus the reviewing
  session's own risk judgement; escalate a genuinely high-risk PR to a human
  even when the gate is green (ADR-0003).
- `guest-build` — always **owner-merged**: it opens the PR but never merges it
  or arms auto-merge (`.agents/skills/guest-build/SKILL.md`'s "one hard
  subtraction" section, ADR-0023).
- `midden-catalogue` — always **owner-merged** (#1802): it opens the PR and
  never merges (`.agents/skills/midden-catalogue/SKILL.md` §5).
- `dependabot` — never merged by an agent; leave those PRs alone (ADR-0003
  ledger). The `dependabot-automerge` workflow that will merge them is proposal
  #1633, not yet applied.
- An ordinary work PR — merged by its authoring session on a green gate, unless
  the ADR-0004 rule names an exception; then a human merges it (ADR-0003).

## Closing a self-merged chartered run

The tiers above that merge on a green gate alone close the same way once their
own work is staged. `reviewer-agent` does not, since it opens many
PRs per run. Each Skill's SKILL.md states only its delta (what
its diff is limited to, and what to do when something rides outside that scope):

1. Run `pnpm gate:scoped` (ADR-0004; `scripts/gate.ts` owns what it runs).
   Done when it's green.
2. Commit, review (see "Review before the first push"), push with retry, and
   open **one gated PR** scoped to that Skill's own diff — one per run unless
   the Skill's own SKILL.md names more.
3. Subscribe on open and land via this doc's recipe once green.
4. **At PR-open, invoke `close-session`** — your first log (`in-review`).
5. If the gate is red for a reason that isn't yours, or anything outside the
   Skill's own scope rode into the diff, leave the PR open and escalate to a
   human instead of merging: a chartered run merges only its own bounded diff
   (ADR-0003 ledger), whatever the rule for an ordinary work PR says.

Once the PR is merged or honestly left open, re-invoke `close-session` to update
that log (the ADR-0009 rule, `.claude/rules/adr-0009.md`).
