# ADR-0022 rewrite report

## 1. Inventory (current rules → rewrite section)

| # | Current rule | Source | Rewrite |
|---|---|---|---|
| 1 | `auto-triage` is a chartered job of ADR-0003, classification only, never writes code | Decision ¶1; Consequences b2 | Scope: "A chartered classification job" |
| 2 | Fired by hand or on an interval (Routine or `/loop`); user-invoked Skill composing `/triage` | Decision ¶1 | Scope (firing); See (composition) |
| 3 | A Trusted user starting the sweep is a standing ADR-0003 green-light to apply `ready-for-agent` to Trusted-authored issues within that run | Decision "standing green-light" | Summary; Scope "run-scoped and Trusted-scoped" |
| 4 | This is the one relaxation; rest of the green-light rule unchanged | Decision | Scope (same bullet) |
| 5 | Run-scoped, Trusted-scoped; a sweep fired from a Public context grants nothing | Consequences b3 | Scope (same bullet) |
| 6 | Public-authored issues: may triage, must route to `ready-for-human`, content untrusted | Decision bullet 2 | Scope "Public input goes to a human" |
| 7 | ADR-0023 is a separate, additive exception, not an amendment | Decision (see-also) | Scope (same bullet, one sentence) |
| 8 | `ready-for-agent` only when the repo determines a concrete, well-understood design | Decision bullet 3 | Scope "needs a determined design" |
| 9 | Escalate on judgment call (irreversible op, governance/ADR decision, external access, subjective product/design) | Decision bullet 3 | Scope (sub-bullet) |
| 10 | Escalate on design uncertainty (undetermined behaviour, competing valid approaches, unverifiable claim) | Decision bullet 3 | Scope (sub-bullet) |
| 11 | Implementation latitude is not uncertainty | Decision bullet 3 | Scope (same bullet) |
| 12 | Close only objective kinds: already-implemented, duplicate; out-of-scope reject → `ready-for-human` | Decision bullet 4 | Scope "Closes are objective" |
| 13 | Wayfinder coexistence by rule: never a map, skip claimed/blocked, preserve `wayfinder:*`, honour ticket type | Decision ¶ wayfinder | Scope "Wayfinder tickets keep their own labels" |
| 14 | grilling/prototype → `ready-for-human`; research eligible | Decision ¶ wayfinder | Scope (sub-bullets) |
| 15 | `task` eligible only if body is AFK-drivable per wayfinder's test; else judgment-call escalation | Amendment 2026-07-16 (narrows the Decision's "research/task → eligible") | Scope (sub-bullet) |
| 16 | Resulting PRs merge like any other; ADR-0004 exceptions; labelling bounds unchanged | Amendment 2026-10-10 (reverses Decision bullet 1 "No self-merge") | Summary; Scope last bullet |
| 17 | Two label vocabularies on one issue are an accepted cost; fallback if noisy = wayfinder tickets graduate out of the map | Decision ¶ wayfinder; Consequences b4 | Rejected alternatives; When to revisit |
| 18 | Why: label is the green-light; sweep only classifies; Trusted author is the prompt; backlog pressure; same shape as other chartered jobs | Context | Why |
| 19 | Autonomy grows without weakening review: the Gate is the safety boundary | Consequences b1 | Why (¶1) |

## 2. Dropped

