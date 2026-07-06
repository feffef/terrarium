---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship fixes autonomously — file up to 10 issues (at most 2 hard), dispatch Sonnet impl agents as gated PRs, then review-and-merge them yourself, escalating only genuinely high-risk changes to humans.
disable-model-invocation: true
---

# Frictions to Fixes

The manual precursor to the deferred `consolidate`/`codify` jobs (ADR-0009): read
the **frictions** every session honestly logged, turn the ones worth retiring into
issues, dispatch fixes, then **review and land them yourself**. **Autonomy is the
goal** — you act as the mid-term **review-agent** that ADR-0003 foresaw (the impl
agents author the PRs; you review and merge them against the ADR-0004 gate),
escalating to a human only when a change is genuinely high-risk. Harvest broadly —
a friction is worth an issue when it recurs or stings and a change can retire it
without touching a human-only surface — but keep the hard ones rare (§3).

Run it when asked, or after a batch of sessions has piled up unaddressed friction.

## 1. Read the latest 20 session logs

Session logs live in `tenants/journal/content/current/sessions/*.yml`, each named
with an ISO date prefix (`YYYY-MM-DD-…`) so a plain filename sort is chronological.
Read the **latest 20** — take the last 20 filenames sorted ascending (e.g.
`ls -1 tenants/journal/content/current/sessions/*.yml | tail -20`). This is a
**recency window, not a sample**: read every log inside it, but don't chase
frictions from older sessions that are likely long gone. (If there are fewer than
20 logs, read them all.)

For each, pull its `frictions[]` (`description`, `solution`, `severity`) and keep
its `startedAt` — you need the date to catch regressions in step 2.

Done when every log in the latest-20 window is read and you hold one flat list of
frictions, each tagged with its session(s), severity, and date.

## 2. Screen against fixes already shipped

Never re-fix what is already fixed. For each friction, check the tracker for a
**closed issue or merged PR** that already addressed it, then branch:

- **Never fixed** — carries on to step 3.
- **Fixed, and not logged since the fix merged** — drop it. Done is done; spending
  a PR here is duplicate work.
- **Reappeared _after_ its fix merged** (a friction logged in a session that
  started later than the fixing PR landed) — this is a **regression**: the fix that
  was supposed to be in place did not hold. Do **not** route it through the ordinary
  simplest-fix dispatch — a change that already failed once needs human eyes, not a
  second run of the same idea. Instead file a distinct issue that flags the earlier
  fix as ineffective (link the prior issue/PR and quote both the original and the
  recurring friction), and **alert the user**.

Done when every friction is labelled never-fixed, drop, or regression — and every
regression has its own alerting issue filed.

## 3. Pick what to fix — up to 10, at most 2 hard

From the never-fixed frictions, rank by **recurrence × severity** — one logged
across sessions, or at `moderate`+, outranks a lone `nit`. **Group related
frictions** as you go: several that share a root cause or a single fix become one
selection, not several. Select **up to 10** issues total for this run, sorted into
two buckets:

- **Simple (the bulk).** Passes the **ripeness test**, all three: **simple** (one
  small code or config change, no redesign), **autonomous** (an agent lands it
  start-to-finish with no human decision mid-way), and **safe surface** (touches
  none of the human-only surfaces — generator, routing, isolation logic, CI / the
  safety gate — ADR-0004; those are never dispatched here). These you review and
  merge yourself in §6.
- **Hard (at most 2 per run).** A friction whose fix is a **large code change** or
  is **expected to need human review**. These are still confined to safe surfaces —
  "hard" buys ambition within the dispatchable surface, never a licence to touch a
  human-only one. Cap them at **2** so the review-and-merge load stays sane; if
  more than two hard frictions rank highly, take the top two and leave the rest for
  a later run.

Drop one-offs and anything an ADR defers. If the total count is unset and no user
is reachable (autonomous run), default to everything that ranks, capped at the
same 10-total / 2-hard limits.

