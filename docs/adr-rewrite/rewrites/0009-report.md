# ADR-0009 rewrite report

## 1. Parts

| # | Part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Header (Date, Status) | leftover | ADR-0030: no history in the text | dropped |
| 2 | Banner: ADR-0018 `tenants/` → `layers/` | leftover | Path rename is history; the folder is `SESSIONS_DIR` in `scripts/session-logs.ts:7` (checked) | dropped; *See* |
| 3 | Banner: ADR-0025 schema moved to `shared/schemas/session.ts` | split | Move is history; the schema's home is mechanics (checked) | *See* |
| 4 | Context: one honest log per session, mined by self-improvement; PR fits no session shape | live | Still the reason for the exception | *Why* 1; *Rejected* 1 |
| 5 | Decision: one log file straight to `main`, nothing else | live | Only `journal(sessions): log …` commits sit on `origin/main`'s first-parent line besides merges (798 vs 462 since 2026-09-13, checked) | Summary; *Scope* 1 |
| 6 | Decision: filename `<date>-<sessionId>.yml` | mechanics | `expectedFilename` in `scripts/log-session.ts` (checked) | *See* |
| 7 | Decision: helper is the single enforcement point, commits only that file | split | Boundary live; one-file check is `buildLogCommit` `log-session.ts:378-385`, folder check `:1097-1099` (checked) | *Scope* 2; *See* |
| 8 | Decision: validate before push; fetch → rebase → push with retry | mechanics | `validateEntry`, `mainSchemaRefusal`, `pushWithRetry` `log-session.ts:400-425` (checked) | *See* |
| 9 | Decision: always lands, wherever the work went | live | Holds; folded into "a session with no PR logs too" | *Scope* 3 |
| 10 | Incremental rollout (schema PR, then Skill) | leftover | Done | dropped |
| 11 | Stop hook dropped; reminder convention; deferred trigger | split | Convention and deferral superseded (parts 16, 20). Why a forcing hook fails: live | *Rejected* 3 |
| 12 | Consequence: safe because inert | live | Still true; logs show on the dashboard but add no code or route | *Why* 2 |
| 13 | Consequence: honesty needs low friction | live | | *Why* 1 |
| 14 | Consequence: unreviewed commits on `main` | dropped | Obvious from the decision; the reader-not-gatekeeper point is cut for length | dropped |
| 15 | Consequence: helper is gated code | live | `log-session.ts` is not on the Human-only list (checked) | *Why* 2 |
| 16 | Consequence: aging via `digest`'s archive sweep, newest 7 dates | split | Archive moves go by PR: live. Count: mechanics, `RETAIN_DATES = 7` `scripts/archive-journal-content.ts:40` (checked) | *Scope* 1; *See* |
| 17 | Schema evolution policy: why, rules | live | The strict schema and the no-migration rule still bind; ADR-0012 points here | *Scope* 7; *Why* 5 |
| 18 | Policy: `z.literal(1).optional()` not `default`, `z.union` recipe, write `schemaVersion: 1` | mechanics | Version recipe has no home but this ADR; needs one (§3c). `SCHEMA_VERSION` constant `log-session.ts:72` (checked) | new home |
| 19 | Policy: consumers read old versions leniently | mechanics | A coding rule for readers; new home in schema comment (§3c) | new home |
| 20 | Policy: how pingbacks fit | live (pointer) | ADR-0012 cites it; see policy question 1 | *Scope* 7 |
| 21 | SessionEnd amendment: mechanical vs authored split | live | `session-trace.ts` derives, agent authors (checked) | *Scope* 4; *Why* 3 |
| 22 | SessionEnd amendment: scratch is the closure signal; closure ≠ merged | split | Closure self-judged: live (*Scope* 3). Scratch file and gating: mechanics, `.claude/settings.json:162,173` (checked) | *Scope* 3; *See* |
| 23 | `log-session` flips to model-invocable | leftover | Done; Skill frontmatter is the home | dropped |
| 24 | Idempotent, diff-guarded overwrite; same-session only | split | Same session replaces its log: live. Diff-guard: mechanics, `handle` `log-session.ts:733-741` (checked) | *Scope* 3, 5; *See* |
| 25 | SessionEnd consequences (coverage, startedAt exact, install prompt, residual edge) | split | "No closure → no log": live (*Consequences* 2). Install-prompt story: leftover (ADR-0004 now covers hooks as Human-only) | *Consequences* |
| 26 | `docsRead`/`skillsUsed` one merged field, no `source` | live | Rejected alternative "separate field" was cut for length; the merge is stated in *Scope* 4 | *Scope* 4 |
| 27 | Schema impact: additive only | leftover | An application of part 17 | dropped |
| 28 | Landing as shipped: Stop primary, SessionEnd, SessionStart resume; sentinel | split | Why three hooks: live (*Why* 4). Hooks and sentinel: mechanics, `settings.json:147-184`, `log-session.ts` (checked) | *Why* 4; *See* |
| 29 | One lander module; `session-trace.ts` stays separate | mechanics | `log-session.ts:1-17` says it (checked) | *See* |
| 30 | Fallbacks retire on `landedBy` evidence, not orphan count | split | Revisit condition: live. Grep command: mechanics (§3c) | *When to revisit* 2 |
| 31 | close-session front door | live | Skill exists and is the closure trigger (checked) | *Scope* 3 |
| 32 | `log-session` demoted to capability | mechanics | Its description (checked) | *See* |
| 33 | Reminder/block hook declined, measured by invocation metric | live | Rejected alternative + revisit; metric is `audit-skills`' orphan check | *Rejected* 3; *When to revisit* 1 |
| 34 | Truncation sweep exception | leftover | One-time, done (`scripts/sweep-truncated-sessions.ts` header says one-time). What remains live: "no other edits" | *Scope* 5; policy question 2 |
| 35 | Clobber-repair exception | leftover | One-time; `mergeAuthored` fixed the cause (checked `log-session.ts:237`) | dropped; policy question 2 |
| 36 | External sessions: mark, mining split | live | `isExternalSession` and its consumers (checked `session.ts:132`) | *Scope* 8; *Why* 6 |
| 37 | External: self-declared flag | dropped | Not needed to act; cut for length | dropped |
| 38 | External: log travels in the PR | live | `guest-contributions.md:54-58` (checked). Human merge is ADR-0004's, not restated | *Scope* 8 |
| 39 | `session` id derived, not typed | mechanics | Lander resolves it; Skill says so (`SKILL.md:142-145`) | *See* |
| 40 | Placeholder reasons `(read before editing)` / `(no reason given)` | mechanics | `session-trace.ts:752-759` (checked) | *See* |
| 41 | `main` protected; admin bypass coarser than the boundary | split | Bypass is wider than the lander's check: live (*Consequences* 1). Ruleset: mechanics, research doc | *Consequences*; *When to revisit* 3; *See* |
| 42 | Shell reads by output matching | split | Credit from output, not command text: live (*Scope* 4, *Rejected* 4). Thresholds `MIN_DISTINCTIVE_LINE = 30`, `MIN_LINES_SHOWN = 10` `shell-reads.ts:771,775`; quoting surfaces; limits: mechanics | *See*; §3c |
| 43 | `docsReadViaShell` deprecated | mechanics | `session.ts:67-69` (checked) | *See* |
| 44 | Agent corrects the list; `(not read)` → Friction | live | `NOT_READ_REASON` `session-trace.ts:770` (checked) | *Scope* 4 |
| 45 | Ratings: `useful`, `ruleVerdicts`, `rulesGlobal` | mechanics | Schema fields; the Skill says how to write them | *See* |

