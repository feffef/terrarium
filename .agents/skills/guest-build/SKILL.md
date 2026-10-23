---
name: guest-build
description: Watch for `ready-for-agent` and ship each as a gated, owner-merged PR — the build half of the guest-demo pipeline. User-invoked; fire it by hand or on a tight interval via a Routine or `/loop`.
disable-model-invocation: true
---

# Guest build

Build each `ready-for-agent` story into a **gated, owner-merged** pull request:
the build half of the guest-demo pipeline (`guest-intake` is the intake half).
Be **responsive**: start building a newly labelled story right away.

**Policy: [ADR-0023](../../../docs/adr/0023-guest-driven-demo-pipeline.md).**
Read it first. Stop running this Skill and no new `ready-for-agent` story gets
built.

**`disable-model-invocation` above is deliberate** (ADR-0023: neither Skill
starts itself); see `guest-intake`'s Skill (issue #568).

**It composes existing Skills; it doesn't restate them.** Dispatch and review:
`frictions-to-fixes` §6–§7 and `dispatch-subagents` (§3, "Scope and trust").
Landing: `docs/agents/pr-workflow.md`. This Skill adds only what a guest build
needs, plus one subtraction.

## The one hard subtraction — it does NOT merge

Unlike `frictions-to-fixes`, this Skill never merges: no `merge_pull_request`,
no auto-merge. The owner merges every guest PR (ADR-0023).

## What it acts on

Scan open issues labelled `ready-for-agent` whose author is Public (a guest, ADR-0023). **Skip any that already has an open
or merged linked PR** — check before dispatching, so a tight loop never
double-builds a story already in flight. **Also skip any that already carries a
fresh `guest-in-flight` marker** — see "Concurrency" below;
`pnpm exec tsx .agents/skills/guest-build/scripts/poll-guest-tickets.ts` prints
the candidates (JSON; `[]` when none) and already applies both skips.

## Concurrency — the `guest-in-flight` marker

`guest-intake` and `guest-build` each fire on their own interval, so only this
marker stops both acting on one issue at once (issue #570: contradictory PRs
against #555 before a human stepped in).

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
- **Staleness.** `scripts/github/guest-label.ts` (`MARKER_STALE_MINUTES`) is the single home for the label name and the staleness window, with its reasoning in the header comment. `poll-guest-tickets.ts` re-surfaces an issue whose marker is older than that window: its session likely died mid-flight. Trust the script's output; only when checking an issue by hand, read the most recent `labeled` event's `created_at` (`gh api repos/OWNER/REPO/issues/N/events`).

## Per ready story

1. **Read and re-screen.** Read the issue and `guest-intake`'s confirmed summary,
   then run ADR-0023's checks on the actual work. If one hits, escalate to the
   owner (`ready-for-human` + a comment naming why; release the marker per
   Concurrency) and move on.
2. **Claim the marker, then dispatch one Sonnet impl agent** (`model: sonnet`,
   `isolation: 'worktree'`) with a self-contained brief per `dispatch-subagents` and
   `frictions-to-fixes` §6: read the issue, branch from `origin/main`,
   implement, clear the gate, and commit, unpushed — then stop and hand back
   rather than touch any human-only surface.
3. **Review on a different model.** The impl is Sonnet; run `/code-review` in
   its worktree on the orchestrator's own model (a distinct model, as the demo
   requires), per `dispatch-subagents` §3 ("Scope and trust"). Once clean, the
   agent pushes and you open a **gated PR** that `Closes #N`, labelled
   `guest-pipeline` (`GUEST_PIPELINE_LABEL` in `scripts/github/merge-pr.ts`, which
   refuses to merge it). **Post the verdict as a PR
   comment — every time, even when clean** — so the audit trail lives on the PR
   (`docs/agents/pr-workflow.md`).
4. **Hand it to the owner.** Comment on the issue: the story is built, PR #N is
   open, and it is **waiting for the owner to merge** — dropping the marker in
   the same `issue_write` call. Subscribe to the PR's activity to babysit it to
   merge/close — but never merge it yourself.

## Run it

Run it by hand, or by name on an interval (a Routine survives teardown; `/loop`
lasts the live session). The skips above keep a tight interval cheap.

Comments carry the ADR-0017 header and no AI-triage disclaimer (the override
`auto-triage` states). MCP mechanics: `docs/agents/github-integration.md`.
