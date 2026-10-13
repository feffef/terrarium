# ADR-0004 rewrite report (v4)

Rewrite: `rewrites-v4/0004.md`. Read this run: ADR-0030, ADR-0004 (HEAD
e32f617ba, unchanged since v3), `.claude/rules/adr-0004.md`,
`.claude/rules/adr-0004-human-merge.md`, the callers' checklist
(`expectations/0004.md`, `.yml`), the background survey and session-log notes
for 0004, the v2 and v3 rewrites and reports, `rewrites-v2/0022.md`, and the
ADR-0004 lines of 0003, 0005, 0020, 0023, 0026. Checked against
`scripts/gate.ts:17-62` (`FLOOR`, `HEAVY`, `isInert`, `isSkillFile`,
`decideScope`), `scripts/merge-pr.ts:166-188`, `.github/actions/gate/action.yml`
(scope step, `skip_heavy`/`skip_build` guards), `docs/agents/pr-workflow.md`,
`docs/agents/guards.md:45-47`.

Changes from v3: cut from 146 to ~93 lines; plain words replace glossary
terms the brief names ("the gate", "the slow steps", "a change that can't
affect them" instead of Gate, Heavy, Floor, Inert, Full gate); five layer
sub-bullets folded into one bullet; Consequences section dropped; Why trimmed
to reasons that still bear on a decision; merge enforcement split into its own
bullet. Decision unchanged.

## 1. Inventory: current rules → section

| # | Rule today | Source | Rewrite section |
|---|---|---|---|
| 1 | Every PR passes the gate; CI's run decides | Decision; CONTEXT "Gate" | Summary; S&L "CI's run counts" |
| 2 | `gate:scoped` locally; full `pnpm gate` left to CI | summary rule only (decision, promoted) | S&L "CI's run counts" |
| 3 | L0: manifests validate, app builds, lint, typecheck, drift checks | Decision L0, "generator" corrected (07-10; ADR-0013/0014); action.yml | S&L "Four layers" |
| 4 | L1: Documents match Collection schemas; the build validates nothing | Decision L1 + 07-11 correction | S&L "Four layers"; build-as-validator → Rejected |
| 5 | L2: every Tenant/Space entry route loads in a real browser, no console errors | Decision L2; `tests/e2e/smoke.spec.ts` | S&L "Four layers" |
| 6 | L3: isolation; keys unique and scoped, checked at expansion and resolution | Decision L3; `shared/expand.ts`, `shared/routing.ts` | S&L "Four layers" |
| 7 | Slow steps (test, build, e2e) skipped only when no changed file can affect them; any doubt runs all; same code for CI and local | 10-03; `gate.ts:17-62`; action.yml scope step | S&L "Skipping the slow steps" |
| 8 | Skill files (`.agents/skills/`, `.claude/workflows/`) skip build + e2e only; nothing built or e2e-loaded may live there | 10-12 (#1603) + ADR-0005 widening (10-13); `gate.ts:29-33` | S&L "Skipping the slow steps" |
| 9 | Revisit if CI passes an all-skip PR the full gate would fail | 10-03 | When to revisit |
| 10 | `gate:scoped` + `code-review` before first push, even if Stop hook asks | 10-12 (#1853); rule | S&L "Before the first push"; reason → Why |
| 11 | Later push: prose/docs may rely on CI; code runs `gate:scoped` | 10-12 (#1853) | S&L "Before the first push" |
| 12 | CI red after green `gate:scoped` → check base drift, log `major` Friction | summary rule only (CONTEXT:144 relies on it) | S&L "CI fails after…" |
| 13 | Tests live with their code | 07-07; 10-12 (#1603) | S&L "Tests" |
| 14 | e2e specs share one build; a spec never builds | 10-12 (supersedes 07-07) | S&L "Tests"; 07-07 shape → Rejected |
| 15 | Agents self-merge on green; five exceptions | 10-10 (#1741), 07-06, ADR-0020 amendment, ADR-0023 | Summary; S&L "Who merges" |
| 16 | Meaning and examples of "behaviour no test covers" | 07-30 | S&L "Behaviour no test covers" |
| 17 | Presentation-only layer code via `resolveSpaceRoute` is not "Tenant reach" | callers only (ADR-0016:37, ADR-0025:124, ~22 comments) | S&L "Which Tenant's data…" (added) |
| 18 | Human-only list = rule `paths`, only home; what kind of file belongs | 10-10; 07-10; Decision "High-risk"; ADR-0025/0026 amendments | S&L "Human-only files" (criterion, not enumeration) |
| 19 | Human-only limits merging, not editing | ADR-0026 "not a security hole"; CONTEXT "Human-only" | S&L "Human-only files" |
| 20 | merge-pr reads list from `origin/main`; refuses listed paths; empty list refuses all; refuses fork/Public; other exceptions rely on the agent | 10-10; `merge-pr.ts:166-188` | S&L "What is enforced" |
| 21 | Autonomy needs automated checks; the one place not minimal | Context | Why |
| 22 | Gate checks output, not intent; blind to some risks | ADR-0020 Context; CONTEXT "Gate" | Why |
| — | Low-risk auto-merge tier; 07-19 "ordinary PR always human-merged" | Decision; 07-19 | reversed by 10-10 → Rejected alternatives |
| — | Two amendments re-listing paths went stale | 07-10 | Rejected alternatives |
| — | Rollout (L0+L1+L3 day one, L2 later); "L3 before autonomous consolidation" | Decision; Consequences | dropped: history |
| — | "generator produces content.config.ts" | Decision L0 | dropped: no longer true (ADR-0013/0014) |
| — | gate.yml L1 step landing (#323); `workflow` OAuth scope | 07-11 | dropped: history; scope fact is ADR-0026's |
| — | action.yml and ADR-0025 files join the list | 08-06, 07-22 | folded into the rule's `paths` |
| — | Strict schemas do double duty (contract + L1) | Consequences | dropped: obvious once L1 is stated |
| — | Classifier and merge files are themselves Human-only | Consequences | dropped: covered by "weaken the gate or the merge rules" criterion, and they are on the list |
| — | `gate-scope.spec.ts` tripwire catches imports, not new build reads | 10-12 (#1603) | dropped from ADR: test detail; home is the spec's own header and `tests/README.md` |
| — | Skill-file safety argument (build reads `.agents/skills/` only to list `SKILL.md` folders) | 10-12 | moved: `scripts/gate.ts` comment at `isSkillFile` (repoint target, §3) |
| — | Inert set definition (`.md` outside `layers/`, `.claude/skills/`), doubt cases (no base, shallow, failed decision, empty, push to main) | 10-03 | moved: `scripts/gate.ts` `isInert`/`decideScope` and action.yml comments, already there |
| — | One list doing two jobs (warning + refusal) | 10-10 | dropped: ADR-0029 owns how rules load |
| — | Per-spec SQLite, `globalSetup`, `setupL2()`, freshness check | 10-12 | moved: `tests/README.md`, `tests/support/e2e.ts`, already there |
| — | Tests homed with code: "legible, grows per Tenant" reason | 07-07 | dropped: obvious |
| — | `validate:content` for content-only edits | summary rule | procedure; stays in the rule, also `pr-workflow.md` |
| — | ADR-0005 banner: "the build reads only `.claude/rules/*.md`" | 10-13 | dropped: not verified (v3 grep found no reader) |

## 2. Callers' checklist

| id | Outcome | Note |
|---|---|---|
| C1 who merges | answered | row 15; conflict settled (self-merge + exceptions) |
| C2 merge not edit | answered | row 19 |
| C3 list home | answered | rows 18, 20 |
| C4 which surfaces | answered (criterion) + elsewhere | enumeration lives in the rule's `paths` |
| C5 presentation-only layer code | added | row 17 |
| C6 dependency | answered | "adds a dependency"; `package.json` is on the list. Dependabot conflict → §8 Q1 |
| C7 untested behaviour; gate blind by design | answered | rows 16, 22 |
| C8 unattended-hook reviewability | elsewhere | `docs/agents/guards.md:45-47`; See points there |
| C9 Public/fork/guest | answered | rows 15, 20 |
| C10 Tenant reach | answered | rows 15, 17 |
| C11 L0–L3 | answered | rows 3–6; labels kept (code cites them) |
| C12 objective; CI authoritative | answered | rows 1, 22 |
| C13 Floor/Heavy, Inert, local decides same | answered in substance | row 7; terms replaced by plain words, mechanics in `gate.ts` |
| C14 Skill files skip build+e2e | answered | row 8 |
| C15 one e2e build | answered | row 14 |
| C16 `workflow` scope / drift history | elsewhere | ADR-0026 |
| C17 gate:scoped before push; CI-fail Friction | answered | rows 10, 12 |
| C18 every PR passes | answered | row 1 |
| C19 orthogonal axes | answered in substance | Why bullet on what a path can't show; "blast-radius" dropped |
| C20 advisory checks outside CI | contradicted | ADR-0004 says nothing on this; fix caller |

## 3. Callers to repoint or fix

Repoint (cite ADR-0004, or a *Scope and limits* lead-in, without quoting):

| file:line | change |
|---|---|
| `scripts/gate.ts:29`, `.github/actions/gate/action.yml:91`, `docs/adr/0005-skill-model.md:19` | "2026-10-12 amendment" → "ADR-0004 (Skipping the slow steps)"; gate.ts should keep the build-reads-only-SKILL.md-folders reason itself, since the ADR no longer holds it. Both scripts Human-only |
| `tests/README.md:3` | drop the amendment quote → "ADR-0004 (Tests)" |
| `tests/README.md:24` | → "ADR-0004 (Skipping the slow steps)" |
| `tests/support/e2e.ts:6`, `tests/e2e/smoke.spec.ts:12`, `layers/{atlas,blog,marquee,midden}/tests/e2e/*.spec.ts:2`, `layers/commons/tests/e2e/commons.spec.ts:4`, `layers/journal/tests/e2e/journal.spec.ts:7` | "ADR-0004 amendment" → "ADR-0004 (Tests)" |
| `scripts/validate-content.ts:32` | "ADR-0004 amendment" → "ADR-0004 (L1)" |
| `scripts/double-background-guard.ts:23`, `scripts/skill-inline-guard.ts:8`, `scripts/workflow-edit-guard.ts:10`, `scripts/loop-only-tool-guard.ts:17` | "2026-07-30 amendment" → "ADR-0004 (Behaviour no test covers)"; reviewability → `docs/agents/guards.md`. All Human-only |
| `.agents/skills/frictions-to-fixes/SKILL.md:286,288` | → "ADR-0004 (Behaviour no test covers)" |
| `docs/adr/0003-…:99` | "ADR-0004's 2026-10-10 amendment" → "ADR-0004" |
| `docs/adr/0026-…:15,25` | drop "ADR-0004's 2026-07-11 amendment"; ADR-0026 holds the scope fact |
| `docs/adr/0020-…:156` | "amending note" → plain pointer |
| `docs/agents/pr-workflow.md:75` | "(ADR-0003/0004)" for chartered tiers → ADR-0003 |
| `CONTEXT.md:269-286` (Gate, Floor, Heavy, Full gate), `.github/actions/gate/action.yml:2` | still accurate as code names; the ADR no longer uses them, so the glossary is their only home. No change needed unless the glossary wants to point at `gate.ts` instead of ADR-0004 |

Fix (stale or wrong):

| file:line | change |
|---|---|
| `.github/workflows/gate.yml:5`, `docs/adr/0026-…:64-65` | "high-risk set", "never auto-merged by any chartered-Skill tier" → "Human-only (ADR-0004)" |
| `docs/adr/0020-…:41,111,121` | "blast-radius tier", "low-risk auto-merge tier" stale: ADR-0004 names exceptions, not tiers |
| `docs/adr/0006-…:50` | "blast-radius policy" → "Human-only list" |
| `docs/adr/0019-…:108,111` | "escalation axes", "named high-risk file list" → ADR-0004's exceptions / the rule's `paths` |
| `docs/adr/0024-…:91` | "ADR-0004's workflow scope" → ADR-0026 |
| `docs/proposals/README.md:32` | CI running a stale subset → ADR-0026 |
| `scripts/check-conflicting-issues.ts:15` | miscite: drop "ADR-0004's human-only boundary" |
| `scripts/validate-content-refs.ts:17` | "ADR-0004 gap" → "a gap L1's schemas can't see (ADR-0004)" |
| `.github/dependabot.yml:3` | reason "since they change `package.json`" applies to minor/patch too; §8 Q1 |
| `docs/adr/0023-…:83,96`, `docs/adr/0025-…:177`, `.agents/skills/guest-build/SKILL.md:81,83`, `.agents/skills/frictions-to-fixes/SKILL.md:230` | repeats of list or exceptions → pointers |
| `docs/adr/0003-…:148`, `docs/adr/0022-…:35,58` | stale "human merges every PR"; fixed by those rewrites |
| `scripts/subagent-background-guard.ts:11`, `tests/unit/skill-inline-guard.spec.ts:6` | "reviewability bar" is a phrase the ADR no longer uses → `docs/agents/guards.md` |

## 4. Dropped

- Amendment banners, dates, Status line, PR and issue numbers: history (git).
- Rollout plan; "L3 before autonomous consolidation": history.
- "Generator" wording: no longer true.
- 07-11 gate.yml / `workflow` scope narrative: history; ADR-0026 owns the fact.
- 07-19 per-Skill merge list: superseded; ADR-0003 ledger and `pr-workflow.md`.
- Glossary terms Floor, Heavy, Inert, Full gate: replaced by plain words per the brief; the exact sets live in `scripts/gate.ts` and CONTEXT.md.
- The list of doubt cases (no base, shallow, failed decision, empty, push to main): `scripts/gate.ts` `decideScope` and action.yml comments.
- Skill-file safety argument: should stay in `scripts/gate.ts`'s `isSkillFile` comment (today it points to the amendment).
- e2e mechanics: `tests/README.md`, `tests/support/e2e.ts`.
- Consequences (schemas double duty; classifier files Human-only; gate-scope tripwire): obvious, covered, or test detail.
- Concurrency and "L0–L2 can't observe" wording in the untested-behaviour examples: folded into "timing or ordering" and "an effect outside the app".
- "Blast-radius", "high-risk set", "escalation axes", "reviewability bar": coined phrases.

## 5. Rule and cross-ADR check

`.claude/rules/adr-0004.md`, fact by fact:

| Rule fact | Rewrite |
|---|---|
| Every PR passes the gate | Summary; S&L "CI's run counts" |
| `gate:scoped` + `code-review` before first push, even when Stop hook asks; skips in pr-workflow.md | S&L "Before the first push"; skips via See |
| Later prose/docs push may rely on CI; code runs `gate:scoped` | S&L "Before the first push" |
| Leave full `pnpm gate` to CI | S&L "CI's run counts" (promoted) |
| CI fail after green `gate:scoped` → base drift, `major` Friction | S&L "CI fails after…" (promoted) |
| `validate:content` takes seconds for a content-only edit | procedure: not in ADR; home `docs/agents/pr-workflow.md` |
| Five exceptions | Summary; S&L "Who merges" |
| Human-merge rule loads on touch; `merge-pr.ts` refuses | S&L "Human-only files", "What is enforced" |

Rule drift: the rule says `merge-pr.ts` "refuses to merge it" after naming all
five exceptions. It refuses only listed paths and fork/Public PRs
(`merge-pr.ts:171-188`). The rewrite states it exactly.

`.claude/rules/adr-0004-human-merge.md`: agrees.

Facts other ADRs own:
- Self-merge on green (ADR-0003, 10-10 amendment): agrees.
- Fork/Public PRs merged by a person (ADR-0020 rule 3): agrees; ADR-0020's tier wording stale (§3).
- Guest PRs (ADR-0023): ADR-0023 narrows the merger to the owner. The rewrite says a person with write access merges, then names ADR-0020 and ADR-0023 as owning those cases. Consistent.
- Pushing opens the PR (ADR-0003): agrees.
- Steps in the composite action, CI parity (ADR-0026): agrees.
- Workflow scripts are Skill files (ADR-0005): agrees.
- Presentation-only layer code (ADR-0016, ADR-0025): agrees.
- `rewrites-v2/0022.md:49,70`: agrees.
- **Disagreement:** ADR-0003's `dependabot` ledger row lets a bot merge npm minor/patch PRs, which change `package.json`, a listed Human-only file. Not built (proposal #1633). §8 Q1.

## 6. Candidate issues

- Repoint the ~25 citations of dated ADR-0004 amendments (§3), and move the Skill-file safety reason into `gate.ts`'s own comment.
- Dependabot auto-merge (#1633) is decided in ADR-0003 but not built; it would collide with `package.json` on the Human-only list.
- No mechanical check for "behaviour no test covers" or "Tenant reach"; "adds a dependency" is covered by `package.json` on the list.
- Verify or drop ADR-0005's "the build reads only `.claude/rules/*.md`".

## 7. Format friction

- **Length.** 93 lines vs the 40–70 target. The ADR holds two linked decisions (what the gate checks, and who merges) plus a "don't clean this up" test-layout rule, and it is the most-cited ADR, read for limits. Cutting further would drop the untested-behaviour examples or the enforcement split, which are exactly what agents open it for. A split (gate vs merge exceptions) would bring each half inside 70; the brief forbids it.
- **Plain words vs identifiers.** The brief wants "the slow steps", not Heavy. But `action.yml`, `gate.ts` and CONTEXT.md use Floor/Heavy/Inert as names. Plain words read better in the ADR; an agent grepping "Heavy" now lands in CONTEXT.md, not here. Acceptable, but ADR-0030 gives no rule for glossary terms that are also code names. L0–L3 I kept, since code comments cite them as labels.
- **Summary vs test layout.** The summary covers the decision in three sentences only by leaving out test layout, which suggests it is a separate decision.
- **Promoting rule-only decisions** (full gate left to CI; CI-red Friction) changes the ADR's text, though not the decision in force. Promoted per step 5.
- **Cross-refs at sentence end** forced the ADR-0020/ADR-0023 pointer into its own sentence after the exceptions list, which reads slightly awkwardly.

## 8. Open questions

1. Dependabot: should a bot merge under ADR-0003's ledger sit outside the Human-only list, or should ADR-0003's row narrow? `.github/dependabot.yml:3`'s reason applies to minor/patch bumps too.
2. Should test layout (tests beside their code; one e2e build) leave this ADR for `tests/README.md` or its own ADR?
3. The presentation-only edge case comes from callers (ADR-0016, ADR-0025, ~22 comments), not ADR-0004's own text. Confirm it belongs here.

## 9. Lines

Old: 237. New: 93.