## 2. Callers

| # | Item | Outcome |
|---|---|---|
| 1 | Outside agents' logs | answered (*Scope* 8); split details in `CONTEXT.md` Session; fix callers that quote the amendment |
| 2 | What may go to `main` without a PR | answered (*Scope* 1–2); **conflict settled below**; fix `merged-since.ts` |
| 3 | When a shell command counts as a read | answered (*Scope* 4) + mechanics (`shell-reads.ts`); **conflict settled below** |
| 4 | Agent-written vs derived | answered (*Scope* 4); field list is mechanics (`session-trace.ts`); fix Skill lines that repeat it |
| 5 | Schema change | answered (*Scope* 7); recipe gets a new home (§3c) |
| 6 | When a session logs | answered (*Scope* 3); ADR-0003:46 points here |
| 7 | What enforces the boundary | answered (*Scope* 2) + mechanics (`log-session.ts`) |
| 8 | Outside agent's log lands in its PR | answered (*Scope* 8) |
| 9 | Push past `main`'s protection | mechanics (research doc); gap stated in *Consequences* |
| 10 | When and how a log lands | mechanics (`log-session.ts`, `settings.json`); reason in *Why* 4; **conflict settled below** |
| 11 | What a log is for | answered (*Why* 1), owned by ADR-0008 |
| 12 | Archiving | answered (*Scope* 1: moves go by PR) + mechanics (`archive-journal-content.ts`); fix ADR-0010:20 and `midden-survey.ts:111` |
| 13 | What does not qualify | answered (*Scope* 1) |
| 14 | Derived read never read | answered (*Scope* 4) + mechanics (`NOT_READ_REASON`, Skill) |
| 15 | Read reasons and `useful` | mechanics (`session.ts`, Skill) |
| 16 | Commit carries the session id | mechanics: `buildLogCommit` builds the trailer with `provenanceFooter` (`log-session.ts:367-374`, checked); ADR-0017 owns it |
| 17 | When fallbacks retire | answered (*When to revisit* 1–2); **conflict settled below** |
| 18 | Can a landed log change | answered (*Scope* 3, 5); **conflict settled below** |
| 19 | Re-derive repeatable | mechanics (`log-session.ts` diff-guard); the doc-edit limit was cut from the ADR, see §3c |