Done when each selection names its evidence, is tagged **simple** or **hard**, and
you can state in one line why it earns a fix (and, for a group, which frictions it
subsumes).

## 4. File the issues — one per selection, recommended solution named

File one issue on the tracker per **selection** from §3 (a group of related
frictions is one issue, not several): the **problem** with its evidence (quote the
logging sessions + severities — for a group, all of them), the **solutions** you
weighed, and the **recommended** one. For a **simple** selection, the recommended
option must be a single, unambiguous change — that is what §5 implements. For a
**hard** selection, scope the intended change and note it is expected to need
human review at merge. Search the tracker first to avoid duplicates.

Done when every selection has an open issue with a clearly recommended solution,
tagged simple or hard.

## 5. Dispatch Sonnet impl agents — batch the doc fixes

Dispatch the implementation to **Sonnet** agents (`model: sonnet`) — the impl work
is well-scoped once §4 named the fix, so it doesn't need the main model. Each agent
runs in its **own git worktree** (parallel PRs must not share a working tree):

- **Doc-only fixes** (Markdown / prose — CLAUDE.md, a SKILL, a catalogue entry):
  hand them **all to one agent as a single grouped PR** that `Closes` every one of
  their issues. Many one-line doc PRs are pure review overhead; one batched PR is
  cheaper to review and still traces back to each issue.
- **Code or config fixes**: one PR each — they carry distinct review and CI surface
  and shouldn't ride on each other. (A single issue that already grouped related
  frictions is still one PR.)

Every agent's brief is self-contained: read the issue(s), branch from `origin/main`,
implement the **recommended** option only, clear the **safety gate**, push, and open
a **gated PR**. The impl agent **never merges and never enables auto-merge**
(ADR-0003) — it hands the open PR back to you. You are the reviewer (§6).

Done when every issue is covered by a pushed gated PR (doc issues by the one grouped
PR, each code/config issue by its own), gate green, awaiting your review.

## 6. Review and merge — autonomously, escalate only high-risk

Once an impl agent hands back an open PR, **you review it** — you are the ADR-0003
review-agent, not a bystander waiting for a human. For each PR:

1. **Confirm the gate is green** (ADR-0004: build / validate / isolation / smoke).
   A red gate is never mergeable — bounce it back to the agent or fix it yourself.
2. **Code-review the diff** — run `/code-review` (or review directly for a small
   doc PR). Check it implements the issue's recommended option, matches repo
   conventions, and confines itself to a safe surface.
   **Always post the review result as a PR comment before merging — every time,
   with no exception.** Even a clean, "looks perfect, merging as-is" verdict gets a
   comment. The merge must never be the only trace: an unreviewed-looking merge and
   a genuinely-reviewed one must be distinguishable on the PR, so leave a written
   record of what you checked and what you concluded even when you change nothing.
3. **Decide, and act:**
   - **Merge right away** when the review is clean and the change is low-risk.
   - **Amend then merge** when the only gaps are small — push the fixup yourself,
     re-run the gate, then merge. If your amendment **fundamentally changes** what
     the PR does, update the PR title/description in the same push (the CLAUDE.md
     hard rule — a stale description is a defect).
   - **Escalate to a human** only when the change is **genuinely high-risk**:
     - introduces a **new dependency**,
     - changes **untested or untestable runtime behaviour** (no gate coverage can
       vouch for it),
     - or touches an **ADR-0004 human-only surface** (generator, routing,
       isolation logic, CI, or governance/ADRs) — these are always human-only,
       even if one slipped into a hard issue.
     Leave the PR open, say precisely why it is high-risk, and **alert the user**.
     A **hard** selection (§3) usually lands here — that is expected.

Autonomy is the default; escalation is the exception, reserved for the three cases
above. A PR is finished only when **merged** (by you) or **escalated/abandoned** —
not at push time (`CLAUDE.md`: pushing is not landing).

Done when every dispatched PR carries a posted review comment and is merged or
escalated/abandoned. Then it is a genuine end-of-session — offer to `/log-session`,
and log this run's own frictions too.
