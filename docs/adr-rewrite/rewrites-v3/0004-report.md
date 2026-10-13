# ADR-0004 rewrite report (v3)

Rewrite: `rewrites-v3/0004.md`. Read: ADR-0030, ADR-0004 (HEAD e32f617ba), both
summary rules (`adr-0004.md`, `adr-0004-human-merge.md`), CONTEXT.md, the
callers' checklist, the background survey and session-log notes for 0004, the
v2 rewrite and report, and the ADR-0004 lines of 0003, 0005, 0016, 0020, 0023,
0025, 0026. Checked against `scripts/gate.ts` (`FLOOR`, `HEAVY`, `isInert`,
`isSkillFile`, `decideScope`), `scripts/merge-pr.ts:169-188`,
`.github/actions/gate/action.yml`, `layers/journal/nuxt.config.ts:15-16`,
`tests/README.md`, `docs/agents/pr-workflow.md`, `docs/agents/guards.md:45-47`,
`.github/dependabot.yml`.

Main change from v2: plain language. "Trusted human" → "a person with write
access"; "Public author" → "someone without write access"; "Full gate",
"fails closed", "the merge boundary" spelled out;
cross-refs moved to sentence ends. Glossary terms kept only where they are the
names in code and docs: Tenant, Space, Collection, Document, Floor, Heavy,
Inert, Human-only, Friction. Decision unchanged.

## 1. Inventory: current rules → section

