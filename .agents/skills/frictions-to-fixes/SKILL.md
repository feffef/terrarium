---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship fixes autonomously — keep the Friction Ledger, select up to 10 per run (at most 2 hard; hard and surface-blocked ones become issues), dispatch Sonnet impl agents as gated PRs, then review-and-merge them yourself, escalating only genuinely high-risk changes to humans.
disable-model-invocation: true
---

# Frictions to Fixes

Read the **frictions** every session honestly logged (ADR-0009), pick the ones worth retiring (only what this run can't land becomes an issue, §4),
dispatch fixes, then **review and land them yourself**. **Autonomy is the
goal** — the impl agents author the PRs; you review and merge them against the
ADR-0004 gate,
escalating to a human only when a change is genuinely high-risk. Harvest broadly —
a friction is worth a fix when it recurs or stings and a change can retire it
without touching a human-only surface — but keep the hard ones rare (§3).

Run it when asked (a Routine also fires it on a schedule), or after a batch of
sessions has piled up unaddressed friction.

> **Keep it short** (CLAUDE.md) governs every fix this run ships. Prefer the
> friction a deletion retires over the one a new mechanism would.

## 1. Survey & screen the frictions — in a subagent

Reading a window of logs and surveying the whole tracker is context-heavy (the tracker JSON
alone overflows the tool-result limit), so **delegate the survey and screen to a single
subagent** (`general-purpose`, so it can run `tsx` and the GitHub MCP tools), with
[`survey-brief.md`](survey-brief.md) verbatim and the scratchpad path filled in. It
surveys, screens, and returns a **distilled, ranked report**; the main session
works only from that report and never re-reads the raw corpus. The subagent
**surveys only** — it files no issues, opens no PRs, changes no code.

Its report holds **(a)** the ranked actionable candidates, **(b)** a dropped list,
**(c)** the subagent's own frictions (they belong in this session's log too, §6),
**(d)** the ledger changes and the path of their YAML patch file, **(e)** the
regressions, and **(f)** the frictions two clusters share. Done when it has
returned all six.

## 2. Act on the screen

The subagent labels every candidate **never-fixed**, **drop**, **open-already** or
**regression**, citing the issue/PR where one exists:

- **Never fixed** carries on to step 3.
- **Drop** is done; spending a PR there is duplicate work. A `blocker` dropped
  only for an open Prune Trial is the exception: after the usual tracker search,
  file it, naming the trial.
- **Open already**: don't file a duplicate. One the subagent flags idle (no
  commit or comment within the horizon) is yours to pick up or escalate.
- **Regression** (its fix merged and the friction recurred): do **not** route it
  through the ordinary simplest-fix dispatch — a change that already failed once
  needs human eyes, not a second run of the same idea. File a distinct issue that
  flags the earlier fix as ineffective (link the prior issue/PR and quote both the
  original and the recurring friction); §3 caps these issues per run.

## 3. Pick what to fix — up to 10, at most 2 hard

