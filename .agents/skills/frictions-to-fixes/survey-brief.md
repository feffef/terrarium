You survey and screen this window's session-log Frictions for the
`frictions-to-fixes` run and return a distilled, ranked report. The main
session works only from your report and never re-reads the raw corpus. You
**survey only**: file no issues, open no PRs, and change nothing but the
Friction Ledger, which you commit (§5). Write scratch files only under
{SCRATCH_DIR}.

Every script below runs through `pnpm exec tsx` (bare `tsx` isn't on PATH).
Before your first GitHub call, load the `mcp__github__*` tools you need via
`ToolSearch` (a recurring Friction: heed it) (for example
`select:mcp__github__list_issues,mcp__github__list_pull_requests,mcp__github__issue_read,mcp__github__pull_request_read`;
§3's nearby-issue check needs the read tools too).
`docs/agents/github-integration.md` owns name resolution and the
`list_*`/`search_*` overflow guidance.

## 1. Read the ledger and the window

Goal: the ledger's current state and every in-window Friction in front of
you, without opening more logs than needed.

### Instructions

1. **The Friction Ledger** (`layers/journal/content/current/frictions/*.yml`;
   schema in `layers/journal/tenant.config.ts`) holds one entry per cluster
   of Frictions with a common cause, with its `status`, `surface` and every
   `occurrence` so far. Survey it with
   `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/prune-friction-ledger.ts --summary --out {SCRATCH_DIR}/summary.txt`:
   one line per entry with its state, fixes and newest note, ending with the
   Frictions two clusters share. Read the file. Open an entry file only for its evidence.
2. **The window's session logs:** run
   `pnpm exec tsx scripts/session/extract-frictions.ts --compact --unledgered --out {SCRATCH_DIR}/frictions.json`.
   It prints where the window starts. Read the file; don't parse stdout. `--unledgered` drops
   each Friction the ledger already carries verbatim, and a session with
   none left; `--compact` keeps `subagents` and each Friction's `index` and
   drops prose and `docsRead`. Re-read a full log via its `file` only when a
   candidate needs it (the doc-read check, say).

### Done when

You hold the summary and the window's unledgered Frictions.

### Edge cases

- The window is a recency window, not a sample: read every session in it,
  and chase no Frictions from older, likely-gone sessions.
- External sessions (`external: true`, ADR-0009) are already excluded by the
  script. Don't hunt the raw corpus for them.

## 2. Update the ledger

Goal: the ledger carries every in-window Friction, each in the cluster of
its root cause, with every merged fix recorded and every stale status reset.
Every edit goes through
`print-ledger-occurrence.ts --append`,
`pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/ledger-set.ts`
(flags in its header; it refuses a result the schema rejects) or
`prune-friction-ledger.ts --move`, never by hand.

### Instructions

1. **Append each window Friction that matches an entry**, whatever its
   severity. Match on the harm, not the slip behind it; when an entry's
   `cause` routes a Friction elsewhere, append it there. A session counts once
   per entry, at its highest severity. One
   call files them all:
   `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/print-ledger-occurrence.ts --append <entry> <session> <index> [<entry> <session> <index> …]`
   copies each Friction's text from its log (a content test checks the
   copy) and appends it under its entry; it writes all or nothing:
   one session the entry already holds makes the call write nothing, and the
   error names that session. Drop those triples and rerun the rest in one call. When an appended Friction goes beyond the entry's
   `summary` or `cause`, rewrite them with `ledger-set.ts <entry> --summary TEXT
   --cause TEXT` so they cover every occurrence.
2. **Open a new entry** for a cause seen twice, or once at `moderate`,
   `major` or `blocker`. Its `summary` is one plain sentence a visitor can
   read; its `cause` names the root mechanism and the signals that identify
   a new occurrence (error text, file or tool, trigger), so a later run can
   match it.
3. **Re-cluster when the ledger says so.** A cluster is a shared root cause:
   two Frictions days apart, on different tools, belong together when one
   change would retire both. When the stored texts show one broad entry
   holding several causes, or two entries holding one, split or merge them
   without reopening the logs: move each occurrence with
   `prune-friction-ledger.ts --move <session> <from> <to>` (it refuses a
   session the target already holds and checks every text survived).
4. **Record each PR that merged to fix a cluster** as a `fixes` entry on it,
   oldest first: `pr`, `date` (its UTC merge date) and a one-line `summary`
   of what the PR changed, written from the PR's description, not the
   Friction's. Count a PR only if it tries to change the cause (not a
   ledger-only, tracking or session-log one), and add every partial fix.
   `gh api repos/feffef/terrarium/commits/<sha>/pulls` maps a commit to its
   PR and `gh api repos/feffef/terrarium/pulls/<N>` gives its body and
   `merged_at` (`gh pr view` is GraphQL-backed, which the cloud blocks:
   `docs/agents/github-integration.md`); read the body, since a batched doc
   PR's title names no cluster. Then rewrite the entry's `cause` to say
   what the fix changed, so no line it made stale survives.
