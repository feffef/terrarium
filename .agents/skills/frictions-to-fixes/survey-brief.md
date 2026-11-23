You survey and screen this window's session-log Frictions for the
`frictions-to-fixes` run and return a distilled, ranked report. The main
session works only from your report and never re-reads the raw corpus. You
**survey only**: file no issues, open no PRs, and change nothing but the
Friction Ledger, which you commit (§5). Write scratch files only under
{SCRATCH_DIR}.

Run every script through `pnpm exec tsx` (bare `tsx` isn't on PATH). Before
your first GitHub call, load the tools you need in one `ToolSearch`
(`select:mcp__github__list_issues,mcp__github__list_pull_requests,mcp__github__issue_read,mcp__github__pull_request_read`).
`docs/agents/github-integration.md` owns tool names and overflow guidance.

## 1. Read the ledger and the window

Goal: the ledger's state and every in-window Friction in front of you.

1. The Friction Ledger (`layers/journal/content/current/frictions/*.yml`; schema
   in `layers/journal/tenant.config.ts`) holds one entry per cluster of
   Frictions with a common cause. Run
   `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/prune-friction-ledger.ts --summary --out {SCRATCH_DIR}/summary.txt`
   and read the file. Open an entry file only for its evidence.
2. Run
   `pnpm exec tsx scripts/session/extract-frictions.ts --compact --unledgered --out {SCRATCH_DIR}/frictions.json`
   and read the file, not stdout. It drops Frictions the ledger already carries
   per Friction (a session's other Frictions stay listed: skip one already in
   the target cluster), and keeps each remaining one's `index` and its
   session's `subagents`. It prints where the window starts. Open a full log
   (its `file`) only when a candidate needs it.

The window is a recency window: read every session in it and chase nothing from
older sessions. External sessions are already excluded (ADR-0009).

## 2. Update the ledger

Goal: every in-window Friction sits in the cluster of its root cause, every
merged fix is recorded and every stale status is reset. Edit only through
`print-ledger-occurrence.ts --append`, `ledger-set.ts` (flags in its header;
it refuses a result the schema rejects) or `prune-friction-ledger.ts --move`
(all in `.agents/skills/frictions-to-fixes/scripts/`), never by hand.

1. **Append** each Friction that fully matches an entry, whatever its severity:
   `print-ledger-occurrence.ts --append <entry> <session> <index> [<entry> <session> <index> …]`
   (it writes all or nothing, and the error names a session the entry already
   holds; add `--skip-held` first to skip those). Match on the harm, not the
   slip behind it, and obey the entry's `see:` rules. A Friction sits in one
   cluster unless its text names two causes; one that fits only in part is
   appended unless step 2 applies. A
   session counts once per entry, at its highest severity. When the new text
   goes beyond the entry's `summary` or `cause`, rewrite them
   (`ledger-set.ts <entry> --summary TEXT --cause TEXT`) so they cover every
   occurrence.
2. **Open a new entry** for a cause seen twice, once at `moderate` or above, or
   when a Friction's cause or harm clearly differs from every entry it nearly
   matched (including one that fits an entry only in part and is `moderate` or
   above: don't bury a severe one in a milder cluster; a Friction worse than the
   entry's worst severity, or above its `acceptedSeverity`, may be this or the
   same problem at higher cost: check whether its cause or harm differs).
   `summary` is one plain sentence a visitor can read; `cause` names the root
   mechanism and the signals that identify a new occurrence (error text, file
   or tool, trigger). Link each nearly-matching entry with
   `ledger-set.ts --related <entry> <rule>`; state the distinction there only,
   on both entries (`ledger-content.spec.ts` refuses a one-way link), and end
   each `--summary` with `see:` its related entries and rules.
3. **Re-cluster** when the stored texts show one entry holding several causes
   or two entries holding one (a cluster is a shared root cause: one change
   would retire all of it). Move occurrences with
   `prune-friction-ledger.ts --move <session> <from> <to>`. Afterwards make
   every touched entry coherent: `summary`, `cause`, `fixes`, `status`, `ref`
   and `notes` fit what it now holds, a deleted entry's `fixes`, `notes` and
   `ref` go to the survivor, and grep the old name to repoint every `related`,
   `cause` and `ref` that used it.
4. **Record each PR that merged to fix a cluster** in its `fixes`, oldest
   first: `pr`, `date` (UTC merge date) and a one-line `summary` from the PR's
   description (read the body; a batched doc PR's title names no cluster).
   `gh api repos/feffef/terrarium/commits/<sha>/pulls` maps a commit to its PR
   and `gh api repos/feffef/terrarium/pulls/<N>` gives body and `merged_at`
   (`gh pr view` is GraphQL, blocked in the cloud). Count a PR only if it tries
   to change the cause (not a ledger-only, tracking or session-log one); count
   partial fixes. Then rewrite the entry's `cause` to say what the fix changed.
   This run's own PRs are recorded by the main session; an earlier run's
   missed PR is recorded here.
5. **Reset stale statuses.** Leave a `tracked` entry with no `ref` alone (a fix
   in flight). A `tracked` or `on-trial` entry whose PR closed unmerged, or
   whose `ref` names no open issue, open PR or trial in
   `.agents/prune-trials.yml`, goes back to `open`; if its issue closed as not
   planned (not as superseded), to `accepted` with the reason in `notes`. One
   whose `ref` PR merged (not the fix a new cause came from) goes to `open` too, and that PR's `fixes` `date` becomes its `merged_at`.

Rules that hold throughout:

- A fix whose guard, hint or refusal now catches the slip leaves a different
  harm (a refused call and a retry, a false positive): give it its own entry
  whose `ref` names the original and the fix. Only the original harm recurring
  is a regression. An original left empty is deleted, so `ref` also says what
  it covered.
- Never record that a fix worked. `status` is only the tracking state (`open`,
  `tracked`, `on-trial`, `accepted`); the page and `--summary` derive `fix
  landed`, `likely fixed` or `still recurring` from `fixes`. A re-fix after a
  regression needs only its `fixes` entry. An `accepted` cluster (an owner
  ceiling, `acceptedSeverity`) is never re-proposed; recording a fix on it, or an occurrence above
  its `acceptedSeverity`, sets it back to `open`. Accept with
  `ledger-set.ts --status accepted [--accepted-severity S]` (default: the worst
  occurrence stored now); an `accepted` merge target needs a ceiling for what
  it received.
- `ref` holds the tracking issue or open PR, the trial's territory match, what a
  fix left open, or the entry and fix a new cause came from; never a merged PR
  that fixes this entry.
- Recurrence is an entry's occurrences within `LEDGER_HORIZON_DAYS`
  (`layers/journal/app/utils/ledger.ts`), counting only sessions that started
  after its fix merged.

Done when every window Friction sits in an entry (or is too new for one) and no
`tracked` or `on-trial` entry points at something closed.

## 3. Screen every candidate

Goal: never re-fix what is already fixed. A candidate is every entry that
`prune-friction-ledger.ts --candidates --out {SCRATCH_DIR}/candidates.txt`
lists, or a window Friction too new for an entry. Label each **never-fixed**,
**drop**, **open-already** or **regression**. Drop what a later in-window
session or merged fix already resolved fast; dig only where nothing resolved
it. The script's labels come from the ledger alone: confirm those that read
never-fixed or regression and any you rank high, and mark the rest unconfirmed.

1. **Drop what isn't ours to change:** a candidate whose only fix edits an
   installed Skill's `SKILL.md` (ADR-0015; that is `audit-skills`' job).
2. **Drop what is on trial:** a fix that would restore prose inside an open
   Prune Trial's territory (`.agents/prune-trials.yml`) is the trial's evidence
   (ADR-0027). Quote the matching `territory` path or keyword verbatim; with no
   quotable match, it is not on trial. A `blocker` on trial is still listed, as a
   drop flagged `blocker`; the main session files it, naming the trial.
3. **Check the rest against the tracker and `main`.**
   `pnpm exec tsx scripts/git/list-merges-since.ts --merges-only <Friction session's startedAt> > {SCRATCH_DIR}/merges.json 2> {SCRATCH_DIR}/merges.err`
   lists PR merges after that instant (keep stderr apart: it breaks the JSON).
   Before labelling never-fixed, list issues
   (`pnpm exec tsx scripts/github/list-open-issues.ts > {SCRATCH_DIR}/open-issues.json`
   and `... 200 --closed > {SCRATCH_DIR}/closed-issues.json`; the closed list
   holds only the 200 most recently updated, so an older fix shows in
   `merges.json`) and filter by the Friction's tool name and error text. For a
   Friction naming a doc or Skill, also run
   `git log --oneline --since=<earliest occurrence date> origin/main -- <path>`.
   A title match is a hint and a miss proves nothing: read nearby issues (same
   file, script or mechanism) for one covering the same cause in other words. A
   paraphrase of a fixed cause is fixed, not never-fixed (issue #854).
4. **Label:**
   - **Never-fixed:** no issue or PR addresses it.
   - **Drop:** dropped in step 1 or 2, or fixed and not logged since (cite the
     issue or PR).
   - **Open-already:** an open issue or PR tracks it (cite it). One with no
     commit or comment within the horizon is idle: surface it.
   - **Regression:** it reappeared after its fix merged. When the issue is
     closed, read its `closed_by_pull_requests` (`issue_read`) and cite any PR.

An earlier run's decisions are the ledger's `status`, `ref` and `notes`; when
an entry lacks them, the window's `trigger: frictions-to-fixes` logs are the
fallback, verified against the PR or `main` since a run's summary can be wrong.

Done when every candidate is labelled, with its issue or PR number if any.

## 4. Rank the candidates

Rank every non-drop candidate by recurrence and severity together, severity as
an ordered rank, never multiplied. `moderate`, `major` and `blocker` rank high
even logged once; a `nit` or `minor` that recurs regularly ranks high too (only
the lone low-severity one-off is dropped). Rank low a cluster whose newest note
drops a design (`--summary`'s last column), unless its entry shows later
occurrences. A Friction alleging a detector, tool or mechanism bug is no
evidence until you check the `subagents` field and read the mechanism's source.

## 5. Commit the ledger

Commit every ledger change in one commit on the current branch with
`git commit -F <file>`. Don't push or switch branches. `git log -1` must show it
and no ledger change may be left uncommitted.

## 6. Report

Return, in your final reply:

- **(a) The ranked candidates**: ledger entry, severity, recurrence (as §2
  counts it), sessions, label (never-fixed / open-already #N / regression of
  #N), evidence quotes from the Friction descriptions, and what you found in
  source, on `main`, in the ledger or on the tracker. Propose no fix and relay
  no session's `solution`: a design agent designs it from the full logs. Cite
  GitHub sources by number or hash only, without copying their text.
- **(b) The dropped list**: one-line reason each; an on-trial one quotes its
  territory match.
- **(c) Your own Frictions** (an MCP disconnect, a tool that resolved only under
  its full id, an oversized result), naming each place this brief was confusing
  or contradicted itself and each step hard to follow with this run's data.
- **(d) The ledger changes**, each with its evidence, and §5's commit hash.
- **(e) The regressions**: every cluster `--summary` shows as `still
  recurring`, with its count since the latest PR and highest severity since
  (`since:`).
- **(f) The shared Frictions**: each one `--summary` lists in two clusters,
  moved or kept because its text names both causes.