| # | Rule today | Source | Rewrite section |
|---|---|---|---|
| 1 | Every PR passes the Gate; CI's run decides | Decision; CONTEXT "Gate" | Summary; S&L "Every PR passes the Gate" |
| 2 | Full `pnpm gate` is CI's; `gate:scoped` locally | summary rule only (decision, promoted) | S&L "Every PR passes the Gate" |
| 3 | L0: manifests validate + expand, build, lint, typecheck, drift checks | Decision L0 with "generator" corrected (07-10, ADR-0013/0014); action.yml | S&L "Four layers" |
| 4 | L1 via `validate:content`; build validates nothing | Decision L1 + 07-11 | S&L "Four layers"; build-as-validator → Rejected |
| 5 | L2: every (Tenant, Space) entry route 200, real browser, no console errors | Decision L2; smoke.spec.ts | S&L "Four layers" |
| 6 | L3: isolation; keys unique and scoped at expansion and resolution | Decision L3; expand.ts, routing.ts | S&L "Four layers" |
| 7 | Floor always; Heavy (test, build, e2e) skipped only on all-Inert; any doubt runs everything (no base, shallow, failed decision, empty, push to main); one classifier for CI and local | 10-03; `gate.ts:17-18,46-58`; action.yml:31,88 | S&L "Skipping the costly steps" |
| 8 | Revisit if CI green on an Inert PR a full gate would fail | 10-03 | When to revisit |
| 9 | Skill files (`.agents/skills/`, `.claude/workflows/`) skip build+e2e, not unit tests; only while nothing built/e2e-loaded lives there | 10-12 (#1603) + ADR-0005 widening (10-13); `gate.ts:31-33` | S&L "Skill files"; safety argument → Why |
| 10 | gate-scope.spec catches imports, not new build-time reads | 10-12 (#1603) | Consequences |
| 11 | gate:scoped + code-review before first push, even if Stop hook asks; skips in pr-workflow.md | 10-12 (#1853); rule | S&L "Before the first push"; reason → Why |
| 12 | Later push: code runs gate:scoped; prose/docs may rely on CI | 10-12 (#1853) | S&L "Later pushes" |
| 13 | CI red after green gate:scoped → check base drift, log `major` Friction | summary rule only (CONTEXT:144 relies on it) | S&L "CI fails after `gate:scoped` passed" |
| 14 | Tests live with their code (Tenant / Platform / Skill helper) | 07-07; 10-12 (#1603) | S&L "Where tests live"; reason → Why |
| 15 | e2e reuses one build; specs never build; per-Tenant specs in parallel | 10-12 (supersedes 07-07) | S&L "One build for e2e"; 07-07 shape → Rejected |
| 16 | Agents self-merge on green; five exceptions | 10-10 (#1741), 07-06, ADR-0020 amendment, ADR-0023 | Summary; S&L "Who merges" |
| 17 | Meaning and examples of "behaviour no test covers" | 07-30 | S&L "Behaviour no test covers" |
| 18 | Human-only list = rule `paths`, only home; read from `origin/main`; empty list refuses all | 10-10; 07-10; `merge-pr.ts:169-177` | S&L "Human-only files" |
| 19 | What kind of file belongs on the list | Decision "High-risk"; 10-10; ADR-0025/0026 amendments | S&L "Human-only files" (criterion, not enumeration) |
| 20 | merge-pr refuses fork/Public; the other path-less exceptions rely on the agent | 10-10; `merge-pr.ts:181-188` | S&L "Exceptions with no file to match" |
| 21 | Human-only limits merging, not editing | ADR-0026 "Why not a security hole"; CONTEXT "Human-only" | S&L "Merging, not editing" |
| 22 | Presentation-only layer code via `resolveSpaceRoute` is outside the reach exception | callers only (ADR-0016:37, ADR-0025:124, ~22 comments) | S&L "Deciding which Tenant's data…" (added) |
| 23 | Strict schemas do two jobs | Consequences | Consequences |
| 24 | Classifier and merge files are themselves Human-only | Consequences ("classification is itself high-risk") | Consequences |
| 25 | Autonomy needs automated checks; the one place not minimal; same signals for person and agent | Context | Why |
| 26 | Gate checks output, not intent; blind to some risks | ADR-0020 Context; CONTEXT "Gate" | Why |
| — | Low-risk auto-merge tier; 07-19 "ordinary PR always human-merged" | Decision; 07-19 | reversed by 10-10 → Rejected alternatives |
| — | Two amendments re-listing paths went stale | 07-10 | Rejected alternatives |
| — | Rollout (L0+L1+L3 day one, L2 later); L3 before autonomous consolidation | Decision; Consequences | dropped: history (all four layers exist) |
| — | "generator produces content.config.ts" | Decision L0 | dropped: no longer true (ADR-0013/0014) |
| — | gate.yml L1 step landing (#323); `workflow` OAuth scope | 07-11 | dropped: history; scope fact belongs to ADR-0026 |
| — | action.yml and ADR-0025 files join the high-risk set | 08-06, 07-22 | folded into the rule's `paths`; not restated |
| — | Per-spec SQLite file; `globalSetup` / `setupL2()` / freshness check | 10-12 | moved: mechanics already in `tests/README.md`, `tests/support/e2e.ts` |
| — | `validate:content` for a content-only edit | summary rule | See (procedure) |
| — | "the build reads only `.claude/rules/*.md`" | ADR-0005 amendment banner | dropped: not verified. No build-time reader of `.claude/rules/` found (grep of layers/, modules/, app/, shared/, nuxt.config.ts). Rewrite states only the verified fact: nothing in the build reads `.claude/workflows/`. |

Every amendment banner and every Decision/Consequences bullet maps to a row.

## 2. Callers' checklist

| id | Outcome | Note |
|---|---|---|
| C1 who merges | answered | row 16; conflict settled (self-merge + exceptions) |
| C2 merge not edit | answered | row 21 |
| C3 list home | answered | row 18 |
| C4 which surfaces | answered (criterion) + elsewhere | enumeration lives in the rule's `paths` |
| C5 presentation-only layer code | added | row 22; `app/composables/space.ts` and layer pages use `resolveSpaceRoute` |
| C6 dependency | answered | "adds a dependency"; patches/reclassification change `package.json`, which is on the list (no `patches/` or `pnpm-workspace.yaml` exists). Dependabot conflict → §3, §8 |
| C7 untested behaviour; gate blind by design | answered | rows 17, 26 |
| C8 unattended-hook reviewability bar | elsewhere | `docs/agents/guards.md:45-47`; See points there |
| C9 Public/fork/guest | answered | rows 16, 20 |
| C10 Tenant reach | answered | rows 16, 22 |
| C11 L0–L3 | answered | rows 3–6; labels kept |
| C12 objective; CI authoritative | answered | rows 1, 26 |
| C13 Floor/Heavy, Inert, gate:scoped decides | answered | row 7 |
| C14 Skill files skip build+e2e | answered | row 9 |
| C15 one e2e build | answered | row 15 |
| C16 `workflow` scope / drift history | elsewhere | ADR-0026 |
| C17 gate:scoped before push; CI-fail Friction | answered | rows 11, 13 |
| C18 every PR passes | answered | row 1 |
| C19 orthogonal axes | answered in substance | Why bullet on what a path can't show; "blast-radius" vocabulary dropped (no tiers remain) |
| C20 advisory checks outside CI | contradicted | ADR-0004 says nothing on this; fix caller |

## 3. Callers to repoint or fix

Repoint (cite the ADR, or its bullet lead-in, without quoting):

| file:line | change |
|---|---|
| `scripts/gate.ts:29`, `.github/actions/gate/action.yml:91`, `docs/adr/0005-skill-model.md:19` | "2026-10-12 amendment" → "ADR-0004 (Skill files)". gate.ts and action.yml are Human-only |
| `tests/README.md:3` | drop the amendment quote → "The why: ADR-0004 (One build for e2e)" |
| `tests/README.md:24` | → "ADR-0004 (Skill files)" |
| `tests/support/e2e.ts:6`, `tests/e2e/smoke.spec.ts:12`, `layers/{atlas,blog,marquee,midden}/tests/e2e/*.spec.ts:2`, `layers/commons/tests/e2e/commons.spec.ts:4`, `layers/journal/tests/e2e/journal.spec.ts:7` | "ADR-0004 amendment" → "ADR-0004" |
| `scripts/validate-content.ts:32` | "ADR-0004 amendment" → "ADR-0004 (L1)" |
| `scripts/double-background-guard.ts:23`, `scripts/skill-inline-guard.ts:8`, `scripts/workflow-edit-guard.ts:10`, `scripts/loop-only-tool-guard.ts:17` | "2026-07-30 amendment" → "ADR-0004 (Behaviour no test covers)"; reviewability bar → `docs/agents/guards.md` (all Human-only) |
| `.agents/skills/frictions-to-fixes/SKILL.md:286,288` | → "ADR-0004 (Behaviour no test covers)" |
| `docs/adr/0003-…:99` | "ADR-0004's 2026-10-10 amendment" → "ADR-0004" |
| `docs/adr/0026-…:15,25` | drop "ADR-0004's 2026-07-11 amendment"; ADR-0026 holds the scope fact itself |
| `docs/adr/0020-…:156` | "amending note" → plain pointer to ADR-0004 |
| `docs/agents/pr-workflow.md:75` | "(ADR-0003/0004)" for chartered tiers → ADR-0003 (ADR-0004 grants no tiers) |

Fix (stale or wrong):

| file:line | change |
|---|---|
| `.github/workflows/gate.yml:5`, `docs/adr/0026-…:64-65` | "high-risk set", "never auto-merged by any chartered-Skill tier" → "Human-only (ADR-0004)" |
| `docs/adr/0020-…:41,111,121` | "blast-radius tier", "low-risk auto-merge tier" are stale: ADR-0004 names exceptions, not tiers |
| `docs/adr/0006-…:50` | "blast-radius policy" → "Human-only list" |
| `docs/adr/0019-…:108,111` | "escalation axes", "named high-risk file list" → ADR-0004's exceptions / the rule's `paths` |
| `docs/adr/0024-…:91` | "ADR-0004's workflow scope" → ADR-0026 |
| `docs/proposals/README.md:32` | CI running a stale subset → ADR-0026 |
| `scripts/check-conflicting-issues.ts:15` | miscite: drop "ADR-0004's human-only boundary"; the script is advisory (pr-workflow.md step 2) |
| `scripts/validate-content-refs.ts:17` | "ADR-0004 gap" → "a gap L1's schemas can't see (ADR-0004)" |
| `.github/dependabot.yml:3` | reason "since they change `package.json`" applies to minor/patch bumps too; see §8 Q1 |
| `docs/adr/0023-…:83,96`, `docs/adr/0025-…:177`, `.agents/skills/guest-build/SKILL.md:81,83`, `.agents/skills/frictions-to-fixes/SKILL.md:230` | repeats of the list or exceptions → pointers |
| `docs/adr/0003-…:148`, `docs/adr/0022-…:35,58` | stale "human merges every PR"; fixed by those ADRs' rewrites (rewrites-v2/0022 already agrees) |
| `docs/adr/0005-…` amendment banner | "the build reads only `.claude/rules/*.md`": no such reader found; verify or drop in ADR-0005's rewrite |

Wording callers quote that the rewrite keeps because it is the plain name:
L0–L3, Human-only, Floor/Heavy/Inert, "behaviour no test covers", the two file
names. Dropped coined phrases: "high-risk set", "blast-radius", "escalation
axes", "low-risk auto-merge tier", "reviewability bar", "Full gate" (callers
using them go in the tables above).

## 4. Dropped

- Amendment banners, dates, Status line, PR and issue numbers: history (git).
- Rollout plan and "L3 before autonomous consolidation": history.
- "Generator" wording: no longer true (ADR-0013/0014).
- 07-11 narrative about gate.yml and the `workflow` scope: history; the scope fact's home is ADR-0026.
- 07-19 per-Skill merge list: superseded; scope per job is ADR-0003's ledger, mechanics in `pr-workflow.md` "Per-tier merge authority".
- ADR-0025/0026 "join the high-risk set": folded into the rule's `paths`.
- e2e mechanics (globalSetup, `setupL2()`, freshness, per-spec SQLite): already in `tests/README.md` and `tests/support/e2e.ts`.
- Inert proof details: already in `scripts/gate.ts` comments and issues #350, #544.
- "Blast-radius" vocabulary: no tiers remain; the rewrite speaks of exceptions.

## 5. Rule and cross-ADR check

`.claude/rules/adr-0004.md`, fact by fact:

| Rule fact | Rewrite |
|---|---|
| Every PR passes the gate | S&L "Every PR passes the Gate" |
| gate:scoped + code-review before first push, even when Stop hook asks; skips in pr-workflow.md | S&L "Before the first push" |
| Later prose/docs push may rely on CI; code runs gate:scoped first | S&L "Later pushes" |
| Leave full `pnpm gate` to CI | S&L "Every PR passes the Gate" (rule-only decision, promoted) |
| CI fail after green gate:scoped → base drift, `major` Friction | S&L "CI fails after…" (rule-only decision, promoted) |
| `validate:content` takes seconds for content edits | See (procedure) |
| Five exceptions | Summary; S&L "Who merges" |
| Human-merge rule loads on touch; merge-pr refuses | S&L "Human-only files" + Why |

Rule drift: the rule says `merge-pr.ts` "refuses to merge it" after listing all
five exceptions. It refuses only the Human-only path and the fork/Public cases
(`merge-pr.ts:171-188`). The rewrite states it exactly.

`.claude/rules/adr-0004-human-merge.md`: agrees (list in `paths`, merge-only, merge-pr refuses).

Facts owned by other ADRs:
- Agents self-merge on green (ADR-0003 10-10 amendment): agrees.
- Fork/Public PRs merged by a person (ADR-0020 rule 3): agrees. ADR-0020's tier wording is stale (§3).
- Guest PRs (ADR-0023): ADR-0023 narrows the merger to the owner; the rewrite says "a person with write access" and points to ADR-0023. Stricter, not contradictory.
- Pushing opens the PR (ADR-0003): agrees.
- Gate steps live in the composite action, parity (ADR-0026): agrees.
- Workflow scripts count as Skill files (ADR-0005): agrees. ADR-0005's claim that the build reads `.claude/rules/*.md` is unverified (§3).
- Presentation-only layer code (ADR-0016, ADR-0025): agrees.
- `rewrites-v2/0022.md:49,70`: agrees ("unless one of ADR-0004's exceptions applies").
- **Disagreement:** ADR-0003's `dependabot` ledger row lets a bot merge npm minor/patch PRs that change `package.json`, which is on the Human-only list. Not built yet (`pr-workflow.md:84-86`, proposal #1633). See Q1.

## 6. Candidate issues

- Repoint the ~25 citations of dated ADR-0004 amendments (§3).
- Dependabot auto-merge (#1633) is decided in ADR-0003 but not built; when built it collides with `package.json` on the Human-only list.
- No mechanical check exists for "adds a dependency", "behaviour no test covers" or "Tenant reach". `package.json` on the list already covers dependencies, so possibly nothing to build.
- Verify or drop ADR-0005's "the build reads only `.claude/rules/*.md`".

## 7. Format friction

- *Scope and limits* carries four topics (the Gate's checks, push discipline, test layout, merge exceptions) in 16 flat bullets. ADR-0030 doesn't say whether `###` subheadings are allowed; they would help scanning.
- The summary fits three sentences only by leaving out test layout. That is arguably a separate decision; kept per the brief, flagged as a split candidate.
- Promoting rule-only decisions (full gate is CI's; CI-red Friction) is what step 5 asks, yet is a small change to the ADR's text. I promoted.
- "Plain words over glossary terms" conflicts with names that code and callers depend on (Floor, Heavy, Inert, Human-only). I kept those, each explained at first use; ADR-0030 gives no rule for terms that are also identifiers.
- "Cross-references at sentence end": a bullet list item like "…the guest pipeline (ADR-0020, ADR-0023);" sits mid-list. Unclear whether that counts as mid-sentence.

## 8. Open questions

1. Dependabot: should ADR-0004 say a bot merge under ADR-0003's ledger is outside the Human-only list, or should ADR-0003's row narrow? `.github/dependabot.yml:3`'s reason applies to minor/patch bumps too.
2. Should test layout (tests live with their code; one e2e build) leave this ADR for `tests/README.md` or its own ADR?
3. The presentation-only edge case comes from callers (ADR-0016, ADR-0025, ~22 comments), not ADR-0004's own text. Confirm it belongs here.

## 9. Lines

Old: 237. New: 146.