5. **Reset stale statuses.** A `tracked` or `on-trial` entry whose PR closed
   unmerged, or whose `ref` names no open issue, PR or trial in
   `.agents/prune-trials.yml`, goes back to `open`, unless its issue closed
   as not planned: then `accepted`, with the close and its reason in `notes`. One whose `ref` PR
   merged (not the fix a new cause came from) goes to `open` too, and that
   PR's `fixes` `date` becomes its `merged_at` (the same call), since an
   escalated PR dated its own entry before it merged.

### Done when

Every window Friction sits in an entry or is too new for one, and
no `tracked` or `on-trial` entry points at something closed.

### Edge cases

- A Friction sits in one cluster unless its text names two causes.
- When a fix's guard, hint or refusal catches the slip and the harm is now
  different (a refused call and a retry, a false positive, no cost), give it
  its own entry whose `ref` names the original entry and the fix: it is not
  a regression; only the original harm recurring is. An original left empty
  is deleted, so `ref` also says what the original covered.
- `--unledgered` drops per Friction, not per session: a session's other
  Frictions stay listed, so skip one already in the target cluster.
- This run's own PRs are recorded by the main session. A PR an earlier run
  missed (its entry still `tracked`, or the PR in that run's log `prs` but
  in no `fixes`) is recorded here.
- Never record that a fix worked. `status` is only the tracking state
  (`open`, `tracked`, `on-trial`, `accepted`); from `fixes`, the page and
  `--summary` derive `fix landed`, `likely fixed` (3 quiet days after the
  latest PR) or `still recurring`. A re-fix after a regression needs only
  its `fixes` entry. An `accepted` cluster (the owner accepts its cost) is
  never re-proposed.
- `ref` holds the tracking issue or open PR, the trial's territory match,
  what a fix left open, or the entry and fix a new cause came from; never a
  merged PR that fixes this entry (that goes in `fixes`).
- Recurrence is an entry's occurrences within the horizon
  (`LEDGER_HORIZON_DAYS` in `layers/journal/app/utils/ledger.ts`), counting
  only sessions that started after its fix merged when it has one.

## 3. Screen every candidate

Goal: never re-fix what is already fixed. A candidate is a ledger entry (one
per root cause: every entry `prune-friction-ledger.ts --candidates` lists,
not only those that gained occurrences this window) or a window Friction too
new for one. Each ends up labelled **never-fixed**, **drop**,
**open-already** or **regression**. Many of the window's Frictions are usually already resolved by a
later in-window session or a merged fix: drop those fast, without re-deriving
their history, and save the deep digging for candidates with no in-window
resolution.

### Instructions

1. **Drop what isn't ours to change:** a candidate whose only fix edits an
   external pack Skill's `SKILL.md` (ADR-0015; the gate rejects it). A
   repo-specific fit-note belongs in that Skill's Inventory entry:
   `audit-skills`' job, not a Friction fix.
2. **Drop what is on trial:** a candidate whose fix would restore prose
   inside an open Prune Trial's territory (`.agents/prune-trials.yml`) is
   the trial's evidence, not a fix (ADR-0027). The drop reason quotes the
   matching `territory` path or keyword verbatim; with no quotable match the
   candidate is not on trial, so carry on.
