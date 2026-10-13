# ADR-0018 rewrite report

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
| --- | --- | --- | --- |
| Context: the `tenants/` setup (hand-kept `extends` list, the `tsConfig.include` patch, the canary guarding it) | split: leftover / live | The setup is gone (history). What it cost is the reason for the decision. | Why; Rejected alternatives |
| Context: revives issue #55 Option A over Option B | leftover | Story of the issue. | dropped |
| Context: the three-part "deserves an ADR" test | leftover | About whether to write an ADR, not about the decision. That test lives in `.agents/skills/domain-modeling/ADR-FORMAT.md` (ADR-0030). | dropped |
| Decision: `git mv tenants layers`, content moves along | split: leftover / live | The move is done. The resulting location holds. | Summary; Scope "Where a Tenant lives" |
| Decision: "Tenant" term unchanged, the folder is just a path | live | Still how CONTEXT.md:31-33 words it. | Scope "Words", pointing to CONTEXT.md |
| Decision: `nuxt.config.ts` has no `extends` list, Nuxt auto-extends `layers/*` | live | Checked: `nuxt.config.ts` has no `extends`. | Scope; Why |
| Decision: the evidence (`pnpm build` + `test:e2e` with no `extends`) | leftover | A one-time check. | dropped |
| Decision: `tsConfig.include` shrinks to `../layers/*/tenant.config.*`; Nuxt covers `app/**` and `nuxt.config.*` | split: live / mechanics | That only the manifest needs our include is live. The glob value is held in `nuxt.config.ts:52` (checked). | Scope "Type checking"; See |
| Decision: the #55 negative test (a planted type error fails `pnpm typecheck`) | leftover | A one-time proof. | dropped |
| Decision: the canary narrows to the manifest glob and `content.config.ts` | mechanics | `tests/unit/typecheck-coverage.spec.ts` holds both checks (checked). | Scope (one sentence); See |
| Decision: `shared/expand.ts` reads `layers/` and emits `cwdRel: layers/…` | mechanics | `shared/expand.ts:70` (`layersDir = join(root, 'layers')`). | Scope "code that finds the Tenants"; See |
| Consequence: spawning a Tenant is purely additive (ADR-0002) | live | Still true. The steps (own `nuxt.config.ts`, `nuxt prepare`) live in `docs/agents/tenant-layers.md` §3. | Summary; Scope; Why; See |
| Consequence: type-check coverage for layers is free; only the manifest glob is ours, canary-guarded | live | Still true. | Why, third bullet |
| Consequence: runtime routing unaffected (routes keyed by Tenant name) | leftover | Only mattered for the move. ADR-0006 owns routing. | dropped |
| Consequence: this ADR touched Human-only files, so it was human-reviewed | split: leftover / live | How this PR landed is history. That moving the folder again touches Human-only files still guides a reader asking "may I change it?". | Consequences, pointing to ADR-0004 |
| Consequence: session logs and blog posts keep `tenants/` paths | live | Still true: 70 files under `layers/*/content` say `tenants/`. ADR-0009 already treats landed logs as fixed. | Consequences |
| ADR-editing rule (in-place fix vs amendment) and the ADR-0027 amendment | leftover | Already removed in 0530f8cd; ADR-0030 owns how ADRs change. | not in the current text; noted for the ADR-0022 caller |

## 2. Callers

| Checklist item | Outcome |
| --- | --- |
| 1. Each Tenant's code, content and manifest live under `layers/<tenant>/` (moved from `tenants/` on 2026-07-07) | **answered** (Scope "Where a Tenant lives"). The date is history. |
| 2. Older ADRs keep `tenants/` paths, with a note that the paths predate the move | **fix the caller.** ADR-0030 replaces banners: a small fix to an older ADR edits the wrong line. Remove each banner and change its `tenants/` paths to `layers/` (edits below). |
| 3. Nuxt loads every `layers/*`, no `extends` list; adding a Tenant is adding a folder; ADR-0002's 2026-07-05 amendment is moot | **answered** (Scope, Why). The ADR-0002 banners are **fix the caller**. |
| 4. Nuxt's type check covers `app/` and `nuxt.config.*`; only the manifest needs an include, a test guards it | **answered** (Scope "Type checking"), **mechanics** in `nuxt.config.ts` and `tests/unit/typecheck-coverage.spec.ts`. `shared/expand.ts:20-21` points here for this, and the rewrite keeps it. |
| 5. When to fix an ADR in place vs add a dated amendment (ADR-0022:112) | **fix the caller.** The rule left ADR-0018 in 0530f8cd. ADR-0030 now owns it, and amendments are gone. The ADR-0022 rewrite already drops this paragraph. |
| Repoint: `tests/unit/typecheck-coverage.spec.ts:51` test title | no change. The title only names the ADR. |
| Repoint: header comment `tests/unit/typecheck-coverage.spec.ts:10-15` | **fix the caller** (optional). It tells the history of the move. Edit below. |
| `nuxt.config.ts:7-12, 40-43` | answered; light edit to drop "now" (history wording). |
| `docs/agents/tenant-layers.md:3-4` | answered. A short pointer; no change. |
| `docs/diagrams/interactive-map/terrarium-overview.md:863` | answered. A pointer; no change. |
| Fix: `docs/research/content-client-queries-without-wasm.md:381` cites ADR-0018 for `nuxt.config.ts` being Human-only | **fix the caller.** ADR-0004 holds the Human-only list. Also flagged in the ADR-0028 report. |
| Noise: `tests/unit/shell-reads.spec.ts:328, 634, 640` | no change. These are fake filenames in test data. |
| Not attributed: "layers are presentation only, never define content collections" (`nuxt.config.ts:11-12`) | not added. It belongs to ADR-0002/0013, which build the collections. |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0018.md`

```markdown
---
adr: <new hash>
paths:
  - "nuxt.config.ts"
  - "tests/unit/typecheck-coverage.spec.ts"
