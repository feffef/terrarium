---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship fixes autonomously — keep the Friction Ledger, pick up to 10 per run, have a design agent design each fix and assess its risk, dispatch the safe ones to Sonnet impl agents as gated PRs and file the rest as issues, then review-and-merge the PRs yourself, escalating only genuinely high-risk changes to humans.
disable-model-invocation: true
---

# Frictions to Fixes

Read the **frictions** every session honestly logged (ADR-0009), pick the ones worth retiring,
have them designed, dispatch the safe fixes (only what this run can't land becomes an issue, §5),
then **review and land them yourself**. **Autonomy is the
goal** — the impl agents author the PRs; you review and merge them against the
ADR-0004 gate,
escalating to a human only when a change is genuinely high-risk. Harvest broadly —
a friction is worth a fix when it recurs or stings and a change can retire it
without touching a human-only surface.

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
**(c)** the subagent's own frictions (they belong in this session's log too, §7),
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
- **Regression** (its fix merged and the friction recurred): never picked or
  dispatched — a change that already failed once needs human eyes, not a second
  run of the same idea. File a distinct issue for every one that flags the
  earlier fix as ineffective (link the prior issue/PR and quote both the
  original and the recurring friction).

## 3. Pick what to fix — up to 10

From the subagent's ranked never-fixed candidates (already grouped by root cause,
§1), pick **up to 10** for this run. (Adjust the grouping if your judgement
differs, but don't re-derive the ranking from scratch.) Prefer an open ledger
entry with a `major` or `blocker` occurrence. Drop a lone low-severity one-off
and anything an ADR defers. The caller may pass a lower count as the Skill's
argument; with none, take everything that ranks, up to 10.

Done when each pick names its ledger entry or window friction and its sessions,
and you can state in one line why it earns a fix.

## 4. Design the picks — in a subagent

Dispatch **one** design subagent (`general-purpose`) for all picks, with
[`design-brief.md`](design-brief.md) verbatim, with the picks and the scratchpad path filled in. It reads
the full session log of every occurrence, explores the source, and returns, per
fix: the problem with its evidence, the sessions' own proposals, the design it
recommends, a risk assessment and a recommendation (dispatch or issue). It
designs only — it files no issues, opens no PRs, changes no code.

Done when every pick has a design and a recommendation.

## 5. Decide; update the ledger; file issues only for what outlives this run

**Decide each fix** from the design agent's report: **dispatch** it when an
agent can land it start-to-finish on a safe surface, or **file it as an issue**.
A fix is never dispatched when it touches a human-only surface (the `paths` of
`.claude/rules/adr-0004-human-merge.md`) or a guard or `.claude/settings.json`'s
hook wiring (`docs/agents/guards.md`'s own rule, since editing it needs a
human-attended session), or when it turns on a design choice a human should make.

**File an issue** for each fix you don't dispatch (a group of related frictions
is one issue, not several): the **problem** with its evidence (quote the logging
sessions + severities — for a group, all of them), the **solutions** weighed,
and the **recommended** one. Search the tracker first to avoid duplicates. Label
one blocked only by a human-only surface `ready-for-human` (an agent may still
write the fix; only the merge needs a human), except a guard fix:
`docs/agents/guards.md` routes it. Otherwise it ages out of the window
untracked, and the next run rediscovers and re-drops it.

A dispatched fix gets **no issue**: it is reviewed and merged inside this run
(§6–§7), so an issue would only be closed by its own merge minutes later. Carry
its problem, evidence and design into §6's brief and into the PR description;
the merged PR is the record.

**Update the ledger every run, fixes or none.** It is the run's durable
record. The ledger edit is:

- the subagent's ledger changes (§1), `fixes` included;
- `status` and `ref` for what this run files, dispatches or escalates: a
  dispatched fix is `tracked` until its PR merges, and §7 records it in `fixes`;
- last, `pnpm exec tsx scripts/prune-friction-ledger.ts`, which drops every
  occurrence before the horizon and deletes an entry left with none (git
  keeps them).

You review and merge; you never author. So
the ledger edit rides in the grouped doc PR (§6), or, on a run that dispatches
none, goes to one Sonnet agent of its own.

Done when every fix is either ready to dispatch or has an open issue, and every
regression has its issue.

## 6. Dispatch Sonnet impl agents — batch the doc fixes

Dispatch the implementation to **Sonnet** agents (`model: sonnet`) — the impl work
is well-scoped once §4 designed the fix, so it doesn't need the main model. Each agent
runs in its **own git worktree** (parallel PRs must not share a working tree) —
invoke `dispatch-subagents` for the mechanism, the brief checklist, and the
post-dispatch check. Run at most 2 impl agents' full gates concurrently
(dispatch-subagents §3); dispatch the rest as those finish:

- **Doc-only fixes** (Markdown / prose — CLAUDE.md, a **repo-owned** SKILL, a Skill
  Inventory entry): hand them **all to one agent as a single grouped PR**,
  with this run's ledger edit (§5) in the brief, as the path to §1's patch file
  plus any changes to it. Many one-line doc PRs are pure review overhead; one
  batched PR is cheaper to review than several.
- **Code or config fixes**: one PR each — they carry distinct review and CI surface
  and shouldn't ride on each other.

Each PR description carries its fixes' problem, evidence and design (§5); a fix
picked up from an open issue (§2) also `Closes` it.

Each agent's brief is [`impl-brief.md`](impl-brief.md) verbatim, with its
fixes and (for the doc-fix agent, or the lone ledger agent of §5) the ledger
edit filled in, plus `dispatch-subagents` §3's lines. It hands the committed
branch back to you, unpushed; you are the reviewer (§7) and open the PR.

Done when every dispatched fix and the ledger edit are covered by a committed branch
(every doc fix and the ledger edit by the one grouped branch, each other
fix by its own), gate green, awaiting your review.

## 7. Review and merge — autonomously, escalate only high-risk

Once an impl agent hands back its branch, **you review it** — you are the reviewer,
not a bystander waiting for a human. For each branch:

1. **Confirm the gate is green** (ADR-0004).
   A red gate is never mergeable — resume the agent to fix it.
2. **Code-review the diff** before the first push, per `dispatch-subagents` §3
   ("Scope and trust"). Check it implements the design (§4), matches repo
   conventions, and confines itself to a safe surface. **For a doc PR, also
   confirm it clears `audit-docs`' house rules** ([`impl-brief.md`](impl-brief.md)): a fix that would itself be
   a future audit-docs finding is bounced back, not merged.
3. **Have the agent push, then open the PR**, carrying its problem, evidence and
   design inline. At the first PR open, invoke `close-session` (`in-review`).
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
     high-risk, in a PR comment.

5. **Record the PRs you merged in `fixes` right away**, not in the next run:
   merge the grouped doc PR (§6) last. Once every other PR of the run is merged,
   append a commit to the grouped doc PR that adds a `fixes` entry (`pr`, today's
   UTC date, a one-line summary from the PR's description) to each cluster those
   PRs fixed, the doc PR's own number included, and drops `tracked` from them.
   Re-run the gate, post a fresh review comment, then merge. A PR you did not
   merge gets no entry.

A PR is finished only when **merged** (by you) or **escalated/abandoned**, not at push time (the ADR-0003 rule).

Done when every dispatched PR carries a posted review comment and is merged or
escalated/abandoned, and every PR you merged is in `fixes`.

Log the session.
