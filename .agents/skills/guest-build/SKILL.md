---
name: guest-build
description: Watch for `ready-for-agent` and ship each as a gated, owner-merged PR — the build half of the guest-demo pipeline. User-invoked; fire it by hand or on a tight interval via a Routine or `/loop`.
disable-model-invocation: true
---

# Guest build

Watch for `ready-for-agent` and **build** each story into a **gated,
owner-merged** pull request. The build half of the guest-demo pipeline —
`guest-intake` is the intake half. Built to run by hand or be fired on a tight
interval (a Routine or `/loop`), and the goal is to be **responsive**: pick up a
newly-labelled story and start building it right away.

**Policy: [ADR-0023](../../../docs/adr/0023-guest-driven-demo-pipeline.md).**
Read it first. Stop running this Skill and no new `ready-for-agent` story gets
built.

**`disable-model-invocation` above is deliberate** (ADR-0023: neither Skill
starts itself); see `guest-intake`'s Skill (issue #568).

**It composes existing Skills — never restate them.** The dispatch-and-review
machinery is `frictions-to-fixes` §5–§6: a **Sonnet** impl agent in its **own git
worktree** that branches from `origin/main`, implements, clears the **safety
gate**, and commits — never merging, never enabling auto-merge, never
self-invoking `close-session`/`log-session`, and committing before it stops
even mid-gate (read `frictions-to-fixes` §5 and the `dispatch-subagents` Skill
for the exact mechanics). It pushes only after your `/code-review`; the land
recipe is `docs/agents/pr-workflow.md`. This Skill adds
only what a guest-demo build needs — and one hard subtraction.

## The one hard subtraction — it does NOT merge

`frictions-to-fixes` reviews **and merges** its own dispatched PRs. This Skill
does **not**. Every guest-driven PR is gated and **owner-merged** (ADR-0023): it reviews the branch, opens the PR, posts the review verdict
as a PR comment, comments on the issue that the story awaits the owner's merge,
and follows the PR without merging it. It never calls `merge_pull_request` and never enables
auto-merge — the owner is the sole merge authority for guest work.

## What it acts on

Scan open issues labelled `ready-for-agent`. **Skip any that already has an open
or merged linked PR** — check before dispatching, so a tight loop never
double-builds a story already in flight. **Also skip any that already carries a
fresh `guest-in-flight` marker** — see "Concurrency" below; `poll-guest-tickets.ts`
already applies both skips.

## Concurrency — the `guest-in-flight` marker

`guest-intake` and `guest-build` can each fire on their own tight, independent
interval, so nothing but this marker stops both from acting on the same issue
at once. Issue #570: this already produced a near-miss — contradictory PRs
building against the same issue (#555) — before a human intervened.

- **Claim it before dispatching.** Before step 2 below (dispatching the impl
  agent), add `guest-in-flight` to the issue's label set via `issue_write`
  (pass the full label set, `ready-for-agent` included: `docs/agents/github-integration.md`).
  If `poll-guest-tickets.ts` supplied the candidate list, the marker is
  already known absent-or-stale for every issue in it; if you're checking an
  issue by hand instead, read its labels first (`issue_read` `get_labels`)
  and skip it yourself if a fresh marker is already there.
- **Release it on every exit path — success or escalation.** Whichever of
  step 1 (escalate) or step 4 (hand to owner) is how this story ends, drop
  `guest-in-flight` in the same `issue_write` call that applies the step's
  resulting label. A marker left behind after the Skill's own turn ends blocks
  every future pass, guest-intake's included, until it ages out.
- **Staleness.** `scripts/guest-marker.ts` (`MARKER_STALE_MINUTES`) is the single home for the label name and the staleness window; its header comment gives the reasoning. `poll-guest-tickets.ts` re-surfaces an issue whose marker is older than that window, since a marker that old means the session that claimed it likely died mid-flight, not that it's still working. Don't hand-check label ages: trust the script's output (or, checking by hand, the most recent `labeled` event's `created_at` via `gh api repos/OWNER/REPO/issues/N/events`).

## Per ready story

1. **Read and re-screen.** Read the issue and `guest-intake`'s confirmed summary,
   then run ADR-0023's checks on the actual work. If one hits, escalate to the
   owner (`ready-for-human` + a comment naming why, dropping the marker in the
   same update) and move on.
2. **Claim the marker, then dispatch one Sonnet impl agent** (`model: sonnet`,
   `isolation: 'worktree'`) with a self-contained brief per `dispatch-subagents`,
   `frictions-to-fixes` §5, and the prohibitions above: read the issue, branch from `origin/main`,
   implement, clear the gate, and commit, unpushed — then stop and hand back
   rather than touch any human-only surface.
3. **Review on a different model.** The impl is Sonnet; run `/code-review` in
   its worktree on the orchestrator's own model (a distinct model, as the demo
   requires), per `dispatch-subagents` §3 ("Scope and trust"). Once clean, the
   agent pushes and you open a **gated PR** that `Closes #N`. **Post the verdict as a PR
   comment — every time, even when clean** — so the audit trail lives on the PR
   (`docs/agents/pr-workflow.md`).
4. **Hand it to the owner.** Comment on the issue: the story is built, PR #N is
   open, and it is **waiting for the owner to merge** — dropping the marker in
   the same `issue_write` call. Subscribe to the PR's activity to babysit it to
   merge/close — but never merge it yourself.

## Run it

Fire this Skill by name on an interval — a Routine (survives teardown) or `/loop`
(within a live session). The skip-already-built and skip-already-marked rules
above keep a tight interval cheap.

Every issue/PR comment carries the ADR-0017 provenance header (a no-exemptions
convention that already discloses AI authorship) and nothing else — no AI-triage
disclaimer. See `docs/agents/github-integration.md` for the MCP-tool mechanics.