### The five conflicts

1. **Direct-to-`main` "session/doc" commits (item 2). The ADR wins.**
   `scripts/log-session.ts:378-385` refuses any commit that changes more than
   the one log path, and `:1097-1099` refuses a path outside `SESSIONS_DIR`.
   On `origin/main`'s first-parent line since 2026-09-13, every non-merge
   commit is `journal(sessions): log …` (798 of them; 462 merges; checked with
   `git log`, local `origin/main` at 41876bde, not re-fetched). No doc commit
   takes the path. `scripts/merged-since.ts:8,67` is stale: fix the caller.
2. **"Derived from `tool_use` calls, not results" vs output matching (item 3).
   Neither is wrong; the code wins and the quote was scoped.** The phrase came
   from the placeholder-reason amendment and describes `filesRead`, the Read
   tool's calls: still true at `scripts/session-trace.ts:756-758`. Shell-read
   credits do read `tool_result` text (`session-trace.ts:210-235`). The
   rewrite drops the phrase, so the conflict goes with it.
   `docs/research/shell-reads-by-output-matching.md:129,132` is a dated note
   that recorded the question for #1545, since settled; leave it.
3. **"SessionEnd" lander vs `Stop` primary (item 10). `Stop` wins.**
   `.claude/settings.json:167-184` runs `log-session.ts --land` on `Stop`
   (and on `SessionStart` resume) when the scratch exists, and on
   `SessionEnd` always (for the dropped-scratch recovery,
   `log-session.ts:989-1000`). The lander's header (`:9-13`) and the
   `log-session` Skill (`SKILL.md:10-14`) agree. `shared/schemas/session.ts:52-53`
   and `.gitignore:32-33` are stale: fix the callers.
4. **Fallback exit measure: `landedBy` vs the `close-session` rate (item 17).
   Both stand; they answer different questions.** `landedBy`
   (`log-session.ts:659-672`, `session.ts:101-105`) decides whether the
   `SessionEnd` and `SessionStart` fallbacks can go. The orphan check in
   `scripts/audit-skills.ts:154-175` (merged PRs whose session left no log,
   `audit-skills/SKILL.md:97`) measures whether `close-session` alone keeps
   sessions logging, which decides whether a reminder hook comes back. The
   rewrite names both under *When to revisit*. `audit-skills.ts:169` is right
   but leans on the old wording; repoint it.
