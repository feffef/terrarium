---
name: visitor-loop
description: Self-growth run — three blind first-time visitors (three different models) browse a live Terrarium; the run fixes what at least two of them flag, builds the best feature idea they raised, and self-merges both PRs on a green gate.
disable-model-invocation: true
---

# visitor-loop

The Terrarium grows by being **visited**. Each run serves the site, sends three
blind **first-time visitors** through it, fixes only **consensus** problems —
ones at least two of the three raised independently — and builds the best
idea any of them had. One visitor's complaint is taste; two visitors arriving
at the same complaint is signal.

## Remit

Each run may change, and merge on a green gate, two PRs: one fixing the
consensus findings and one building **one** feature from the visitors'
ideas. Both stay inside existing Tenant layers (`layers/<tenant>/`:
content, components, pages, styles and that Tenant's tests), files under `app/`
that are not Human-only, and this Skill's `decisions.md`. Out of remit: a new Tenant, Space, Collection or stored field (`.claude/rules/data-shapes.md`), a new dependency, any Human-only file,
agent instructions, and editing authored history (published posts,
session logs, Digests, Midden artifacts). File an out-of-remit finding as
an issue (step 7). If anything else gets into a PR, leave it open for a
human (ADR-0003).

## Today's focus

Each run looks hard at one part of the Platform, so all three visitors see the
same thing and their findings can agree. A focus given as the Skill's argument
wins. Otherwise take row
`$(( ($(date -u +%s)/86400 - $(date -u -d 2026-09-29 +%s)/86400) % 7 ))`:

| # | Focus | Entry | Note |
|---|-------|-------|------|
| 0 | atlas | `/t/atlas` | |
| 1 | blog | `/t/blog` | |
| 2 | journal | `/t/journal/current` | |
| 3 | midden | `/t/midden` | |
| 4 | tinkerfund | `/t/tinkerfund` | |
| 5 | glassbox | `/t/glassbox/guide` | Stay inside /t/glassbox/guide. Fixes and the feature leave the `drafts` Space alone. |
| 6 | homepage | `/` | |

Both PR titles start `visitor-loop (<focus>): …` — on a pinned branch that is how
`owner-corrections.ts` recognises them. The focus also heads the tally and goes
in the session log's summary.

## 1. Serve the site

On a fresh `origin/main`: `pnpm install`, `pnpm build`, then `pnpm exec tsx scripts/ui/preview.ts start` (production
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
`SendMessage`, never by re-dispatching. Then `scripts/ui/preview.ts stop <pid>`.

## 3. Tally consensus

Findings and ideas cover content (wording, thin or missing pages, new entries) as
much as application behaviour; weigh both alike. Merge the three reports into one
tally in your scratchpad:

- **Findings.** Cluster reports of the *same problem on the same page or
  component*, however worded. A cluster raised by ≥2 visitors is consensus.
  **Verify** every consensus finding yourself against the source and the
  rendered page — two visitors can share a misreading. Drop an unverified one
  with the reason.
- **Feature.** Ideas need no consensus. Weigh every visitor's ideas and pick
  the **one** you judge best: the most visible payoff for a first-time
  visitor that fits the remit, a single PR and today's focus. Consensus fixes may land anywhere.
- **Owner memory.** First run `pnpm exec tsx .agents/skills/visitor-loop/scripts/owner-corrections.ts`:
  it prints every candidate owner correction since the last `decisions.md`
  commit (human reviews of `visitor-loop` PRs, merged PRs that revert or
  rework one, human issue comments about one). Read each candidate and
  resolve it on a tally line that names it (a PR by `#N` or URL, a comment
  by its URL; one line may name several): a rejected approach or standing
  preference becomes one new line in `decisions.md` (committed with step 5's
  PR; say "decisions.md" on the tally line); anything else is marked *not a
  ruling (why)*.
- **Filters.** Then drop anything [`decisions.md`](decisions.md) rules out or
  that is in the same family as one of its rulings,
  anything an open or closed issue/PR already covers (search first; record
  each result in the tally — the match by number, or the query and *no match*),
  and anything already logged as an idea in the last week
  (`pnpm exec tsx .agents/skills/visitor-loop/scripts/ideas.ts gather --days 7`).

Done when `pnpm exec tsx .agents/skills/visitor-loop/scripts/owner-corrections.ts --check <tally-file>`
passes; every feature idea and every *fix* or *out of remit* finding has its
search result; every
reported finding is in the tally, marked consensus or single; every consensus
finding is marked *fix*, *dropped (why)*, or *out of remit*; and exactly one
feature is chosen, with a line on why it beat the others.

## 4. Check fit

Visitors judge the site from outside; they can't know why it is built the way it
is. Dispatch one read-only subagent on `opus` with
[`refiner-brief.md`](refiner-brief.md) verbatim and the tally's path filled in.
It checks every *fix* item, every *out of remit* finding and the chosen feature
against the ADRs, glossaries, repo docs and GitHub issues, and returns each
one kept, refined (rewritten to fit) or dropped, each with the source it rests
on. Apply its verdicts to the tally. If it drops the feature, choose the next
best idea and send it back with `SendMessage`. Done when every item it checked
carries its verdict and source in the tally and the feature it last saw is kept
or refined (or no idea is left: then step 6 is skipped).

## 5. Fix PR

Use the session's designated branch (the cloud harness pins one); `claude/visitor-loop-fixes-<YYYY-MM-DD>` is only the fallback. Branch from `origin/main`. Fix every
consensus finding marked *fix*, in the form step 4 left it. Prove each one in the rendered DOM, before and
after (`docs/agents/verifying-ui-changes.md`: `eval-in-page.ts` to measure, `preview.ts shot` to screenshot; hand-roll a Playwright script only to prove a click those two can't reach, per the doc's recipe). Commit, then run **`/code-review`** before the first
push, fixed point `origin/main`, with the refined tally as the spec. **Auto-fix every
important finding yourself** — a real bug, a broken documented standard (an
ADR included), an accessibility or honesty problem — never defer it to a human
or a follow-up. Re-review and repeat until nothing important remains. Then
push and open the PR — its body carries the tally, its owner-memory lines pasted verbatim from the file `--check` ran against. Post the review verdict on the PR, then land it
per `docs/agents/pr-workflow.md` ("Closing a scheduled run's PR" and
"The recipe"). Done when every *fix* item has DOM evidence, the last review
has no important finding left unfixed, and the PR is merged — or left open and escalated
with the reason.

## 6. Feature PR

Only after step 5's PR has merged or been escalated, branch from the fresh
`origin/main`: re-cut the session's designated branch if step 5's PR merged
(`docs/agents/pr-workflow.md`'s restart-after-merge note), else
`claude/visitor-loop-feature-<YYYY-MM-DD>`. Then build the refined feature —
smallest version that a visitor would notice, in the site's existing voice and
design. Tests where the Tenant already has them.
Its body states the feature's search result and names any related issue, with a
closing keyword only per `docs/agents/pr-workflow.md`. Review and land it the
same way as step 5, with the refined idea as the spec. Done when the feature is
visible on the rendered page, the PR body has that search line, the last review has no
important finding left unfixed, and the PR is merged or escalated.

## 7. File the rest, then close

For each *out of remit* finding step 4 kept or refined, open one issue
(`needs-triage`; body per `docs/agents/issue-tracker.md`'s "Filing an issue") unless one already exists. Every unbuilt idea and
single-visitor finding that survived step 3's filters goes into the session
log's `ideas` instead: one short line each, a finding paired with a proposed
fix, readable without this run's context. Done when every *out of remit*
finding step 4 kept or refined links to an issue and the rest are in `ideas`.

Then invoke `close-session`.
