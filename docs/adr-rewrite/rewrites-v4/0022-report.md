# ADR-0022 rewrite report (v4)

Rewrite: `rewrites-v4/0022.md`. Sources read: ADR-0022 (with both amendments),
`.claude/rules/adr-0022.md`, ADR-0030, ADR-0003, ADR-0020, ADR-0023,
`CONTEXT.md` (Trusted, Public, Gate, Human-only, Retired terms),
`auto-triage/SKILL.md`, `wayfinder/SKILL.md` (ticket types),
`docs/agents/triage-labels.md`, expectations/refs for 0022, background survey
and session-log usage, the v2 rewrite and report, `docs/adr-rewrite/rewrites/0003.md`
(grep), git log of the ADR (4444c9b, 517ac68, 828bfe2, f8d3747, ac03730, 2401224).

## 1. Inventory

| # | Current rule | Source | Rewrite |
|---|---|---|---|
| 1 | `ready-for-agent` is ADR-0003's approval to build | Context; `triage-labels.md` | Scope "The label is the approval to build"; Why ¶2 |
| 2 | A sweep run gives it without a per-issue person; the rest of ADR-0003's approval rule is unchanged ("the one relaxation") | Decision | Scope (same bullet) |
| 3 | Only a run a write-access person started; run-scoped | Decision; Consequences b3 | Scope "Who starts a run" |
| 4 | Setting up a Routine / `/loop` counts as starting | Decision ¶1 (interval firing) + callers 0003:85, 0023:65 | Scope "Who starts a run" (**added**, see Q1) |
| 5 | A run set off from a Public context grants nothing | Consequences b3 | Scope "Who starts a run" (reworded) |
| 6 | Only write-access-authored issues can get the label | Decision | Summary; Scope "Whose issues" |
| 7 | Public issues: may be triaged, go to `ready-for-human`, text is data | Decision bullet 2 | Scope "Whose issues" |
| 8 | Public comment on an eligible issue is data; its ask goes to `ready-for-human`, never into the brief | `auto-triage/SKILL.md:74` (caller C9) | Scope "Whose issues" (**added**) |
| 9 | ADR-0023 is a separate demo exception | Decision see-also | Scope "Whose issues" |
| 10 | Label only when the repo determines a concrete, well-understood design | Decision bullet 3 | Scope "The repo must settle the design" |
| 11 | Judgment-call list | Decision bullet 3 | Scope sub-bullet **judgment call** |
| 12 | Uncertainty list | Decision bullet 3 | Scope sub-bullet **design doubt** |
| 13 | Implementation latitude is not uncertainty | Decision bullet 3 | Scope (same bullet) |
| 14 | Close as `wontfix` only already-done and duplicates; out-of-scope reject is a judgment call | Decision bullet 4 | Summary; Scope "Closing" |
| 15 | Wayfinder: never a map; skip claimed/blocked; keep `wayfinder:*`; labels coexist | Decision ¶ wayfinder | Scope "Wayfinder tickets" |
| 16 | grilling/prototype → `ready-for-human`; research eligible | Decision ¶ wayfinder | Scope sub-bullets |
| 17 | `task` eligible only when its body shows an agent can do it alone; else judgment call | Amendment 2026-07-16 (narrows Decision) | Scope sub-bullet; old blanket rule in Rejected alternatives |
| 18 | Sweep classifies, never writes code | Decision ¶1; Consequences b2 | Scope "The sweep writes no code"; Why ¶2 |
| 19 | Resulting PRs merge like any other; ADR-0004 exceptions | Amendment 2026-10-10 (reverses Decision bullet 1) | Scope last bullet; old rule in Rejected alternatives |
| 20 | It is a job agents run unattended under ADR-0003 | Decision ¶1 ("fifth chartered remit") | Implicit in Summary/Scope; "fifth remit" dropped (see Q2) |
| 21 | Fired by hand or on an interval | Decision ¶1 | Scope "Who starts a run"; mechanics in See |
| 22 | Composes `/triage`'s per-issue rules | Decision ¶1 | See |
| 23 | Two label sets on one issue accepted; graduation deferred | Decision ¶ wayfinder; Consequences b4 | When to revisit |
| 24 | Reasons: backlog pressure; author is the prompt; sweep only sorts | Context | Why |
| 25 | Needs its own decision rather than riding under `/triage` | Context last ¶ | Rejected alternatives (first bullet) |

