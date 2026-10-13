# ADR-0005 rewrite: report

Rewrite: `docs/adr-rewrite/rewrites/0005.md`. Sources: the ADR, its rule,
`decisions.md`, ADR-0030 and the template, ADRs citing it (0004, 0009, 0010,
0015) and the rewrites of 0004 and 0015, `expectations/0005.md`, the
session-log usage notes, `git log --follow -p` on the ADR (7 commits), and the
live files named below.

## 1. Parts

| # | Part of the old ADR | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Amend. 07-13: Skills live in `.agents/skills/`, `.claude/skills/` is a link layer | live + mechanics | Still true: 43 links in `.claude/skills/`, each to `../../.agents/skills/<name>` (checked). No check enforces it; its home is `CLAUDE.md` Repo layout | Scope "Where Skills live"; See |
| 2 | Amend. 10-13 (#1870): a workflow script is its Skill's code, named by it, in `.claude/workflows/<name>.js` | live | `CONTEXT.md` **Workflow**, `CLAUDE.md` layout, `clear-backlog/SKILL.md:15` rely on it; two scripts exist | Scope "Workflow scripts" |
| 2a | ...as a real file, because saving refuses a symlink | live (as reason) | Explains why workflows are not in the Skill folder | Why; Rejected alternatives |
| 2b | ...the gate treats it as one of its Skill's files | split: live / mechanics | That it counts as a Skill file: live. Which steps skip: `scripts/gate.ts` `isSkillFile` (checked, line 31-33) | Scope; See |
| 2c | (commit, not text) ESLint skips it; a unit spec checks it | mechanics | `eslint.config.mjs` `ignores: ['.claude/workflows/**']`, `tests/unit/workflow-scripts.spec.ts` (checked) | See |
| 3 | Context: "core identity", decide what a Skill is | live (short) | `CONTEXT.md` **Skill**, ADR-0015:128 still say the Skill set is a deliverable | Summary |
| 4 | Context: two categories, Platform-operation vs general engineering | split: live / leftover | The examples (`spawn-tenant`, `add-space`, `add-collection`, `edit-content`) were never built; adding a Tenant is `docs/agents/tenant-layers.md`. `sync`, `consolidate`, `triage`, `codify` as "chartered jobs" are retired terms (`CONTEXT.md` Retired terms; `decisions.md`). What stays: a Skill that changes the Platform; and pack Skills, which ADR-0015 owns | Scope bullets 2, 3 |
| 5 | Context: a Skill is separate from its schedule; a job = schedule + Skill | live | ADR-0010:12, ADR-0015:13 rely on it; `scripts/validate-skill-cadence.ts` header: a Routine's schedule lives outside git | Scope "Schedules"; Why |
| 6 | Decision: Platform Skills are generic, work on any Tenant through its manifest | live | Still the rule for any Skill that changes the Platform. No such generic Skill exists today, but the rule binds the next one | Scope bullet 2; Why; Rejected alternatives |
| 7 | Decision: repo-committed, versioned, reviewed in the same PR flow | live | Core | Summary; Scope bullet 1 |
| 8 | Decision: per-Tenant Skills only by exception, for a unique repeated workflow | live | Five exist (`atlas-specimen`, `blog-post`, `midden-catalogue`, `midden-survey`, `tinkerfund-campaign`), each a Tenant's own content workflow, so they fit the rule. "Exception" overstates it; the rewrite states the condition | Scope bullet 2 |
| 9 | Decision: make the distinction explicit by directory or naming | policy question | Never built: `.agents/skills/` is flat. `skills-lock.json` marks pack Skills instead | Rejected alternatives (pending owner, PQ 1) |
| 10 | Consequence: repo-committed because cloud sessions start cold | live | Still the reason | Why; Rejected alternatives |
| 11 | Consequence: generic Skills mirror the manifest philosophy | live | Reason for part 6 | Why |
| 12 | Consequence: a Skill change is a gated PR | live | Agrees with ADR-0004 | Scope bullet 1 |
| 13 | Consequence: a Skill that edits the generator/isolation is human-only | leftover | The generator is gone (ADR-0013/0014); the human merge follows the files a PR touches (ADR-0004), whichever Skill made it | dropped |
| 14 | Consequence: the `codify` job grows the set | leftover | `codify` is a retired term (`CONTEXT.md`) | dropped |
| 15 | Consequence: new Skills follow `writing-for-agents`, land via PR | mechanics | The Skill's own trigger ("Use when creating or editing skills") holds it | See |
| 16 | History: `drift-check` retired (07-11), wording fix, pack rename | leftover | Already removed or history | dropped |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | Workflow script is part of one Skill's code; fixed sequence the model can't skip | answered (Scope "Workflow scripts") |
| 2 | Skills written in `.agents/skills/`; `.claude/skills/` only links | answered (Scope bullet 1); mechanics home `CLAUDE.md` Repo layout |
| 3 | Which files the ADR governs | mechanics: the rule's `paths`, read by `scripts/skill-rules-hint.ts`. Fix the caller `docs/diagrams/interactive-map/terrarium-overview.md:860` (add `.claude/workflows/`) |
| 4 | For the gate a workflow script is a Skill file; Skill-only changes skip build and e2e | answered (Scope) + mechanics: `scripts/gate.ts` `isSkillFile`. Fix the caller `scripts/gate.ts:29-30` |
| 5 | A Skill is ordinary repo code, changed by gated PR | answered (Summary, Scope bullet 1) |
| 6 | A scheduled job is a Skill plus an outside timer | answered (Scope "Schedules") |
| 7 | Pack Skills used as installed; tracked in `skills-lock.json` | answered by pointer to ADR-0015 (its home). Caller ADR-0015:188 is fixed by the 0015 rewrite |
| 8 | A doc copied from a pack template becomes ours, never re-synced | added (Scope "Pack Skills"). True today: `docs/agents/domain.md:3`, `issue-tracker.md:3-6` are edited repo copies. No other ADR states it |
| 9 | Does the build read anything under `.claude/`? (conflict) | mechanics, not this ADR's fact: the build reads `.claude/rules/*.md` (`layers/journal/app/pages/t/journal/[space]/index.vue:92`, `import.meta.glob`) and lists `.agents/skills/` (`layers/journal/nuxt.config.ts:16`). Fix the caller `scripts/gate.ts:23`. The ADR-0004 line is dropped by its rewrite |
| 10 | The Skills are the project's main product | answered (Summary) |
| 11 | Workflow scripts are not ES modules; ESLint skips, a spec checks | mechanics: `tests/unit/workflow-scripts.spec.ts`, `eslint.config.mjs` (See). Fix the caller's dated citation |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0005.md`

```markdown
---
adr: <new hash>
paths:
  - ".agents/skills/**"
  - ".claude/skills/**"
  - ".claude/workflows/**"
  - "skills-lock.json"
  - ".agents/skills/frictions-to-fixes/**"
  - ".agents/skills/audit-docs/**"
---
# ADR-0005: Skills are Platform code, committed with the repo

Keep each Skill in `.agents/skills/<name>/` with a link in `.claude/skills/`,
and change it through a gated PR like any code. A Skill that changes the
Platform works on any Tenant through its manifest; give one Tenant its own
Skill only for a repeated workflow unique to it. Pack Skills in
`skills-lock.json` stay as installed (ADR-0015); a doc copied from a pack
template is ours and is never re-synced. A workflow script is its Skill's
code: a real file in `.claude/workflows/<name>.js`, named by the Skill that
runs it. A schedule lives in a Routine, not in the Skill.

Read the full ADR before you move where Skills or workflows live, or add a
Skill for one Tenant.
```

(`paths` unchanged, so `scripts/skill-rules-hint.ts:36` stays valid.)

### Caller edits

- `scripts/gate.ts:22-23` (Human-only): "and `build` never reads `.claude/`" →
  "and `build` reads only `.claude/rules/` there".
- `scripts/gate.ts:29-30` (Human-only): as drafted in the 0004 report: "Build
  reads `.agents/skills/` only to list which folders hold a SKILL.md, and no
  e2e spec reads it, so build and e2e may skip these (#1603). A workflow script
  is its Skill's code (ADR-0005)." Agrees with this rewrite.
- `tests/unit/workflow-scripts.spec.ts:2`: "(ADR-0005's 2026-10-13 amendment,
  #1870)" → "(#1870)".
- `docs/diagrams/interactive-map/terrarium-overview.md:860`: "`.agents/skills/`,
  `.claude/skills/`, `skills-lock.json`" → "`.agents/skills/`,
  `.claude/skills/`, `.claude/workflows/`, `skills-lock.json`".
- `docs/adr/0004-objective-safety-gate.md:4-8` and
  `docs/adr/0015-audit-skills-and-conditional-importance.md:13,188`: replaced by
  their rewrites (rewrites/0004.md, 0015.md), which drop these lines.
- No change: `CLAUDE.md:83`, `CONTEXT.md:198`, `docs/agents/domain.md:4`,
  `docs/agents/issue-tracker.md:6`, `scripts/skill-rules-hint.ts:36`,
  ADR-0009:365, ADR-0010:12. Each points to a fact the rewrite keeps.

### New homes

None needed. Every mechanic that left the ADR already has a home: `CLAUDE.md`
Repo layout, `scripts/gate.ts`, `eslint.config.mjs`, `tests/unit/workflow-scripts.spec.ts`,
the `writing-for-agents` Skill trigger.

### Other ADRs

| Fact the rewrite states | Owner | Agrees? |
|---|---|---|
| A Skill's PR merges like any other | ADR-0004 (rewrite) | yes |
| A Skill-only change may skip some gate steps | ADR-0004 / `scripts/gate.ts` | yes; the rewrite only points |
| Pack Skills stay as installed | ADR-0015 (rewrite) | yes |
| A scheduled run is a Skill plus a Routine | ADR-0003 (job ledger and "chartered job" go, `decisions.md`) | yes; ADR-0003's rewrite should point here for what a scheduled run is |
| A Skill fix is ordinary gated code | ADR-0009:365 | yes |

## 4. Policy questions

1. **Separate our Skills from pack Skills by folder or name?** The old ADR
   decided to, and it was never built. `skills-lock.json` and the Skill
   Inventory already tell them apart, and moving pack Skills would fight the
   installer. **Recommendation:** drop it, as the rewrite does (listed under
   *Rejected alternatives*). If the owner wants it kept, move that bullet to
   *Scope*.
2. **Per-Tenant Skills "only by exception".** Five of ~17 own Skills serve one
   Tenant. **Recommendation:** state the condition (a repeated workflow unique
   to that Tenant) without "exception", as the rewrite does. Low stakes.

## 5. Split

Not needed: 61 lines.

## 6. Prompt friction

- The old ADR's main examples (`spawn-tenant` etc.) never existed. The rule
  they illustrated is still live but has no current instance, so "live" vs
  "leftover" turned on whether a rule with no example still binds. I kept it.
- Checklist item 8 is a decision only callers state; "added" fit, but it
  overlaps ADR-0015's ground. It went here because ADR-0015 is about Skills,
  not docs.
- Item 9 is another ADR's mechanic; the prompt's outcomes have no "belongs to
  another ADR" case, so I used "mechanics" with a caller fix.

## 7. Lines

Old: 61. New: 61 (the old ADR was already short; the new one drops its history and leftovers and adds the copied-template and schedule decisions).
