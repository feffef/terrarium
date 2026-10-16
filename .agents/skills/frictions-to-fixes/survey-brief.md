You survey and screen this window's session-log frictions for the
`frictions-to-fixes` run and return a **distilled, ranked report**; the main
session works only from it and never re-reads the raw corpus. You **survey
only**: file no issues, open no PRs, change no code. The scratchpad is
{SCRATCH_DIR}.

## Survey

- **Start from the Friction Ledger** (`layers/journal/content/current/frictions/*.yml`;
  schema in `layers/journal/tenant.config.ts`): one entry per cluster of
  frictions with a common cause, carrying its `status`, `surface` and every
  `occurrence` so far. Append each friction in the window that matches an
  entry, whatever its severity; a session counts once, at its highest
  severity. An occurrence is the block
  `pnpm exec tsx scripts/ledger-occurrence.ts <session> <index> [<session> <index> …]`
  prints (the friction's text copied from the log; a content test checks the
  copy), never retyped; pass all pairs in one call, as each takes seconds. A
  friction sits in one cluster unless its text names two causes. A new entry needs a cause seen twice, or one `moderate`, `major` or
  `blocker`. Its `summary` is one plain sentence a visitor can read; its
  `cause` names the root mechanism and the signals that identify a new
  occurrence (error text, file or tool, trigger), so a later run can match it.
  A cluster is a shared **root cause**: two frictions days apart, on different
  tools, belong together when one change would retire both. The ledger's
  **horizon** is the last 14 days (the main session prunes it to that): an entry's
  recurrence is its occurrences within it, counting only sessions that started
  after its fix merged when it has one. Return the ledger changes (new entries, appended occurrences,
  status changes, each with its evidence) in the report. Survey the ledger with
  `pnpm exec tsx scripts/prune-friction-ledger.ts --summary` (one line per entry
  with its fixes and its state; it lists the frictions two clusters share, for
  you to re-judge);
  open an entry file only for its evidence.
- **Re-cluster when the ledger says so.** The stored texts show a broad entry
  that holds several causes, or two entries with one: split or merge them,
  moving the occurrences, without reopening the logs.
- **Record each PR that merged to fix a cluster** as a `fixes` entry on its cluster, oldest
  first: `pr`, `date` (its UTC merge date) and a one-line `summary` of what the
  PR changed, written from the PR's description, not the friction's. Count a PR
  only if it tries to change the cause (not a ledger-only, tracking or session-log
  one); add every partial fix. Never record that a fix worked: `status` is the
  tracking state (`open`, `tracked`, `on-trial`), and for an entry with `fixes`
  the page and `--summary` derive `fix landed`, `likely fixed` (no occurrence
  for 3 days after the latest PR) or `still recurring` (occurrences dated after
  it, counted), so a re-fix after a regression needs only its `fixes` entry.
  `ref` is not rendered: it
  holds the tracking issue, the trial's territory match or what a fix left
  open, never the PR list. `gh api repos/feffef/terrarium/commits/<sha>/pulls`
  maps a commit to its PR and `gh api repos/feffef/terrarium/pulls/<N>` gives
  its body and `merged_at` (`gh pr view` is blocked); read the body, since a
  batched doc PR's title names no cluster. This run's own PRs are recorded
  by the main session; a PR an earlier run missed (still `tracked`, or in that run's log `prs`
  but in no `fixes`) is recorded here.
- **Steer the budget at the unfixed tail.** A large share of the window's frictions are usually already resolved by a later in-window session or a merged fix. Screen those out fast as a `drop` (Screen, below) instead of re-deriving their history; save the deep archaeology for candidates with no in-window resolution.
- **Read the window's session logs** via `pnpm exec tsx scripts/session-frictions.ts`
  (it prints where the window starts; bare `tsx` isn't on PATH). Large output goes to
  `/tmp/session-frictions-output.json` and stdout gets only a notice — read the file, or
  pass `--out PATH`; don't parse stdout. Use `--compact --unledgered` (the latter drops every friction the ledger already carries, and a session with none left; `--compact` keeps `docsRead` paths,
  `subagents` and each friction's `index`, drops prose) and re-read a full log via its `file` only when a candidate needs it. This is a **recency window, not a
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
- **Screen against the tracker** — apply the Screen rules below to every candidate.
- **Earlier runs' decisions are the ledger's `status` and `ref`.** When an entry
  lacks them, the window's `trigger: frictions-to-fixes` logs (`summary`,
  `outcome`, `prs`) are the fallback; a run's summary can be wrong or partial, so
  verify against the PR or `main` before dropping.
