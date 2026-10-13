# ADR-0004 rewrite report (v5)

Rewrite: `rewrites-v5/0004.md` (63 lines). Source unchanged since v4: last
commit on `docs/adr/0004-objective-safety-gate.md` and both rules is
e32f617ba. Re-verified this run: `scripts/gate.ts:17-62` (`FLOOR`, `HEAVY`,
`isInert`, `isSkillFile`, `decideScope`), `scripts/merge-pr.ts:166-188`
(`humanMergeRefusal` fails closed on an empty list; `prOriginRefusal` refuses
fork and non-Trusted authors), `shared/routing.ts:81` (`resolveSpaceRoute`).

v4's inventory, caller map, repoint/fix list, cross-ADR check and candidate
issues (`rewrites-v4/0004-report.md` §1–3, §5–6) still hold row for row. This
report lists only what v5 changes against them.

## 1. Inventory: changes from v4

All v4 rows keep their v4 section except:

| v4 row | Rule | v5 |
|---|---|---|
| 1, 2 | CI's run decides; full `pnpm gate` left to CI | Summary only. "Left to CI" is procedure: home is the summary rule and `pr-workflow.md` |
| 3–6 | L0–L3 | "What the gate checks", one line each. Dropped: drift checks in L0 (they are `FLOOR` steps, see `gate.ts`); "real browser"; L3's "keys unique, checked at expansion and resolution" (mechanics, `shared/expand.ts`, `shared/routing.ts`) |
| 7, 8 | Skip rules; same code for CI and local | "Skipping the slow steps". CI/local parity dropped: ADR-0026 owns it |
| 10, 11 | Review + gate before first push; later prose push may rely on CI | "Before the first push". Dropped: "even when the Stop hook asks" and "a code change runs `gate:scoped` first" (procedure; both in the summary rule and `pr-workflow.md`) |
| 12 | CI red after green `gate:scoped` → base drift, `major` Friction | Dropped from ADR: procedure. Home: summary rule today; propose `docs/agents/pr-workflow.md` |
| 13, 14 | Tests beside their code; e2e specs share one build | Moved to `tests/README.md` (already states both); See points there. The rejected "one e2e spec" alternative went with them |
| 20 | merge-pr reads list from `origin/main`, empty list refuses all | Kept only "refuses listed files, forks and authors without write access". `origin/main` and fail-closed are mechanics in `merge-pr.ts` (its doc comment says so) |
| 15–19, 21, 22, 9 | Merge exceptions, definitions, Human-only, Why, revisit | Unchanged in substance, fewer words |

## 2. Callers

Same outcomes as v4 §2, except C15 (one e2e build): now **elsewhere**,
`tests/README.md`. C17's CI-fail Friction half: **elsewhere**,
`pr-workflow.md` (or the summary rule as today).

## 3. Callers to repoint or fix

As v4 §3, with headings renamed: "Tests" → `tests/README.md` (callers citing
the e2e amendment should point there, not to ADR-0004); "Behaviour no test
covers", "Skipping the slow steps", "Human-only files" keep their names; "L1"
→ "What the gate checks".

## 4. Dropped (new in v5)

- Test layout and e2e build sharing: `tests/README.md`.
- CI-fail Friction step, "full gate left to CI", Stop-hook note: procedure,
  `pr-workflow.md` and the summary rule.
- L3 mechanics, drift checks, CI/local parity: `gate.ts`, `shared/`, ADR-0026.
- merge-pr's `origin/main` read and fail-closed empty list: `merge-pr.ts`.
- Rejected alternative "one e2e spec": goes with test layout.

## 5. Rule and cross-ADR check

Summary rule facts: every PR passes the gate (Summary); gate + review before
first push (S&L); later prose push may rely on CI (S&L); five exceptions (S&L
"Who merges"); merge-pr refuses (S&L "Enforcement"). Rule-only, procedure,
out of the ADR: Stop-hook note, full gate left to CI, CI-fail Friction,
`validate:content` for content edits. Home: `docs/agents/pr-workflow.md`.
Rule drift as in v4: the rule implies `merge-pr.ts` refuses all five
exceptions; it refuses only listed files, forks and Public authors.

Cross-ADR: unchanged from v4. One disagreement stands: ADR-0003's
`dependabot` row vs `package.json` on the Human-only list.

## 6. Candidate issues

As v4 §6. Add: confirm `tests/README.md` holds the "an e2e spec never
builds" invariant firmly enough to be its only home.

## 7. Format friction

- Getting under ~65 lines meant dropping test layout entirely. It was never
  part of the gate-or-merge decision, which supports v4's guess that it is a
  separate decision.
- ADR-0030 has no place for "procedure the summary rule states". Moving the
  CI-fail Friction and Stop-hook notes out leaves the rule ahead of its ADR
  until `pr-workflow.md` holds them.
- `(ADR-0020, ADR-0023)` sits at the end of its sentence but still in
  parentheses; a separate sentence cost a line.

## 8. Open questions

1. Dependabot vs `package.json` on the Human-only list (v4 Q1).
2. Is `tests/README.md` an acceptable sole home for the shared-e2e-build rule,
   or does it need its own ADR?
3. Confirm the presentation-only exception (`resolveSpaceRoute`) belongs here
   (v4 Q3).

## 9. Lines

Old: 237. v4: 93. v5: 63.
