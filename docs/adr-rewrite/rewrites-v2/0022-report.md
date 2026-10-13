# ADR-0022 rewrite report (v2)

Rewrite: `rewrites-v2/0022.md`. Sources read: ADR-0022, `.claude/rules/adr-0022.md`,
ADR-0030, ADR-0003, ADR-0023, ADR-0020 rule 2, `CONTEXT.md` (Trusted, Public,
Human-only, Retired terms), `auto-triage`, `wayfinder` and `clear-backlog`
Skills, `docs/agents/triage-labels.md`, expectations/refs/comparison for 0022,
background survey and session-log usage, v1 rewrite and report, git log of the
file (4444c9b, 517ac68, 828bfe2, 2401224).

## 1. Inventory

| # | Current rule | Source | Rewrite |
|---|---|---|---|
| 1 | `auto-triage` joins ADR-0003's chartered jobs; classification only, never writes code | Decision ¶1; Consequences b2 | Scope "A chartered classification job" |
| 2 | Fired by hand or on an interval (Routine or `/loop`) | Decision ¶1 | Scope (same bullet) |
| 3 | Composes `/triage`'s per-issue rules | Decision ¶1 | See (`triage` Skill) |
| 4 | `ready-for-agent` is ADR-0003's implementation green-light | Context; `triage-labels.md` | Scope "The standing green-light"; Why ¶2 |
| 5 | A Trusted user starting the sweep = standing green-light, within that run, for Trusted-authored issues | Decision "standing green-light" | Summary; Scope "The standing green-light" |
| 6 | The one relaxation; rest of green-light rule unchanged | Decision | Scope (same bullet) |
| 7 | Run-scoped, Trusted-scoped; "a sweep fired from a Public context grants nothing" (kept verbatim) | Consequences b3 | Scope "Run-scoped and Trusted-scoped" |
| 8 | Public-authored issues: may triage, route to `ready-for-human`, content untrusted | Decision bullet 2 | Scope "Public input goes to a human" |
| 9 | ADR-0023 a separate, additive exception | Decision see-also | Scope (same bullet) |
| 10 | `ready-for-agent` only when the repo determines a concrete, well-understood design | Decision bullet 3 | Scope "`ready-for-agent` needs a determined design" |
| 11 | Judgment-call list (irreversible op, governance/ADR decision, external access, subjective product/design) | Decision bullet 3 | Scope sub-bullet **judgment call** |
| 12 | Uncertainty list (undetermined behaviour, competing approaches, unverifiable claim) | Decision bullet 3 | Scope sub-bullet **design uncertainty** |
| 13 | Implementation latitude is not uncertainty | Decision bullet 3 | Scope (same bullet) |
| 14 | Close as `wontfix` only already-implemented and duplicate; out-of-scope reject → `ready-for-human` | Decision bullet 4 | Scope "Closes are objective" |
| 15 | Wayfinder: never a map, skip claimed/blocked, keep `wayfinder:*`, labels coexist | Decision ¶ wayfinder | Scope "Wayfinder tickets keep their own labels" |
| 16 | grilling/prototype → `ready-for-human`; research eligible | Decision ¶ wayfinder | Scope sub-bullets |
| 17 | `task` eligible only if body is agent-drivable per wayfinder's test, else judgment-call rule | Amendment 2026-07-16 (narrows Decision) | Scope sub-bullet; reversed "task → eligible" in Rejected alternatives |
| 18 | Resulting PRs merge like any other, ADR-0004 exceptions | Amendment 2026-10-10 (reverses Decision bullet 1) | Summary; Scope last bullet; reversed rule in Rejected alternatives |
| 19 | Labelling bounds unchanged by the merge change | Amendment 2026-10-10 | Implicit: Scope bullets unchanged |
| 20 | Two label sets on one issue: accepted cost; graduation deferred until noisy | Decision ¶ wayfinder; Consequences b4 | When to revisit |
| 21 | Why: backlog pressure; same shape as other chartered jobs; sweep only classifies; Trusted author is the prompt | Context | Why |
| 22 | Public comment on a Trusted issue is data; its ask goes to `ready-for-human`, never into a brief | `auto-triage/SKILL.md:74` (caller C9) | Scope "Public input goes to a human" (**added**) |
| 23 | Setting up the Routine/`/loop` counts as starting the sweep | Decision ¶1 (interval firing) read with "starting"; callers 0003:85, 0023:65 | Scope "Run-scoped and Trusted-scoped" (**added**, see Open questions) |