5. **Can a landed log change (item 18). The ADR wins: only its own session
   re-lands it.** `handle` (`log-session.ts:722-746`) overwrites the file at
   the session's own path when the re-derived bytes differ; the filename
   carries the session id, so it cannot reach another session's log.
   `close-session/SKILL.md:41-44` has the same session finalize to
   `completed` after merge. No script or Skill has a *later* session flip a
   status (grep of `in-review` across `scripts/` and `.agents/skills/`), so
   `shared/schemas/session.ts:36-39` ("A later session flips it") is wrong:
   fix the caller. `scripts/validate-content.ts:96-97` skips logs in the
   truncation check because old logs stay as landed; calling that "ADR-0009's
   bounded exception" mixes it up with the direct path: fix the caller.
   `docs/agents/guest-contributions.md:61-69` updates a log still inside its
   unmerged PR, so it isn't landed yet; it agrees.

## 3. Follow-ups

### 3a. Summary rule: `.claude/rules/adr-0009.md`

```markdown
---
adr: <new hash>
---
# ADR-0009: A session's own log goes straight to `main`, without a PR

Invoke `close-session` when you open a PR, and again when the work merges,
stops or is blocked; re-invoking it is safe and replaces your earlier log. You
write the judgement half and record every Friction honestly; the hooks derive
the rest, and `scripts/log-session.ts` commits that one file straight to
`main`. Keep logs out of your branch and PRs, and never edit another session's
log. Add schema fields only as optional ones.

Before you change how logs land, what they record or the session schema, read
the full ADR: docs/adr/0009-session-logs-commit-directly-to-main.md
```

### 3b. Caller edits