- **GitHub-MCP hygiene** (a recurring friction — heed it): load the
  `mcp__github__*` tools you need via `ToolSearch` before the first call (e.g.
  `select:mcp__github__search_issues,mcp__github__search_pull_requests,mcp__github__issue_read,mcp__github__pull_request_read`
  — the nearby-issue eyeball step needs the read tools too).
  `docs/agents/github-integration.md` owns name resolution and the
  `list_*`/`search_*` overflow guidance.

## Screen against fixes already shipped

Never re-fix what is already fixed. **First, drop what isn't ours to change:** a candidate whose only fix edits an **external pack Skill's `SKILL.md`** is off limits (ADR-0015; the gate rejects it). A repo-specific fit-note belongs in that Skill's Inventory entry: `audit-skills`' job, not a friction fix.
**Next, drop what is on trial:** a candidate whose fix would restore prose inside
an open **Prune Trial**'s territory (`.agents/prune-trials.yml`) is the trial's
evidence, not a fix (ADR-0027). The drop reason quotes the matching `territory` path or keyword verbatim; with no quotable match the candidate is not on trial, so classify it below. A
`blocker` is the exception: the main session files it, naming the
trial. Then, for the rest: check the tracker for an issue or PR that already covers it, and confirm against **`main`** where cheap (a "solution" isn't ripe if main already has it). `pnpm exec tsx scripts/merged-since.ts <friction session's startedAt>` lists every `origin/main` commit landed after that instant (UTC, newest-first, `isMerge`-flagged; `--merges-only` keeps PR merges alone, else a window's output can overflow you). Find the fixing commit/PR in it rather than comparing git timestamps by hand. Capture stdout and stderr separately: diagnostics go to stderr, and mixing them into the JSON on stdout breaks parsing. **Before labelling a candidate "never fixed", search the tracker with the friction's tool name and error-message text** (not a paraphrase), with a narrow query (`docs/agents/github-integration.md`). The search tools (e.g. `mcp__github__search_issues`) match semantically, not by substring, so a miss alone doesn't prove never-fixed: also eyeball nearby issues (same file, script or mechanism) for a closed one covering the same root cause in other words. A paraphrase or a nearby instance of an already-fixed cause is **fixed, not never-fixed** (issue #854). Classify each into one branch:

- **Never fixed** — no issue/PR addresses it, confirmed by the keyword search
  above.
- **Fixed, and not logged since the fix merged** — drop it (cite the issue/PR).
  Done is done; spending a PR here is duplicate work.
- **Open already** — an **open** issue or **open** PR already tracks it (the
  ledger's `tracked`; cite the number). One with no
  commit or comment within the horizon is idle: surface it as a candidate for
  the main session to pick up or escalate.
- **Reappeared _after_ its fix merged** (a friction logged in a session that
  started later than the fixing PR landed; the entry's latest fix dates it,
  and `--summary` shows it as `still recurring`) — a **regression**: the fix
  that was supposed to be in place did not hold.

Done when every candidate is labelled never-fixed, drop, open-already, or
regression — each with its citing issue/PR number where one exists.

## Your own frictions

Whatever you hit while running the survey — an MCP disconnect, a tool that only resolved under its full id, an oversized result you had to slice — record and **return alongside** the screened list, so this run's own frictions feed the next cycle.

## Report

Return a structured report: **(a) ranked actionable
candidates** — each with its ledger entry, severity, recurrence (as counted above), sessions, tracker
classification (never-fixed / open-already #N / regression of #N), fix type
(doc/code/config), surface-blocked flag (touches a human-only file — the `paths`
of `.claude/rules/adr-0004-human-merge.md` — a guard, or `.claude/settings.json`'s
hook wiring), difficulty (simple: one small change to a single file, no redesign;
hard: 2 or more files, or a non-obvious design decision), a one-line
recommended fix, and evidence quotes; **(b) a dropped list** with one-line reasons (an on-trial one quotes its territory match);
**(c) your own frictions** from the run; **(d) the ledger changes**, also saved as a YAML patch file in the
scratchpad whose path you name: a list of whole entries, each exactly as its file
reads (never invented keys such as `fixes_append`), with occurrence blocks as
`ledger-occurrence.ts` printed them; **(e) the regressions**: every cluster
`--summary` shows as `still recurring`, with its count since the latest PR and its highest severity since; and
**(f) each friction `--summary` lists in two clusters**, moved or kept because its text names
both causes.

Also return, for each rule and doc you loaded or read: its path, why it
loaded or was read, and whether it was useful (yes/partly/no).
