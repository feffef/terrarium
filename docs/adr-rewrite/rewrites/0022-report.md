# ADR-0022 rewrite report

## 1. Parts

| # | Old part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Context: backlog outgrows a person; unlabelled work invisible | live (Why) | Still true; the reason the sweep exists | *Why* ¶1 |
| 2 | Context: chartered jobs on a schedule; sweep is "the same shape" | leftover | Chartered-job idea goes with ADR-0003's table (decisions.md) | dropped |
| 3 | Context: `ready-for-agent` is ADR-0003's build approval, so a sweep stamping it needs its own decision | live | triage-labels.md and ADR-0020 rule 2 still treat the label as the approval | *Why* ¶1 |
| 4 | Context fact 1: sweep classifies; human gate moved to merge time | split | "classifies, never builds" live (Summary). "Human gate at merge" leftover: reversed 2026-10-10 (commit 2401224f, PR #1741) | Summary; *Consequences* states the effect now |
| 5 | Context fact 2: Trusted author filing the issue is the prompt | live | Still the reason the approval may be standing | *Why* ¶2 |
| 6 | Decision: fifth chartered remit in ADR-0003's set | leftover | decisions.md: table and "chartered job" go | dropped |
| 7 | Decision: realised by user-invoked Skill, fired by hand or Routine/`/loop` | split | Who may start a run: live (decisions.md: Routine/`/loop` counts as starting). How to fire: mechanics, `auto-triage/SKILL.md` "Loop it" (checked) | *Scope* "Who starts a run"; *See* |
| 8 | Standing green-light: Trusted start approves `ready-for-agent` on Trusted-authored issues within the run | live | Core decision | Summary; *Scope* |
| 9 | "One narrow relaxation; see also ADR-0023" | split | Coined framing dropped; ADR-0023 pointer live | *Rejected alternatives* bullet 2 |
| 10 | Bullet: merge stays gated, no self-merge | leftover | Reversed by the 2026-10-10 amendment | replaced by part 17 |
| 11 | Bullet: Public-authored never self-approved, to `ready-for-human`, content untrusted | live | ADR-0020 rule 2 still holds | *Scope* "Which issues"; *Why* ¶3 |
| 12 | Bullet: determinability, judgment-call and uncertainty lists, implementation latitude | live | Skill points here for the lists (SKILL:48); sessions read the full ADR for them (session-log-usage §4) | *Scope* "When to mark" / "When to send" |
| 13 | Bullet: closes only already-implemented or duplicate; out-of-scope is judgment | live | Unchanged; SKILL "Closing" holds the how (`state_reason`, `.out-of-scope/`) | *Scope* "Closing"; *Why* ¶2 |
| 14 | Wayfinder coexistence rules (no map, skip claimed/blocked, keep labels, HITL/AFK by type) | split | The decision to overlay rather than separate: live. The rule list: mechanics, `auto-triage/SKILL.md` "Coexisting with wayfinder" (checked, lines 78-97) | *Scope* "Wayfinder tickets"; *See* |
| 15 | Consequence: autonomy grows while merge gate is the safety boundary | leftover | Rested on human merge, since reversed | *Consequences* restates the effect today |
| 16 | Consequence: classification not implementation | live | Same as part 4 | Summary |
| 17 | Consequence: run-scoped, Trusted-scoped; "a sweep fired from a Public context grants nothing" | split | Run-scoped: live. The Public-context sentence: leftover (decisions.md: only write-access users can start a run) | *Scope* "Who starts a run" |
| 18 | Consequence: two label systems cost; fallback is graduating wayfinder tickets | live | Source gives it as the deferred alternative and its trigger | *Rejected alternatives* bullet 3; *When to revisit* |
| 19 | Consequence: PRs touching this ADR, triage or CI stay human-merged | mechanics | Home: `.claude/rules/adr-0004-human-merge.md` `paths`, enforced by `scripts/merge-pr.ts` | dropped; *Scope* "Merging" points to ADR-0004 |
| 20 | Amendment: `wayfinder:task` is AFK per ticket | mechanics | Implemented at `auto-triage/SKILL.md:93-97`, from `wayfinder/SKILL.md:80` (checked) | *Scope* "follows wayfinder's rules"; *See* |
| 21 | Amendment: resulting PRs merge like any other | live | Owner's 2026-10-10 call | *Scope* "Merging"; *Consequences* |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | Who can let the sweep mark issues ready | answered. Conflict resolved by decisions.md: any Trusted user starting a run, by hand or Routine/`/loop`; run-scoped. Fix the caller ADR-0003:85 (below) |
| 2 | Which issues the approval covers | answered (*Scope* "Which issues") |
| 3 | Does it change who merges | answered (*Scope* "Merging") |
| 4 | Does a sweep from a Public context approve anything | leftover; fix the caller ADR-0023:34-37 |
| 5 | When to an agent vs a person | answered; both lists are in *Scope*. Fix the caller SKILL:48 (repoint) |
| 6 | Public comment on a Trusted issue | added (*Scope* "Public comments"); still true in SKILL:74-75 and consistent with ADR-0020 rule 1 |
| 7 | Fifth job in ADR-0003's list | leftover; fix the caller ADR-0003:70-75 |
| 8 | Does the guest demo change this ADR | answered: separate exception, pointed to from *Rejected alternatives* |
| 9 | Which files the ADR governs | mechanics; home `docs/diagrams/interactive-map/terrarium-overview.md:868` (`issues` row), unchanged |
| - | Noise: `layers/journal/app/utils/dashboard.ts:190`, `journal-dashboard.spec.ts:372-382` | no change needed; tests use inline fixtures. The comment becomes a stale example only; optionally update it to the new title |
| - | Not in refs: `docs/agents/triage-labels.md:20-22` points to the Skill's "standing green-light" section, which the follow-up cuts | fix the caller (below) |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0022.md`

```markdown
---
adr: <new hash>
---
# ADR-0022: The triage sweep may mark Trusted issues ready to build

When a Trusted user starts the `auto-triage` sweep, by hand or through a
Routine or `/loop`, that run may label a Trusted-authored issue
`ready-for-agent` once the repo settles a concrete design. Send Public-authored
issues, anything a Public comment asks for, judgment calls and real design
doubt to `ready-for-human`. Close only duplicates and already-done work.

Before you run or change the sweep, or judge an issue for it, read the full
ADR: docs/adr/0022-autonomous-triage-sweep.md
```

### Caller edits

- `.agents/skills/auto-triage/SKILL.md:47-49` → "Escalate to
  `ready-for-human` only on a genuine judgment call or genuine design
  uncertainty, as ADR-0022 defines them."
- `.agents/skills/auto-triage/SKILL.md:67-76` → replace the section with:
  "## Approval\n\nWhat a run may label `ready-for-agent`, and what goes to
  `ready-for-human`: ADR-0022."
- `docs/agents/triage-labels.md:20-22` → "> **Requester-trust gate.**
  `ready-for-agent` is gated by requester trust (ADR-0020; for the
  `auto-triage` sweep, ADR-0022)."
- `docs/adr/0003-agent-operating-model-and-governance.md:70-75` → delete the
  ADR-0022 amendment paragraph. If ADR-0003's rewrite keeps a general line on
  approval by starting a run: "A Trusted user starting a run can approve a
  bounded set of work for that run (ADR-0022, ADR-0023)."
- `docs/adr/0003-agent-operating-model-and-governance.md:84-85` → drop
  "(as ADR-0022's is for triage)"; the visitor-loop part moves to its Skill in
  ADR-0003's rewrite.
- `docs/adr/0023-guest-driven-demo-pipeline.md:34-38` → "ADR-0020 and ADR-0022
  let only a Trusted user approve building a request; the demo automates that
  approval for guests."
- `docs/adr/0023-guest-driven-demo-pipeline.md:65-66` → "As in ADR-0022, the
  owner starting the loops is the approval, for that run."
- `docs/adr/0023-guest-driven-demo-pipeline.md:7-12` (banner) → goes in
  ADR-0023's own rewrite; no ADR-0022 wording needed.

### New homes

- None needed. Everything that left the ADR already lives in
  `auto-triage/SKILL.md` (wayfinder rules, `wayfinder:task` test, how to
  fire), `.claude/rules/adr-0004-human-merge.md` (human-only paths) or
  `docs/agents/triage-labels.md`.

### Other ADRs

- ADR-0003 owns "`ready-for-agent`/building net-new work needs Trusted
  approval": agrees (its decision text and ADR-0020 amendment).
- ADR-0004 owns which PRs a human merges: agrees (2026-10-10 amendment).
- ADR-0020 owns "Public text is data" and rule 2: agrees. Rule 4 (autofix
  loop escalates on a Public comment) is the nearest match for the added
  Public-comment line; consistent.
- ADR-0023 owns the guest exception: agrees, once its quoted phrase is
  repointed.

## 4. Policy questions

1. **Does an agent-filed issue count as Trusted-authored?** Agent writes land
   under the owner's account (ADR-0017), so a net-new idea an agent filed reads
   as Trusted and could be approved by the sweep, skipping ADR-0003's
   "propose freely, build only after approval". Recommendation: keep the ADR
   as written; the judgment-call list ("a matter of product taste", a
   governance decision) already sends agent-proposed net-new work to a person.
   If the owner wants it explicit, add to *Scope*: "An issue an agent filed on
   its own initiative, proposing new work, is a judgment call."
2. **Load the summary rule only when it applies?** It has no `paths`, so it
   loads every session; outside backlog runs it was rated useless 35 of 40
   times (session-log-usage §2). Recommendation: give it `paths` for
   `.agents/skills/auto-triage/**`, `.agents/skills/triage/**`,
   `.agents/skills/clear-backlog/**` and `docs/agents/triage-labels.md`. This
   is ADR-0029 territory, so the owner decides.

## 5. Split

Not needed; the rewrite is 71 lines, at the guide's edge.

## 6. Prompt friction

- The refs file misses `docs/agents/triage-labels.md:21`, which points to the
  Skill section the follow-up cuts; found only by grepping "standing
  green-light".
- Expectations item 4 is a decisions.md drop, but step 3 has no outcome for
  "leftover"; I used "fix the caller".
- The `writing-for-agents` Skill call was blocked by a guard claiming the body
  was already inlined; it was not, so I read the SKILL.md directly.
- *Consequences* "only effects that aren't obvious" vs a reversed safety
  premise: I kept the one effect the reversal created (filed-to-merged with no
  human) since a reviewer would not infer it from *Scope*.

## 7. Lines

Old: 131. New: 71.
