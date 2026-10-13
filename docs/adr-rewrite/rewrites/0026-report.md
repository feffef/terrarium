# ADR-0026 rewrite report

## 1. Parts

| # | Old part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Status line, date, "green-lit in /grill-with-docs" banner, supersedes #445/#630/#659 | leftover | History (ADR-0030); the shell was applied (commit ffbf96f1) | dropped |
| 2 | Context: agents lack the `workflow` scope; the fence covers `.github/workflows/` only, `.github/actions/**` is pushable | live (+ mechanics) | Still true: `docs/agents/environment-caveats.md:31`, `scripts/workflow-edit-guard.ts` (checked) | *Why* ¶1; *See* |
| 3 | Context: three pending Proposals queued | leftover | All applied; `docs/proposals/` now holds only `1633-dependabot-automerge.md` | dropped |
| 4 | Context: drift between `gate.yml` and `pnpm gate` was the real cost | live | It is why the parity test exists | *Why* ¶2 |
| 5 | Context: the probe commit that verified the fence empirically | leftover | Proof story; the fact stands in part 2 | dropped |
| 6 | Context: composite semantics (`if`, `continue-on-error`, `uses`, no `secrets`) checked against GitHub docs; re-test `continue-on-error` first if fail-open misbehaves | split | The semantics: mechanics, comments in `action.yml:10,28-33,150-159` (checked). The re-test instruction: live as a revisit condition | *When to revisit* bullet 1 |
| 7 | Decision: steps in the composite, `gate.yml` a shell | live | Core decision; 11 callers rely on it | Summary; *Scope* bullets 1-2 |
| 8 | Decision: what the shell keeps (`on`, permissions, runs-on, checkout, token) and why checkout and token cannot move | split | The list: live (defines the split). Why each cannot move: mechanics, comments in `gate.yml:23-33` (checked) | *Scope* bullet 2 |
| 9 | Decision: applying the shell is a one-time human act | leftover | Done (ffbf96f1) | dropped |
| 10 | Decision: afterwards the shell changes only for triggers and permissions | live | Still bounds when a Proposal is needed | *Scope* bullet 2 |
| 11 | Decision: `action.yml` joins ADR-0004's high-risk set, human-only to merge, agent-editable; "never auto-merged by any chartered-Skill tier" | split | Human merge: live, but the list is ADR-0004's (rule `paths`, checked: line 15). The tier wording: leftover (ADR-0003 ledger goes; agents merge their own PRs) | *Scope* bullet 4, pointing to ADR-0004 |
| 12 | Decision: parity spec pins composite = `FLOOR`+`HEAVY` in order, Heavy guarded, Floor not, and = `package.json` `gate` | split | That the three must agree and a test checks it: live. The exact assertions: mechanics, `tests/unit/gate-parity.spec.ts:68-93` (checked; it also checks `skip_build` vs `skip_heavy` guards since #1603) | *Scope* bullet 3; *See* via the spec name |
| 13 | "Why this is not a new security hole" (package.json defines scripts; gate.ts decides skips; CI runs the PR's copy; merge review protects) | live | The answer to "may I change this?"; ADR-0004 rewrite's "Merging, not editing" agrees | *Why* ¶3 |
| 14 | Rejected: one `run: pnpm gate:scoped` step | live | Reasons still hold: `gate.ts:153-180` stale-deps `pnpm install`, `:112` `merge-base origin/main HEAD` (checked) | *Rejected* bullet 1 |
| 15 | Rejected: grant the `workflow` scope | live | Plausible to re-propose | *Rejected* bullet 2 |
| 16 | Rejected: keep setup/install in the shell | live | Plausible to re-propose; "#659" detail dropped | *Rejected* bullet 3 |
| 17 | Consequence: the composite ships unexercised | leftover | The shell is applied and CI runs the composite | dropped |
| 18 | Consequence: the drop-zone shrinks; a Proposal only for triggers or permissions | live | Same fact as part 10 | *Scope* bullet 2 |
| 19 | Consequence: a stale shell without `fetch-depth: 0` degrades to the full gate | mechanics | `scripts/gate.ts:137` returns `null` on a shallow repo → full gate (checked); the principle is ADR-0004's "Skipping steps" | dropped; `gate.yml:26` repointed |
| 20 | Consequence: parity spec checks which steps, not what they do | live | Non-obvious limit of the test | *Consequences* |
| 21 | Consequence: `gate.yml` and `pr-authorassociation-label.yml` differ in shape; "gate shell" not a glossary term (rule of two) | split | Only the gate has the split: live, as a revisit condition. The glossary note: leftover (`docs/agents/domain.md` owns the rule of two) | *When to revisit* bullet 2 |
| 22 | Summary rule only: "propose changes to it in `docs/proposals/`" | live | Agents cannot push the workflow file | *Scope* bullet 2 |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | Steps live in the action; the workflow only starts them | answered (summary, *Scope* 1-2) |
| 2 | Agents may push the action; only `.github/workflows/` is blocked (no `workflow` permission) | answered (*Why* ¶1); the block is mechanics in `scripts/workflow-edit-guard.ts` and `environment-caveats.md` |
| 3 | Who merges a change to the action? Which ADR owns it? | answered: a human, because the file is on ADR-0004's Human-only list. ADR-0004 owns the fact; ADR-0026 points to it. Fix the callers that call it "ADR-0004's high-risk set" (`gate.yml:5`) or cite ADR-0026 as the home (`mermaid:52`) |
| 4 | Pushing the action loses no safety, a human still merges | answered (*Why* ¶3) |
| 5 | CI steps must match `package.json` `gate` and `gate.ts`; a test checks | answered (*Scope* 3); mechanics in the spec |
| 6 | CI asks `gate.ts --decide`; a missing answer runs everything | mechanics: `scripts/gate.ts`, `action.yml:28-42`; the principle is ADR-0004 "Skipping steps". Fix `action.yml:87` |
| 7 | Fewer Proposals; the old `gate.yml` gap closed | answered (*Scope* 2, *Why* ¶2). Fix `CONTEXT.md:320` wording |
| 8 | Full-history checkout; shallow falls back to full run | mechanics: `gate.yml:27`, `scripts/gate.ts:137`. Fix `gate.yml:26` |
| 9 | Token passed in; fork-PR comment fix in the action | mechanics: `action.yml:10,155-164`, `gate-parity.spec.ts:96-103`. Fix `public-readiness-review.md:99` (miscite: #659 was fixed in the action, not decided by ADR-0026) |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0026.md`

`paths` unchanged except the policy question on `.agents/skills/audit-docs/**`.

```markdown
---
adr: <new hash>
paths:
  - ".github/actions/gate/**"
  - ".github/workflows/**"
  - "scripts/gate.ts"
  - "tests/unit/gate-parity.spec.ts"
  - "docs/proposals/**"
---
# ADR-0026: CI's gate steps live in an action that agents can push

Change the gate's CI steps in `.github/actions/gate/action.yml`; agents can
push it. You cannot push `.github/workflows/gate.yml`: a change to its
triggers or permissions goes to a human through `docs/proposals/`. When you
add, drop or reorder a gate step, change `package.json`'s `gate`,
`scripts/gate.ts` and the action together; `tests/unit/gate-parity.spec.ts`
fails until they agree. A human merges changes to both files (ADR-0004).

If you plan to move steps back into the workflow file, or change this split,
read the full ADR first: docs/adr/0026-gate-workflow-thin-shell.md
```

### Caller edits

- `.github/workflows/gate.yml:1-5` (Human-only; a human applies via Proposal):
  "Both files are human-only to merge (ADR-0004's high-risk set)." → "Both
  files are Human-only to merge (ADR-0004)."
- `.github/workflows/gate.yml:23-26`: "… which costs a Full gate, not a wrong
  one. See ADR-0026." → "… which costs a full gate, not a wrong one
  (`scripts/gate.ts`)."
- `.github/actions/gate/action.yml:87`: "guarded on the scope decision (#445,
  ADR-0026)" → "guarded on the scope decision (#445; skip only on proof,
  ADR-0004)". (ADR-0004's report already rewrites line 91.)
- `CONTEXT.md:320`: "The class is deliberately shrinking (ADR-0026)." →
  "Gate steps need none: they live in an action agents can push (ADR-0026)."
- `docs/research/mermaid-server-side-rendering.md:52`: "(`.github/actions/gate/action.yml`,
  agent-pushable but still human-only to merge — ADR-0026)" →
  "(`.github/actions/gate/action.yml`, ADR-0026)".
- `docs/research/public-readiness-review.md:99`: "(#659, fixed in the Gate
  composite action, ADR-0026)" → "(#659, fixed in
  `.github/actions/gate/action.yml`)".
