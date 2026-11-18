---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship fixes autonomously — keep the Friction Ledger and merge it to main in its own PR every run, pick up to 10 per run, have a design agent design each fix and assess its risk, dispatch the safe ones to Sonnet impl agents as gated PRs and file the rest as issues, then review-and-merge the PRs yourself, escalating only genuinely high-risk changes to humans.
disable-model-invocation: true
---

# Frictions to Fixes

Sessions log the **frictions** they hit (ADR-0009). This run finds the ones
worth retiring and fixes them without a human: subagents survey, design and
build; you decide, review and merge. Escalate only a genuinely high-risk change.
Prefer a fix that deletes something over one that adds a mechanism (CLAUDE.md,
"Keep it short").

Three kinds of PR: the **ledger PR** (§5, every run, fixes or none), **fix PRs**
(§6–§7: one per code fix, one for all doc fixes) and the **closing ledger PR**
(§8). Work on the session's branch until §6. A brief goes to its agent verbatim
(pasted or by path) with its `{…}` values filled.

## 1. Survey

Goal: a ranked, screened candidate list with the ledger updated. The logs and
tracker are too big for your context, so work only from a subagent's report.

Dispatch **one** `general-purpose` subagent (it needs `tsx` and the GitHub MCP
tools) with [`survey-brief.md`](survey-brief.md). It runs in your checkout:
touch no git state until it returns. Its one write is the ledger commit on your
branch. Its report must have six parts: **(a)** ranked candidates, **(b)**
dropped list, **(c)** its own frictions, **(d)** ledger changes and their commit,
**(e)** regressions, **(f)** frictions two clusters share.

## 2. Act on the screen

Check the survey has all six parts before you go on. Each candidate is one of:

- **never-fixed:** go to §3.
- **drop:** nothing. A `blocker` dropped only for an open Prune Trial's
  territory still gets an issue naming the trial (search the tracker first).
- **open-already:** file nothing. If flagged idle (no commit or comment within
  `LEDGER_HORIZON_DAYS`, `layers/journal/app/utils/ledger.ts`), pick it up in
  §3 or escalate.
- **regression** (its fix merged, then the friction came back): never pick it,
  since a change that failed once needs human eyes. File an issue saying the
  earlier fix did not work, linking it and quoting the original and new
  friction, for the top three (fewer if fewer qualify) still-recurring entries
  (status not `accepted`, `on-trial` or `tracked`) whose highest severity since
  the latest fix (`since:` in the survey's `--summary`) is `moderate` or above,
  ranked by it. List every other regression, lower severity included, in the
  ledger PR's description. A regression with an open issue needs none and takes
  no slot.

## 3. Pick up to 10

Take the survey's ranking and grouping (adjust a grouping, don't re-rank). Pick
from never-fixed candidates and idle open-already ones you take on, up to 10 or
the Skill argument's lower count, preferring entries with a `major` or `blocker`
occurrence. Skip a lone low-severity one-off and anything an ADR defers. Each
pick names its ledger entry (or window friction), its sessions and one line on
why it earns a fix.

## 4. Design the picks

Dispatch **one** `general-purpose` subagent for all picks with
[`design-brief.md`](design-brief.md), giving each pick everything the survey
found plus its ledger entry's `notes`. It designs only; it files and changes
nothing. Per fix it returns the problem and evidence, one design, the risk and a
recommendation (dispatch, issue or no change), plus its own frictions.

## 5. Decide, file issues, open the ledger PR

Goal: each fix is dispatched, filed or dropped with its reason kept, and the
ledger reaches `main` whatever happens to the fixes.

1. **Decide.** Dispatch a fix an agent can land start to finish on a safe
   surface; otherwise file it. Never dispatch one that touches a Human-only file
   (`paths` of `.claude/rules/adr-0004-human-merge.md`), a guard or the hook
   wiring in `.claude/settings.json` (`docs/agents/guards.md`), or that needs a
   human's design choice. Drop a fix the design agent says changes nothing or
   costs more than the friction.
