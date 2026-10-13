# ADR-0015 rewrite report

## 1. Inventory (current rules → rewrite section)

| # | Rule today | Source | Rewrite |
|---|---|---|---|
| 1 | `importance` = conditional essentialness, never raw frequency | Decision b1 | Summary; Scope/Grades |
| 2 | Five grades (essential, routine, specialist, supporting, peripheral), defined in CONTEXT.md | Decision b1 + 2026-08-01 | Scope/Grades (pointer) |
| 3 | `routine` assigned from an observed fact (scheduled sessions run it), not the usage judgement | 2026-08-01 | Scope/Grades |
| 4 | Disuse alone never lowers a grade; drop only on opportunity missed in sessions of its kind | Decision b2 | Scope/Grades |
| 5 | A grade change, either direction, needs ≥2 cited windowed sessions | Decision b2 + 2026-07-09 ("symmetric") | Scope/Grades |
| 6 | Missed invocation of an own Skill = trigger problem → finding, not demotion; for a pack Skill the grade is the lever | 2026-09-27 (same commit 9e83006b6 as SKILL.md step 5; not stated in the amendment text) | Scope/Grades |
| 7 | `role`: role + importance here, not a copy of the description; reference-free | Decision b1 + 2026-07-13 | Scope/Entries |
| 8 | `role` ≤ ~50 words | Decision b1 | moved to See (SKILL.md, schema comment) |
| 9 | `observations`: citable findings with ids; required (`[]` when empty) | 2026-07-13 | Scope/Entries (required-ness → schema) |
| 10 | Observations kept 40 days; add only when citing a new session; unverified findings marked | 2026-09-27 (reverses 07-13 append-only) | Scope/Entries |
| 11 | Observations not rendered; `audit-docs` may read them | 2026-07-13 | Scope/Entries |
| 12 | Entries record real use; created on first observed use; pack Skill without entry is unpinned, not a gate failure | 2026-09-25 + Decision b3 | Scope/Entries, Scope/Pack |
| 13 | Pack Skill repo advice lives in its Inventory entry | rule; Decision b4 ("fit to this project"); tenant.config.ts comment | Scope/Entries |
| 14 | audit-skills runs on a schedule; `disable-model-invocation: true` | 2026-07-08 (reverses "on-demand v1"); SKILL frontmatter | Scope/audit-skills |
| 15 | Window is a span of days (7), not newest-N logs | 2026-09-27 (reverses Decision b3's 40 logs) | Scope (value → See: script) |
| 16 | Script gathers, session judges (digest pattern) | Decision b5 | Scope/audit-skills |
| 17 | Own Skills used in ≥3 windowed sessions get a read-only subagent check for silent failure / missed invocation | 2026-09-27 | Scope (threshold → See: script) |
| 18 | Issue only when significant or repeated; else observation | 2026-09-27 | Scope/audit-skills; Why |
| 19 | Tuning covers all Skills incl. pack; checks/issues own only; pack finding → observation | Decision b4 + 2026-09-27; SKILL step 4 | Scope/audit-skills |
| 20 | Writes only Inventory + issues/comments; never edits `.agents/skills/` | Decision b3 + 2026-07-09 | Scope/audit-skills (phrased positively) |
| 21 | Self-merge bounded by ADR-0003 ledger row; never ADR-0009 path | Decision b5 + 2026-07-09 | Scope/audit-skills (pointer) |
| 22 | Never retires/deletes; ideas only; retiring is human | Consequences b4; SKILL step 5 | Scope/audit-skills |
| 23 | Pack Skill = keyed in skills-lock.json; SKILL.md not ours (re-install clobbers) | Decision b4 | Scope/Pack |
| 24 | Gate pins installed SKILL.md hash in Inventory, fails on drift; lock is installer's, read keys only | 2026-07-11 | Scope/Pack; Why; Rejected |
| 25 | Scorecard reports usage for every Skill | 2026-09-27 | dropped: mechanics (script) |

## 2. Dropped

- **History:** Context's 14-vs-25 entry counts; "catalogue" retirement (term
  already gone; CONTEXT.md holds Skill Inventory); `core`→`essential`
  migration; 8-entry `role` migration; 5-Skill `routine` migration; PR #304
  story; ADR-0018 path banner (`tenants/` → `layers/`); "specialist starts
  unused"; "partly revisits the helpfulness cut" narration.
- **No longer true:** the 40-newest-logs window; on-demand v1 cadence;
  append-only observations; the friction regression watch (added 07-09,
  removed 09-27); "referral to frictions-to-fixes" (08-29 said it is
  historical); "a pack Skill must be catalogued to pass the gate" (reversed
  09-25); "a `sync`-family Skill, not a new chartered job / doesn't claim the
  `sync` name" (retired term; audit-skills is now an ADR-0003 ledger row);
  the "demote-and-flag self-correcting loop" (superseded by row 6).
- **Mechanics moved to See** (should live where noted; all already do):
  window length 7 and threshold 3 → `scripts/audit-skills.ts` constants;
  `role` ≤ ~50 words, observation `{date, note}` format, escalation search
  steps, coverage-gap entry creation and removal → audit-skills SKILL.md;
  `installedSha256` field and `--write` → `verify-skills-lock.ts` header and
  schema comment; "runs first in the Gate" → `.github/actions/gate/action.yml`;
  "say scheduled, never when" → `validate-skill-cadence.ts`.

## 3. Rule check (`.claude/rules/adr-0015.md`)

| Rule fact | Rewrite |
|---|---|
| importance = essential when its kind of work happens, not how often; grades in CONTEXT.md | Summary; Scope/Grades |
| A grade changes only with ≥2 cited sessions | Scope/Grades |
| audit-skills checks our own Skills fire and deliver, keeps Inventory in line | Summary; Scope/audit-skills |
| Pack Skills stay as installed (`pnpm verify:skills-lock`) | Summary; Scope/Pack; See |
| Repo advice for a pack Skill goes in its Inventory entry | Scope/Entries |

No rule drift remains: the advice line (flagged in the survey as homeless)
now has a home, grounded in Decision b4 and the schema comment.

## 4. Format friction

- **Scope and limits got long** (four sub-groups, ~30 bullets). The ADR holds
  one decision with three parts (the grading scale, the auditor, pack-Skill
  pinning). I grouped with plain lead-in lines, not `###`, since the template
  allows only its `##` sections. Unclear whether sub-groups are allowed.
- **Summary 2–3 sentences** fit only by squeezing pack pinning into a clause.
  This strains ADR-0030's split test; pack-Skill pinning arguably belongs in
  ADR-0005 (which already says "Pack Skills stay as installed (ADR-0015)").
- **Limits vs mechanics:** 2 sessions and 40 days stay inline (agents act on
  them; the rule cites 2); 7 days and 3 uses moved out. The line between a
  "limit" and a "constant" was a judgement call.
- **Rejected alternatives whose reasoning is in Why:** two entries say "See
  Why" to avoid restating. Either duplicates or points; neither is clean.
- **Row 6** is decided only in SKILL.md (same commit as the amendment). The
  template has no place to mark "decision inferred from implementation".
- **When to revisit:** sources give none, so omitted.

## 5. Open questions

- Confirm row 6 (missed invocation of an own Skill is not a demotion) is the
  decision, not just SKILL.md drift from the original demote-and-flag loop.
- Should pack-Skill pinning move to ADR-0005, leaving 0015 to grading and
  the auditor?

## 6. Lines

Old: 218. New: 120.
