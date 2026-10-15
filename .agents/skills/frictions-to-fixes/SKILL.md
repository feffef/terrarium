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
alone overflows the tool-result limit), so **delegate steps 1–2 to a single
subagent** (`general-purpose`, so it can run `tsx` and the GitHub MCP tools). It
surveys, screens, and returns a **distilled, ranked report**; the main session
works only from that report and never re-reads the raw corpus. The subagent
**surveys only** — it files no issues, opens no PRs, changes no code.

Its brief:

- **Start from the Friction Ledger** (`layers/journal/content/current/frictions/*.yml`;
  schema in `layers/journal/tenant.config.ts`): one entry per cluster of
  frictions with a common cause, carrying its `status`, `surface` and every
  `occurrence` so far. Append each friction in the window that matches an
  entry, whatever its severity; a session counts once, at its highest
  severity. A new entry needs a cause seen twice, or one `moderate`, `major` or
  `blocker`.
  A cluster is a shared **root cause**: two frictions days apart, on different
  tools, belong together when one change would retire both. The ledger's
  **horizon** is the last 14 days (§4 prunes it to that): an entry's
  recurrence is its occurrences within it, counting only sessions that started
  after its fix merged when it has one. Return the ledger changes (new entries, appended occurrences,
  status changes, each with its evidence) in the report. Survey the ledger with
  `pnpm exec tsx scripts/prune-friction-ledger.ts --summary` (one line per entry; it flags a `fixed` entry with a later
  occurrence as a possible regression);
  open an entry file only for its evidence.
- **Steer the budget at the unfixed tail.** A large share of the window's frictions are usually already resolved by a later in-window session or a merged fix. Screen those out fast as a §2 `drop` instead of re-deriving their history; save the deep archaeology for candidates with no in-window resolution.
- **Read the window's session logs** via `pnpm exec tsx scripts/session-frictions.ts`
  (it prints where the window starts; bare `tsx` isn't on PATH). Large output goes to
  `/tmp/session-frictions-output.json` and stdout gets only a notice — read the file, or
  pass `--out PATH`; don't parse stdout. Use `--compact --unledgered` (the latter skips sessions the ledger already cites; `--compact` keeps `docsRead` paths and
  `subagents`, drops prose) and re-read a full log via its `file` only when a candidate needs it. This is a **recency window, not a
  sample** — read every session in it, don't chase frictions from older,
  likely-gone sessions. Each record's `id`/`file` point back to the full log —
  re-read it directly when a candidate needs more context than the triage
extract carries. **External sessions are already excluded:** the survey script drops any log flagged `external: true` (ADR-0009). Don't hunt the raw corpus for them.
- **For a friction a doc already covers, check whether that session read the
  doc.** Each triage record carries `docsRead` (Read-tool opens plus any the
  author listed, and since 2026-10-10 shell reads). On an older log a
  `cat`/`grep` read shows only in the full log's deprecated
  `docsReadViaShell`, so check the record's `file` before calling a doc *not
  opened*. This
  splits one question into two very different frictions: **doc not opened** ⇒ a
  *discoverability* failure — the rule's home is wrong, or prose is the wrong
  mechanism entirely; **doc opened and the friction happened anyway** ⇒ the
  prose itself is unclear, wrong, or too easy to read past. Report which, with
the paths as evidence. **"Opened" can mean a subagent opened it:** subagent reads are folded into the parent's list (`session-trace.ts`'s `foldSubagentTrace`), so on a session that delegated, check the `subagents` field before concluding the agent that hit the friction had the rule in front of it. A doc only a subagent opened is closer to *not opened*. This repo has paid for the distinction repeatedly: the fixes for #241/#425 landed in `docs/agents/github-integration.md`, which the affected sessions had no reason to open, and the friction kept recurring until a `PreToolUse` guard replaced the prose.
- **For a friction alleging a detector/tool/mechanism bug, check the `subagents` field and read the relevant mechanism source before trusting the friction's own root-cause guess.** A self-diagnosis logged in the moment, without source access, is not evidence: e.g. "detector over-credits reads" can be `foldSubagentTrace` correctly unioning a dispatched subagent's reads, not a real detector gap. Verify against source before ranking it.
- **Group and rank.** A candidate is a ledger entry (one per root cause) or a
  window friction too new for one; rank by **recurrence and severity together** (severity is an ordered rank, not a number: weigh it qualitatively, never multiply it). **Prioritize `moderate`, `major`, and `blocker` frictions**: these earn a fix on severity alone, even logged once. **A low-severity friction is not automatically dropped:** a `nit` or `minor` that **recurs across sessions _and_ is easy to fix** is still worth retiring, since cheap repeated papercuts add up. What gets dropped is the lone low-severity one-off (a single `nit` with a non-trivial fix), not every `nit`.