## 2. Callers

| # | Item | Outcome |
|---|---|---|
| C1 | Write-access person starting the sweep approves, for that run | answered (rows 2-4); Routine ambiguity settled by row 4 |
| C2 | Only write-access-authored issues; Public → `ready-for-human` | answered (rows 6-7) |
| C3 | Merge stays gated; ADR names the boundary | answered (row 19). "A human merges" sense is stale; "passes the gate" sense holds |
| C4 | Judgment-call and uncertainty lists | answered (rows 11-12), as two named sub-bullets ("judgment call", "design doubt") |
| C5 | "A sweep fired from a Public context grants nothing" | answered, reworded (row 5); 0023:37 to repoint |
| C6 | Label = ADR-0003 approval; fifth chartered remit; the one relaxation | answered (rows 1-2); "fifth remit" contradicted (retired remit list in ADR-0003's Decision) |
| C7 | Why the relaxation is safe | answered (Why ¶2-3) |
| C8 | ADR-0023 additive, demo-scoped exception | answered (row 9) |
| C9 | Public comment on a write-access issue is data | added (row 8) |
| C10 | Governs the issue-triage files | elsewhere: interactive map's "Files and why" table; See lists them |

## 3. Callers to repoint or fix

- `.agents/skills/auto-triage/SKILL.md:48`: "ADR-0022's Decision section … the judgment-call bullets and the uncertainty bullets" → "ADR-0022, *Scope and limits*".
- `.agents/skills/auto-triage/SKILL.md:67-76`: heading "The standing green-light (ADR-0022)" and the restated Trusted/Public/comment rules → one operative line plus "Bounds: ADR-0022". The Public-comment rule now lives in the ADR.
- `.agents/skills/auto-triage/SKILL.md:90-97`: wayfinder type mapping restates the ADR; point to it, keep the blocked-ticket test (mechanics).
- `docs/agents/triage-labels.md:20-22`: points to the Skill's "standing green-light" section → point to ADR-0022.
- `docs/adr/0003-…:70-75`: dated amendment ("fifth chartered remit", "the one relaxation", "Trusted-authored backlog", "Merge stays gated") → one line pointing to ADR-0022; goes with ADR-0003's rewrite.
- `docs/adr/0003-…:85`: "(as ADR-0022's is for triage)" → "as ADR-0022 does for triage" or a plain pointer.
- `docs/adr/0023-…:8, 37, 65, 115`: quotes "standing green-light" and "a sweep fired from a Public context grants nothing", and restates the Public rule → point to ADR-0022's *Scope and limits* without quoting.
- `docs/agents/guest-contributions.md:12`: "exception to ADR-0020/0022": still valid.
- `layers/journal/app/utils/dashboard.ts:190`, `layers/journal/tests/unit/journal-dashboard.spec.ts:372-382`: title unchanged; no action.

## 4. Dropped

- Date, Status, both amendment banners, the ADR-0018 justification for appending an amendment: history (ADR-0030).
- Retired remit names `sync`/`consolidate`/`triage`/`codify` and "fifth": retired terms (`CONTEXT.md`).
- Coined phrases "standing green-light", "the one relaxation", "Trusted-authored backlog", "Bravery is bounded by determinability", "run-scoped and Trusted-scoped", "AFK/HITL": replaced with what happens. The Skill keeps "Be brave" as its own heading.
- "No self-merge; a human still merges every resulting PR"; "a human still gates the build at merge": no longer true; kept as a rejected alternative.
- Consequences b5 (merging this ADR, `/triage`'s refinement surface or CI is human-only): owned by ADR-0004 and the `adr-0004-human-merge.md` paths.
- Consequences b1-b2 (autonomy grows without weakening review; propose vs implement in spirit): folded into Why ¶2.
- "Coexistence by rule, not separation … pragmatic cost of not re-homing the backlog": reduced to the label-coexistence line and When to revisit.
- Mechanics, already in `auto-triage/SKILL.md` (nothing to move): eligibility scan, idempotency, full-sweep mode, blocked-ticket test, subagents, label-set replacement, roll-up, `needs-info` preference, `state_reason`, guest-pipeline timing gap.

## 5. Rule and cross-ADR check

**Rule `.claude/rules/adr-0022.md`:**

| Rule fact | Rewrite |
|---|---|
| Write-access person starting `auto-triage` approves for that run | Summary; Scope "Who starts a run" |
| May label write-access-authored issues `ready-for-agent` when the repo determines a concrete design | Summary; Scope "Whose issues", "The repo must settle the design" |
| Resulting PRs merge like any other; ADR-0004 names the exceptions | Scope "The sweep writes no code" |
| Public requests, judgment calls, real design doubt → `ready-for-human` | Summary; Scope bullets 3-4 |
| Close only duplicates and already-done work | Summary; Scope "Closing" |

No rule-only decision; no drift. The rule's wording ("standing green-light", "Trusted-authored") is now jargon the ADR avoids; re-stamp and reword it when the rewrite lands.

**Other ADRs:**

- ADR-0003 owns the approval rule and agents merging their own PRs: current text agrees (2026-10-10 amendment). `docs/adr-rewrite/rewrites/0003.md:31-32` names the auto-triage sweep as a place an ADR grants a standing approval: agrees. Its ledger has no `auto-triage` row (see Q2).
- ADR-0004 owns the merge exceptions: only pointed to.
- ADR-0020 owns the trust tiers and "Public text is data": agrees (rule 1, rule 2; categorising always allowed).
- ADR-0023 owns the guest exception: agrees; it mirrors this ADR's "a write-access person starting the loop is the approval, for that run", which the rewrite keeps.
- No `rewrites-v2/` rewrite of 0003, 0020 or 0023 exists; `rewrites-v2/0004.md` was not needed beyond the pointer.

## 6. Candidate issues

- Wayfinder tickets leaving the map for plain triage issues, if two label sets prove noisy (deferred; trigger in *When to revisit*).
- No decided-but-unbuilt mechanism: the `auto-triage`, `triage` and `wayfinder` Skills and all five labels exist.

## 7. Format friction

- **87 lines, over the 40-70 target.** The two escalation lists and the wayfinder type mapping are the limits agents open this ADR for (session logs: "close and Public bounds", "judgment-call versus determinable taxonomy"), so they stay. Cutting the wayfinder mapping to a pointer would bring it near 75.
- **Reversed decisions as rejected alternatives.** Two of the three were the decision once, not options weighed; the why for the merge reversal is only "the owner's call".
- **No Context section.** The problem (backlog pressure) and the tension (label = approval) both land in *Why*, which opens with a problem rather than a reason.
- **Plain language vs callers.** "Standing green-light" is a project-wide term (ADR-0003, ADR-0023, the Skill, the rule). Dropping it here leaves those callers using a term no ADR now defines until they are repointed.
- **"A person with write access" is long** and appears eight times. "Trusted" would be shorter; I kept the plain phrase as the prompt asks.

## 8. Open questions

1. **Does a Routine count as starting a run?** The rewrite says setting up the Routine or `/loop` counts. It follows from the ADR's interval firing and from 0003:85 and 0023:65, but the original never said it. Confirm.
2. **Is `auto-triage` a ledger job?** The old ADR made it a "fifth chartered remit"; ADR-0003's ledger (current and rewrite) has no row, and the sweep opens no PRs. The rewrite avoids the claim. Either add a row ("labels, comments and closes issues; no PRs") or leave it outside the ledger.
3. **Is needing a human merge (ADR-0004) a reason to escalate?** No source says so; left out.
4. **Why now rests on the gate, not a human merge.** The original's safety argument was "a human still merges"; after 2026-10-10 it can only rest on the gate and ADR-0004's exceptions. Accept?
5. **"A run that someone without write access set off approves nothing."** The original said "fired from a Public context". Does that also cover a run a Public comment prompted? The rewrite reads it as who started the run.

## 9. Lines

131 → 87.
