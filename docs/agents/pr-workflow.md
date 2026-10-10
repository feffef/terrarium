# Landing a gated PR

The single home for the "land a low-risk gated PR" recipe. `CLAUDE.md`'s
"Pushing is not landing" bullet and the per-Skill merge sections point here for
the mechanics.

Why a tier merges on green: ADR-0003. What counts as high-risk: CLAUDE.md's
Ground rules, ADR-0004. `main`'s branch-protection state:
`docs/research/github-branch-protection-vs-autonomous-log-commits.md` (issue #348).

For the `mcp__github__*` tool surface this recipe runs on — transient 503s and
when to retry, `get_check_runs` vs `get_status`, the `list_*`/`search_*`
overflow traps — see [`github-integration.md`](./github-integration.md).

## Assembling several stories into one integration PR

When a branch stacks several already-reviewed stories into one integration PR,
run **one more whole-branch two-axis review** — [`code-review`](../../.agents/skills/code-review/SKILL.md)
scoped to the full integration diff (fixed point: the branch's base, not a
single story's start) — before opening it. Per-story review can't see how
independently-correct stories interact (e.g. both ship the same thing, or stack
discounts meant to be mutually exclusive) (issue #1421). One extra pass; don't
re-review each story or repeat its findings.

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
  keeping what they decided, as part of a trial (ADR-0027's narrow amendment to ADR-0004).
- `reviewer-agent` (`frictions-to-fixes`) — green gate plus the reviewing
  session's own risk judgement; escalate a genuinely high-risk PR to a human
  even when the gate is green (ADR-0003).
- `guest-build` — agent-dispatched but always **owner-merged**: it opens and
  reviews the PR but never calls `merge_pull_request` or arms auto-merge (see
  `.agents/skills/guest-build/SKILL.md`'s "one hard subtraction" section and
  ADR-0023).
- `dependabot` — merged by the `dependabot-automerge` workflow (proposal #1633, not yet applied), never by an agent; leave those PRs alone (ADR-0003 ledger).
- An ordinary work PR — merged by a human, never self-merged.

## Closing a self-merged chartered run

Every tier above except `reviewer-agent` (`frictions-to-fixes`; many PRs per
run), `guest-build`, `dependabot` and an ordinary work PR closes the same way
once its own work is staged. Each Skill's SKILL.md states only its delta (what
its diff is limited to, and what to do when something rides outside that scope):

1. Run `pnpm gate:scoped` (ADR-0004; `scripts/gate.ts` owns what it runs).
   Done when it's green.
2. Commit, push with retry, and open **one gated PR** scoped to that Skill's
   own diff — one per run unless the Skill's own SKILL.md names more.
3. Subscribe on open and land via this doc's recipe once green.
4. **At PR-open, invoke `close-session`** — your first log (`in-review`).
5. If the gate is red for a reason that isn't yours, or anything outside the
   Skill's own scope rode into the diff, leave the PR open and escalate to a
   human instead of merging — never force a self-merge past scope or a red
   gate.

Once the PR is merged or honestly left open, re-invoke `close-session` to update
that log (CLAUDE.md, "Logging your session").
