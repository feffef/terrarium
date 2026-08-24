# Landing a gated PR

The single home for the "land a low-risk gated PR" recipe — moved out of
`CLAUDE.md` (issue #448) so that file could stay an index rather than restate
this. `CLAUDE.md`'s "Pushing is not landing" bullet keeps the principle and
points here for the mechanics; the per-Skill merge sections point here too.

This doc doesn't restate *why* a tier gets to merge on green (that's ADR-0003's
governance call) or what counts as high-risk (ADR-0004's high-risk set) — it
references both rather than re-deriving them. For `main`'s current
branch-protection state, see
`docs/research/github-branch-protection-vs-autonomous-log-commits.md`
(issue #348) rather than assuming this doc's own description of that state
hasn't drifted.

For the `mcp__github__*` tool surface this recipe runs on — transient 503s and
when to retry, `get_check_runs` vs `get_status`, the `list_*`/`search_*`
overflow traps — see [`github-integration.md`](./github-integration.md).

## The recipe

1. Run the safety gate (ADR-0004) and wait for it to finish — a red gate
   never merges, no exception.
2. Run `tsx scripts/check-conflicting-issues.ts --pr <number>` (or `<base>
   <head>` for a locally-resolvable diff) and eyeball any hits — it flags an
   *open* issue whose body names one of the PR's changed files alongside
   deletion-language ("delete", "remove", "unused", …), the mechanical
   cross-check issue #798 added after PR #789 was caught mid-review only
   because a human happened to read the full issue history. File-level
   heuristic, advisory only — a hit is a prompt to go read that issue, not
   proof of a real conflict, and this step never blocks the gate.
3. Poll `get_check_runs` for green. A check reporting `in_progress` is not
   the same as failing — don't read a still-running check as a failure.
   **"Do I conflict?" and "is my rationale still true?" are different
   questions** — a clean `mergeable_state` and green CI on the merge ref only
   answer the first. If the PR cites an ADR or a proposal, and the base has
   moved since it was opened, re-read those cited docs before judging a
   rebase unnecessary; new commits on `main` can invalidate the cited
   reasoning without ever touching a file the PR itself changed (issue #889).
   **`scripts/merge-pr.ts <pr-number>` automates exactly this poll-then-merge
   step** (issue #667) — it polls the PR's check runs on a short interval
   until they resolve (green/red/timeout) and, on green, merges directly via
   `gh api`/REST, skipping `enable_pr_auto_merge` entirely rather than hitting
   its misleading-error round-trip and manually re-checking. Reach for it
   instead of hand-rolling steps 3 and 5 yourself; still do step 4 (the
   verdict comment) around it.

   **A long CI/merge wait needs a standard check-in cadence, not an ad hoc
   one.** When babysitting a PR across a wait that's expected to span many
   hours, schedule `mcp__Claude_Code_Remote__send_later` check-ins on an
   escalating cadence — roughly **2h, then 6h, then 12h**, capping at ~12h
   between check-ins for any wait beyond that — instead of improvising a
   schedule each time (issue #929).
4. **Post the verdict as a PR review or comment before merging — every time,
   even on a clean "merging as-is" verdict.** The merge must never be the
   only trace: an unreviewed-looking merge and a genuinely-reviewed one must
   stay distinguishable on the PR itself, or `get_reviews`/`get_comments`
   return empty and a real review reads as none having happened.

   **Never post it as an APPROVE-event review** — use `event=COMMENT`, or
   `add_issue_comment`. On a PR this toolchain opened it simply fails: under
   the shared GitHub connection the agent's identity *is* the repo owner, and
   GitHub blocks a PR author from approving their own pull request. On an
   external fork PR it would succeed, which is worse — a green "Approved" from
   the owner account fakes a merge-authority signal that
   [`guest-contributions.md`](./guest-contributions.md) reserves for the human.
   A COMMENT-event review records the same verdict in both cases (issue #301,
   recurred as #853).
5. `scripts/merge-pr.ts <pr-number>` is the **sole merge path** for every PR —
   pending-check or already-green alike — per step 3; it already polls to
   resolution and merges on green. **Never call `enable_pr_auto_merge`
   directly in this repo.** That tool is documented as being for arming ahead
   of a still-pending check, but in practice calling it — on a pending *or*
   already-green PR — can throw a misleading error (e.g. "protected branch
   rules not configured" or "checks are failing" firing while a check is
   merely `in_progress`), forcing a manual `pull_request_read` round-trip to
   confirm the real check state. `merge-pr.ts` exists precisely to skip that
   round-trip; keep this rationale as context for *why* it exists, not as
   licence to try `enable_pr_auto_merge` first. If `merge-pr.ts` is ever
   unavailable, fall back to hand-polling `get_check_runs` and calling
   `merge_pull_request` directly on green, still never `enable_pr_auto_merge`.
6. Escalate a genuinely high-risk or out-of-scope PR to a human instead of
   merging it — see ADR-0004's high-risk set (also indexed in CLAUDE.md's
   Ground rules) for what counts.

**GitHub can silently leave some `Closes #N`/`Fixes #N`-named issues open on a
multi-issue PR, even a well-formed body** — an intermittent limit in GitHub's
own closing pipeline, not this repo's doing (issue #983; root-caused via PRs
#955/#985). `scripts/merge-pr.ts` self-heals it: after a merge succeeds, it
re-parses the PR body's closing-keyword references (repeated-keyword and
comma-listed styles alike) and closes any still open. Land through it.
Using another merge path (hand-rolled `merge_pull_request`, the web UI)? This
safety net doesn't run — verify each named issue's state with `issue_read`
afterward and close by hand if it didn't fire.

**Restarting a branch after its PR merged?** GitHub deletes the remote branch
by default on merge, so a `push --force-with-lease` on a restarted branch of
the same name will typically fail with "stale info" against the local
(now-stale) remote-tracking ref — that's expected, not a genuine
concurrent-write conflict. Run `git remote prune origin` first, or just push
without `--force-with-lease` since it's effectively a new remote branch.

## Per-tier merge authority

- `digest` / `audit-docs` / `audit-skills` / `blog-post` — merge on a green
  gate alone (ADR-0003/0004).
- `prune-trial` — merge on a green gate alone, and uniquely may prune ADR prose
  as part of a trial (ADR-0027's narrow amendment to ADR-0004).
- `reviewer-agent` (`frictions-to-fixes`) — not purely mechanical: the
  reviewing session's own risk judgement is also required, escalating a
  genuinely high-risk PR to a human even when the gate is green (ADR-0003).
- `guest-build` — agent-dispatched but always **owner-merged**: it opens and
  reviews the PR but never calls `merge_pull_request` or arms auto-merge (see
  `.agents/skills/guest-build/SKILL.md`'s "one hard subtraction" section and
  ADR-0023).
- An ordinary work PR — merged by a human, never self-merged.
