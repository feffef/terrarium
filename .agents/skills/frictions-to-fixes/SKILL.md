---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship fixes autonomously — keep the Friction Ledger and merge it to main in its own PR every run, pick up to 10 per run, have a design agent design each fix and assess its risk, dispatch the safe ones to Sonnet impl agents as gated PRs and file the rest as issues, then review-and-merge the PRs yourself, escalating only genuinely high-risk changes to humans.
disable-model-invocation: true
---

# Frictions to Fixes

Sessions log the **frictions** they hit (ADR-0009). This run finds the ones
worth retiring and fixes them without a human: subagents survey, design and
build; you decide, review and merge. Escalate to a human only a genuinely
high-risk change. Prefer a fix that deletes something over one that adds a
mechanism (CLAUDE.md, "Keep it short").

A run opens three kinds of PR:

- **The ledger PR** (§5): the Friction Ledger's updates. It lands every run,
  fixes or none.
- **Fix PRs** (§6–§7): one per code fix, plus one for all doc fixes.
- **The closing ledger PR** (§8): records what happened to the fix PRs.

Work on the session's branch until §6, where fixes move to their own branches.

## 1. Survey the frictions

Goal: a ranked list of candidates, screened against what is already fixed or
tracked, with the ledger updated. The logs and the tracker are too big for
your context, so a subagent reads them and you work only from its report.

### Instructions

1. Dispatch **one** `general-purpose` subagent (it needs `tsx` and the GitHub
   MCP tools). Its brief is [`survey-brief.md`](survey-brief.md) verbatim,
   with the scratchpad path filled in.
2. Wait. It runs in your checkout, so touch no git state until it returns.
3. Check its report has all six parts: **(a)** ranked candidates, **(b)**
   dropped list, **(c)** its own frictions, **(d)** ledger changes and the
   commit holding them, **(e)** regressions, **(f)** frictions two clusters
   share.

Done when you hold all six parts.

### Edge cases

- The subagent only surveys: its one write is the ledger commit on your
  branch.

## 2. Act on the screen

Goal: deal with every candidate that is not new work. Each candidate is
labelled **never-fixed**, **drop**, **open-already** or **regression**.

### Instructions

- **Never-fixed:** carry on to §3.
- **Drop:** nothing to do.
- **Open-already:** file nothing. If the subagent flags it idle, it is yours
  to pick up in §3 or escalate.
- **Regression** (its fix merged, then the friction came back): never pick
  it; a change that already failed once needs human eyes. File an issue saying the earlier fix did not work, linking the earlier
  issue or PR and quoting the original and the new friction. Do this for the
  top **three** by severity, count and dated proof of recurrence together.
  List the rest in the ledger PR's description (§5).

Done when every candidate is handled as above.

### Edge cases

- A `blocker` dropped only because it is in an open Prune Trial's territory
  still gets an issue naming the trial (search the tracker first).
- A regression that already has an open issue from an earlier run needs
  none, and does not count toward the three.
- "Idle" means no commit or comment within the ledger horizon
  (`LEDGER_HORIZON_DAYS` in `layers/journal/app/utils/ledger.ts`).

## 3. Pick up to 10

Goal: choose this run's fixes from the never-fixed candidates.

### Instructions

1. Take the subagent's ranking and grouping as given. Adjust a grouping if
   you disagree, but don't re-rank from scratch.
2. Pick from the never-fixed candidates and any idle open-already ones you
   take on (§2): everything that ranks, **up to 10**, or the lower count the
   Skill's argument gives. Prefer a ledger entry with a `major` or `blocker`
   occurrence.

Done when each pick names its ledger entry (or window friction) and its
sessions, with one line on why it earns a fix.

### Edge cases

- Skip a lone low-severity one-off, and anything an ADR defers.

## 4. Design the picks

Goal: one concrete design per fix, with a risk call, before anything is
built.

### Instructions

Dispatch **one** `general-purpose` subagent for all picks. Its brief is
[`design-brief.md`](design-brief.md) verbatim, with the picks (each with
everything the survey found, plus its ledger entry's `notes`, read from the
entry file) and the scratchpad path filled in. It returns, per fix: the problem and
evidence, one design, the risk, and a recommendation (dispatch, issue, or no
change), plus its own frictions.

Done when every pick has a design and a recommendation.

### Edge cases

- It designs only: it files and changes nothing.

## 5. Decide, file issues, open the ledger PR

Goal: each fix is dispatched (built and merged in this run), filed as an
issue, or dropped with its reason kept, and the ledger reaches `main`
whatever happens to the fixes.

### Instructions

1. **Decide each fix.** Dispatch it when an agent can land it start to
   finish on a safe surface. Otherwise file it as an issue. Never dispatch a
   fix that touches a Human-only file (the `paths` of
   `.claude/rules/adr-0004-human-merge.md`), a guard or the hook wiring in
   `.claude/settings.json` (`docs/agents/guards.md`), or that depends on a
   design choice a human should make. When the design agent recommends no
   change (no repo change helps, or the fix costs more than the friction),
   drop the fix.
2. **File issues** for undispatched fixes, highest-ranked first, **at most
   three**. Search the tracker first. One issue per group of related
   frictions, holding the problem (quote every session and severity) and the
   design. Follow `docs/agents/issue-tracker.md`'s "Filing an issue" and
   label it `needs-triage`. List the fixes over the cap in the ledger PR's
   description. Outside the cap: §2's regression issues, and fixes blocked
   only by a Human-only file or a guard (still filed, as `needs-triage`).