---
# ADR-0018: Each Tenant is a Nuxt layer in `layers/<tenant>/`

Each Tenant lives in `layers/<tenant>/`, and Nuxt loads every folder there on
its own. Add a Tenant by adding its folder; never list Tenants in
`nuxt.config.ts`. Nuxt type-checks each layer's `app/` and `nuxt.config.*`;
the manifests need the one include in `nuxt.config.ts`, which a test guards.

Before you move or rename `layers/`, or change that include, read the full ADR:
docs/adr/0018-tenant-layers-under-layers-directory.md
```

### Caller edits

- `docs/adr/0002-manifest-driven-config-generation.md:6-18`: delete both
  banners (the ADR-0018 note and the 2026-07-05 `extends` amendment, which is
  no longer true). At :35 and :37, change `tenants/` to `layers/`. If 0002 is
  rewritten in the same PR, its rewrite does this.
- `docs/adr/0003-agent-operating-model-and-governance.md:34-36`: delete the
  banner. At :19 (`digest` row), change
  `tenants/journal/content/current/pages/digests/` (pre-rename path; see ADR-0018)
  → `layers/journal/content/current/pages/digests/`. The ledger is going
  anyway (decisions.md), so its rewrite may make this moot.
- `docs/adr/0009-session-logs-commit-directly-to-main.md:6-9`,
  `docs/adr/0010-digests-derived-append-only-journal-pages.md:6-8`,
  `docs/adr/0013-dynamic-content-config-committed-routing-map.md:7-9`,
  `docs/adr/0014-build-time-virtual-routing-module.md:6-8`: delete the
  ADR-0018 banner and change every `tenants/` path in the body to `layers/`.
- `docs/adr/0015-audit-skills-and-conditional-importance.md:7-9`: already
  handled by the 0015 rewrite.
- `docs/adr/0016-tenant-root-layer-routes.md:6-9`: delete the banner. At :29,
  `tenants/atlas/app/pages/t/atlas/index.vue` →
  `layers/atlas/app/pages/t/atlas/index.vue`.
- `docs/adr/0022-autonomous-triage-sweep.md:105-115`: handled by the 0022
  rewrite, which has no amendments. If 0022 is not rewritten first, cut the
  sentence "Per ADR-0018's factual-correction-vs-decision-reversal rule, …
  not an in-place rewrite."
- `docs/research/content-client-queries-without-wasm.md:381`:
  "`nuxt.config.ts` is human-only (ADR-0018), and so is this global runtime
  change (ADR-0004)." → "`nuxt.config.ts` is Human-only, so this global runtime
  change needs a human merge (ADR-0004)."
- `tests/unit/typecheck-coverage.spec.ts:10-15` → 
  ```ts
  // Nuxt type-checks each layer's app/ and nuxt.config.* itself; only the
  // manifest glob is ours to guard (ADR-0018).
  ```
- `nuxt.config.ts:40-43`: "Tenant layers now live under Nuxt's conventional
  `layers/` directory (ADR-0018), so Nuxt's generated tsconfig already
  includes…" → "Nuxt's generated tsconfig already includes each layer's…
  (ADR-0018)". Human-only file, so a human merges this.

### New homes

None needed. Every mechanic already has its home: the include in
`nuxt.config.ts`, the check in `tests/unit/typecheck-coverage.spec.ts`, the
steps for adding a Tenant in `docs/agents/tenant-layers.md` §3, the folder
read in `shared/expand.ts`.

### Other ADRs

- **ADR-0002** (adding a Tenant is adding a folder): agrees once its stale
  2026-07-05 `extends` amendment is removed (edit above).
- **ADR-0004** (`nuxt.config.ts` and `shared/expand.ts` are Human-only):
  agrees; both are in `.claude/rules/adr-0004-human-merge.md` `paths`.
- **ADR-0009** (landed session logs are fixed): agrees with the "old logs keep
  `tenants/` paths" consequence.
- **CONTEXT.md** (Tenant vs layer wording, lines 31-33): agrees.
- **ADR-0030** (how ADRs are edited): now owns the rule ADR-0022:112 cites.

## 4. Policy questions

None. Every part is live, mechanics or a leftover of the move itself.

## 5. Split

Not needed (about 55 lines).

## 6. Prompt friction

- The prompt asks to read every ADR that cites this one in full. Here eight of
  nine cite it only through an identical "paths predate the move" banner, so
  reading 0003 (159 lines) and 0009 (592 lines) in full added nothing. I read
  the short ones in full and the long ones at the cited lines.
- The expectations checklist was built after the ADR-editing section had
  already left ADR-0018 (0530f8cd), so item 5 asks about a part that is no
  longer there. The prompt's step 2 ("every part of the ADR") does not say
  whether parts removed by a recent commit count.
- "When to revisit: only conditions the sources give": the sources give none,
  so the section is left out.

## 7. Lines

Old: 81. New: 55.
