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

## Today's focus

Each run looks hard at one part of the Platform, so all three visitors see the
same thing and their findings can agree. A focus given as the Skill's argument
wins; otherwise take row `$(( ($(date -u +%s)/86400 - $(date -u -d 2026-09-29 +%s)/86400) % 7 ))`:

| # | Focus | Entry | Note |
|---|-------|-------|------|
| 0 | atlas | `/t/atlas` | |
| 1 | blog | `/t/blog` | |
| 2 | journal | `/t/journal/current` | |
| 3 | midden | `/t/midden` | |
| 4 | tinkerfund | `/t/tinkerfund` | |
| 5 | mobile | `/` | Browse the whole visit at 390px width. |
| 6 | homepage | `/` | |

The focus names both PR titles (`visitor-loop (<focus>): …`), heads the tally,
and goes in the session log's summary.

## 1. Serve the site

On a fresh `origin/main`: `pnpm install`, `pnpm build`, then `pnpm exec tsx scripts/preview.ts start` (production
preview, not `--dev`: visitors must see what the public sees). Done when the
printed `URL=` returns 200 for `/`.

## 2. Send three visitors

Dispatch three read-only subagents **in one message**, one per model —
`sonnet`, `fable`, `opus` (the Agent tool's `model` parameter) — so consensus
means two *different* models agreeing, not one model echoing itself. Each gets
[`visitor-brief.md`](visitor-brief.md) verbatim, with the URL, the focus's entry
path and note (blank if none), and a scratch
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
  visitor that fits the remit, a single PR and today's focus (on `mobile`, a
  narrow-screen improvement anywhere). Consensus fixes may land anywhere.
- **Owner memory.** First gather the owner's corrections since the last
  `decisions.md` entry: review comments on `visitor-loop` PRs, merged PRs
  that revert a `visitor-loop` PR or rework what one built (e.g. touch the
  same files), and owner comments on issues about its output. Each rejected
  approach or standing preference becomes one new line there (committed with
  step 4's PR). Then drop anything [`decisions.md`](decisions.md) rules out,
  anything an open or closed issue/PR already covers (search first), and
  anything already logged as an idea in the last week
  (`pnpm exec tsx scripts/ideas.ts gather --days 7`).

Done when every reported finding is in the tally, marked consensus or single;
every consensus finding is marked *fix*, *dropped (why)*, or *out of remit*;
and exactly one feature is chosen, with a line on why it beat the others.

## 4. Fix PR

Branch `claude/visitor-loop-fixes-<YYYY-MM-DD>` from `origin/main`. Fix every
consensus finding marked *fix*. Prove each one in the rendered DOM, before and
after (`docs/agents/verifying-ui-changes.md`). Open the PR — its body carries
the tally — then run **`/code-review`** on it, fixed point `origin/main`, with
the tally as the spec. **Auto-fix every important finding yourself** — a real
bug, a broken documented standard (an ADR included), an accessibility or
honesty problem — never defer it to a human or a follow-up. Push, re-review,
and repeat until nothing important remains. Post the review verdict on the PR, then land it
per `docs/agents/pr-workflow.md` ("Closing a self-merged chartered run" and
"The recipe"). Done when every *fix* item has DOM evidence, the last review
has no important finding left unfixed, and the PR is merged — or left open and escalated
with the reason.

## 5. Feature PR

Only after step 4's PR has merged or been escalated: branch
`claude/visitor-loop-feature-<YYYY-MM-DD>` from the fresh `origin/main` and
build the chosen feature — smallest version that a visitor would notice, in
the site's existing voice and design. Tests where the Tenant already has them.
Review and land it the same way as step 4, with the chosen idea as the spec.
Done when the feature is visible on the rendered page, the last review has no
important finding left unfixed, and the PR is merged or escalated.

## 6. File the rest, then close

For each consensus finding marked *out of remit*, open one issue
(`needs-triage`) unless one already exists. Every unbuilt idea and
single-visitor finding that survived step 3's filters goes into the session
log's `ideas` instead: one short line each, a finding paired with a proposed
fix, readable without this run's context. Done when every *out of remit*
finding links to an issue and the rest are in `ideas`.

Then invoke `close-session`.