| file:line | new text |
|---|---|
| `scripts/merged-since.ts:8` | `// out from a direct-to-\`main\` session-log commit (ADR-0009).` |
| `scripts/merged-since.ts:67` | ` *  ordinary direct-to-\`main\` commit, such as a session log (ADR-0009). */` |
| `shared/schemas/session.ts:36-39` (Human-only) | `// \`in-review\`: the session opened a gated PR that hasn't merged, the norm at` / `// closure. \`completed\` is for work that landed or needed no PR; the session` / `// re-logs as \`completed\` when its PR merges (close-session Skill).` |
| `shared/schemas/session.ts:44-47` | `// docsRead/skillsUsed merge the agent's entries with derived ones (ADR-0009);` / `// \`useful\` is authored only, so absent on derived reads and older logs.` |
| `shared/schemas/session.ts:52-53` | `// Mechanical trace — derived from the transcript by scripts/session-trace.ts` / `// when the lander runs (ADR-0009), never self-reported. All optional: ...` |
| `shared/schemas/session.ts:67-68` | `// DEPRECATED — no longer written; shell reads fold into \`docsRead\`. Kept so` |
| `shared/schemas/session.ts:90-91` | `// stays valid under \`.strict()\`. Mining skips it (ADR-0009):` |
| `shared/schemas/session.ts:101-104` | `// Which hook landed this log (\`Stop\`, \`SessionEnd\`, \`SessionStart\`): the evidence` / `// for retiring the two fallbacks (ADR-0009, When to revisit). Absent on a` / `// hand-landed or pre-#865 log.` |
| `shared/schemas/session.ts:131` | `(... \`scripts/session-frictions.ts\`; ADR-0009). ...` |
| `.gitignore:32-33` | `# Authored session-log scratch: the lander's input, never committed (ADR-0009)` |
| `scripts/audit-skills.ts:169` | ` *  the orphan count, which tells whether \`close-session\` alone keeps sessions logging (ADR-0009), must leave an audit trail,` |
| `scripts/validate-content.ts:96-97` | `/** Values an unquoted \` #\` silently cut short. Session logs are skipped: \`log-session\`` / ` *  rejects this at authoring, and landed logs stay as they are (ADR-0009). */` |
| `scripts/log-session.ts:11-13` | `// matcher \`resume\` (fallbacks). ADR-0009 says why there are three and when the` / `// fallbacks retire; every landing records which one landed it (\`landedBy\`).` |
| `scripts/log-session.ts:109, 467, 659, 810` | drop "amendment", "PR #148", "2026-09-05", "merged-read and verdict amendments"; leave `(ADR-0009)` |
| `scripts/session-trace.ts:1, 285, 335, 532, 768`; `scripts/shell-reads.ts:15, 753, 770` | replace "ADR-0009's output-matching/merged-read amendment" with `(ADR-0009)`; at `shell-reads.ts:770` say "the limits listed in this file's header" (see §3c) |
| `layers/journal/app/utils/dashboard.ts:301`, `CONTEXT.md:91`, `.agents/skills/log-session/SKILL.md:110`, `docs/agents/guest-contributions.md:16,50,61,70` | `(ADR-0009)` in place of "the external-sessions / 2026-07-22 amendment"; `CONTEXT.md:91`: `still surface (ADR-0009).` |
| `.agents/skills/log-session/SKILL.md:10, 107` | `do not write it`; drop the parenthetical "ADR-0009 amendment" / "ADR-0009's amendment" (the field list stays: the Skill is its how-to home) |
| `.agents/skills/log-session/SKILL.md:160-161` | delete (the ADR's *Why* holds it; a Skill reader does not need it) |
| `.agents/skills/log-session/SKILL.md:170-171` | `... \`(not read)\`; the stitch drops it and logs a Friction.` |
| `.agents/skills/log-session/SKILL.md:189-190` | `The report also lists docs a command named but did not show enough of to count; \`scripts/shell-reads.ts\`'s header lists what stays invisible.` |
| `.agents/skills/frictions-to-fixes/SKILL.md:57` | `**External sessions are already excluded:** the survey script drops any log flagged \`external: true\` (\`CONTEXT.md\` Session). Don't hunt the raw corpus for them.` |
| `docs/adr/0003-agent-operating-model-and-governance.md:44-47` | `... The session-log direct-to-\`main\` path (ADR-0009) is unaffected. Opening the PR is also a session closure point (ADR-0009), and the same no-ask default covers babysitting: ...` |
| `docs/adr/0003-agent-operating-model-and-governance.md:141-145` | `- **Session logs go straight to \`main\`** (ADR-0009).` |
| `docs/adr/0010-digests-derived-append-only-journal-pages.md:18-24` | none: ADR-0010's rewrite already drops this text |
| `docs/adr/0012-...md:72` | already repointed by ADR-0012's rewrite (*See*, no anchor) |
| `.agents/skills/midden-survey/scripts/midden-survey.ts:111` | `moving files (\`scripts/archive-journal-content.ts\`), so deletions there are churn —` |
| `docs/diagrams/interactive-map/terrarium-overview.md:869` | `prs` row: ADR-0003, ADR-0004 (drop ADR-0009; no tie to `pr-workflow.md` or `merge-pr.ts`) |
| `.agents/prune-trials.yml:94,107` | territory: `docs/adr/0009-...md: the "Who writes what" bullet (shell reads)`; keep keywords |
| generic "amendment" callers (`ideas.ts:155`, `ideas.spec.ts:144`, `theme.css:32`, `SessionCard.vue:204`, `journal.ts:34`, `journal.spec.ts:49,275`, `journal-dashboard.spec.ts:413`, `audit-skills.ts:372`, `session-frictions.ts:182`, `audit-skills.spec.ts:212`, `session-frictions.spec.ts:176`, `session-trace.spec.ts:1`) | drop the word "amendment"; keep `(ADR-0009)` |

### 3c. New homes

- **Schema version recipe** → `shared/schemas/session.ts:28` (Human-only):
  `schemaVersion: z.literal(1).optional(), // absent ⇒ 1. A breaking change adds a v2 object with z.literal(2) and makes this z.union([v1, v2]); never .default(1), which would blur absent ⇒ v1. Readers tolerate older or unknown versions. Policy: ADR-0009.`
- **Fallback retirement query** → `scripts/log-session.ts` header, after `:13`:
  `// Count landings per hook: grep -h '^landedBy:' layers/journal/content/current/sessions/*.yml | sort | uniq -c`
- **Shell-read rules and limits** → `scripts/shell-reads.ts` header (check what it holds first): a command that printed nothing credits nothing; `gh`, Journal and `git show/diff/log` output credit only a doc the command names (#1723); a doc read from history whose lines are gone, or shown in fewer than `MIN_DISTINCTIVE_LINE` characters, stays invisible; a doc edited between two derivations can change a re-derived log.
- **Reminder-hook metric** → `.agents/skills/audit-skills/SKILL.md:97`, append: `It is the measure ADR-0009 uses to decide whether a reminder hook should come back.`

### 3d. Other ADRs

- **ADR-0003** (not yet rewritten): states the exception and the PR-open log; both become pointers (§3b). Agrees.
- **ADR-0004** rewrite: hooks and `shared/schemas/**` are Human-only; the rewrite doesn't restate it. Agrees.
- **ADR-0008** rewrite: owns what a log is for and "only added to". The rewrite's "a session replaces its own earlier log" refines that; ADR-0008 says "how they are written and landed is ADR-0009's". Agrees.
- **ADR-0010** rewrite: "the direct-to-main path is for session logs: schema-checked data that never renders". Logs do show on the dashboard and Timeline; the rewrite says "changes no code or route". Small mismatch in ADR-0010's wording, worth a one-word fix there ("adds no page").
- **ADR-0012** rewrite: points to this ADR's schema rule; the rewrite keeps Pingbacks under it. Agrees (policy question 1).
- **ADR-0017** rewrite: says `log-session.ts` builds the trailer. Agrees (`log-session.ts:367-374`).
- **ADR-0025** (not yet rewritten): schema home in `shared/schemas/session.ts`. Agrees.
- **ADR-0029** rewrite: session-start rules may say when to act; this rule does. Agrees.

## 4. Policy questions

1. **Do Blog Pingbacks fall under "never migrate"?** Pingbacks are edited and
   deleted with their posts (ADR-0012 report), so a one-PR migration would
   lose no history. Recommendation: limit the no-migration rule to session
   logs and let a Pingback schema change migrate its files in the same PR.
   The rewrite keeps the old scope until the owner decides.
2. **May a bug's damage to landed logs be repaired?** Two one-off repairs
   happened (truncated `outcome`, a clobbered log); the old text forbade using
   them as precedent. The rewrite states the strict form: no other session
   edits a log. Recommendation: allow a repair through an ordinary gated PR
   when it restores only text the file or its git history still holds, and
   marks what it can't (`historicallyTruncated`).
3. **The live prune trial on the shell-read section** (opened 2026-10-12, about
   three days) loses its territory when this rewrite lands. Recommendation:
   land this after the trial's window, or judge the trial in the same PR.

## 5. Split

The rewrite is 95 lines, over the 70-line guide. Two decisions could stand
alone at the reorganisation, as *When to revisit* says: the schema rule for
strict collections kept as history (serves ADR-0012 too), and logs from
outside agents (marking, mining, delivery in a PR). The derived-reads detail
could move to the `log-session` Skill entirely if the owner judges the shell
credit a mechanic rather than a decision.

## 6. Prompt friction

- Step 2's "every Decision bullet, section and amendment" yielded 45 parts for
  this ADR; a table that size is most of the report. Grouping by amendment
  would have been enough for the leftovers.
- The caller's checklist flagged five conflicts, but two were not conflicts in
  the code (items 3 and 17): one quote was narrower than read, and two metrics
  answer two questions. The checklist's "Conflict" label should say "check".
- Read-only git without `fetch` means "only session logs go direct" rests on
  a local `origin/main` that may be stale.
- The template has no place for the dependency between this rewrite and a
  live prune trial on the same text.

## 7. Lines

Old: 592. New: 95.