Dropped: see section 4.

## 2. Callers

| # | Item | Outcome |
|---|---|---|
| C1 | Trusted start = standing green-light, run-scoped | answered (rows 5, 7); Routine ambiguity resolved by row 23 |
| C2 | Trusted-authored backlog only; Public → `ready-for-human` | answered (rows 5, 8); phrase "Trusted-authored backlog" kept |
| C3 | Merge stays gated; ADR names the boundary | answered (row 18): PRs pass the Gate and merge like any other; "a human merges" part is stale |
| C4 | Judgment-call and uncertainty taxonomy | answered (rows 11, 12), as two named sub-bullets so "the judgment-call bullets and the uncertainty bullets" still resolves |
| C5 | "a sweep fired from a Public context grants nothing" | answered, verbatim (row 7) |
| C6 | Label = ADR-0003 green-light; fifth chartered remit; the one relaxation | answered (rows 1, 4, 6); "fifth remit" contradicted (retired remit list) |
| C7 | Why the relaxation is safe | answered (Why ¶2–3) |
| C8 | ADR-0023 additive, demo-scoped exception | answered (row 9) |
| C9 | Public comment on Trusted issue is data | added (row 22) |
| C10 | Governs the issue-triage files | elsewhere: interactive map's "Files and why" table; See lists the Skills and `triage-labels.md` |

## 3. Callers to repoint or fix

- `.agents/skills/auto-triage/SKILL.md:48`: "ADR-0022's Decision section … the judgment-call bullets and the uncertainty bullets" → "ADR-0022's *Scope and limits* (the judgment-call and design-uncertainty bullets)".
- `.agents/skills/auto-triage/SKILL.md:67-76`: restates the green-light, the Public rule and the Public-comment rule. Cut to the operative line plus "Bounds: ADR-0022, *Scope and limits*". The Public-comment rule now lives in the ADR.
- `.agents/skills/auto-triage/SKILL.md:90-97`: restates the wayfinder ticket-type mapping now in the ADR; could point to it (keep the blocked-ticket test, which is mechanics).
- `docs/adr/0003-agent-operating-model-and-governance.md:70-75`: "fifth chartered remit", "Merge stays gated". Stale; goes with ADR-0003's rewrite (v1 rewrite already points to ADR-0022 only).
- `docs/adr/0003-…:85`: "(as ADR-0022's is for triage)": still valid.
- `docs/adr/0023-guest-driven-demo-pipeline.md:37`: quote kept verbatim; no change.
- `docs/adr/0023-…:115`: "a Public issue is still not self-green-lit" restates C2; a pointer would do.
- `docs/agents/triage-labels.md:20-22`: points to the Skill's "standing green-light" section; repoint to ADR-0022.
- `layers/journal/app/utils/dashboard.ts:190`, `layers/journal/tests/unit/journal-dashboard.spec.ts:372-382`: title unchanged; no action.

## 4. Dropped