- **Screen against the tracker** — apply the §2 rules to every candidate.
- **Earlier runs' decisions are the ledger's `status` and `ref`.** When an entry
  lacks them, the window's `trigger: frictions-to-fixes` logs (`summary`,
  `outcome`, `prs`) are the fallback; a run's summary can be wrong or partial, so
  verify against the PR or `main` before dropping.
- **GitHub-MCP hygiene** (a recurring friction — heed it): load the
  `mcp__github__*` tools you need via `ToolSearch` before the first call (e.g.
  `select:mcp__github__search_issues,mcp__github__search_pull_requests,mcp__github__issue_read,mcp__github__pull_request_read`
  — the §2 nearby-issue eyeball step needs the read tools too).
  `docs/agents/github-integration.md` owns name resolution and the
  `list_*`/`search_*` overflow guidance.

**The subagent also reports its own frictions.** Whatever it hits while running the survey — an MCP disconnect, a tool that only resolved under its full id, an oversized result it had to slice — it records and **returns alongside** the screened list, so this run's own frictions feed the next cycle (they belong in this session's log too, §6).

Done when the subagent returns a structured report: **(a) ranked actionable
candidates** — each with its ledger entry, severity, recurrence (as §1 counts it), sessions, tracker
classification (never-fixed / open-already #N / regression of #N), fix type
(doc/code/config), surface-blocked flag (fails §3's safe-surface test: human-only,
guard or hook wiring), difficulty (simple/hard), a one-line
recommended fix, and evidence quotes; **(b) a dropped list** with one-line reasons (an on-trial one quotes its territory match, §2);
**(c) the subagent's own frictions** from the run; and **(d) the ledger changes**, also saved as a YAML patch file in the
scratchpad whose path it names.

## 2. Screen against fixes already shipped (the subagent's rules)

Never re-fix what is already fixed. **First, drop what isn't ours to change:** a candidate whose only fix edits an **external pack Skill's `SKILL.md`** is off limits (ADR-0015; the gate rejects it). A repo-specific fit-note belongs in that Skill's Inventory entry: `audit-skills`' job, not a friction fix.
**Next, drop what is on trial:** a candidate whose fix would restore prose inside
an open **Prune Trial**'s territory (`.agents/prune-trials.yml`) is the trial's
evidence, not a fix (ADR-0027). The drop reason quotes the matching `territory` path or keyword verbatim; with no quotable match the candidate is not on trial, so classify it below. A
`blocker` is the exception: after the usual tracker search, file it, naming the
trial. Then, for the rest: the §1 subagent applies these rules to every candidate, checking the tracker for an issue or PR that already covers it, and confirming against **`main`** where cheap (a "solution" isn't ripe if main already has it). `pnpm exec tsx scripts/merged-since.ts <friction session's startedAt>` lists every `origin/main` commit landed after that instant (UTC, newest-first, `isMerge`-flagged; `--merges-only` keeps PR merges alone, else a window's output can overflow a subagent). Find the fixing commit/PR in it rather than comparing git timestamps by hand. Capture stdout and stderr separately: diagnostics go to stderr, and mixing them into the JSON on stdout breaks parsing. **Before labelling a candidate "never fixed", search the tracker with the friction's tool name and error-message text** (not a paraphrase), with a narrow query (`docs/agents/github-integration.md`). The search tools (e.g. `mcp__github__search_issues`) match semantically, not by substring, so a miss alone doesn't prove never-fixed: also eyeball nearby issues (same file, script or mechanism) for a closed one covering the same root cause in other words. A paraphrase or a nearby instance of an already-fixed cause is **fixed, not never-fixed** (issue #854). Classify each into one branch:

- **Never fixed** — no issue/PR addresses it, confirmed by the keyword search
  above. Carries on to step 3.
- **Fixed, and not logged since the fix merged** — drop it (cite the issue/PR).
  Done is done; spending a PR here is duplicate work.
- **Open already** — an **open** issue or **open** PR already tracks it (the
  ledger's `tracked`; cite the number). Don't file a duplicate. One with no
  commit or comment within the horizon is idle: surface it as a candidate for
  the main session to pick up or escalate.
- **Reappeared _after_ its fix merged** (a friction logged in a session that
  started later than the fixing PR landed; the entry's `fixedOn` dates it) —
  this is a **regression**: the fix that
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

Drop a lone low-severity one-off (§1) and anything an ADR defers. A candidate that ranks but fails only the
safe-surface test is **surface-blocked**: not dropped, §4 files it, uncapped. The
caller may pass a lower count as the Skill's argument; with none, take everything
that ranks, capped at the same 10-total / 2-hard limits.

Done when each selection names its evidence, is tagged **simple** or **hard**, and
you can state in one line why it earns a fix (and, for a group, which frictions it
subsumes).

## 4. Update the ledger; file issues only for what outlives this run

**Update the ledger every run, fixes or none.** It is the run's durable
record. The ledger edit is:

- the subagent's ledger changes (§1);
- `status` and `ref` for what this run files, dispatches or escalates, with
  `fixedOn` on anything it marks `fixed`;
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
`pnpm exec tsx scripts/audit-skills.ts` reports `docReadCounts` — path → how many
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
  plus any changes to it, ending with the prune script. These
  are ordinarily **simple** selections with no issue filed (§4) — the PR
  description carries each fix's problem/evidence/recommended-fix directly
  instead of a `Closes #N`; a doc selection that came out **hard** still cites its
  issue. **Never an external pack Skill's `SKILL.md`**
  (a `skills-lock.json` name) — those are off limits (screened out in §2). Many one-line doc PRs are pure review overhead; one batched PR is
  cheaper to review than several.
  - **The doc fix must itself clear `audit-docs`' house rules** — that Skill is
    the home for them (`audit-docs/SKILL.md`, not restated here), and since this
    Skill self-merges its doc commits too (§6), they hold to the same standard the
    doc-audit sweep verifies. Two axes: (1) respect each surface's **tier** — Live
    is fixable, but **never edit an ADR** (its PR needs a human merge, ADR-0004, and this Skill merges its own), **a Historical
    record** (session logs, blog posts) **or a Pack-generic template**;
    (2) don't *author* any defect audit-docs' eight lenses catch — above all
    **single-home rather than restate** (the CLAUDE.md rule), and make any new
    `docs/agents/*` file reachable (ADR-0029; audit-docs' orphan-addition
    lens). A
    friction doc fix that would become the next audit-docs finding isn't done.
    Put this in the doc-fix agent's brief.
- **Code or config fixes**: one PR each — they carry distinct review and CI surface
  and shouldn't ride on each other. (A single issue that already grouped related
  frictions is still one PR.) A **simple** code/config selection carries its
  problem/evidence/fix in the PR description with no issue to cite; a **hard**
  one cites its issue and `Closes` it.

Every agent's brief is self-contained: read the issue(s), branch from `origin/main`,
implement the **recommended** option only, clear the **safety gate**, and commit,
unpushed (`dispatch-subagents` §3, "Scope and trust"). The gate's floor runs `pnpm typecheck` (`scripts/gate.ts`); the brief tells
the agent never to substitute a bare `tsc --noEmit`, which skips the
`nuxt typecheck` step and can pass while real errors remain. The impl agent **never
merges and never enables auto-merge** — it hands the committed branch back to you. You are the reviewer (§6)
and open the PR.

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
   confirm it clears `audit-docs`' house rules** (§5): a fix that would itself be
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
     high-risk, and **alert the user**. A **hard** selection (§3) usually lands
     here — that is expected.

A PR is finished only when **merged** (by you) or **escalated/abandoned**, not at push time (the ADR-0003 rule).

Done when every dispatched PR carries a posted review comment and is merged or
escalated/abandoned.

Log the session.
