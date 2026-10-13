# ADR-0015 rewrite: report

Rewrite: `docs/adr-rewrite/rewrites/0015.md`. Sources: the ADR, its rule,
`decisions.md`, ADR-0030 and the template, ADR-0003/0005/0010/0027,
`expectations/0015.md`, `refs/0015.md`, the session-log usage notes,
`git log --follow` on the ADR (21 commits, messages read), and the live code
and Skills named below.

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
| --- | --- | --- | --- |
| ADR-0018 banner (`tenants/` → `layers/`) | leftover | history; paths now `layers/` | dropped |
| Amend. 07-08: `digest` and `audit-skills` now scheduled | leftover | cadence is not a decision here; "never say when a Skill runs" (issue #813, `scripts/validate-skill-cadence.ts`) | dropped |
| Amend. 07-09: bounded self-merge tier (3rd name on ADR-0003's list) | split: leftover / live | self-merge is now every agent's default (ADR-0003 10-10 amend.); the *bound* (only Inventory `.yml`, edits cite evidence) is live | Scope "What `audit-skills` may change"; mechanics in `audit-skills/SKILL.md` step 6 |
| Amend. 07-09: frontmatter concern filed as issue; regression watch | leftover | regression watch removed 09-27 (9e83006b); replaced by behaviour checks | Rejected alternatives (regression watch) |
| Amend. 07-11: pack Skill boundary gate-enforced; pin in Inventory, not `skills-lock.json`; `--write` | split: live / mechanics | "never edit a pack Skill" live; pin home and `--write` are mechanics in `scripts/verify-skills-lock.ts` (checked: header comment, `--write` path, runs first in `package.json` `gate` and `action.yml` L0) | Scope "Pack Skills"; Rejected alternatives (lock hash); See |
| Amend. 07-11: PR #304 story, "8 pack Skills gained entries" | leftover | history (the why survives in the script header) | dropped |
| Amend. 09-25: unlisted pack Skill doesn't fail gate; entry on first use | live + mechanics | still true in `verify-skills-lock.ts` (header lines 26-27) and SKILL.md step 5 "Coverage gaps" | Scope "Inventory covers every Skill in use"; Consequences (gate gap) |
| Amend. 07-13: `role` reference-free; `observations` field, required, append-only | split: live / mechanics / leftover | role vs observations split live; schema shape mechanics (`tenant.config.ts`); append-only replaced 09-27 | Scope `role` bullet; Why (ids crowded out prose) |
| Amend. 07-13: `observations` not rendered; audit-docs may consult them | live / mechanics | not rendered: live (checked, no use in `layers/journal/app` components); audit-docs use is held in `audit-docs/SKILL.md:70` | Scope `role` bullet; audit-docs part dropped (at home) |
| Amend. 07-13: migration of 8 entries | leftover | history | dropped |
| Amend. 08-01: `routine` grade and why | live (short) / mechanics | grade exists in schema enum and `CONTEXT.md`; definitions live in `CONTEXT.md` | Scope importance bullet, one sentence |
| Amend. 08-01: migrated Skills, `frictions-to-fixes` "not a demotion" | leftover | history | dropped |
| Amend. 08-29: referral framing is historical | leftover | describes a replaced path | dropped |
| Amend. 09-27: main purpose = silent failure + missed invocation | live | owner's call (9e83006b); SKILL.md intro | Summary; Why |
| Amend. 09-27: ≥3 windowed uses → one subagent | mechanics | `BEHAVIOUR_CHECK_MIN_USES` in `scripts/audit-skills.ts` | See |
| Amend. 09-27: issue only if significant or repeated, else observation | split: live / mechanics | "issue when it matters enough, otherwise observation" live; the bar is SKILL.md step 4 | Scope "What `audit-skills` may change" |
| Amend. 09-27: regression watch removed (80 runs, one finding) | rejected alternative | could plausibly be re-proposed | Rejected alternatives |
| Amend. 09-27: 7-day window, not 40 newest logs | mechanics | `DEFAULT_WINDOW_DAYS` and its why-comment in `scripts/audit-skills.ts` | See |
| Amend. 09-27: observations kept 40 days, added only for new sessions | mechanics | SKILL.md step 5; schema comment repeats it (to repoint) | Scope says "keeps only recent history" |
| Amend. 09-27: unverified findings recorded as observations | mechanics | SKILL.md steps 2 and 5 | dropped |
| Context: Inventory drift, flat 3-grade scale | leftover | history; the reason (frequency punishes rare tools) kept | Why |
| Context: helpfulness/friction-per-use dropped (issue #136) | rejected alternative | still plausible | Rejected alternatives |
| Context: "catalogue" → "Skill Inventory" | leftover | glossary owns the term (`CONTEXT.md`) | dropped |
| Decision: importance = conditional essentialness, never frequency; enum | live / mechanics | live principle; enum in `tenant.config.ts`, definitions in `CONTEXT.md` | Scope importance bullet |
| Decision: `role` ≤ ~50 words, not a copy of description | live / mechanics | "not a copy" live; length in SKILL.md step 5 and schema comment | Scope `role` bullet |
| Decision: grade drops only on opportunity-missed (≥2 sessions); self-correcting demote/re-promote loop | split: live / mechanics / leftover | "disuse alone never lowers" and "cited evidence" live; "≥2" mechanics (SKILL.md step 5); own-Skill demote-and-flag loop replaced: a missed own Skill is now a trigger problem, not a demotion (SKILL.md step 5) | Scope importance bullet |
| Decision: `audit-skills` is `sync`-family, not a chartered job | leftover | `decisions.md`: the job table and "chartered job" idea go | dropped |
| Decision: reads 40 newest logs | leftover | replaced by 7-day window | dropped |
| Decision: writes only `importance` + `role`, creates entries; never touches `.agents/skills/` | live | still SKILL.md line 20 | Scope "What `audit-skills` may change" |
| Decision: frontmatter-suspect referral to `frictions-to-fixes`; importance doesn't gate it | leftover | 08-29 amend. says historical; replaced by missed-invocation check | dropped |
| Decision: tune both categories, refer only our own; helper marks `external` | live / mechanics | pack Skills graded, never escalated (SKILL.md step 4); `external` flag in `scripts/audit-skills.ts` | Scope "Pack Skills", importance bullet |
| Decision: script gathers, session judges (`digest` pattern) | live | `scripts/audit-skills.ts` header | Scope last bullet |
| Decision: products land via gated PR, never direct to main | leftover | restates ADR-0003/0009 for every change | dropped |
| Decision: cadence on-demand, schedule deferred | leftover | now scheduled; cadence not stated in committed docs | dropped |
| Consequences: enum rename migration | leftover | history | dropped |
| Consequences: rolling judgement, grades move run to run | leftover (obvious) | follows from "re-graded each run" | dropped |
| Consequences: "catalog" → "collection index" | leftover | history | dropped |
| Consequences: auditor only proposes; retiring a Skill human-gated; never deletes | live | SKILL.md step 5 "Ideas … never act on it" | Scope "Ideas … are only recorded" |
| Consequences: first slice of the future `sync` job | leftover | `decisions.md` | dropped |

## 2. Callers

| # | Item | Outcome |
| --- | --- | --- |
| 1 | Pack Skills never edited; reinstall wipes edits | answered (Scope "Pack Skills", Why) |
| 2 | Inventory records role and importance, not a copy of the description; home for pack-Skill notes | answered (Summary, Scope) |
| 3 | sha256 pin in `installedSha256`, `--write`, runs first in gate | mechanics: `scripts/verify-skills-lock.ts`, `package.json` `gate`, `.github/actions/gate/action.yml` (checked) |
| 4 | What `audit-skills` may change | answered (Scope "What `audit-skills` may change") |
| 5 | `observations` internal, ids allowed, 40-day retention | answered (not shown, ids) + mechanics (retention: SKILL.md step 5; shape: `tenant.config.ts`) |
| 6 | `audit-skills` scheduled; with `digest` makes up "sync" | fix the caller (ADR-0003:54, ADR-0010:14): the "sync" remit is a leftover |
| 7 | Script/judgement split | answered (Scope last bullet) + mechanics (`scripts/audit-skills.ts`, `tests/unit/audit-skills.spec.ts`) |
| 8 | Which changes merge without a person; the "existing evidence rule" | fix the caller (ADR-0003:22): ledger goes; the bound lives in SKILL.md step 6, the evidence rule in step 5 |
| 9 | `role` ~50 words (80 max), no ids | answered (no ids) + mechanics (length: SKILL.md step 5; schema comment) |
| 10 | Skills live in `.agents/skills/` with `.claude/skills/` links | fix the caller (ADR-0005:11): ADR-0005 owns it; drop the ADR-0015 mention |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0015.md`

```markdown
---
adr: <regenerate>
paths:
  - "layers/journal/content/*/skills/**"
  - "skills-lock.json"
  - ".agents/skills/audit-skills/**"
  - "scripts/audit-skills.ts"
  - "scripts/verify-skills-lock.ts"
  - ".agents/skills/frictions-to-fixes/**"
  - ".agents/skills/audit-docs/**"
---
# ADR-0015: Pack Skills stay as installed; audit-skills grades every Skill by need

Never edit a Skill listed in `skills-lock.json`; `pnpm verify:skills-lock`
fails the gate on it. Put repo notes on a pack Skill in its Skill Inventory
entry. `importance` grades how much a Skill matters when its kind of work
comes up, not how often it runs (`CONTEXT.md`), and moves only on cited
session evidence. Keep `role` free of PR, issue and session ids; they go in
`observations`. `audit-skills` edits only Inventory entries and issues, never
a Skill.

Read the full ADR before you change a grade rule, the Inventory schema, or
what `audit-skills` may change.
```

### Caller edits

- `.github/actions/gate/action.yml:45`: `# Skill Inventory entry (ADR-0015 amendment) — a governance/provenance` → `# Skill Inventory entry (ADR-0015) — a governance/provenance`. Human merge (ADR-0026).
- `layers/journal/tenant.config.ts:30-34` →
  ```ts
      // The Skill's role and importance to this project, not a copy of its
      // own description, and free of PR/issue/session ids (ADR-0015). Length:
      // `.agents/skills/audit-skills/SKILL.md` step 5.
  ```
- `layers/journal/tenant.config.ts:42-47` →
  ```ts
      // `audit-skills`' own record, not rendered on the site (ADR-0015). Each
      // entry is one run's citable finding; PR/issue/session ids go here, not
      // in `role`. How long entries stay: `audit-skills/SKILL.md` step 5.
  ```
- `scripts/audit-skills.ts:112`: `/** One \`observations\` entry (ADR-0015 amendment, 2026-07-13). */` → `/** One \`observations\` entry (ADR-0015). */`
- `.agents/skills/audit-skills/SKILL.md:20-22` →
  ```markdown
  This Skill writes only Inventory `.yml` entries and GitHub issues (ADR-0015).
  A finding that clears step 4's bar becomes an issue; the rest become
  observations.
  ```
- `docs/adr/0005-skill-model.md:10-11`: `(see CLAUDE.md's Repo layout and ADR-0015, which already assumes the current split).` → `(see CLAUDE.md's Repo layout).` Moot if ADR-0005 is rewritten in the same PR.
- `docs/adr/0003-agent-operating-model-and-governance.md:22`: the ledger row goes with ADR-0003's rewrite (`decisions.md`). Until then: `Inventory-only content (\`.agents/skills/audit-skills/SKILL.md\` step 6)`.
- `docs/adr/0003-agent-operating-model-and-governance.md:52-54`: drop point (1) ("a chartered job is a remit … (ADR-0015) — `sync` spans `digest` and `audit-skills`"); goes with the ledger.
- `docs/adr/0010-digests-derived-append-only-journal-pages.md:13-14`: `realised by \`digest\` and \`audit-skills\`, both now scheduled (see ADR-0015).` → `realised by \`digest\` and \`audit-skills\`, both now scheduled.`
- `.claude/rules/adr-0005.md:17`: keep as is. It already only points to ADR-0015, and it is the one rule that loads on `.agents/skills/**`, where a pack edit would happen.
- No change: `scripts/verify-skills-lock.ts:1,4,221`, `scripts/audit-skills.ts:1,64`, `tests/unit/audit-skills.spec.ts:1`, `scripts/validate-skill-cadence.ts:4`, `frictions-to-fixes/SKILL.md:97`, `docs/adr/0027-prune-trials.md:58`, `docs/diagrams/interactive-map/terrarium-overview.md:860,867`. All point to the decision the rewrite keeps.

### New homes

- **Role length.** Two homes today: SKILL.md step 5 ("≤ ~50 words") and the schema comment ("~80 is the outer limit"). Make SKILL.md the one home. In step 5 change `stays ≤ ~50 words and free of` → `stays ≤ ~50 words (80 at most) and free of`.
- **What an `audit-skills` run may merge.** SKILL.md step 6 already holds it. `docs/agents/pr-workflow.md` "Closing a self-merged chartered run" step 5 cites "(ADR-0003 ledger)". When the ledger goes, change it to: `a run merges only the diff its own SKILL.md allows.`
- **Observations retention, first-use entries, `external` flag, window, behaviour-check threshold.** Already in SKILL.md and `scripts/audit-skills.ts`. Nothing to add.

### Other ADRs

- ADR-0005: Skills are code in `.agents/skills/`, changed by gated PR. Agrees. ADR-0005 still holds a `codify`/`sync` "chartered jobs" list, for its own rewrite.
- ADR-0003: every change lands as a gated PR and the author merges its own. Agrees since its 10-10 amendment. Its ledger row and "remit" point need the edits above.
- ADR-0008: the Skill Inventory is a Journal Inventory, refreshed in place. Agrees.
- ADR-0022: audit-skills issues are filed under the owner's account, so they are Trusted-authored and auto-triage may label them `ready-for-agent`. See policy question 1.
- ADR-0027: pack Skills are out of a trial's reach because the gate rejects the edit. Agrees.
- ADR-0026: the composite gate action is human-merged. Affects the `action.yml` caller edit.

## 4. Policy questions

1. **Who decides a change to one of our Skills that audit-skills reports?**
   SKILL.md says "an issue for a human". But the issue is a plain
   `needs-triage` issue, and ADR-0022 lets auto-triage send a Trusted-authored
   issue to `ready-for-agent` when the design is concrete. The rewrite says
   only "becomes an issue". **Recommendation:** let triage decide, as for any
   issue. Triage already sends judgement calls to `ready-for-human`. Change
   "for a human" in SKILL.md to point to triage.
2. **An audit-skills PR whose diff goes past Inventory entries.** Today it
   waits for a human (SKILL.md step 6, `pr-workflow.md` step 5), on the
   ledger's authority. Once the ledger goes, should it still wait, or merge
   like ordinary work? **Recommendation:** keep it waiting, with SKILL.md as
   the home. The rewrite's "edits only Inventory entries and issues" is the
   decision, and a stray diff breaks it.
3. **Gate gap for pack Skills with no Inventory entry.** The no-edit rule is
   not enforced for an installed pack Skill nobody has used yet.
   **Recommendation:** accept it (stated under Consequences). An unused Skill
   is unlikely to draw a friction fix. Revisit if one gets edited.

## 5. Split

The rewrite is 70 lines, so no split is needed. Two decisions share it:
pack Skills stay as installed, and how audit-skills grades and checks Skills.
If ADRs are reorganised, the pack-Skill rule could move to ADR-0005, which
already carries it in its summary rule. This is not proposed now: the first
pass is 1:1.

## 6. Prompt friction

- The checklist's "fix the caller" outcome covers a caller that relies on a
  *leftover* (items 6, 8). Leftover is a step-2 outcome, so the two steps
  overlap. It fits, but the prompt could say so.
- The Skill tool refused `writing-for-agents` ("already inlined"), but its
  body was not in this agent's context. I read
  `.agents/skills/writing-for-agents/SKILL.md` directly.
- The template has no place for "an earlier mechanism was replaced", such as
  the frontmatter referral being replaced by the missed-invocation check.
  ADR-0030 treats it as history, so it was dropped. A reviewer who remembers
  the referral won't find it noted.
- The owner's "not a demotion" rule for a missed own Skill (SKILL.md step 5)
  sits between decision and mechanics. I kept it in Scope because it changes
  what a grade means.

## 7. Lines

Old: 218. New: 70.