- Date, Status, both amendment banners, the ADR-0018 justification for appending: history (ADR-0030).
- Retired remit names `sync`/`consolidate`/`triage`/`codify` and "fifth": retired terms (`CONTEXT.md`).
- "No self-merge; a human still merges every resulting PR" and "a human still gates the build at merge" (Decision bullet 1, Consequences b1–b2): no longer true; kept only as a rejected alternative.
- Consequences b5 (merging this ADR, `/triage`'s refinement surface or CI is human-only): owned by ADR-0004 and its `adr-0004-human-merge.md` `paths`; partly stale (`.agents/skills/triage/` is not on that list).
- "Bravery" leading word: lives in the Skill's "Be brave" heading; the ADR keeps the bound ("determined design").
- Mechanics, all already in `auto-triage/SKILL.md`: eligibility scan, idempotency, full-sweep mode, blocked-ticket test, per-issue subagents, label-set replacement, roll-up, `needs-info` preference, `state_reason`, guest-pipeline timing gap. Nothing to move.

## 5. Rule and cross-ADR check

**Rule `.claude/rules/adr-0022.md`:**

| Rule fact | Rewrite |
|---|---|
| Trusted user starting `auto-triage` → standing green-light for that run | Summary; Scope bullets 2–3 |
| May label Trusted-authored issues `ready-for-agent` when the repo determines a concrete design | Summary; Scope bullets 2, 5 |
| Resulting PRs merge like any other; ADR-0004 names exceptions | Summary; Scope last bullet |
| Public-authored requests, judgment calls, real design doubt → `ready-for-human` | Summary; Scope bullets 4–5 |
| Close only duplicates and already-done work | Summary; Scope "Closes are objective" |

No rule-only decision, no drift. Hash needs re-stamping when the rewrite lands.

**Other ADRs:**

- ADR-0003 owns the green-light rule and the merge default. Current text agrees (2026-10-10 amendment). v1 rewrite (`docs/adr-rewrite/rewrites/0003.md:31-33`) lists the `auto-triage` standing green-light but its chartered-jobs ledger ("each a Skill … whose PRs have a known shape") has no `auto-triage` row, while this rewrite says `auto-triage` "joins ADR-0003's chartered jobs". **Disagreement**: see Open questions. No v2 ADR-0003 rewrite exists yet.
- ADR-0004 owns the merge exceptions: only pointed to.
- ADR-0020 owns Trusted/Public and rule 2: agrees (categorising always allowed; Public issue not moved to `ready-for-agent` without a Trusted green-light).
- ADR-0023 owns the guest exception: agrees; quotes this ADR's kept sentence and "run-scoped and Trusted-scoped" mirror.

## 6. Candidate issues

- Wayfinder tickets graduating out of the map into plain triage issues, if overlaid labels prove noisy (postponed, trigger in *When to revisit*).
- Every mechanism the ADR names exists (`auto-triage`, `triage`, `wayfinder` Skills; labels in `triage-labels.md`). Nothing decided but unbuilt.

## 7. Format friction

- **Reversed decisions as rejected alternatives.** Both "alternatives" were once the decision, not options weighed. The prompt says to put them there; the template's "each option and why we rejected it" fits awkwardly, since the why for the merge change is just "the owner's call".
- **Summary vs Scope duplication.** For a policy ADR the decision is its limits, so the summary is a compressed Scope; one fact, two homes inside one file. The template accepts this.
- **No Context section.** The problem statement (backlog pressure) and the tension (label = green-light) both land in *Why*, so Why opens with the problem rather than a reason.
- **A reason went stale, not just a rule.** The original safety argument was "a human still merges". After 2026-10-10 it rests on the Gate. I rewrote the reason to match the amendment; whether that counts as "decision unchanged" is a judgment.
- **Limits vs mechanics for wayfinder and the Public-comment rule.** Both read as procedure but narrow the grant, so per the prompt they stay in Scope. The blocked-ticket *test* stays in the Skill.

## 8. Open questions

1. **Is `auto-triage` a chartered job with a ledger row?** The ADR says it joins ADR-0003's charter; ADR-0003's ledger (current and v1 rewrite) has no row, and it opens no PRs. Either add a row ("labels, comments and closes issues; no PRs") or reword to "a standing classification job outside the ledger".
2. **Does a Routine count as "starting"?** The rewrite says setting up the Routine or `/loop` counts. This follows from the ADR firing on an interval and from 0003:85 / 0023:65, but the original never said it in words. Confirm.
3. **Is needing a human merge (ADR-0004) a reason to escalate?** Not in any source; a 2026-10-03 subagent escalated on it (comparison/0022.md). Left out; a one-clause decision if wanted.
4. Accept that the Why now rests on the Gate instead of a human merge?

## 9. Lines

131 → 90.
