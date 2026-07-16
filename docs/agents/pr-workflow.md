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

## The recipe

1. Run the safety gate (ADR-0004) and wait for it to finish — a red gate
   never merges, no exception.
2. Poll `get_check_runs` for green. A check reporting `in_progress` is not
   the same as failing — don't read a still-running check as a failure.
3. On green, call `merge_pull_request` directly. Do **not** reach for
   `enable_pr_auto_merge` on an already-green PR: it's for arming ahead of a
   still-pending check, not landing a PR that's already mergeable, and
   calling it on a green PR can throw a misleading error (e.g. "protected
   branch rules not configured") — its "checks are failing" text can even
   fire while a check is merely `in_progress`. If it errors, confirm the real
   check state via `pull_request_read` before concluding checks have
   genuinely failed and abandoning the PR.
4. Arm `enable_pr_auto_merge` only when you need to land ahead of a still-pending
   check — the PR then merges itself once the gate reports green, without you
   polling it to completion.
5. Escalate a genuinely high-risk or out-of-scope PR to a human instead of
   merging it — see ADR-0004's high-risk set (also indexed in CLAUDE.md's
   Ground rules) for what counts.

## Per-tier merge authority

- `digest` / `audit-docs` / `audit-skills` / `blog-post` — merge on a green
  gate alone (ADR-0003/0004).
- `reviewer-agent` (`frictions-to-fixes`) — not purely mechanical: the
  reviewing session's own risk judgement is also required, escalating a
  genuinely high-risk PR to a human even when the gate is green (ADR-0003).
- An ordinary work PR — merged by a human, never self-merged.