- `docs/proposals/README.md:32`: "ADR-0004 records the cost of drifting apart"
  → "ADR-0026 records the cost of drifting apart" (same edit as ADR-0004's
  report).
- `docs/adr/0004-objective-safety-gate.md:4,52-57,138`: removed by ADR-0004's
  rewrite (rewrites/0004.md has no amendments; its *See* points here). No
  further edit.
- No edit needed: `tests/unit/gate-parity.spec.ts:1-4,68,70`,
  `scripts/gate.ts:8`, `scripts/workflow-edit-guard.ts:143`,
  `docs/agents/guards.md:25`, `CONTEXT.md:199`,
  `docs/diagrams/interactive-map/terrarium-overview.md:870`,
  `action.yml:4-5`. They point to the ADR and agree with it.

### New homes

None. Every dropped detail already lives in code comments, the parity spec,
`scripts/gate.ts`, `environment-caveats.md` or `docs/proposals/README.md`.

### Other ADRs

| Fact the rewrite states | Owner | Agrees? |
|---|---|---|
| Both gate files are on the Human-only list; agents may edit, a human merges | ADR-0004 (rewrites/0004.md *Scope* "Human-only list", "Merging, not editing") | yes |
| Skip only on proof; doubt runs everything | ADR-0004 (rewrites/0004.md "Skipping steps") | yes; the rewrite only points to it via `scripts/gate.ts` |
| Agents merge their own PRs | ADR-0003 | yes; the old "chartered-Skill tier" wording is dropped |

## 4. Policy questions

1. **`.agents/skills/audit-docs/**` in the rule's `paths`.** It makes the rule
   load whenever audit-docs is edited, though audit-docs only reads
   `docs/proposals/`. Recommend: drop it; `docs/proposals/**` already loads the
   rule where Proposals are touched. Low stakes, does not change what agents may
   do, so the owner may simply accept or reject.

No real policy question on the decision itself: every part either still holds
or was overtaken by self-merge and the applied shell.

## 5. Split

Not needed (73 lines, at the guide's edge). One decision.

## 6. Prompt friction

- Step 2's "check against what ADR-0003, ADR-0004 and `CLAUDE.md` allow now"
  mattered here only for one phrase ("chartered-Skill tier"); the rest of the
  ADR was mechanical, not permission-bound.
- The checklist's item 3 asks which ADR owns the merge rule; the prompt has no
  explicit step for "the fact belongs to another ADR, point there", beyond the
  *Other ADRs* follow-up. I treated it as answered with a pointer.
- The template's *See* versus "never repeat a value" is ambiguous for the two
  files the decision is about: naming them in the summary is the decision, not
  a mechanic, so I named them there and left them out of *See*.

## 7. Lines

Old: 131. New: 73.