From the subagent's ranked never-fixed candidates (already grouped by root cause,
§1), select **up to 10** for this run, sorted into two buckets. (Adjust the grouping
if your judgement differs, but don't re-derive the ranking from scratch.)

- **Simple (the bulk).** Passes the **ripeness test**, all three: **simple** (one
  small code, config or doc change — touches a single file with a bounded diff, no
  redesign), **autonomous** (an agent lands it start-to-finish with no human
  decision mid-way), and **safe surface** (touches none of the human-only
  surfaces — the `paths` of `.claude/rules/adr-0004-human-merge.md`; those are never dispatched
  here). A fix touching a guard or `.claude/settings.json`'s hook wiring is
  never dispatched either, regardless of size — `docs/agents/guards.md`'s own
  rule, since editing it needs a human-attended session. These you review and
  merge yourself in §6.
- **Hard (at most 2 per run).** A friction whose fix touches **2 or more
  files**, or one that turns on a **non-obvious design decision** even within a
  single file. These are still confined to safe surfaces —
  "hard" buys ambition within the dispatchable surface, never a licence to touch a
  human-only one. Cap them at **2** so the review-and-merge load stays sane; if
  more than two hard frictions rank highly, take the top two and leave the rest for
  a later run.

Spend a hard slot on an open ledger entry with a `major` or `blocker` occurrence
and a safe surface before filling simple ones; the hard slots exist for these.

A cluster `--summary` shows as `still recurring` is a §2 regression: never a
simple or hard selection. It gets the §2 issue if it ranks in the top **three**
of the run by severity, occurrence count and proof of regression (occurrences
dated after the fix) together. List the rest in the description of the PR that
carries the ledger edit (§4); they wait in the ledger for the next run.
Drop a lone low-severity one-off (the survey drops it) and anything an ADR defers. A candidate that ranks but fails only the
safe-surface test is **surface-blocked**: not dropped, §4 files it, uncapped. The
caller may pass a lower count as the Skill's argument; with none, take everything
that ranks, capped at the same 10-total / 2-hard limits.

Done when each selection names its evidence, is tagged **simple** or **hard**, and
you can state in one line why it earns a fix (and, for a group, which frictions it
subsumes).

## 4. Update the ledger; file issues only for what outlives this run

**Update the ledger every run, fixes or none.** It is the run's durable
record. The ledger edit is:

- the subagent's ledger changes (§1), `fixes` included;
- `status` and `ref` for what this run files, dispatches or escalates: a
  dispatched fix is `tracked` until its PR merges, and §6 records it in `fixes`;
- last, `pnpm exec tsx scripts/prune-friction-ledger.ts`, which drops every
  occurrence before the horizon and deletes an entry left with none (git
  keeps them).

You review and merge; you never author. So
the ledger edit rides in the grouped doc PR (§5), or, on a run that dispatches
none, goes to one Sonnet agent of its own.

A **hard** selection (§3) is expected to need human review at merge (§6), so it
can sit open past this run — file it as an issue on the tracker (a group of
related frictions is one issue, not several): the **problem** with its evidence
(quote the logging sessions + severities — for a group, all of them), the
**solutions** you weighed, and the **recommended** one, scoped for what §5 should
implement. Search the tracker first to avoid duplicates.

So does a **surface-blocked** candidate (§3): file it the same way, labelled
`ready-for-human` (for a human-only file an agent may still write the fix; only
the merge needs a human), except a guard fix: `docs/agents/guards.md` routes
it. Otherwise it ages out of the window untracked, and the next run rediscovers
and re-drops it.

A **simple** selection is dispatched, reviewed and merged inside this same run (§5–§6), so an issue would only be closed by its own merge minutes later, leaving nothing durable. **Skip the issue.** Carry the same problem/evidence/recommended-fix into §5's dispatch brief and into the PR description you write (§6); the merged PR is the record.

**Before recommending "add a line to doc X", check that anyone reads doc X.**
`pnpm exec tsx scripts/audit-skills.ts` (about 478 KB: redirect it to a file and read only `docReadCounts`) reports `docReadCounts` — path → how many
of the windowed sessions opened it. A doc sitting at **0** is where a prose fix
goes to die. Prune the instruction that caused it first (CLAUDE.md, "Keep it
short"); failing that, recommend a mechanism that reaches the session (a
`PreToolUse` guard, a gate check, a line in a doc sessions demonstrably open),
or move the rule to a home that is read. **A read count corroborates, never
carries, a finding** — `scripts/audit-skills.ts`'s `docReadCounts` docstring is
the single home for why (three separate reasons it undercounts). Read it before
citing a count.

Done when every **hard** selection and every surface-blocked candidate has an
open issue with a clearly recommended solution, and every **simple** selection
has its problem/evidence/fix ready to hand straight to §5's dispatch brief with
no issue filed for it.

## 5. Dispatch Sonnet impl agents — batch the doc fixes

Dispatch the implementation to **Sonnet** agents (`model: sonnet`) — the impl work
is well-scoped once §4 named the fix, so it doesn't need the main model. Each agent
runs in its **own git worktree** (parallel PRs must not share a working tree) —
invoke `dispatch-subagents` for the mechanism, the brief checklist, and the
post-dispatch check. Run at most 2 impl agents' full gates concurrently
(dispatch-subagents §3); dispatch the rest as those finish:

- **Doc-only fixes** (Markdown / prose — CLAUDE.md, a **repo-owned** SKILL, a Skill
  Inventory entry): hand them **all to one agent as a single grouped PR**,
  with this run's ledger edit (§4) in the brief, as the path to §1's patch file
  plus any changes to it. These
  are ordinarily **simple** selections with no issue filed (§4) — the PR
  description carries each fix's problem/evidence/recommended-fix directly
  instead of a `Closes #N`; a doc selection that came out **hard** still cites its
  issue. Many one-line doc PRs are pure review overhead; one batched PR is
  cheaper to review than several.
- **Code or config fixes**: one PR each — they carry distinct review and CI surface
  and shouldn't ride on each other. (A single issue that already grouped related
  frictions is still one PR.) A **simple** code/config selection carries its
  problem/evidence/fix in the PR description with no issue to cite; a **hard**
  one cites its issue and `Closes` it.

