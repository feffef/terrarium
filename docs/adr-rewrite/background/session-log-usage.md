# Session-log usage of ADR summary rules vs full ADRs

## Data files (all in the scratchpad: /tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad)

The `.json` files are data you can query. The `.mjs` files are the scripts that produced them; run each with `node <script>` from the scratchpad.

- `data.json` — one object per session log that has any rule/verdict field (61 logs). Each object holds:
  - file, startedAt, kind, external, entrypoint, trigger, branch, goal, status
  - skills
  - the rule fields: rulesLoaded, rulesGlobal, rulesFollowedUp, ruleVerdicts
  - has* flags for each rule field
  - docsRead entries that carry `useful` or a `docs/adr/` path
  - frictions that mention rules
- `extra.json` — keyed by data.json `file`. It holds the subagent count and the ADR numbers edited in that session (from `filesEdited`).
- `types.json` — the session short id → my session-type label, for the 35 sessions that read an ADR.
- `rows.json` — one row per (session, ADR) docs/adr read, 144 rows (101 verdict-era plus 43 early), before my hand corrections. Fields:
  - id, date, kind, early, type, goal, n (ADR number)
  - shown (the ADR's rule was loaded) and fu (in rulesFollowedUp)
  - edited, reader, trig, useful
  - reason, and the same session's rule verdict as ruleV and ruleReason
- `rows2.json` — the same as rows.json with the 16 hand corrections to reader and trigger applied. Use this one.
- Scripts:
  - `extract.mjs` builds data.json from all 975 logs.
  - `analyze.mjs` builds the per-rule tables; it carries its own copy of the 61-session type map.
  - `reasons.mjs` dumps reasons. Modes: `fu`, `rule <file>`, `fr`, `summ`, `adrread`.
  - `cons.mjs` checks self-reported claims against `rulesFollowedUp`.
  - `extra.mjs` builds extra.json.
  - `classify.mjs` builds rows.json.
  - `summarize.mjs` applies the overrides, writes rows2.json and prints the counts.
  - `adrrows.mjs` dumps the raw ADR reads.

---

# Report 1: Findings: rule summaries vs full ADRs in the session logs (read-only; nothing in the repo was changed)

**Short answer:** in this ~3-day window the summaries mostly do their job. Only 5 rules are rated useful in most sessions. Every session gets 9 always-loaded rules, and 3 of them are nearly pure noise. Many of the "full ADR read" signals actually come from subagents.

### 1. Which fields record what
Schema: `/home/user/terrarium/shared/schemas/session.ts`. Derivation: `scripts/session-trace.ts` (≈l.555–640, 742–850). Authoring and validation: `scripts/log-session.ts`. Instructions: `.agents/skills/log-session/SKILL.md` step 3.

- **`rulesGlobal`** (derived): rules with no `paths`, which load at session start.
- **`rulesLoaded`** (derived): path-scoped rules. They are captured from nested-memory loads and also from PostToolUse hook "Files this command read are governed by…" hints. Subagents' rules are folded in.
- **`rulesFollowedUp`** (derived): the subset of rules whose `docs/adr/NNNN-*` was read after the rule loaded. A read counts only if it is a Read with no offset/limit, or a match from the shell-output scan. Subagent reads are folded in. `adr-0004-human-merge` maps to ADR 0004.
- **`ruleVerdicts[]`** (authored): `{path, reason, useful: yes|partly|no}`. The Skill asks for about 20 words, and for yes/partly it asks why the full ADR was or wasn't opened.
- **`docsRead[].useful`** (authored, optional): the same verdict for docs, including `docs/adr/*`. Derived reads that the agent didn't cite get placeholder reasons and no `useful`.
- **First appearance:**
  - `rulesLoaded` (and `rulesFollowedUp`): 2026-10-10 15:07Z, `current/2026-10-10-session_015BjYk46dntc…`.
  - `rulesGlobal`, `ruleVerdicts` and `docsRead.useful`: 2026-10-11 07:51Z, `current/2026-10-11-session_01WoJ2cTAuA3Q…`.

### 2. Which logs I parsed
- I parsed all 975 `.yml` files in `layers/journal/content/{current,archived}/sessions` with the `yaml` lib. There were no parse errors; the only file skipped was `.gitkeep`.
- 914 logs have none of the fields. All of them predate the fields; the archive has none.
- **61 logs have the fields:**
  - 10 early logs have `rulesLoaded` only (no globals, no verdicts).
  - **51 have verdicts.** These are the analysis set, spanning 2026-10-11 07:51Z → 2026-10-13 11:46Z (~2.2 days; the whole field window is ~3 days).
- None is `external`, `droppedScratchRecovery` or `historicallyTruncated`.
- By kind: interactive 22, autonomous 19, delegated 10.

### 3a. Session types (51 verdict logs; my classification from goal and Skills)
| Type | Count |
|---|---|
| backlog (auto-triage / clear-backlog runs and dry runs) | 11 |
| meta (rules, session-log, Skill process) | 7 |
| frictions-to-fixes | 6 |
| blog-post | 4 |
| feature | 4 |
| audit-docs | 4 |
| visitor-loop | 3 |
| prune-trial | 2 |
| audit-skills | 2 |
| digest | 2 |
| probe / dry-run | 2 |
| docs / content | 2 |
| question-only | 1 |
| bugfix | 1 |

- **About 2/3 of sessions (34/51) are the Platform maintaining itself:** backlog, meta, frictions-to-fixes, audits, prune-trial and probes.
- Product feature, bug and docs work is 7. Content generation (blog, digest) is 6.
- 20 of the 51 are scheduled `remote_trigger` runs.

### 3b. Per rule (51 sessions)
"Shown" = in `rulesGlobal ∪ rulesLoaded`; G = global, L = path-loaded. "FU" = `rulesFollowedUp`. There were 996 showings and 980 verdicts: 281 yes (29%), 140 partly (14%), 559 no (57%), 16 unrated. No verdict names a rule that wasn't shown.

| Rule | Shown | yes / partly / no / unrated | FU | Mainly triggered by |
|---|---|---|---|---|
| 0009 | 51 G | 48 / 2 / 1 / 0 | 13 | all |
| 0017 | 51 G | 45 / 1 / 5 / 0 | 3 | all |
| 0004 | 51 G | 44 / 1 / 6 / 0 | 15 | all |
| 0003 | 51 G | 42 / 2 / 7 / 0 | 14 | all |
| 0027 | 51 G | 11 / 15 / 25 / 0 | 4 | all |
| 0022 | 51 G | 12 / 4 / 35 / 0 | 8 | all; useful 11/11 in backlog runs, 5/40 elsewhere |
| 0020 | 51 G | 9 / 12 / 30 / 0 | 3 | all |
| 0001 | 51 G | 0 / 6 / 45 / 0 | 0 | all |
| 0023 | 51 G | 0 / 1 / 50 / 0 | 1 | all |
| 0029 | 51 L | 4 / 21 / 26 / 0 | 10 | everything (`docs/agents/**`, CLAUDE.md) |
| 0021 | 47 L | 2 / 7 / 38 / 0 | 0 | the CONTEXT.md read at session start |
| 0004-human-merge | 45 L | 26 / 6 / 12 / 1 | 12 | backlog, meta, blog |
| 0008 | 43 L | 6 / 16 / 20 / 1 | 1 | `layers/journal/**` reads |
| 0005 | 42 L | 6 / 15 / 20 / 1 | 2 | backlog, meta, frictions-to-fixes |
| 0018 | 39 L | 6 / 3 / 30 / 0 | 5 | backlog, meta |
| tenant-layers | 39 L | 1 / 4 / 34 / 0 | 0 (no ADR) | meta, backlog, frictions-to-fixes |
| 0015 | 30 L | 6 / 6 / 16 / 2 | 5 | backlog, frictions-to-fixes, meta |
| mdc-when-to-use | 29 L | 0 / 2 / 26 / 1 | 0 (no ADR) | frictions-to-fixes, audits, blog |
| 0026 | 25 L | 1 / 3 / 20 / 1 | 1 | frictions-to-fixes, backlog, meta |
| 0002 | 23 L | 1 / 0 / 22 / 0 | 0 | frictions-to-fixes, audit-docs |
| guards | 20 L | 6 / 5 / 8 / 1 | 0 (no ADR) | backlog, frictions-to-fixes |
| 0025 | 18 L | 0 / 2 / 14 / 2 | 0 | backlog, audit-docs |
| 0028 | 16 L | 0 / 0 / 15 / 1 | 1 | audit-docs, visitor-loop |
| 0010 | 16 L | 2 / 1 / 12 / 1 | 0 | audit-docs, digest |
| 0012 | 14 L | 1 / 3 / 9 / 1 | 0 | blog, audit-docs |
| 0014 | 9 L | 0 / 1 / 8 / 0 | 0 | backlog, audit-docs |
| 0006 | 7 L | 1 / 0 / 6 / 0 | 0 | feature |
| 0011 | 6 L | 0 / 1 / 5 / 0 | 0 | audit-docs |
| 0013 | 6 L | 0 / 0 / 4 / 2 | 0 | backlog, feature |
| 0024 | 6 L | 0 / 0 / 5 / 1 | 0 | audit-docs |
| 0016 | 5 L | 0 / 0 / 5 / 0 | 0 | feature |
| 0019 | 1 L | 1 / 0 / 0 / 0 | 0 | feature |

### 3c. Full-ADR reads
- **Trace view:** 30 of 51 sessions have at least one `rulesFollowedUp`. That includes all 11 backlog runs, but only 19 of the other 40 sessions. There are 98 follow-ups in total; their verdicts are 60 yes, 18 partly, 20 no.
- **docsRead view:** there are 101 distinct ADR reads across 28 sessions. 48 of them (48%) are explicitly attributed to subagents in the reason (e.g. triage or reviewer agents doing CLAUDE.md's "grep docs/adr and read them").
- **Reads per ADR, with verdicts (yes/partly/no/none):**

| ADR | Reads | Verdicts |
|---|---|---|
| 0009 | 15 | 6/6/1/2 |
| 0003 | 14 | 8/2/1/3 |
| 0004 | 14 | 10/0/1/3 |
| 0029 | 12 | 7/2/0/3 |
| 0022 | 8 | 6/1/0/1 |
| 0018 | 7 | 5/1/0/1 |
| 0015 | 6 | 3/2/0/1 |
| 0005 | 5 | — |
| 0027 | 5 | — |
| 0020 | 4 | — |
| 0017 | 3 | — |
| 0026 | 3 | — |
| 0008, 0010, 0023, 0025, 0028 | 1 each | — |

- **Never read in the verdict window:** 0001, 0002, 0006, 0007, 0011–0014, 0016, 0019, 0021, 0024.
- When an ADR is read, it is mostly rated useful. Reads cluster in backlog and meta work, mainly to check amendments and bounds.

### 3d. Patterns
**Noise candidates** (shown often, rarely useful):
- **The three global rules that are pure noise:**
  - **0023:** 50/51 "no", e.g. "Guest pipeline; not involved in this run" (01YKBUn).
  - **0001:** 45 "no", 0 "yes", e.g. "Architecture background; no build depended on it" (017NBxJ).
  - **0022:** useful only in backlog runs; 35/40 "no" elsewhere, e.g. "About auto-triage sweeps; not this run." (01BkB4A).
- **0020 and 0027:** mostly "no" outside backlog and prune work.
- **Over-broad `paths` that make these effectively global:**
  - **0029:** shown in 51/51 because `docs/agents/**` is read in every session; 26 "no", e.g. "Explained the rule loading; didn't change any action." (016gu9e).
  - **0021:** shown in 47/51 via CONTEXT.md, 0 follow-ups.
  - **0008:** 43/51 via journal reads, e.g. "it only restated what the Journal is" (015LwBg).
  - **tenant-layers:** 34/39 "no".
  - **mdc-when-to-use:** 26/29 "no".
  - **0002:** 22/23 "no".

**Summary carries the weight:**
- 0009, 0017, 0004 and 0003 are 86–94% useful. Their reasons almost always say "summary was enough": 120 reasons that claim this match a trace with no follow-up.
- Representative reasons:
  - "Made me run gate:scoped before pushing; summary was enough, no need for the full ADR" (01P1PVF).
  - "Told me to open the PR myself and subscribe despite the harness saying not to; summary was enough." (01QCF5h).

**Full ADR needed:**
- **0022 in backlog runs:** "Bounded the standing green-light I passed to triage agents; read the full ADR for the close and Public bounds" (01La82m).
- **0027 at the edge of the three-day floor:** "confirmed the literal three-day floor has no grace exception anywhere in the text" (01AA2LX, an ADR docsRead reason).
- **0004 and 0005 amendment checks:** "only knows Skills; needed an amendment for workflow scripts" (017XWy7).
- In short, full reads happen for bounds, amendments and edge cases, not for the core instruction.

**Never shown:** ADR-0007 has no rule file. 0019, 0016, 0011, 0013 and 0024 were shown 1–6 times each.

**Recurring rule friction:** 13 logs record a friction for reading with Bash `cat`/`sed`, so path rules "may not have loaded". 01VGLAa adds: "close-session's re-read of always-loaded rules … loaded unrelated path-scoped rules".

### 3e. Data quality
- **Small window:** ~2.2 days and 51 sessions, dominated by backlog and self-maintenance runs. It is not a 7-day or representative mix.
- **`rulesFollowedUp` is not proof the agent read the ADR:**
  - It folds in subagent reads and the shell-output scan, and maps `adr-0004-human-merge` to ADR 0004.
  - In 23 of 98 follow-ups, the agent's own reason says "summary was enough" or "not opened" anyway; the cases are listed in my `cons.mjs` output.
  - ADR reads with offset/limit don't count as follow-ups, but do appear in `docsRead`.
  - So follow-ups overstate main-agent full reads, and the summary-vs-full split is only approximate.
- **"Shown" may be too low:** Bash reads load no rules (a recurring friction), and hook hints add some back later.
- **Some verdicts are boilerplate:** 64 reasons are under 25 characters. 0147GPf answered "summary rule" for all 13 rules, and 0177ZCp, 01Tjsmy, 01QfaLu, 017NBxJ and 01DXuGr wrote 6–8 short ones each.
- **Self-reported only:** verdicts are self-reported, written at close, and usually in a second `--author` pass.
- **Placeholder reasons:** about 30% of ADR `docsRead` entries carry placeholder reasons with no `useful`.
- **Early logs:** the 10 early logs lack globals and verdicts; I excluded them from the table. Their `rulesLoaded` counts are similar: 0005 ×8, 0021 ×7, 0018 ×6, 0004-human-merge ×6.
- **My classification:** session types are my own judgement from goal and Skills.

Files are in /tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad:
- extract.mjs
- data.json
- analyze.mjs
- reasons.mjs
- cons.mjs

---

# Report 2: Follow-up: who reads full ADRs, why, and whether it helped

**Short answer:** full ADRs are read mostly by subagents looking up the ADR that binds an issue, or because the ADR is the thing being worked on. Reads that follow a summary's pointer are few (15 of 101). Every read with a real verdict that came from the summary pointer was rated useful. No reason anywhere says an ADR was too long, confusing or noisy.

### What was read
- **Field window:** 35 sessions read at least one `docs/adr/*`.
  - **28 verdict-era sessions, 101 reads.** All tallies below use only these.
  - **7 early logs, 43 reads, marked "(early)".** These have no `useful` field and no global rules captured. 28 of their 43 reads come from one session, 015BjYk, which read ADRs 0001–0028 to write the rule summaries.
- **Caveat: a `docsRead` entry is not proof of a full read.** Partial reads count too (e.g. 01LzWPj: "first 30 lines"). 81 of the 101 reads carry the trace's follow-up flag, which means a full Read (or a shell-output match) after the rule loaded.

### How I classified each read
- **Reader**, taken from the reason text:
  - S = subagent: the reason mentions a subagent, reviewer, triage agent or research agent.
  - M = main agent: the reason is first person, or the session had no subagents.
  - X = mixed.
  - ? = unknown: the reason has no attribution and the session had subagents.
- **Trigger:**
  - **Se = search:** a triage, build or reviewer subagent looking up the ADR that binds an issue ("binding ADR", "grepped", "for #NNNN", "reviewer checked…"), or the ADR's rule was never shown.
  - **Su = subject:** the ADR is itself the work object. Either the ADR was edited in the session, or the reason is about its amendments, an escalation, post source material, or writing the summaries.
  - **P = pointer:** the rule was shown, the ADR was read afterwards, and the reason is about bounding this session's own action ("ledger row bounds the remit", "standing green-light bounds").
  - **U = unclear:** a placeholder reason.
  - **Hand corrections:** I applied regex rules first, then corrected 16 rows by hand. The overrides are in `summarize.mjs`.
- **Global rules make "pointer" weak evidence.** Their rule is loaded from session start, so any later read counts as "after the rule".
- **Verdict codes in the table:** y / p / n = yes / partly / no; "-" = placeholder reason; 0 = the field doesn't exist yet (early logs).

### Per-session table
Each cell is ADR:reader/trigger/verdict.

| Session | Date | Kind | Type | Goal | ADR reads |
|---|---|---|---|---|---|
| 015BjYk (early) | 10-10 | inter | meta | Give agents short, current ADR summaries at the right moment | 01…28 all X/Su/0 |
| 01LzWPj (early) | 10-10 | inter | meta | Check three session-log ideas and build open ones | 09:M/Se/0 25:M/Su/0 |
| 013GkBt (early) | 10-11 | auto | digest | 2026-10-10 Journal Digest | 04:S/U/- |
| 01KnHp9 (early) | 10-11 | auto | audit-skills | Weekly check of Platform Skills | 09,22,27:?/Se/0 |
| 01GbMt1 (early) | 10-11 | auto | audit-docs | Weekly docs audit | 03,04,20,21,24:?/U/- |
| 01LARTW (early) | 10-11 | inter | meta | Record how instructions reach agents via rules | 29:?/Su/- 18,27:?/U/- |
| 01DRBxy (early) | 10-11 | inter | question | Could merge-pr.ts refuse merges without code-review? | 04:M/Se/0 |
| 01WoJ2c | 10-11 | inter | meta | Let session logs say whether docs/rules helped | 09:?/P/y 29:?/Su/y 18:S/Se/y |
| 01CasnQ | 10-11 | inter | backlog | Triage backlog, implement three ADR-0029 follow-ups | 29:X/Su/y 22:?/P/y 17:?/U/p 03:S/Se/y |
| 0177ZCp | 10-11 | auto | blog | Kevin blog post from recent activity | 29:?/Su/y 04:?/Su/y 25:?/U/- |
| 01Tjsmy | 10-11 | deleg | blog | Karen blog post | 29:?/Su/y |
| 017inrp | 10-11 | auto | visitor-loop | Visitor-loop run, mobile focus | 03:?/P/y |
| 01YVCyX | 10-11 | deleg | audit-docs | Weekly prose-vs-code audit | 03,04,09,20,27:S/Se/n |
| 01V3bxJ | 10-11 | inter | meta | Do frictions-to-fixes' limits leave fixes undone? | 08:?/P/y 15:?/Su/y 09:?/Su/p 03:?/U/y 18:?/Su/y |
| 01D3gBo | 10-11 | inter | backlog | Auto-triage, design, build ready-for-human backlog | 22:S/Se/y 27:S/Se/p 03,29:?/Su/- 04,05,09,15,18:?/U/- |
| 01BLrfu | 10-11 | inter | feature | Cut the gate's duration, chiefly e2e | 04:?/Su/y 26:?/P/y 03:?/P/p 28:?/U/- |
| 01Dz52W | 10-12 | auto | audit-docs | Scheduled docs audit | 03,04,09,20,22,29:?/U/- |
| 014uXxm | 10-12 | inter | visitor-loop | Visitor loop on the Journal | 03:?/P/y |
| 01VGLAa | 10-12 | inter | feature | Make Journal "Rules loaded" list readable | 09:?/Su/y 29:?/Su/p |
| 0147GPf | 10-12 | auto | prune-trial | Judge open trials, prune one problem | 09:M/Su/y |
| 01596W4 | 10-12 | inter | backlog | Triage backlog, implement ready-for-agent issues | 22:?/P/y 03,04,09,15:S/Se/y |
| 01DtK8w | 10-12 | inter | meta | A clear-backlog Skill | 20:?/P/y 05:S/Se/p 03:?/Se/p |
| 01SZwdb | 10-12 | auto | backlog | Dry run of clear-backlog | 22:?/P/y 03,04,29:S/Se/y 09,17,26:S/Se/p |
| 01La82m | 10-12 | auto | backlog | Second clear-backlog dry run | 22:?/P/y 03,04,29:S/Se/y 09,26:S/Se/p |
| 017NBxJ | 10-12 | inter | backlog | clear-backlog run | 04,05,09,18:S/Se/y |
| 018KSwe | 10-12 | inter | meta | Diagnose clear-backlog run, fix PR review | 03:S/Se/y 04:?/Su/y |
| 015LwBg | 10-12 | inter | backlog | Second clear-backlog run | 04,09,27,29:S/Se/y 17,18:S/Se/p |
| 01AA2LX | 10-13 | auto | audit-skills | Weekly Skills check | 15:?/P/y 27:M/Su/y |
| 01FJuuz | 10-13 | auto | audit-docs | Scheduled docs audit | 03,04,10,23,29:?/U/- |
| 01STVS3 | 10-13 | inter | backlog | Clear fresh issues, tighten clear-backlog/auto-triage | 22:?/P/y 27:S/Se/y |
| 017XWy7 | 10-13 | inter | meta | clear-backlog phases as saved workflows | 05:?/Su/y 15,29:?/P/p 18:S/Se/y 04:S/Su/y |
| 013FXrB | 10-13 | auto | backlog | Test run of workflow clear-backlog | 15:S/Se/p |
| 016gu9e | 10-13 | deleg | backlog | Clear the issue backlog | 09:S/Se/p |
| 01DqPT8 | 10-13 | deleg | backlog | Clear backlog with clear-backlog | 09,22:S/Se/p |
| 01AnHXy | 10-13 | deleg | audit-docs | Fact-check docs/agents family | 04,05,18:?/Su/y 09,20:S/Se/p |

None of the 101 verdict-era rows was left unclassified. The 20 "unclear" rows are all placeholder reasons, so their trigger can't be known.

### 1. Counts (101 verdict-era reads)
- **By trigger:** search 45, subject 21, unclear 20, pointer 15.
  - The 15 pointer reads are mostly ADR-0022 (6 green-light bounds) and ADR-0003 (3 ledger rows).
- **By reader:** subagent 45, unknown 53, main 2, mixed 1.
  - 44 of the 45 subagent reads are searches.
  - Main-agent reads are probably most of the "unknown" rows, but no reason says so.
- **Early logs (43 reads):** subject 30, unclear 8, search 5. Readers: mixed 28, unknown 11, main 3, subagent 1.

### 2. By session type (verdict era; 23 of 51 sessions read no ADR)
None of the frictions-to-fixes, digest, probe, bugfix, docs/content or question sessions in the verdict era read an ADR.

- **Backlog (11 sessions, 47 reads; ADRs 03, 04, 05, 09, 15, 17, 18, 22, 26, 27, 29):**
  - 33 reads are subagent searches for the ADR binding each issue (e.g. "Inert/Heavy and amendment need for #1603", "self-merge amendment vs midden review (#1802)").
  - 5 are pointer reads of ADR-0022 by the coordinator for the sweep's green-light bounds.
- **audit-docs (4 sessions, 21 reads):**
  - 11 placeholders.
  - 7 checker-subagent searches.
  - 3 subject reads: amendment banners used as the basis of an escalation (01AnHXy).
- **meta (5 sessions, 18 reads):** pointer 5, subject 7, search 5. The work here was designing or editing Skills, ADRs and logging, which needed amendment format, ledger rows and schema-evolution policy.
- **feature (2 sessions, 6 reads):** 01BLrfu needed ADR-0004/0026 definitions while reworking the gate; 01VGLAa edited ADR-0009.
- **blog (2 sessions, 4 reads):** subject; ADRs used as source material.
- **visitor-loop (2 sessions, 2 reads):** pointer to ADR-0003's ledger row for the run's remit.
- **prune-trial (1 read):** ADR-0009 amendments to prune.
- **audit-skills (2 reads):** ADR-0015, "governs this run"; ADR-0027 for an escalation.

### 3. Reads rated "no"
- All 5 are in 01YVCyX (03, 04, 09, 20, 27), each with the reason "read by a reviewer or checker subagent, not by me".
- The main agent rated reads it didn't make. The subagents were checking audit fixes against those ADRs. None of the 5 says the content was unhelpful.

### 4. Reads where the summary lacked a bound or detail
The full text held a table, a definition, an edge case or an amendment format that the summary only points to:

- **ADR-0022:**
  - "standing green-light bounds, closes objective only" (01La82m). Its rule verdict adds: "read the full ADR for the close and Public bounds".
  - "judgment-call versus determinable taxonomy for the triage agents" (01CasnQ).
  - "subagents: escalation taxonomy; time gate not a reason to escalate" (01D3gBo).
- **ADR-0003 (the ledger table lives only in the full text):**
  - "visitor-loop ledger row bounds the remit" (017inrp).
  - "ledger row: frictions-to-fixes is reviewer, not author; fixed section 4 to match" (01V3bxJ).
  - "grepped the ledger: clear-backlog is not a chartered job" (01DtK8w).
- **ADR-0027:** "confirmed the literal three-day floor has no grace exception anywhere in the text" (01AA2LX).
- **ADR-0018:** the summary says "edit in place / append a dated amendment", but the format lives only in the full text.
  - "how to amend an ADR" (017NBxJ, 01WoJ2c).
  - "one-line amending-note convention for the escalation" (01AnHXy).
  - "a factual correction is an in-place edit, still human-merged" (01V3bxJ).
  - The rule also bundles two topics, tenant layers and ADR editing. Its verdict in 01V3bxJ was "Tenant layers and ADR editing; no ADR edited" (no).
- **ADR-0004:**
  - "the one-spec/one-setup() amendment this work supersedes; L2 definition" (01BLrfu).
  - "Human-only merge and untested-behaviour bar for gate.ts" (01SZwdb).
- **ADR-0005:** "only knows Skills; needed an amendment for workflow scripts" (017XWy7).
- **ADR-0009:**
  - "schema evolution policy: additive optional fields need no version bump" (01WoJ2c).
  - "external-session exclusion and the SHELL-READ-DETECTION floor" (01V3bxJ).
- **ADR-0026:** "composite action is agent-editable, Human-merge; parity spec" (01BLrfu).
- **ADR-0020:** "rule 3: Public-originated PRs are human-merged" (01DtK8w).
- **ADR-0017:** "bot identity still deferred" (015LwBg, 01SZwdb; both rated partly). This open question appears only in the full text.

### Section: `docsRead.useful` on ADR reads (101 verdict-era reads)
- **Overall:** yes 54, partly 22, no 5, placeholder 20 ("(no reason given)" or "(read before editing)", no verdict). 81% carry a real verdict.
  - The placeholders come from 01D3gBo (7), 01Dz52W (6), 01FJuuz (5), 0177ZCp (1) and 01BLrfu (1).

**Per ADR (yes / partly / no / missing, share with a real verdict):**

| ADR | Verdicts | Real verdict |
|---|---|---|
| 0003 | 8 / 2 / 1 / 3 | 79% |
| 0004 | 10 / 0 / 1 / 3 | 79% |
| 0005 | 3 / 1 / 0 / 1 | 80% |
| 0008 | 1 / 0 / 0 / 0 | 100% |
| 0009 | 6 / 6 / 1 / 2 | 87% |
| 0010 | 0 / 0 / 0 / 1 | 0% |
| 0015 | 3 / 2 / 0 / 1 | 83% |
| 0017 | 0 / 3 / 0 / 0 | 100% |
| 0018 | 5 / 1 / 0 / 1 | 86% |
| 0020 | 1 / 1 / 1 / 1 | 75% |
| 0022 | 6 / 1 / 0 / 1 | 88% |
| 0023 | 0 / 0 / 0 / 1 | 0% |
| 0025 | 0 / 0 / 0 / 1 | 0% |
| 0026 | 1 / 2 / 0 / 0 | 100% |
| 0027 | 3 / 1 / 1 / 0 | 100% |
| 0028 | 0 / 0 / 0 / 1 | 0% |
| 0029 | 7 / 2 / 0 / 3 | 75% |

**By reader:**
- subagent: 25 yes, 15 partly, 5 no.
- unknown: 26 yes, 7 partly, 20 placeholder.
- main: 2 yes.
- mixed: 1 yes.

**By trigger:**
- pointer: 12 yes, 3 partly (100% useful).
- subject: 17 yes, 2 partly, 2 placeholder.
- search: 24 yes, 16 partly, 5 no.
- unclear: 1 yes, 1 partly, 18 placeholder.
- Searches are the main source of "partly", typically "confirmed the binding ADR for #1878" (01DqPT8), where only part of the ADR applied.

**Full read vs the same session's summary verdict for that ADR:**

| Full read \ Summary rule | yes | partly | no | unrated |
|---|---|---|---|---|
| yes | 40 | 10 | 4 | 0 |
| partly | 14 | 4 | 3 | 1 |
| no | 0 | 5 | 0 | 0 |
| placeholder | 3 | 2 | 13 | 2 |

- **Both useful (40 + 14 + 10 + 4):** the norm. Typical pair: the summary drove the action ("Made me run gate:scoped…"), and the full read supplied an amendment or definition.
- **Summary "no" but full read "yes" (4):** mostly the two verdicts judge different readers.
  - In 01596W4 (03, 04) and 01La82m (29), a subagent read the ADR for an issue, while the main agent rated the rule against its own action: "Open-a-PR rule did not apply to a labels-only sweep."
  - Only 01V3bxJ / ADR-0018 is a genuine case where the summary was unhelpful and the full text helped (the amendment convention, quoted in point 4).
- **Summary "yes" but full read "partly" (14):** again different questions.
  - Typical rule reason: "Told me to invoke close-session at PR-open… no need for the full ADR."
  - Typical full-read reason, by a subagent: "the ADR that binds the #1876 session-trace change" (016gu9e).
- **Full "no" with summary "partly" (5):** all 01YVCyX, "not by me".
- **Placeholder with summary "no" (13):** audit-docs and backlog coordinators whose subagents read the ADR. The main agent rated the rule irrelevant and gave the read no verdict.

**Representative "yes" reasons (what the full text gave):**
- 01AA2LX/0027: "Read the full ADR directly (not just grepped it) once I decided to escalate #1856, since it governs the finding; confirmed the literal three-day floor has no grace exception anywhere in the text."
- 01La82m/0022: "standing green-light bounds, closes objective only."
- 01WoJ2c/0009: "schema evolution policy: additive optional fields need no version bump."
- 01BLrfu/0004: "the one-spec/one-setup() amendment this work supersedes; L2 definition."
- 01BLrfu/0026: "composite action is agent-editable, Human-merge; parity spec."
- 017XWy7/0005: "only knows Skills; needed an amendment for workflow scripts."
- 01V3bxJ/0018: "ADR drift: a factual correction is an in-place edit, still human-merged."
- 01AnHXy/0018: "one-line amending-note convention for the escalation."
- 01DtK8w/0020: "rule 3: Public-originated PRs are human-merged."
- 015LwBg/0027: "subagent #1745: trials may fold amendments into ADRs."
- 017inrp/0003: "visitor-loop ledger row bounds the remit."
- 01VGLAa/0009: "its 2026-10-11 amendment defined the rule reason as 'what it told the agent'; fixed in place."

**Representative "partly" and "no" reasons:**
- 01SZwdb/0017 and 015LwBg/0017: "bot identity deferred (#1689)". The ADR records an open question rather than a rule.
- 017XWy7/0029: "rules paths for the new folder".
- 017XWy7/0015: "audit-skills would not see workflows". Here the ADR was silent on the new case.
- 01V3bxJ/0009: "grepped its frictions-to-fixes passages: external-session exclusion and the SHELL-READ-DETECTION floor". Only scattered passages applied.
- 01VGLAa/0029: "rules are hashed against their ADR; the rulesLoaded/rulesFollowedUp design".
- 01CasnQ/0017: "provenance header format for subagent comments". The summary already holds the format.
- 01SZwdb/0026, 01La82m/0026: "gate action editability (#1603)".
- 01DqPT8/0009: "subagent: confirmed the binding ADR for #1878". The read only confirmed which ADR applies.
- 01YVCyX ×5: "read by a reviewer or checker subagent, not by me".

### Caveats
- The verdict-era sample is 28 sessions over about 2 days, dominated by backlog runs.
- Reader attribution exists only when the agent wrote it; 53% of reads are "unknown".
- Trigger classification is my heuristic. Order is known only through the trace's follow-up flag, and global rules are always loaded first, so a "pointer" for a global-rule ADR is my judgement from the reason.
- Rule verdicts judge the main agent's own action, while full reads are often a subagent's. Discordant pairs in the cross-tab mostly reflect that, not disagreement about content.

Files are in /tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad:
- adrrows.mjs
- extra.mjs
- extra.json
- types.json
- classify.mjs
- rows.json
- summarize.mjs
- rows2.json
