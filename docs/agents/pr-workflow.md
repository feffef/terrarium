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

1. Run `pnpm gate:scoped` (ADR-0004) and wait for it to finish — a red gate
   never merges, no exception.
2. Run `pnpm exec tsx scripts/check-conflicting-issues.ts --pr <number>` (or
   `<base> <head>` for a locally-resolvable diff) and read any hits. It flags an
   *open* issue whose body names one of the PR's changed files alongside
   deletion-language ("delete", "remove", "unused", …) (issue #798). It is a
   file-level heuristic and advisory: a hit means go read that issue, not that
   there is a conflict, and it never blocks the gate.
3. Poll `get_check_runs` for green. A check reporting `in_progress` is not
   the same as failing — don't read a still-running check as a failure.
   **"Do I conflict?" and "is my rationale still true?" are different
   questions** — a clean `mergeable_state` and green CI on the merge ref only
   answer the first. If the PR cites an ADR or a proposal, and the base has
   moved since it was opened, re-read those cited docs before judging a
   rebase unnecessary; new commits on `main` can invalidate the cited
   reasoning without ever touching a file the PR itself changed (issue #889).
   `scripts/merge-pr.ts <pr-number>` does this poll and, on green, the merge
   (issue #667); use it instead of hand-rolling steps 3 and 5.

   When babysitting a PR across a wait expected to span many hours, schedule
   `mcp__Claude_Code_Remote__send_later` check-ins at roughly **2h, then 6h,
   then every ~12h** (issue #929).
4. **Post your verdict as a PR review or comment before merging — every time,
   even a clean "merging as-is"** — the merge must never be the only trace.
   Never as an APPROVE-event review: use `event=COMMENT` or `add_issue_comment`.
   The agent's identity is the repo owner, so APPROVE fails on our own PRs and,
   on a fork PR, would fake the human merge authority
   [`guest-contributions.md`](./guest-contributions.md) reserves (#301, #853).
5. **Land through `scripts/merge-pr.ts <pr-number>`** — the sole merge path. It
   refuses without step 4's verdict (#1276) and refuses fork and Public-authored
   PRs, which a human merges (ADR-0020). Never call `enable_pr_auto_merge`: it
   throws misleading errors on pending or green PRs (#385). If the script is
   unavailable, hand-poll `get_check_runs` and call `merge_pull_request` on green.
6. Escalate a genuinely high-risk or out-of-scope PR to a human instead of
   merging it.

**Use a closing keyword (`Resolves`/`Closes`/`Fixes #N`) only for an issue the
PR completes.** Merging auto-closes every issue named that way: PR #326 closed a
tracking issue (#213) it only touched, and it had to be reopened. For any other
issue write "relates to #N" or "see #N".

**GitHub can silently leave `Closes #N`/`Fixes #N` issues open on a multi-issue PR, even with a well-formed body** (intermittent, GitHub's closing pipeline; issue #983). `scripts/merge-pr.ts` self-heals: after a successful merge it re-parses the body's closing keywords (repeated or comma-listed) and closes any still open. Land through it. On any other merge path (hand-rolled `merge_pull_request`, web UI) it doesn't run; check each named issue with `issue_read` afterward and close by hand.

**Before pushing a follow-up commit to an existing PR branch** (e.g. answering
review), check the PR's state with `pull_request_read`. An owner can merge it
mid-flight (GitHub then deletes the branch), and pushing to the branch name
silently recreates it. If it's already merged, push it as a new branch (plain
push, no `--force-with-lease`).

**Reply before resolving a review thread.** Say what changed (or why nothing
did) before calling `resolve_review_thread`. A resolved thread with no reply
leaves no record.

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