3. **Update the ledger** on your branch, on top of the survey's commit
   (`status` and `ref` through `scripts/ledger-set.ts`):
   - set `status: tracked` on every entry this run files or dispatches, with
     the issue number in `ref` for a filed one;
   - for each dropped fix, append a line to its entry's `notes` (a `|-`
     block, one note per line):
     `<date> design: <the solution> dropped: <the reason>`. The entry keeps
     its status: only that solution is dropped, not the cluster;
   - run `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/prune-friction-ledger.ts`
     (drops occurrences older than the horizon and deletes empty entries).
4. **Open the ledger PR.** Review the diff yourself (this Skill's own review
   step, per `docs/agents/pr-workflow.md`), run `pnpm gate:scoped`
   on the final head, push, and open it. Invoke `close-session` (status
   `in-review`). Land it by `docs/agents/pr-workflow.md`'s recipe once CI is
   green. §6 does not wait for it.

Done when every fix is ready to dispatch, filed, dropped with a note, or
listed for the next run;
the top three regressions have issues; and the ledger PR is open.

### Edge cases

- A dispatched fix's record is its merged PR, so it gets no issue (one would
  close minutes later). Carry its problem, evidence and design into §6's
  brief and the PR description.
- A fix neither filed nor listed drops out of the window, and the next run
  finds it again from scratch.
- A dispatched fix's PR number goes into the ledger in §8, not here.

## 6. Dispatch the builds

Goal: each dispatched fix becomes a committed, gate-green branch, built by a
Sonnet agent in its own worktree.

### Instructions

1. Invoke `dispatch-subagents` for the worktree mechanism, the brief
   checklist and the post-dispatch check.
2. Group the fixes:
   - **Doc-only fixes** (Markdown: CLAUDE.md, one of our own Skills, a Skill
     Inventory entry): all go to **one** agent as one branch. One batched PR
     is cheaper to review than many one-line ones.
   - **Code or config fixes:** one agent and one branch each.
3. Dispatch each agent with `model: sonnet`, in its own worktree. Its brief is
   [`impl-brief.md`](impl-brief.md) verbatim, with its fixes (problem,
   evidence, design) and its own scratchpad subfolder (`{SCRATCH_DIR}`)
   filled in, plus `dispatch-subagents` §3's lines.

Done when every dispatched fix is on a committed, gate-green branch handed
back to you, unpushed.

### Edge cases

- Run at most **two** agents' full gates at once (`dispatch-subagents` §3);
  dispatch the next as one finishes.

## 7. Review and merge

Goal: you are the reviewer. Every fix PR ends merged by you, escalated or
abandoned, never just pushed (ADR-0003).

### Instructions

For each branch the agent hands back:

1. **Gate green?** A red gate is never mergeable: resume the agent to fix
   it.
2. **Review the diff** before the first push (`dispatch-subagents` §3, "Scope
   and trust"). Check it implements the §4 design, follows repo conventions
   and stays on a safe surface. A doc branch must also clear `audit-docs`'
   house rules ([`impl-brief.md`](impl-brief.md)): a fix that would be a
   future `audit-docs` finding goes back.
3. **Have the agent push; open the PR yourself.** Its description carries
   the problem, evidence and design. A fix taken from an open issue (§2)
   also `Closes` it.
4. **Post your review as a PR comment**, always, before any merge
   (`docs/agents/pr-workflow.md`, recipe step 4).
5. **Decide:**
   - **Merge** a clean, low-risk change by the recipe.
   - **Send it back** when the agent can fix the findings: resume it, review
     the new commits as in step 2, have it push them, then decide again.
   - **Escalate** only when the diff meets an ADR-0004 exception (check the
     *Scope* list in `docs/adr/0004-objective-safety-gate.md` against the
     diff). Once the ledger PR has merged, have the agent merge `origin/main`
     into the branch and commit the PR's own `fixes` ledger entry, dated
     today. Leave the PR open and say exactly why in a PR comment.

Done when every fix PR has a posted review comment and is merged, escalated
or abandoned.

### Edge cases

- The escalated PR's own `fixes` entry lets the ledger update when a human
  merges it; the next run's survey corrects the date.

## 8. Close the ledger and log

Goal: the ledger shows what happened to every fix PR, and the session log
is honest.

### Instructions

1. Wait until the ledger PR has merged and every fix PR is merged,
   escalated or abandoned.
2. From `origin/main`, land **one** status-only PR, the same way as the
   ledger PR, through `scripts/ledger-set.ts`:
   - **merged** fix PR: add a `fixes` entry (`pr`, its UTC merge date, a
     one-line summary from its description) and set `status: open`;
   - **abandoned:** set `status: open`;
   - **escalated:** put its PR number in `ref`; it stays `tracked`.
3. Invoke `close-session`. Among the frictions, include the subagents' own
   frictions, and name each place this Skill or its briefs were confusing or
   contradicted themselves, and each step that was hard to follow with this
   run's data.

Done when the closing PR has merged and the log is written.

### Edge cases

- No fix PR opened this run: skip the closing PR, still log.
- `status: open` on a merged fix is right: whether the fix worked is derived
  from later occurrences, never set by hand (`survey-brief.md`).
