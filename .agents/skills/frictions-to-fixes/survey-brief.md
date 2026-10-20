You survey and screen this window's session-log frictions for the
`frictions-to-fixes` run and return a **distilled, ranked report**; the main
session works only from it and never re-reads the raw corpus. You **survey
only**: file no issues, open no PRs, and change nothing but the Friction
Ledger, which you commit (Report, (d)). The scratchpad is
{SCRATCH_DIR}.

## Survey

- **Start from the Friction Ledger** (`layers/journal/content/current/frictions/*.yml`;
  schema in `layers/journal/tenant.config.ts`): one entry per cluster of
  frictions with a common cause, carrying its `status`, `surface` and every
  `occurrence` so far. Append each friction in the window that matches an
  entry, whatever its severity; a session counts once, at its highest
  severity. An occurrence is the block
  `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/print-ledger-occurrence.ts <session> <index> [<session> <index> …]`
  prints (the friction's text copied from the log; a content test checks the
  copy), never retyped; pass all pairs in one call, as each takes seconds. A
  friction sits in one cluster unless its text names two causes. A new entry needs a cause seen twice, or one `moderate`, `major` or
  `blocker`. Its `summary` is one plain sentence a visitor can read; its
  `cause` names the root mechanism and the signals that identify a new
  occurrence (error text, file or tool, trigger), so a later run can match it.
  A cluster is a shared **root cause**: two frictions days apart, on different
  tools, belong together when one change would retire both. The ledger's
  **horizon** is the last 14 days (the run prunes it to that): an entry's
  recurrence is its occurrences within it, counting only sessions that started
  after its fix merged when it has one. Write the ledger changes (new entries, appended occurrences,
  status changes) to the entry files. Survey the ledger with
  `pnpm exec tsx .agents/skills/frictions-to-fixes/scripts/prune-friction-ledger.ts --summary` (one line per entry
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
  tracking state (`open`, `tracked`, `on-trial`, `accepted`), and for an entry with `fixes`
  the page and `--summary` derive `fix landed`, `likely fixed` (no occurrence
  for 3 days after the latest PR) or `still recurring` (occurrences dated after
  it, counted), so a re-fix after a regression needs only its `fixes` entry.
  An `accepted` cluster (the owner accepts its cost) is never re-proposed for a fix.
  `ref` is not rendered: it
  holds the tracking issue or open PR, the trial's territory match or what a fix left
  open, never the merged PRs. `gh api repos/feffef/terrarium/commits/<sha>/pulls`
  maps a commit to its PR and `gh api repos/feffef/terrarium/pulls/<N>` gives
  its body and `merged_at` (`gh pr view` is blocked); read the body, since a
  batched doc PR's title names no cluster. This run's own PRs are recorded
  by the main session; a PR an earlier run missed (still `tracked`, or in that run's log `prs`
  but in no `fixes`) is recorded here. A `tracked` or `on-trial` entry whose PR closed
  unmerged, or whose `ref` names no open issue, PR or trial in `prune-trials.yml`, goes back to `open`.
  For one whose `ref` PR merged, set `status: open` and set that PR's `fixes`
  `date` to its `merged_at` (the same call), since an escalated PR dated its own
  entry before it merged.
- **Steer the budget at the unfixed tail.** A large share of the window's frictions are usually already resolved by a later in-window session or a merged fix. Screen those out fast as a `drop` (Screen, below) instead of re-deriving their history; save the deep archaeology for candidates with no in-window resolution.
- **Read the window's session logs** via `pnpm exec tsx scripts/session/extract-frictions.ts`
  (it prints where the window starts; bare `tsx` isn't on PATH). Large output goes to
  `/tmp/extract-frictions-output.json` and stdout gets only a notice — read the file, or
  pass `--out PATH`; don't parse stdout. Use `--compact --unledgered` (the latter drops each friction the ledger carries verbatim, and a session with none left; a session's other frictions stay, so skip one already in the target cluster; `--compact` keeps
  `subagents` and each friction's `index`, drops prose and `docsRead`) and re-read a full log via its `file` when a candidate needs it, such as for the doc-read check. This is a **recency window, not a
  sample** — read every session in it, don't chase frictions from older,
  likely-gone sessions. Each record's `id`/`file` point back to the full log —
  re-read it directly when a candidate needs more context than the triage
extract carries. **External sessions are already excluded:** the survey script drops any log flagged `external: true` (ADR-0009). Don't hunt the raw corpus for them.
- **For a friction alleging a detector/tool/mechanism bug, check the `subagents` field and read the relevant mechanism source before trusting the friction's own root-cause guess.** A self-diagnosis logged in the moment, without source access, is not evidence: e.g. "detector over-credits reads" can be `foldSubagentTrace` correctly unioning a dispatched subagent's reads, not a real detector gap. Verify against source before ranking it.
- **Group and rank.** A candidate is a ledger entry (one per root cause) or a
  window friction too new for one; rank by **recurrence and severity together** (severity is an ordered rank, not a number: weigh it qualitatively, never multiply it). **Prioritize `moderate`, `major`, and `blocker` frictions**: these earn a fix on severity alone, even logged once. **Rank a `nit` or `minor` that recurs regularly high**: cheap repeated papercuts add up. What gets dropped is the lone low-severity one-off, not every `nit`.
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
`blocker` is the exception: list it as a drop flagged `blocker`, and the main
session files it, naming the trial. Then, for the rest: check the tracker for an issue or PR that already covers it, and confirm against **`main`** where cheap (a "solution" isn't ripe if main already has it). `pnpm exec tsx scripts/git/list-merges-since.ts <friction session's startedAt>` lists every `origin/main` commit landed after that instant (UTC, newest-first, `isMerge`-flagged; `--merges-only` keeps PR merges alone, else a window's output can overflow you). Find the fixing commit/PR in it rather than comparing git timestamps by hand. Capture stdout and stderr separately: diagnostics go to stderr, and mixing them into the JSON on stdout breaks parsing. **Before labelling a candidate "never fixed", filter `pnpm exec tsx scripts/github/list-open-issues.ts` output locally for open issues by the friction's tool name and error text, and run one scoped `search_issues` with `state:closed` and the exact identifier for closed ones** (`docs/agents/github-integration.md`). The search tools (e.g. `mcp__github__search_issues`) match semantically, not by substring, so a miss alone doesn't prove never-fixed: also eyeball nearby issues (same file, script or mechanism) for a closed one covering the same root cause in other words. A paraphrase or a nearby instance of an already-fixed cause is **fixed, not never-fixed** (issue #854). Classify each into one branch:

- **Never fixed** — no issue/PR addresses it, confirmed by the search
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

Whatever you hit while running the survey — an MCP disconnect, a tool that only resolved under its full id, an oversized result you had to slice — record and **return alongside** the screened list, so this run's own frictions feed the next cycle. Name among them each place
this brief was confusing or contradicted itself, and each step that was hard
to follow with this run's data.

## Report

Return a structured report: **(a) ranked actionable
candidates** — each with its ledger entry, severity, recurrence (as counted above), sessions, tracker
classification (never-fixed / open-already #N / regression of #N) and evidence
quotes from the friction descriptions, plus everything else you gathered about
it that the session logs don't hold (what you found in the source, on `main`,
in the ledger or on the tracker). Report no fix and no session `solution`
proposals: a later design agent reads the full logs and designs the fix from
your findings. Cite GitHub
sources by issue or PR number or commit hash only, without copying their text; **(b) a dropped list** with one-line reasons (an on-trial one quotes its territory match);
**(c) your own frictions** from the run; **(d) the ledger changes**, each with its evidence, and the hash of the one
commit on the current branch that holds them (`git commit -F <file>`; don't push
or switch branches). Write each entry as the schema reads (never invented keys
such as `fixes_append`), with occurrence blocks as `print-ledger-occurrence.ts`
printed them; **(e) the regressions**: every cluster
`--summary` shows as `still recurring`, with its count since the latest PR and its highest severity since; and
**(f) each friction `--summary` lists in two clusters**, moved or kept because its text names
both causes.

Also return, for each rule and doc you loaded or read: its path, why it
loaded or was read, and whether it was useful (yes/partly/no).
