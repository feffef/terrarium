# ADR-0004 rewrite report

Rewrite: `rewrites-v2/0004.md`. Read for it: ADR-0030, ADR-0004 (current, Prune
Trial carve-out already removed by e32f617ba), both summary rules, CONTEXT.md,
ADR-0003, -0020, -0026 in full, and the ADR-0004 lines of 0005, 0006, 0009,
0014, 0016, 0019, 0022, 0023, 0024, 0025, 0027, 0029. Checked against
`scripts/gate.ts`, `scripts/merge-pr.ts`, `package.json`, `action.yml`,
`gate.yml`, `tests/README.md`, `tests/support/e2e.ts`, `shared/expand.ts`,
`docs/agents/pr-workflow.md`, `docs/agents/guards.md`, `.github/dependabot.yml`.

## 1. Inventory: current rules → section

| # | Rule today | Source | Rewrite section |
|---|---|---|---|
| 1 | Every PR passes the Gate; CI's run is authoritative | Decision; CONTEXT "Gate" | Summary; S&L "The Gate" |
| 2 | Full `pnpm gate` is CI's to run; `gate:scoped` locally | summary rule (rule-only decision, promoted) | S&L "The Gate" |
| 3 | L0 build: manifests validate + expand, build, lint, typecheck, drift checks | Decision L0, "generator" corrected per 07-10 / ADR-0013/0014; `action.yml` L0 steps; `expand.ts:123` | S&L "Four layers" |
| 4 | L1 content via `validate:content`; build validates nothing | Decision L1 + 07-11 correction | S&L "Four layers"; build-as-validator → Rejected |
| 5 | L2 smoke render: entry routes 200, real browser, no console errors | Decision L2; `smoke.spec.ts:1` (adds "hydrates") | S&L "Four layers" |
| 6 | L3 isolation; keys unique and scoped, at expansion and resolution | Decision L3; `expand.ts:152`, `routing.ts:3` | S&L "Four layers" |
| 7 | Floor/Heavy; Heavy skipped only on all-Inert; fail-safe cases; one classifier for CI and local | 10-03 amendment; `gate.ts decideScope` | S&L "Floor and Heavy" |
| 8 | Revisit if CI green on Inert PR a Full gate would catch | 10-03 | When to revisit |
| 9 | Skill files (`.agents/skills/`, `.claude/workflows/`) skip build+e2e, not unit tests; only while nothing built/e2e-loaded lives there | 10-12 (#1603) + ADR-0005 widening (10-13) | S&L "Skill files"; safety argument → Why |
| 10 | gate-scope.spec tripwire catches imports, not build-time reads | 10-12 (#1603) | Consequences |
| 11 | gate:scoped + code-review before first push, even if Stop hook asks; skips in pr-workflow.md | 10-12 (PR #1853); rule | S&L "Before the first push"; reason → Why |
| 12 | Later push: code runs gate:scoped; prose/docs may rely on CI | 10-12 (#1853) | S&L "Later pushes" |
| 13 | CI red after green gate:scoped → check base drift, log `major` Friction | summary rule only (CONTEXT:144 cites "the ADR-0004 rule"); promoted as a decision | S&L "CI red after a green `gate:scoped`" |
| 14 | Tests homed with code (Tenant / Platform / Skill helper) | 07-07; 10-12 (#1603) | S&L "Where tests live"; reason → Why |
| 15 | e2e: one build, specs never build, per-Tenant specs in parallel | 10-12 (supersedes 07-07 "one spec, one setup()") | S&L "One build for e2e"; 07-07 shape → Rejected |
| 16 | Agents self-merge on green; exceptions: dependency, untested behaviour, Tenant reach, Public/fork/guest, Human-only path | 10-10 (PR #1741), 07-06, ADR-0020 amendment, ADR-0023 | Summary; S&L "Who merges" |
| 17 | Definition + worked examples of "behaviour no test covers" | 07-30 (`/audit-docs`) | S&L "Behaviour no test covers" |
| 18 | Human-only list = rule `paths`, single home; read from `origin/main`; empty list fails closed | 10-10; 07-10; `merge-pr.ts:169-177` | S&L "The Human-only list" |
| 19 | What kind of file is on the list (isolation core, Gate/CI, governance, what keeps self-merge safe) | Decision "High-risk"; 10-10; ADR-0025, ADR-0026 amendments | S&L "The Human-only list" (as a criterion, not an enumeration) |
| 20 | merge-pr refuses fork/Public; other path-less exceptions rely on the agent | 10-10; `merge-pr.ts:181-188` | S&L "Exceptions without a path" |
| 21 | Human-only limits merge, not edit | ADR-0026 "Why not a security hole"; CONTEXT "Human-only" | S&L "Merge, not edit" |
| 22 | Presentation-only layer code via `resolveSpaceRoute` is outside the reach exception | callers only (ADR-0016:37, ADR-0025:124, ~22 code comments) | S&L "Which Tenant's data…" (added) |
| 23 | Strict schemas do double duty | Consequences | Consequences |
| 24 | The classifier/merge files are themselves Human-only | Consequences ("classification is itself high-risk and human-owned") | Consequences |
| 25 | Why: autonomy needs automated verification; one place not minimal; same signals for human and agent | Context | Why |
| 26 | Gate checks output, not intent | ADR-0020 Context, CONTEXT "Gate" | Why |
| — | Low-risk "auto-mergeable" tier; 07-19 "ordinary PR always human-merged" | Decision; 07-19 | Reversed by 10-10 → Rejected alternatives |
| — | Two amendments re-enumerating the list went stale | 07-10 | Rejected alternatives |
| — | Rollout (L0+L1+L3 day one, L2 later); "L3 must exist before autonomous consolidation" | Decision; Consequences | dropped: history (all four layers exist) |
| — | "generator produces content.config.ts" | Decision L0 | dropped: no longer true (ADR-0013/0014) |
| — | gate.yml L1 step landing (PR #323), `workflow` OAuth scope | 07-11 | dropped: history; ADR-0026 owns the scope fact |
| — | `action.yml` joins high-risk set; ADR-0025 files join | 08-06, 07-22 | folded into the list (rule `paths`); not restated |
| — | Prune Trial carve-out | removed on this branch | dropped: no longer true |
| — | Per-spec Nuxt Content SQLite file | 10-12 (2026-10-12 e2e) | moved: mechanics, home is `tests/support/e2e.ts:33-46` (already there) |
| — | `globalSetup` / `setupL2()` / freshness check | 10-12 | moved: `tests/README.md` (already there) |
| — | `pnpm validate:content` for content-only edit | summary rule | See (procedure) |

Every amendment banner and every Decision/Consequences bullet maps to a row above.

## 2. Callers' checklist

| id | Outcome | Note |
|---|---|---|
| C1 who merges | answered | rows 16; conflict settled (self-merge + exceptions) |
| C2 merge not edit | answered | row 21 |
| C3 list home | answered | row 18 |
| C4 which surfaces | answered (criterion) + elsewhere | the enumeration lives in the rule `paths` |
| C5 presentation-only layer code | **added** | row 22; checked: `app/composables/space.ts`, layer pages call `resolveSpaceRoute` |
| C6 dependency (+ changing one's behaviour) | answered | "adds a dependency"; patches/reclassification change `package.json`, which is on the list (no `patches/` or `pnpm-workspace.yaml` exists today). Dependabot conflict → §3, §8 |
| C7 untested behaviour, gate blind by design | answered | rows 17, 26 |
| C8 unattended-hook reviewability bar | elsewhere | `docs/agents/guards.md:45-47`; the ADR keeps only "no dry run or test harness" as an example; See points to guards.md |
| C9 Public/fork/guest | answered | row 16, 20 |
| C10 Tenant reach | answered | row 16, 22 |
| C11 layers L0–L3 | answered | rows 3–6; labels kept verbatim |
| C12 objective, output not intent, CI authoritative | answered | rows 1, 26 |
| C13 Floor/Heavy, Inert, gate:scoped decides | answered | row 7 |
| C14 Skill files skip build+e2e | answered | row 9 |
| C15 e2e one build | answered | row 15 |
| C16 `workflow` scope / drift history | elsewhere | ADR-0026 owns it |
| C17 gate:scoped before push; CI-fail Friction | answered | rows 11, 13 |
| C18 every PR passes | answered | row 1 |
| C19 orthogonal axes | answered in substance | the Why bullet on path blindness; "blast-radius" term dropped (no tiers any more) |
| C20 advisory checks out of CI | contradicted | ADR-0004 says nothing about that; fix caller |

## 3. Callers to repoint or fix

| file:line | change |
|---|---|
| `.github/actions/gate/action.yml:91`, `scripts/gate.ts:29`, `docs/adr/0005-skill-model.md:19` | "2026-10-12 amendment" → "ADR-0004, Scope and limits (Skill files)" (action.yml, gate.ts Human-only) |
| `tests/README.md:3` | drop the amendment quote; "The why: ADR-0004 (One build for e2e)" |
| `tests/README.md:24` | → "ADR-0004 (Skill files)" |
| `tests/support/e2e.ts:6`, `tests/e2e/smoke.spec.ts:12`, `layers/{atlas,blog,commons,journal,marquee,midden}/tests/e2e/*.spec.ts` | "ADR-0004 amendment" → "ADR-0004" |
| `scripts/validate-content.ts:32` | "ADR-0004 amendment" → "ADR-0004 L1" |
| `scripts/double-background-guard.ts:23`, `skill-inline-guard.ts:8`, `workflow-edit-guard.ts:10`, `loop-only-tool-guard.ts:17` | "2026-07-30 amendment" → "ADR-0004 (behaviour no test covers)"; reviewability bar → `docs/agents/guards.md` (all Human-only) |
| `.agents/skills/frictions-to-fixes/SKILL.md:286,288` | → "ADR-0004, Scope and limits (Behaviour no test covers)" |
| `.agents/skills/frictions-to-fixes/SKILL.md:230` | repeats Human-only; point to rule `paths` |
| `docs/adr/0003-…:99` | "ADR-0004's 2026-10-10 amendment" → "ADR-0004" (ADR-0003 rewrite) |
| `docs/adr/0026-…:15,25` | drop "ADR-0004's 2026-07-11 amendment"; ADR-0026 holds the scope fact itself |
| `docs/adr/0026-…:64`, `.github/workflows/gate.yml:5` | "high-risk set" → "Human-only list (ADR-0004)"; 0026:65 "never auto-merged by any chartered-Skill tier" is stale wording |
| `docs/adr/0020-…:41,111,121,156` | "blast-radius tier", "low-risk auto-merge tier", "amending note" are stale: ADR-0004 now names exceptions, not tiers. Keep "untested-behaviour blind spot" (meaning survives in Why) |
| `docs/adr/0006-…:50` | "blast-radius policy" → "Human-only list" |
| `docs/adr/0019-…:108,111` | "escalation axes", "named high-risk file list" → the exceptions / the rule's `paths` |
| `docs/adr/0024-…:91` | "ADR-0004's workflow scope" → ADR-0026 |
| `docs/adr/0023-…:83,96`, `docs/adr/0025-…:177`, `.agents/skills/guest-build/SKILL.md:81,83` | repeats → pointers |
| `docs/adr/0003-…:148`, `docs/adr/0022-…:35,58` | stale "human merges every PR"; fixed by those rewrites (0022 v2 already consistent) |
| `docs/proposals/README.md:32` | "ADR-0004 records CI running a stale subset" → ADR-0026 |
| `scripts/check-conflicting-issues.ts:15` | miscite: drop "ADR-0004's human-only boundary"; the script is advisory (pr-workflow.md step 2) |
| `scripts/validate-content-refs.ts:17` | "ADR-0004 gap" → "a gap L1 schemas can't see (ADR-0004)" |
| `.github/dependabot.yml:3` | says non-minor bumps are human-merged "since they change `package.json`"; but minor/patch bumps change it too. See §8 Q1 |
| `docs/agents/pr-workflow.md:75` | "(ADR-0003/0004)" for chartered tiers: ADR-0004 no longer grants tiers; → ADR-0003 |

Kept wording callers quote: L0–L3 labels, "Human-only", "Floor/Heavy/Inert/Full gate", "behaviour no test covers" (the summary rule's form; "changes untested/untestable runtime behaviour" callers map onto it), file names of the ADR and the human-merge rule, "names the exceptions".

## 4. Dropped

- Amendment banners, dates, Status line, PR/issue numbers: history (git).
- Rollout and "L3 must exist before autonomous consolidation": history.
- "Generator" wording: no longer true (ADR-0013/0014).
- 07-11 narrative about gate.yml and the `workflow` scope: history; the scope fact's home is ADR-0026.
- 07-19 per-Skill auto-merge list: superseded; ledger scope is ADR-0003, mechanics `pr-workflow.md`.
- ADR-0025/0026 "join the high-risk set": folded into the rule's `paths`.
- e2e mechanics (globalSetup, `setupL2()`, freshness, per-spec SQLite): `tests/README.md` and `tests/support/e2e.ts` already hold them.
- Inert proof details: `scripts/gate.ts` comments and issues #350/#544 already hold them.
- "Blast-radius" vocabulary: there are no tiers left; the rewrite speaks of exceptions.

## 5. Rule and cross-ADR check

Summary rule `.claude/rules/adr-0004.md`, fact by fact:

| Rule fact | Rewrite |
|---|---|
| Every PR passes the gate | S&L The Gate |
| gate:scoped + code-review before first push, even when Stop hook asks; skips in pr-workflow.md | S&L Before the first push |
| Later prose/docs push may rely on CI; code change runs gate:scoped | S&L Later pushes |
| Leave full `pnpm gate` to CI | S&L The Gate (was rule-only; promoted) |
| CI fail after green gate:scoped → base drift, `major` Friction | S&L (was rule-only decision; promoted) |
| `validate:content` takes seconds for content edits | See (procedure) |
| Five exceptions | Summary; S&L Who merges |
| Human-merge rule loads on touch; merge-pr refuses | S&L The Human-only list |

Rule drift: the rule says `merge-pr.ts` "refuses to merge it" right after listing all five exceptions; it refuses only the path and the Public/fork cases. Minor; the rewrite states it exactly.

`.claude/rules/adr-0004-human-merge.md`: matches (list in `paths`, merge-only, merge-pr refuses).

Other ADRs' facts the rewrite states:
- Agents self-merge (ADR-0003 10-10 amendment): agrees.
- Trusted human merges; Public/fork human-merged (ADR-0020 rule 3): agrees; ADR-0020's "low-risk auto-merge tier" wording is stale (§3).
- Guest PRs owner-merged (ADR-0023): the rewrite says "a Trusted human"; ADR-0023 narrows it to the owner. Not a contradiction, but ADR-0023 is stricter; the rewrite points to it.
- Pushing opens the PR (ADR-0003 07-07): agrees.
- Gate steps in composite action, parity (ADR-0026): agrees.
- Skill workflow scripts count as Skill files (ADR-0005): agrees.
- Presentation-only layer code (ADR-0016, ADR-0025): agrees.
- ADRs are Human-only, no Prune Trial carve-out (ADR-0027 current): agrees.
- **Disagreement:** ADR-0003's `dependabot` row lets a bot merge npm minor/patch PRs that change `package.json`, which is on the Human-only list. Not built (`pr-workflow.md:84-86`: proposal #1633). See Q1.
- `rewrites-v2/0022.md`: consistent ("unless one of ADR-0004's exceptions applies").

## 6. Candidate issues

- Repoint the ~25 code and doc citations of dated ADR-0004 amendments (§3).
- Dependabot auto-merge workflow (#1633) is decided in ADR-0003 but not built; when built it collides with `package.json` on the Human-only list.
- No mechanical check exists for the three path-less exceptions (dependency, untested behaviour, Tenant reach). A cheap one for "adds a dependency" (diff of `package.json` dependencies) would let `merge-pr.ts` refuse it; today `package.json` being on the list already covers it, so maybe nothing to build.

## 7. Format friction

- *Scope and limits* had to carry three distinct topics (the Gate, push discipline, merge exceptions) plus test layout. As flat bold bullets it reads fine but is 15 bullets; sub-headings (`###`) would help scanning, and ADR-0030 doesn't say whether they are allowed. I used flat bullets to follow the template strictly.
- ADR-0030 says "one decision per ADR … if the summary can't cover it in 2–3 sentences, split". The summary fits in three, but only by leaving test layout (homing, one e2e build) out of it. Test layout is arguably its own decision; I kept it (don't split, per the brief) and flag it as a split candidate.
- "Bold only the lead-in of a bullet" vs the nested L0–L3 list: sub-bullets have no bold; fine, but ADR-0030 doesn't say whether nested lists are welcome.
- Promoting rule-only decisions (full gate is CI's, CI-red Friction) is required by step 5 but isn't "the decision unchanged" in the strict sense: the decision existed only in the rule. Unsure which instruction wins; I promoted.

## 8. Open questions

1. Dependabot: should ADR-0004 say that a bot merge under ADR-0003's ledger is outside the Human-only list (it bypasses `merge-pr.ts`), or should ADR-0003's row be narrowed? `.github/dependabot.yml:3`'s reason ("since they change `package.json`") applies to minor/patch bumps too.
2. Should test layout (homing, one e2e build) move to its own ADR or to `tests/README.md` alone? It is a "don't clean this up" decision, which is why it stayed.
3. The added edge case for presentation-only layer code comes from callers (ADR-0016, ADR-0025, ~22 comments), not ADR-0004's own text. Confirm it belongs here.

## 9. Lines

Old: 237. New: 147.