3. **Check the rest against the tracker and, where cheap, `main`** (a
   solution isn't ripe if `main` already has it). `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/prune-friction-ledger.ts --candidates --out {SCRATCH_DIR}/candidates.txt`
   labels each entry from the ledger alone, so read its four labels as
   provisional and confirm each:
   - `pnpm exec tsx scripts/git/list-merges-since.ts <Friction session's startedAt> > {SCRATCH_DIR}/merges.json 2> {SCRATCH_DIR}/merges.err`
     lists every `origin/main` commit after that instant (UTC, newest first,
     `isMerge`-flagged; `--merges-only` keeps PR merges alone, else a
     window's output can overflow you). Find the fixing commit or PR there
     rather than comparing git timestamps by hand. Capture stdout and stderr
     separately: diagnostics go to stderr and break the JSON on stdout.
   - Before labelling a candidate never-fixed, filter
     `pnpm exec tsx scripts/github/list-open-issues.ts > {SCRATCH_DIR}/open-issues.json` output locally by the
     Friction's tool name and error text, and page `mcp__github__list_issues`
     with `state: CLOSED` (parameters per `docs/agents/github-integration.md`),
     filtering titles locally. A title match is a hint, not proof, and a
     miss alone proves nothing: also eyeball nearby issues (same file,
     script or mechanism) for a closed one covering the same root cause in
     other words. A paraphrase or a nearby instance of an already-fixed
     cause is fixed, not never-fixed (issue #854).
4. **Label each candidate:**
   - **Never-fixed:** no issue or PR addresses it, confirmed by step 3.
   - **Drop:** dropped in step 1 or 2, or fixed and not logged since the fix
     merged (cite the issue or PR; a new PR would duplicate work).
   - **Open-already:** an open issue or open PR tracks it (the ledger's
     `tracked`; cite the number). One with no commit or comment within the
     horizon is idle: surface it as a candidate for the main session to pick
     up or escalate.
   - **Regression:** it reappeared after its fix merged, so the fix did not
     hold.

### Done when

Every candidate is labelled, with its citing number where one
exists.

### Edge cases

- A `blocker` on trial is still listed, as a drop flagged `blocker`; the
  main session files it, naming the trial.
- An earlier run's decisions are the ledger's `status`, `ref` and `notes`.
  When an entry lacks them, the window's `trigger: frictions-to-fixes` logs
  (`summary`, `outcome`, `prs`) are the fallback; a run's summary can be
  wrong or partial, so verify against the PR or `main` before dropping.

## 4. Rank the candidates

Goal: every candidate that is not a drop ranked by recurrence and severity
together, for the main session to pick from.

### Instructions

1. Weigh severity as an ordered rank, qualitatively; never multiply it.
2. Rank `moderate`, `major` and `blocker` Frictions high: they earn a fix on
   severity alone, even logged once.
3. Rank a `nit` or `minor` that recurs regularly high too: cheap repeated
   papercuts add up. What gets dropped is the lone low-severity one-off,
   not every `nit`.
4. Rank low a cluster whose newest note drops a design (`--summary`'s last
   column), unless its entry file shows occurrences dated after that note.

### Done when

Every candidate that is not a drop has a rank.

### Edge cases

- A Friction alleging a detector, tool or mechanism bug: check the
  `subagents` field and read the mechanism's source before ranking it. A
  self-diagnosis logged in the moment, without source access, is not
  evidence.

## 5. Commit the ledger

Goal: every ledger change in one commit on the current branch.

### Instructions

Commit all ledger changes in one commit with `git commit -F <file>`. Don't
push, and don't switch branches.

### Done when

`git log -1` shows the commit and no ledger change is left
uncommitted.

## 6. Report

Return, in your final reply:

- **(a) The ranked candidates**, each with its ledger entry, severity,
  recurrence (as §2 counts it), sessions, label (never-fixed /
  open-already #N / regression of #N), evidence quotes from the Friction
  descriptions, and everything else you gathered that the session logs
  don't hold (what you found in the source, on `main`, in the ledger or on
  the tracker). Propose no fix and relay no session's `solution`: a later
  design agent reads the full logs and designs the fix from your findings.
  Cite GitHub sources by issue or PR number or commit hash only, without
  copying their text.
- **(b) The dropped list**, one-line reason each; an on-trial one quotes its
  territory match.
- **(c) Your own Frictions** from the run (an MCP disconnect, a tool that
  resolved only under its full id, an oversized result), naming each place
  this brief was confusing or contradicted itself, and each step that was
  hard to follow with this run's data.
- **(d) The ledger changes**, each with its evidence, and the hash of §5's
  commit.
- **(e) The regressions:** every cluster `--summary` shows as
  `still recurring`, with its count since the latest PR and its highest
  severity since (`--summary`'s `since:`).
- **(f) The shared Frictions:** each one `--summary` lists in two clusters,
  moved or kept because its text names both causes.
- For each rule and doc you loaded or read: its path, why it loaded or was
  read, and whether it was useful (yes/partly/no).