2. **File issues** for undispatched fixes, highest-ranked first, **at most
   three** (§2's regression issues and fixes blocked only by a Human-only file
   or guard are outside the cap). Search the tracker first; one issue per group
   of related frictions, with the problem (every session and severity) and the
   design, by `docs/agents/issue-tracker.md` "Filing an issue", labelled
   `needs-triage`. List fixes over the cap in the ledger PR's description. A
   fix neither filed nor listed is lost to the next run.
3. **Update the ledger** on top of the survey's commit, through
   `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/ledger-set.ts`:
   `status: tracked` on every entry filed or dispatched (issue number in `ref`
   for a filed one); for a dropped fix, `--note "<date> design: <solution>
   dropped: <reason>"` with the entry's status unchanged; then run
   `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/prune-friction-ledger.ts`.
4. **Open the ledger PR**: review by `docs/agents/pr-workflow.md`'s simple-change
   test, `pnpm gate:scoped` on the final head, push, open, land by that doc's
   recipe once CI is green. §6 does not wait for it.

A dispatched fix gets no issue (its merged PR is the record): carry its problem,
evidence and design into §6's brief and the PR description. Its PR number goes
into the ledger in §8.

## 6. Dispatch the builds

Goal: each dispatched fix is a committed, gate-green, unpushed branch built by a
Sonnet agent in its own worktree. Invoke `dispatch-subagents` first.

Doc-only fixes (Markdown: CLAUDE.md, one of our Skills, a Skill Inventory entry)
all go to **one** agent and branch; each code or config fix gets its own. Use
`model: sonnet` and [`impl-brief.md`](impl-brief.md) with the fixes (problem,
evidence, design) and `{SCRATCH_DIR}` filled, plus `dispatch-subagents` §3's
lines. At most **two** agents run full gates at once; dispatch the next as one finishes.

## 7. Review and merge

You are the reviewer: every fix PR ends merged, escalated or abandoned, never
just pushed (ADR-0003). For each branch handed back:

1. A red gate is never mergeable: resume the agent to fix it.
2. Review the diff before opening the PR (`dispatch-subagents` §3, "Scope and
   trust"): it implements the §4 design, follows conventions and stays on a safe
   surface. A doc branch must also survive `audit-docs`; a fix that would be its
   next finding goes back.
3. Push and open the PR yourself, with problem, evidence and design in the
   description; `Closes` the issue if the fix came from one (§2).
4. Post your review as a PR comment before any merge (`pr-workflow.md`, recipe
   step 4).
5. Decide: **merge** a clean low-risk change by the recipe; **send it back**
   (resume the agent, review the new commits, push, decide again) when the agent
   can fix the findings; **escalate** only when the diff meets an ADR-0004
   exception (the *Scope* list in `docs/adr/0004-objective-safety-gate.md`). To
   escalate, after the ledger PR merges have the agent merge `origin/main` and
   commit the PR's own `fixes` ledger entry (dated today, via `ledger-set.ts`),
   leave the PR open and say exactly why in a comment. The entry lets the ledger update when a human merges it; the next survey corrects the date.

## 8. Close the ledger and log

Goal: the ledger shows what became of every fix PR, and the log is honest.

Once the ledger PR has merged and every fix PR is merged, escalated or
abandoned, land **one** status-only PR from a fresh branch off `origin/main`,
the same way as the ledger PR, through `ledger-set.ts`:

- **merged** fix: a `fixes` entry (`pr`, UTC merge date, a one-line summary from
  its description) and `status: open`. That is right: whether it worked is
  derived from later occurrences (`survey-brief.md`).
- **abandoned:** `status: open`.
- **escalated:** its PR number in `ref`; it stays `tracked`.

With no fix PR, skip this PR and still log.

Then invoke `close-session`. Among the frictions, include the subagents' own, and
name each place this Skill or its briefs were confusing or contradicted
themselves, and each step hard to follow with this run's data.
