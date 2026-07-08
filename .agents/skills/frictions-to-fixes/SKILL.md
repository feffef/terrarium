---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship fixes autonomously — file up to 10 issues (at most 2 hard), dispatch Sonnet impl agents as gated PRs, then review-and-merge them yourself, escalating only genuinely high-risk changes to humans.
disable-model-invocation: true
---

# Frictions to Fixes

The precursor to the deferred `consolidate`/`codify` jobs (ADR-0009): read
the **frictions** every session honestly logged, turn the ones worth retiring into
issues, dispatch fixes, then **review and land them yourself**. **Autonomy is the
goal** — you act as the mid-term **review-agent** that ADR-0003 foresaw (the impl
agents author the PRs; you review and merge them against the ADR-0004 gate),
escalating to a human only when a change is genuinely high-risk. Harvest broadly —
a friction is worth an issue when it recurs or stings and a change can retire it
without touching a human-only surface — but keep the hard ones rare (§3).

Run it when asked (a Routine also fires it on a schedule), or after a batch of
sessions has piled up unaddressed friction.

## 1. Survey & screen the frictions — in a subagent

Reading 20 logs and surveying the whole tracker is context-heavy (the tracker JSON
alone overflows the tool-result limit), so **delegate steps 1–2 to a single
subagent** (`general-purpose`, so it can run `tsx` and the GitHub MCP tools). It
surveys, screens, and returns a **distilled, ranked report**; the main session
works only from that report and never re-reads the raw corpus. The subagent
**surveys only** — it files no issues, opens no PRs, changes no code.

Its brief:

- **Read the latest 20 session logs** via `tsx scripts/session-frictions.ts`
  (`--window N` to change the count). This is a **recency window, not a
  sample** — read every session in it, don't chase frictions from older,
  likely-gone sessions. Each record's `id`/`file` point back to the full log —
  re-read it directly when a candidate needs more context than the triage
  extract carries.
- **Group and rank.** Fold related/recurring frictions (shared root cause or single
  fix) into one candidate; rank by **recurrence × severity**. **Prioritize
  `moderate`, `major`, and `blocker` frictions** — these earn a fix on severity
  alone, even logged once. **But a low-severity friction is not automatically
  dropped:** a `nit` or `minor` that **recurs across sessions _and_ is easy to
  fix** should still be addressed — cheap, repeated papercuts add up and are worth
  retiring. What gets dropped is the lone, low-severity one-off (a single `nit`
  with a non-trivial fix), not every `nit`.
- **Screen against the tracker** — apply the §2 rules to every candidate.
- **GitHub-MCP hygiene** (these are themselves recurring frictions — heed them):
  call the tools by their **fully-qualified `mcp__github__*` names** (bare names
  don't resolve via ToolSearch). `list_issues` / `list_pull_requests` have **no
  `minimal_output` param** — they always return full bodies, so prefer
  `search_issues` / `search_pull_requests` with a targeted query for a narrow
  lookup; when a full list is unavoidable, use a small `perPage` (5–10) and
  page, expecting to slice the persisted file for large sets. Page both open
  and closed/merged.

**The subagent also reports its own frictions.** Whatever it hits while running the
survey — an MCP disconnect, a tool that only resolved under its full id, an
oversized result it had to slice — it records and **returns alongside** the
screened list, so this run's own frictions feed the next cycle (they belong in this
session's log too, §6). Don't let the survey's frictions evaporate just because it
ran in a subagent.

Done when the subagent returns a structured report: **(a) ranked actionable
candidates** — each with title, severity, recurrence (N/20), sessions, tracker
classification (never-fixed / open-already #N / regression of #N), fix type
(doc/code/config), human-only-surface flag, difficulty (simple/hard), a one-line
recommended fix, and evidence quotes; **(b) a dropped list** with one-line reasons;
and **(c) the subagent's own frictions** from the run.

## 2. Screen against fixes already shipped (the subagent's rules)

Never re-fix what is already fixed. The §1 subagent applies these rules to every
candidate, checking the tracker for an issue or PR that already covers it — and
confirming against **`main`** where cheap (a "solution" isn't ripe if main already
has it). `tsx scripts/merged-since.ts <friction session's startedAt>` lists every
`origin/main` commit landed after that instant (UTC-normalized, newest-first,
`isMerge`-flagged) — scan it for the fixing commit/PR to turn the
already-fixed/regression join into a direct comparison instead of manual
git-timestamp archaeology. Classify each into one branch:

- **Never fixed** — no issue/PR addresses it. Carries on to step 3.
- **Fixed, and not logged since the fix merged** — drop it (cite the issue/PR).
  Done is done; spending a PR here is duplicate work.
- **Open already** — an **open** issue or **open** PR already tracks it (cite the
  number). Don't file a duplicate; surface it so the main session can pick up the
  existing thread instead.
- **Reappeared _after_ its fix merged** (a friction logged in a session that
  started later than the fixing PR landed) — this is a **regression**: the fix that
  was supposed to be in place did not hold. Do **not** route it through the ordinary
  simplest-fix dispatch — a change that already failed once needs human eyes, not a
  second run of the same idea. The main session files a distinct issue that flags
  the earlier fix as ineffective (link the prior issue/PR and quote both the
  original and the recurring friction), and **alerts the user**.

Done when every candidate is labelled never-fixed, drop, open-already, or
regression — each with its citing issue/PR number where one exists.

## 3. Pick what to fix — up to 10, at most 2 hard

From the subagent's ranked never-fixed candidates (already grouped by root cause,
§1), select **up to 10** for this run, sorted into two buckets. (Adjust the grouping
if your judgement differs, but don't re-derive the ranking from scratch.)

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

- **Doc-only fixes** (Markdown / prose — CLAUDE.md, a SKILL, a Skill Inventory entry):
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
escalated/abandoned. Then it is a genuine end-of-session — invoke `log-session`
(you judge closure), logging this run's own frictions too.
