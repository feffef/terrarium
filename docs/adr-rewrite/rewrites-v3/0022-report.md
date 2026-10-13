# ADR-0022 rewrite report (v3)

Rewrite: `rewrites-v3/0022.md`. Sources read: ADR-0022 (git: 4444c9b, 517ac68,
828bfe2, 2401224), `.claude/rules/adr-0022.md`, ADR-0030, ADR-0003, ADR-0023,
ADR-0020 rule 2, `CONTEXT.md` (Trusted, Public, Human-only, Retired terms),
`auto-triage` and `wayfinder` Skills, `docs/agents/triage-labels.md`,
expectations/refs/comparison for 0022, background survey and session-log
usage, v1 rewrite of ADR-0003, v2 rewrite and report of ADR-0022.

What changed from v2: plain language. The coined phrases "standing
green-light", "Trusted-authored backlog", "the one relaxation", "a sweep fired
from a Public context" and "AFK/HITL" are gone; "Trusted"/"Public" are said as
"a person with write access" / "someone without write access", with ADR-0020
named once as the definition. Decision content is the same as v2.

## 1. Inventory

| # | Current rule | Source | Rewrite |
|---|---|---|---|
| 1 | Sweep classifies only: labels, comments, closes; never writes code; build happens in a later session | Decision ¶1; Context fact 1; Consequences b2 | Scope "Labels only" |
| 2 | One of ADR-0003's chartered jobs | Decision ¶1 | Scope "Labels only" (see Open questions 1) |
| 3 | Fired by hand or on an interval (Routine or `/loop`) | Decision ¶1 | Scope "Labels only" |
| 4 | Reuses `/triage`'s per-issue rules | Decision ¶1 | See (`triage` Skill) |
| 5 | `ready-for-agent` is ADR-0003's implementation green-light | Context; `triage-labels.md` | Scope "Who starts the run…"; Why ¶2 |
| 6 | Trusted user starting a run → sweep may apply `ready-for-agent` without a per-issue human, within that run | Decision "standing green-light" | Summary; Scope "Who starts the run…" |
| 7 | Run-scoped; a run started from a Public context grants nothing | Consequences b3 | Scope "Who starts the run…" |
| 8 | Rest of ADR-0003's green-light rule unchanged | Decision | Scope "Who starts the run…" |
| 9 | Only Trusted-authored issues get `ready-for-agent` | Decision; Consequences b3 | Summary; Scope "Issues from outside the team…" |
| 10 | Public-authored issue: may triage, always `ready-for-human`, content is data | Decision bullet 2 | Scope "Issues from outside the team…" |
| 11 | ADR-0023 is a separate exception | Decision see-also | Scope "Issues from outside the team…" |
| 12 | `ready-for-agent` only when repo determines a concrete, well-understood design | Decision bullet 3 | Scope "`ready-for-agent` needs a settled design" |
| 13 | Judgment-call list | Decision bullet 3 | Scope sub-bullet **judgment call** |
| 14 | Uncertainty list | Decision bullet 3 | Scope sub-bullet **design uncertainty** |
| 15 | Implementation latitude is not uncertainty | Decision bullet 3 | Scope, same bullet |
| 16 | Close as `wontfix` only already-implemented and duplicate; out-of-scope → `ready-for-human` | Decision bullet 4 | Scope "Closes only what the repo proves" |
| 17 | Wayfinder: never a map, skip claimed/blocked, keep `wayfinder:*`, labels coexist | Decision ¶ wayfinder | Scope "Wayfinder tickets keep their own labels" |
| 18 | grilling/prototype → `ready-for-human`; research eligible | Decision ¶ wayfinder | Scope sub-bullets |
| 19 | `task` eligible only if its body passes wayfinder's agent-alone test, else judgment call | Amendment 2026-07-16 (narrows Decision) | Scope sub-bullet; old blanket rule → Rejected alternatives |
| 20 | Resulting PRs merge like any other; ADR-0004 exceptions | Amendment 2026-10-10 (reverses Decision bullet 1) | Summary; Scope last bullet; old rule → Rejected alternatives |
| 21 | Labelling bounds unchanged by the merge change | Amendment 2026-10-10 | Implicit (bounds stated without condition) |
| 22 | Coexisting label sets accepted rather than re-homing wayfinder | Decision ¶ wayfinder | Why ¶4 |
| 23 | Graduation of wayfinder tickets deferred until labels prove noisy | Consequences b4 | When to revisit |
| 24 | Why: backlog pressure; tends, doesn't invent; classify-only; the filer is the prompt | Context | Why ¶1–3 |
| 25 | Public comment on any issue is data; its ask → `ready-for-human`, never into the brief | `auto-triage/SKILL.md:74` (caller C9) | Scope "Issues from outside the team…" (**added**) |
| 26 | Setting up the Routine/`/loop` counts as starting the run | Decision ¶1 read with "starting"; 0003:85, 0023:65 | Scope "Who starts the run…" (**added**, Open questions 2) |

