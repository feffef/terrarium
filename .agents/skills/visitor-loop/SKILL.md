---
name: visitor-loop
description: Daily self-growth run — three blind first-time visitors (three different models) browse a live Terrarium; the run fixes what at least two of them flag, builds the best feature idea they raised, and self-merges both PRs on a green gate.
disable-model-invocation: true
---

# visitor-loop

The Terrarium grows by being **visited**. Each run serves the site, sends three
blind **first-time visitors** through it, fixes only **consensus** problems —
ones at least two of the three raised independently — and builds the best
idea any of them had. One visitor's complaint is taste; two visitors arriving
at the same complaint is signal.

Your **remit** — what this run may change and self-merge — is ADR-0003's
`visitor-loop` ledger row. Read it before step 3; anything outside it lands as
an ordinary gated PR for a human, or as an issue.

## 1. Serve the site

On a fresh `origin/main`: `pnpm install`, `pnpm build`, then `pnpm exec tsx scripts/preview.ts start` (production
preview, not `--dev`: visitors must see what the public sees). Done when the
printed `URL=` returns 200 for `/`.

## 2. Send three visitors

Dispatch three read-only subagents **in one message**, one per model —
`sonnet`, `fable`, `opus` (the Agent tool's `model` parameter) — so consensus
means two *different* models agreeing, not one model echoing itself. Each gets
[`visitor-brief.md`](visitor-brief.md) verbatim, with the URL and a scratch
directory unique to that visitor filled in. They get no repo context, no hints,
no list of past findings — a primed visitor is not a first-time visitor.
Done when all three reports are in; resume a stalled visitor with
`SendMessage`, never by re-dispatching. Then `scripts/preview.ts stop <pid>`.

## 3. Tally consensus

Merge the three reports into one tally in your scratchpad:

- **Findings.** Cluster reports of the *same problem on the same page or
  component*, however worded. A cluster raised by ≥2 visitors is consensus.
  **Verify** every consensus finding yourself against the source and the
  rendered page — two visitors can share a misreading. Drop an unverified one
  with the reason.
- **Feature.** Ideas need no consensus. Weigh every visitor's ideas and pick
  the **one** you judge best: the most visible payoff for a first-time
  visitor that fits the remit and a single PR.
- **Owner memory.** First read the owner's review comments on every
  `visitor-loop` PR since the last `decisions.md` entry; each rejected
  approach or standing preference becomes one new line there (committed with
  step 4's PR). Then drop anything [`decisions.md`](decisions.md) rules out,
  and anything an open or closed issue/PR already covers (search first).

Done when every reported finding is in the tally, marked consensus or single;
every consensus finding is marked *fix*, *dropped (why)*, or *out of remit*;
and exactly one feature is chosen, with a line on why it beat the others.

## 4. Fix PR

Branch `claude/visitor-loop-fixes-<YYYY-MM-DD>` from `origin/main`. Fix every
consensus finding marked *fix*. Prove each one in the rendered DOM, before and
after (`docs/agents/verifying-ui-changes.md`). Then land it per
`docs/agents/pr-workflow.md` ("Closing a self-merged chartered run" and "The
recipe") — the PR body carries the tally. Done when every *fix* item has DOM
evidence and the PR is merged, or left open and escalated with the reason.

## 5. Feature PR

Only after step 4's PR has merged or been escalated: branch
`claude/visitor-loop-feature-<YYYY-MM-DD>` from the fresh `origin/main` and
build the chosen feature — smallest version that a visitor would notice, in
the site's existing voice and design. Tests where the Tenant already has them.
Land it the same way. Done when the feature is visible on the rendered page
and the PR is merged or escalated.

## 6. File the rest, then close

For each consensus finding marked *out of remit*, open one issue
(`needs-triage`) unless one already exists. Unbuilt ideas and single-visitor
findings are not filed — tomorrow's visitors will raise them again if they
matter. Done when every *out of remit* finding links to an issue.

Then invoke `close-session`.