Each agent's brief is [`impl-brief.md`](impl-brief.md) verbatim, with its
selections and (for the doc-fix agent, or the lone ledger agent of §4) the ledger
edit filled in, plus `dispatch-subagents` §3's lines. It hands the committed
branch back to you, unpushed; you are the reviewer (§6) and open the PR.

Done when every selection and the ledger edit are covered by a committed branch
(every simple doc fix and the ledger edit by the one grouped branch, each other
selection by its own), gate green, awaiting your review.

## 6. Review and merge — autonomously, escalate only high-risk

Once an impl agent hands back its branch, **you review it** — you are the reviewer,
not a bystander waiting for a human. For each branch:

1. **Confirm the gate is green** (ADR-0004).
   A red gate is never mergeable — resume the agent to fix it.
2. **Code-review the diff** before the first push, per `dispatch-subagents` §3
   ("Scope and trust"). Check it implements the issue's recommended option, matches repo
   conventions, and confines itself to a safe surface. **For a doc PR, also
   confirm it clears `audit-docs`' house rules** ([`impl-brief.md`](impl-brief.md)): a fix that would itself be
   a future audit-docs finding is bounced back, not merged.
3. **Have the agent push, then open the PR.** A hard selection's PR cites and
   `Closes` its issue; a simple selection's PR carries its problem/evidence/fix
   inline. At the first PR open, invoke `close-session` (`in-review`).
   **Always post the review result as a PR comment before merging, with no
   exception** — see `docs/agents/pr-workflow.md`'s recipe (step 4) for the
   rule and why it matters.
4. **Decide, and act:**
   - **Merge right away** when the review is clean and the change is low-risk —
     follow `docs/agents/pr-workflow.md`'s recipe; you merge only by your own
     judgement call, on top of that mechanical recipe.
   - **Escalate to a human** only when the actual diff meets an ADR-0004
     exception (its *Scope* lists them, with examples of behaviour no test can
     observe); check the diff against them rather than guessing. Leave the PR open, say precisely why it is
     high-risk, in a PR comment. A **hard** selection (§3) usually lands
     here — that is expected.

5. **Record the PRs you merged in `fixes` right away**, not in the next run:
   merge the grouped doc PR (§5) last. Once every other PR of the run is merged,
   append a commit to the grouped doc PR that adds a `fixes` entry (`pr`, today's
   UTC date, a one-line summary from the PR's description) to each cluster those
   PRs fixed, the doc PR's own number included, and drops `tracked` from them.
   Re-run the gate, post a fresh review comment, then merge. A PR you did not
   merge gets no entry.

A PR is finished only when **merged** (by you) or **escalated/abandoned**, not at push time (the ADR-0003 rule).

Done when every dispatched PR carries a posted review comment and is merged or
escalated/abandoned, and every PR you merged is in `fixes`.

Log the session.