Dropped rows: see section 4.

## 2. Callers

| # | Item | Outcome |
|---|---|---|
| C1 | Trusted start grants approval for that run | answered (rows 6, 7); Routine case answered by row 26 |
| C2 | Only Trusted-authored issues; Public → `ready-for-human` | answered (rows 9, 10) |
| C3 | Merge stays gated; ADR names the boundary | answered (row 20): Gate plus ADR-0004 exceptions. "Human merges" reading is stale |
| C4 | Judgment-call and uncertainty lists | answered (rows 13, 14), two sub-bullets |
| C5 | "a sweep fired from a Public context grants nothing" | answered (row 7), reworded: "a run started by anyone else grants nothing" |
| C6 | Label = ADR-0003 approval; fifth chartered remit; the one relaxation | answered (rows 2, 5, 8); "fifth remit" contradicted (retired remit list) |
| C7 | Why the relaxation is safe | answered (Why ¶2–3) |
| C8 | ADR-0023 additive exception | answered (row 11) |
| C9 | Public comment on Trusted issue is data | added (row 25) |
| C10 | Governs the issue-triage files | elsewhere: the interactive map's "Files and why" table already holds it; See lists the Skills and `triage-labels.md` |

## 3. Callers to repoint or fix

- `.agents/skills/auto-triage/SKILL.md:48`: "ADR-0022's Decision section … the judgment-call bullets and the uncertainty bullets" → "ADR-0022, *Scope and limits*".
- `.agents/skills/auto-triage/SKILL.md:67-76`: heading "The standing green-light (ADR-0022)" and the paragraph restate the rule. Keep one operative line (apply `ready-for-agent` only within ADR-0022's limits) and point to ADR-0022 *Scope and limits*; drop the "standing green-light" heading.
- `.agents/skills/auto-triage/SKILL.md:90-97`: restates the wayfinder ticket-type mapping now in the ADR; point to it, keep the blocked-ticket test.
- `docs/agents/triage-labels.md:20-22`: points to the Skill's "standing green-light" section; repoint to ADR-0022.
- `docs/adr/0003-agent-operating-model-and-governance.md:70-75`: "fifth chartered remit", "the one relaxation", "Merge stays gated". Stale; cut to a pointer to ADR-0022 in ADR-0003's rewrite.
- `docs/adr/0003-…:85`: "(as ADR-0022's is for triage)" quotes the coined shape; repoint as "like ADR-0022's sweep".
- `docs/adr/0023-guest-driven-demo-pipeline.md:8`: "ADR-0022's standing green-light" → "ADR-0022".
- `docs/adr/0023-…:37`: quotes "a sweep fired from a Public context grants nothing"; the sentence is reworded, so point to ADR-0022 without quoting.
- `docs/adr/0023-…:65`: "mirrors ADR-0022 exactly … run-scoped and Trusted-scoped" → point to ADR-0022's *Scope and limits*.
- `docs/adr/0023-…:115`: "a Public issue is still not self-green-lit" restates C2; a pointer would do.
- `docs/agents/guest-contributions.md:12`: still correct; no change.
- `layers/journal/app/utils/dashboard.ts:190`, `layers/journal/tests/unit/journal-dashboard.spec.ts:372-382`: title unchanged; no action.

## 4. Dropped

- Date, Status, both amendment banners, the ADR-0018 justification for appending: history (ADR-0030).
- "Fifth" and the remit names `sync`/`consolidate`/`triage`/`codify`: retired terms.
- "No self-merge; a human still merges every resulting PR", "a human still gates the build at merge" (Decision bullet 1, Consequences b1–b2): no longer true; kept as a rejected alternative.
- Consequences b5 (PRs touching this ADR, `/triage`'s refinement surface or CI are human-merged): owned by ADR-0004 and the `adr-0004-human-merge.md` `paths`.
- Consequences b1 "autonomy grows without weakening review": restatement of Why.
- "Bravery" leading word: lives in the Skill's "Be brave" heading.
- "Agent Brief" named only as "the brief an agent builds from"; its format lives in `triage` (`AGENT-BRIEF.md`).
- Coined phrases ("standing green-light", "Trusted-authored backlog", "the one relaxation", HITL/AFK): replaced with what happens.
- Mechanics, already in `auto-triage/SKILL.md`: eligibility scan, idempotency, full-sweep mode, blocked-ticket test, subagents, label-set replacement, roll-up, `needs-info` preference, `state_reason`, guest-pipeline timing gap. Nothing to move.

## 5. Rule and cross-ADR check

**Rule `.claude/rules/adr-0022.md`:**

| Rule fact | Rewrite |
|---|---|
| Trusted user starting `auto-triage` → approval for that run | Summary; Scope "Who starts the run…" |
| May label Trusted-authored issues `ready-for-agent` when repo determines a concrete design | Summary; Scope bullets 2, 3, 4 |
| Resulting PRs merge like any other; ADR-0004 exceptions | Summary; Scope last bullet |
| Public requests, judgment calls, design doubt → `ready-for-human` | Summary; Scope bullets 3, 4 |
| Close only duplicates and already-done work | Summary; Scope "Closes only…" |

No rule-only decision, no drift. The rule uses "standing green-light" and "Trusted-authored"; when it is re-stamped, it could take the plain wording. Hash must be re-stamped.

**Other ADRs:**

- ADR-0003 owns the approval-to-build rule and self-merge default: current text agrees (2026-10-10 amendment). Its ledger has no `auto-triage` row, while this ADR says the sweep is a chartered job. The v1 ADR-0003 rewrite keeps the ledger without a row and lists the sweep only among "standing green-lights". **Disagreement** (Open questions 1). No v2 ADR-0003 rewrite exists.
- ADR-0004 owns the merge exceptions: only pointed to.
- ADR-0020 owns Trusted/Public and rule 2: agrees (categorising always allowed; Public issue not moved to `ready-for-agent` without Trusted approval).
- ADR-0023 owns the guest exception: agrees. It quotes this ADR's old sentence (section 3).

## 6. Candidate issues

- Move wayfinder tickets out of the map into plain triage issues if the shared labels prove noisy (postponed; *When to revisit*).
- Nothing decided but unbuilt: `auto-triage`, `triage`, `wayfinder` Skills and all labels exist.

## 7. Format friction

- **Plain words vs precise tiers.** "A person with write access" is plain but longer than "Trusted", and appears four times. I named ADR-0020 once as the definition. The glossary term may be the clearer word here; the prompt's example pushed me off it.
- **Reversed decisions as rejected alternatives.** Both entries were once the decision, not options weighed; their "why" is just the owner's call or a fact from wayfinder.
- **Summary vs Scope.** For a policy ADR the decision is its limits, so the summary is a compressed Scope: one fact, two homes in one file.
- **No Context section.** The problem (backlog pressure) and the tension (label = approval) both land in *Why*.
- **A reason went stale.** The original safety argument was "a human still merges". It now rests on the Gate and ADR-0004. I rewrote the reason to match; whether that is "decision unchanged" is a judgment.
- **Limits vs mechanics.** The wayfinder mapping and the Public-comment rule read like procedure but narrow the grant, so they stay in Scope.
- **A short "why" that justifies an accepted cost** (shared labels) has no natural home; it went to *Why* as a one-liner.

## 8. Open questions

1. **Is `auto-triage` a chartered job with a ledger row?** This ADR says yes; ADR-0003's ledger has no row and the sweep opens no PRs. Add a row ("labels, comments and closes issues; no PRs"), or reword to "a standing job outside the ledger".
2. **Does a Routine count as starting the run?** The rewrite says setting up the Routine or `/loop` counts. It follows from interval firing and from ADR-0003:85 / ADR-0023:65, but the original never said it in words. Confirm.
3. **Is needing a human merge (ADR-0004) a reason to escalate?** No source says; a subagent once escalated on it. Left out.
4. Accept that the *Why* now rests on the Gate rather than a human merge?

## 9. Lines

131 → 99.