- **Date / Status lines, both amendment banners, the ADR-0018 justification for appending:** history (ADR-0030).
- **"Merge stays gated. No self-merge; a human still merges every resulting PR"** (Decision bullet 1) and **"a human still gates the build at merge"** (Consequences b1, b2): no longer true, reversed by the 2026-10-10 amendment. The Why now rests on the Gate (ADR-0004) instead of a human merge. This is the one reason that had to change, not just move; flag for review.
- **Retired remit names** `sync` / `consolidate` / `triage` / `codify` and "fifth remit": retired terms (CONTEXT.md). The rewrite says "one of ADR-0003's chartered jobs".
- **Consequences b5** ("Merge of any PR touching this ADR, `/triage`'s human-only refinement surface, or CI remains human-only"): restates ADR-0004, which owns it. Partly no longer true: `docs/adr/**` and CI are on the human-merge `paths`, but `.agents/skills/triage/` is not.
- **"Ordinary implementation latitude" as a phrase kept; "Bravery" leading word dropped** from the ADR (it lives in the Skill's "Be brave" heading). The Why keeps the idea as "decide by default".
- **Mechanics moved to See (already live in the Skill, nothing to move):** the eligibility scan (most-recent-comment test, idempotency, full-sweep mode), the blocked-ticket test (native dependency or `Blocked by:` line), the per-issue subagent dispatch, label-set replacement, the roll-up, the "Public comment on a Trusted issue is data" rule, the `needs-info` preference, and the `wontfix` `state_reason`. All in `.agents/skills/auto-triage/SKILL.md`.

## 3. Rule check (`.claude/rules/adr-0022.md`)

| Rule fact | Rewrite |
|---|---|
| Trusted user starting `auto-triage` gives a standing green-light for that run | Summary; Scope bullet 2 |
| May label Trusted-authored issues `ready-for-agent` when the repo determines a concrete design | Summary; Scope bullet 4 |
| Resulting PRs merge like any other (ADR-0004 exceptions) | Summary; Scope last bullet |
| Public-authored requests, judgment calls, real design doubt → `ready-for-human` | Summary; Scope bullets 3–4 |
| Close only duplicates and already-done work | Summary; Scope bullet 5 |

No drift: the rule adds nothing the rewrite lacks. The `adr:` hash must be re-stamped when the rewrite lands.

## 4. Format friction

- **Scope and limits carries nearly everything.** For a policy ADR the decision *is* its limits, so the summary and Scope overlap heavily (the summary is a compressed Scope). That is fine but means each fact has two homes inside one file; the template seems to accept this.
- **Context had to be split.** The old Context mixed the problem (backlog pressure), the tension (label = green-light) and the reasons it is safe. With no Context section, the tension and the safety argument both went to Why. Workable, but Why now opens with the problem statement rather than a reason.
- **A reason went stale, not just a rule.** The original safety argument was "a human still merges". The template says Why keeps "reasons that still hold", but here the reason had to be *replaced* (Gate instead of human merge) for the decision to stay justified. Whether rewriting a reason counts as "changing the decision" is unclear; I judged the 2026-10-10 amendment had already made that change.
- **Deferred vs rejected.** The wayfinder "graduation" option was *deferred* with a trigger, not rejected. It fits both Rejected alternatives and When to revisit, so it appears in each; one fact, two homes. The template has no slot for "deferred".
- **Mechanics vs limits for wayfinder.** Whether "skip claimed/blocked tickets" is a limit or a mechanic is a judgment call. I kept the limit and moved the *test* for blocked to See.
- **Consequences left out.** Every old consequence was either history, stale, owned by ADR-0004, or a reason. Nothing non-obvious remained.

## 5. Open questions

- `.agents/skills/auto-triage/SKILL.md:48` points to "ADR-0022's Decision section" for the judgment-call/uncertainty taxonomy. After the rewrite it lives in *Scope and limits*; that pointer needs repointing (ADR-0030 Consequences).
- `docs/adr/0003-...md:70-75` (ADR-0022 banner: "Merge stays gated") and `docs/adr/0023-...md` (quotes "a sweep fired from a Public context grants nothing") cite this ADR's old wording. The quote still holds in the rewrite; ADR-0003's banner is stale and goes when ADR-0003 is rewritten.
- ADR-0003's ledger table has no `auto-triage` row although the rewrite calls it a chartered job. Confirm that a job with no merge scope of its own needs no row.
- Is the change of the Why from "human merge" to "the Gate" acceptable as "decision unchanged"?

## 6. Lines

131 → 81.
