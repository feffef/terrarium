# ADR-0004 rewrite report

## 1. Parts

| # | Old part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Context: automatic checks make autonomy tolerable; CI is the one place not kept minimal | live | Still the reason the gate exists | *Why* ¶1 |
| 2 | Context: human and review-agent need the same objective signals | split | "Objective, so trusted without trusting the author": live (CONTEXT.md **Gate**). The "mid-term review-agent": leftover, every agent now merges its own PR (ADR-0003, 2026-10-10) | *Why* ¶2 |
| 3 | Decision: layered gate, cheapest first, every PR clears it | live | Core decision; CLAUDE.md, pr-workflow.md and merge-pr.ts rely on it | Summary; *Scope* "What the gate checks" |
| 4 | L0 bullet: manifest valid, generator produces `content.config.ts`, build, typecheck, lint | split | The check kinds: live. "Generator": leftover (ADR-0013/0014 removed it). The step list: mechanics, `scripts/gate.ts` `FLOOR`/`HEAVY`, step labels in `action.yml` (checked: `L0 · lint`, `L0 · typecheck`, `L0 · build`, …) | *Scope*; *See* |
| 5 | L1 bullet + 2026-07-11 amendment: content validates; `nuxt build` validates nothing; `validate:content` is the check | split | That L1 exists: live. Which script does it and why build can't: mechanics, `scripts/validate-content.ts` header, `action.yml` `L1 · content validation` (checked). The `gate.yml` push story: leftover (ADR-0026 moved the steps) | *Scope*; *See* |
| 6 | L2 bullet: every entry route returns 200, no console errors | split | Check kind: live. Detail: mechanics, `tests/e2e/smoke.spec.ts` (checked) | *Scope* |
| 7 | L3 bullet: no cross-Tenant/Space results; unique keys | split | Check kind: live, it guards the Platform's core promise. Detail: mechanics, `tests/unit/expand.spec.ts` (header "L3 — Isolation invariant", checked), `routing.spec.ts` | *Scope* |
| 8 | Rollout: L0+L1+L3 day one, L2 later | leftover | All four run today (`action.yml`) | dropped |
| 9 | Auto-merge eligibility = green gate + blast-radius; low-risk vs high-risk tiers | leftover | Reversed 2026-10-10 (commit a0c73b7e, PR #1741): merge on green is the default, only exceptions remain | *Rejected alternatives* bullet 1 |
| 10 | High-risk set: generator, routing, isolation, CI, governance/ADRs | split | The categories and their reason: live. The files: mechanics, `paths` of `.claude/rules/adr-0004-human-merge.md`, enforced by `scripts/merge-pr.ts:167-178` (checked) | *Scope* "The Human-only list"; *See* |
| 11 | Consequence: strict schemas do double duty, free L1 | leftover | The 2026-07-11 amendment showed the premise false | dropped |
| 12 | Consequence: L3 must exist before autonomous consolidation | leftover | It exists (`tests/unit/expand.spec.ts`) | dropped |
| 13 | Consequence: the path classifier is itself high-risk and human-owned | live | Still true: `.claude/rules/**` and `merge-pr.ts` are on the list, and merge-pr reads it from `origin/main` | *Scope* "…cannot shrink it for itself" |
| 14 | Amendment 2026-07-06: dependency and untested behaviour join the human set | live | Rule 0004 and many callers rely on it | *Scope* exceptions 2-3; *Rejected alternatives* bullet 2 |
| 15 | Amendment 2026-07-07: tests homed with their code | mechanics | Home `tests/README.md` "A test is homed with the code it exercises" (checked) | *See* |
| 16 | Amendment 2026-07-07: one spec, one `setup()` | leftover | Replaced by the 2026-10-12 amendment | dropped |
| 17 | Amendment 2026-10-12: one build, every e2e spec reuses it, own SQLite per server | mechanics | Homes `tests/README.md`, `tests/support/e2e-global-setup.ts`, `fresh-output.ts`, `e2e.ts:32-33` (checked). The why leaves the ADR: new home below | *See*; follow-up |
| 18 | Amendment 2026-07-10: "generator" terminology stale; list is the rule's paths | leftover / mechanics | Terminology note is history; list home as part 10 | dropped |
| 19 | Amendment ADR-0020 (2026-07-11): Public PR always human-merged | live | ADR-0020 rule 3 owns it; ADR-0004 names it among the exceptions | *Scope* last exception |
| 20 | Amendment 2026-07-19: only named Skills auto-merge | leftover | Reversed 2026-10-10 | dropped |
| 21 | Amendment ADR-0025 (2026-07-22): catalog files join the set | mechanics | On the rule's `paths` (checked) | *See* |
| 22 | Amendment 2026-07-30: worked examples of "untested behaviour" | live | Callers (frictions-to-fixes:288, four guards) check diffs against it; it defines the exception | *Scope* exception 3, compressed |
| 23 | Amendment ADR-0026 (2026-08-06): `action.yml` joins the set | mechanics | On the rule's `paths` (checked) | *See* |
| 24 | Amendment 2026-10-03: CI skips Heavy on a proven Inert set; any doubt runs everything | split | The principle (skip only on proof, fail to full): live. `isInert`, `--decide`, push:main/shallow/empty fallbacks: mechanics, `scripts/gate.ts:25-58`, `action.yml:31-42` (checked) | *Scope* "Skipping steps"; *See* |
| 25 | Amendment 2026-10-10: Human-only list is the rule's `paths`; non-path exceptions | live (+ mechanics) | Current core | *Scope* exceptions and list; *See* |
| 26 | Amendment 2026-10-12 (#1603): Skill files skip build and e2e, not unit tests | split | Principle: live (part 24). The rule and its safety argument: mechanics, `scripts/gate.ts:29-33` `isSkillFile`, issue #1603; tripwire `tests/unit/gate-scope.spec.ts` | *Scope* "Skipping steps"; follow-up repoints |
| 27 | Amendment 2026-10-12 (after #1853): review before first push; later prose push may rely on CI | split | Review + local gate before first push: live. The skips and the prose-push allowance: mechanics, `docs/agents/pr-workflow.md` "Review before the first push" holds the review skips (checked); the prose-push allowance has no home outside the ADR and rule: new home below | *Scope* "Before the first push"; follow-up |
| 28 | Amendment ADR-0005 (2026-10-13): `.claude/workflows/` counts as Skill files | mechanics | `scripts/gate.ts:31-33` (checked) | dropped |
| 29 | Rule only: if `gate:scoped` passed but CI failed, check base drift, log a `major` Friction | mechanics | No home but the rule (CONTEXT.md:144 points to "the ADR-0004 rule"). New home below | follow-up |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| C01 | Tenant code reading only its own Space via the shared resolver is ordinary code | answered: only *new* logic deciding which Tenant's data a request reaches needs a human |
| C02 | Which files are on the list, and why | answered (categories + reason in *Scope*); files are mechanics in the rule. Fix the callers that list files (below); ADR-0007:51 and ADR-0013:86 name the deleted `scripts/generate.ts` |
| C03 | Agents merge their own PRs; the ADR names the exceptions | answered (*Scope* "Who merges"). Conflict with ADR-0022:35,58,87 is that ADR's leftover, fixed by its own rewrite (rewrites/0022.md) |
| C04 | Untested behaviour needs a human; worked examples | answered (*Scope* exception 3) |
| C05 | The list lives in the rule's `paths`, read from `origin/main`; merge-pr refuses, fails closed | mechanics: `.claude/rules/adr-0004-human-merge.md`, `scripts/merge-pr.ts` |
| C06 | Adding a dependency, changing `package.json`, or patching a dependency needs a human | answered (exception 2; `package.json` is on the list) |
| C07 | E2E specs never build; reuse one build | mechanics: `tests/README.md`, `tests/support/e2e-global-setup.ts`, `fresh-output.ts`. Fix the callers that cite "the amendment" |
| C08 | Unattended hooks need a pure core, `--dry-run` and unit tests | mechanics: `docs/agents/guards.md:45-46`. Fix the guard comments that cite the amendment |
| C09 | Content can't leak between Spaces | answered (L3 in *Scope*); detail mechanics in `shared/expand.ts`, `tests/unit/expand.spec.ts`, `routing.spec.ts` |
| C10 | A human merges a PR touching the list, whoever made it | answered |
| C11 | Every PR passes the gate before merging | answered (summary) |
| C12 | The gate checks the result only, not intent or harmful runtime behaviour | answered (*Why* ¶2) |
| C13 | Public, fork or guest-pipeline PR needs a human | answered (last exception; ADR-0020/0023 own it) |
| C14 | The gate's levels L0-L3 | answered (labels kept in *Scope* because code cites them); steps are mechanics in `scripts/gate.ts` / `action.yml` |
| C15 | The rule limits merging only; agents may edit | added (*Scope* "Merging, not editing"); true in CONTEXT.md **Human-only** and ADR-0026:88. Fix the caller frictions-to-fixes:230 |
| C16 | Skill files skip build and e2e, not unit tests | mechanics: `scripts/gate.ts` `isSkillFile`, issue #1603. Principle answered ("Skipping steps") |
| C17 | Agents can't push `.github/workflows/*`; steps live in the action | mechanics, owned by ADR-0026. Fix the callers that cite ADR-0004's 2026-07-11 amendment |
| C18 | "A human" means any Trusted user | added (*Scope* last bullet); true in ADR-0020 and CONTEXT.md **Trusted** |
| C19 | `validate:content` checks content in seconds | mechanics: `scripts/validate-content.ts`; kept as a tip in the summary rule |
| C20 | L2: every entry route 200, renders, no browser errors | answered (L2); detail in `tests/e2e/smoke.spec.ts` |
| C21 | `gate:scoped` before first push; CI decides; CI failure after green `gate:scoped` is a `major` Friction | split: first two answered (*Scope*); the Friction grading is mechanics, new home in pr-workflow.md |
| C22 | Does the ADR still sort changes into risk tiers? | answered: no. Rejected alternative 1. Fix ADR-0020's tier wording at its rewrite |
| C23 | Inert changesets skip the heavy steps; doubt runs them | answered (principle); mechanics `scripts/gate.ts`, `action.yml` |
| - | Miscite `scripts/check-conflicting-issues.ts:15` | fix the caller (below) |
| - | Noise (21 refs: filenames used as test data) | no change |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0004.md`

```markdown
---
adr: <new hash>
---
# ADR-0004: Every PR passes an objective gate; a human merges the risky few

Before a branch's first push, run `pnpm gate:scoped` and the `code-review`
Skill, even when the Stop hook asks you to push; CI's gate decides the merge.
`docs/agents/pr-workflow.md` has the steps and their skips. For a content-only
edit, `pnpm validate:content` takes seconds.

Merge your own PR once CI is green, unless a human must: the PR changes a
Human-only file (the human-merge rule loads when you touch one), adds or
changes a dependency, changes behaviour no test or gate step can observe, adds
logic that decides which Tenant's data a request can reach, or comes from a
Public author, a fork or the guest pipeline. You may still edit Human-only
files.

If this touches your task, read the full ADR first:
docs/adr/0004-objective-safety-gate.md
```

(`.claude/rules/adr-0004-human-merge.md`: heading becomes the new title; body
unchanged; re-stamp.)

The ADR file keeps its path (`0004-objective-safety-gate.md`), so the many
`docs/adr/0004-…` links stay valid.

### New homes

- `docs/agents/pr-workflow.md`, end of "Review before the first push", add:
  > A later push of a change unlikely to break the gate (prose, docs) may skip
  > `gate:scoped` and rely on CI's gate; run it first for a code change. If
  > `gate:scoped` passed but CI failed, check for base drift, then log a
  > `major` Friction.
- `CONTEXT.md:144`: "a CI failure after a passing `gate:scoped` is `major`
  (the ADR-0004 rule)" → "… is `major` (`docs/agents/pr-workflow.md`)".
- `tests/README.md:3`: "The why: ADR-0004's 2026-10-12 amendment on the e2e
  build (it begins …)." → "Why one build: each spec that builds its own copy
  multiplies the gate's slowest step. Each spec's server gets its own SQLite
  file, because servers sharing one raced and failed."
- `tests/README.md:24`: "(see ADR-0004's 2026-10-12 amendment "A Skill's own
  files skip build and e2e, not unit tests", #1603)" → "(the gate skips build
  and e2e for these, not unit tests: `scripts/gate.ts` `isSkillFile`, #1603)".
- `scripts/gate.ts:29-30`: "Why build + e2e may skip these: ADR-0004's
  2026-10-12 amendment. A workflow script belongs to its Skill: ADR-0005's
  2026-10-13 amendment." → "Build reads `.agents/skills/` only to list which
  folders hold a SKILL.md, and no e2e spec reads it, so build and e2e may skip
  these (#1603). A workflow script is its Skill's code (ADR-0005)."

### Caller edits

- `.github/actions/gate/action.yml:91`: "(ADR-0004, 2026-10-12 amendment)" →
  "(`scripts/gate.ts` `isSkillFile`, #1603)".
- `tests/support/e2e.ts:6`, `tests/e2e/smoke.spec.ts:12`,
  `layers/{atlas,blog,commons,journal,marquee,midden}/tests/e2e/*.spec.ts`
  (line 2-7), `scripts/validate-content.ts:32`: "ADR-0004 amendment" /
  "ADR-0004's 2026-10-12 amendment" → "tests/README.md" (e2e) or "ADR-0004
  L1" (validate-content).
- `scripts/double-background-guard.ts:23`, `scripts/skill-inline-guard.ts:8`,
  `scripts/workflow-edit-guard.ts:10`: "human-only to merge (ADR-0004,
  2026-07-30)" → "human-only to merge (ADR-0004)"; workflow-edit-guard:12
  "per that amendment's reviewability bar" → "per docs/agents/guards.md".
- `scripts/loop-only-tool-guard.ts:17-19`: "(ADR-0004's 2026-07-30 amendment
  makes … tractable)" → "(an unattended hook is human-only to merge, ADR-0004;
  `--dry-run` keeps that review tractable)".
- `scripts/subagent-background-guard.ts:11`: "(ADR-0004's unattended-hook
  reviewability bar)" → "(docs/agents/guards.md)".
- `scripts/check-conflicting-issues.ts:15`: "(ADR-0004's human-only boundary:
  this never runs in CI)" → "(it never runs in CI)".
- `modules/catalog.ts:13`, `shared/kinds.ts:13`: drop the "joins … family" /
  "like content.config.ts …" lists; keep "Human-only to merge (ADR-0004)".
- `.github/workflows/gate.yml:5` (human applies): "ADR-0004's high-risk set" →
  "ADR-0004's Human-only list".
- `.github/dependabot.yml:2-3`: "auto-merged on a green safety-gate (ADR-0003
  ledger row `dependabot`)" → depends on policy question 2.
- `.agents/skills/frictions-to-fixes/SKILL.md:230`: "never edit an ADR
  (human-only, ADR-0004)" → "never edit an ADR (its PR needs a human merge,
  ADR-0004, and this Skill merges its own)".
- `.agents/skills/frictions-to-fixes/SKILL.md:268`: "(ADR-0004: build /
  validate / isolation / smoke)" → "(ADR-0004)".
- `.agents/skills/frictions-to-fixes/SKILL.md:288-290`: "ADR-0004's 2026-07-30
  amendment gives worked examples for its vaguest axis, "changes
  untested/untestable runtime behaviour" — check the diff against that list" →
  "ADR-0004's *Scope* gives examples of behaviour no test can observe; check
  the diff against them".
- `docs/proposals/README.md:32`: "ADR-0004 records the cost of drifting apart"
  → "ADR-0026 records the cost of drifting apart".
- `CLAUDE.md:75`: keep "(mostly Human-only: ADR-0004)"; it points, it does not
  list.
- `docs/agents/guards.md:47`, `docs/agents/guest-contributions.md:76`,
  `docs/agents/tenant-layers.md:153`, `.agents/skills/guest-build/SKILL.md:83`:
  these state one exception and cite the ADR; they agree with it. No edit
  needed.

### Other ADRs

| Fact the rewrite states | Owner | Agrees? |
|---|---|---|
| Agents merge their own PRs on green | ADR-0003 (2026-10-10 amendment) | yes in the amendment; its Decision text and ledger are leftovers for its own rewrite. ADR-0003:32 and :99 cite "ADR-0004's 2026-10-10 amendment" → "ADR-0004" |
| Public / fork PRs need a human | ADR-0020 rule 3 | yes. Its "blast-radius tier" and "low-risk auto-merge tier" wording (:41, :111, :121, :156) is a leftover for its rewrite |
| Guest-pipeline PRs need the owner | ADR-0023 | yes. ADR-0023:83-85's file list → "Human-only files (ADR-0004)" |
| Steps live in the composite action; agents can't push workflows | ADR-0026 | yes. ADR-0026:15, :25 cite "ADR-0004's 2026-07-11 amendment" → drop the citation; :64 "high-risk set" → "Human-only list" |
| Skill files skip build and e2e | ADR-0005 | yes. ADR-0005:19 "(ADR-0004's 2026-10-12 amendment)" → "(`scripts/gate.ts`)" |
| Isolation and routing files are Human-only | ADR-0006:50, 0007:51, 0011:68, 0013:86, 0014:104, 0018:60, 0024:91,125-126, 0025:177 | yes in substance; each lists files or says "blast-radius policy" / "workflow scope". Repoint to "Human-only (ADR-0004)" at each one's rewrite; 0007 and 0013 still name the deleted generator |
| Dependency patches need a human | ADR-0019:108-111 | yes; "escalation axes" / "named high-risk file list" → "ADR-0004's exceptions" |
| ADRs and rules are Human-only to merge | ADR-0027:58, ADR-0029:57 | yes |

## 4. Policy questions

1. **Untested-behaviour exception stays judgment-based.** It has no mechanical
   check and agents decide it themselves. Recommend: keep it, with the short
   examples now in *Scope*. Guards and hook wiring are already on the path
   list, so the exception mainly catches unattended scripts and timing logic
   elsewhere.
2. **Dependabot.** ADR-0003's ledger lets Dependabot minor/patch bumps merge on
   green with no human, and `.github/dependabot.yml:2` says so. But they change
   `package.json`, which is on the Human-only list, and pr-workflow.md says the
   auto-merge workflow (proposal #1633) is not applied. When ADR-0003's ledger
   goes, this permission has no home. Recommend: decide in ADR-0003's PR. If
   Dependabot should auto-merge, add one line to this ADR's exceptions ("except
   Dependabot minor/patch bumps, merged by `dependabot-automerge`"); otherwise
   fix dependabot.yml's comment to "a human merges them".
3. **Guest-pipeline PRs are not mechanically refused.** An agent opens them, so
   `merge-pr.ts` sees a Trusted author. Only `guest-build`'s "never merge" step
   holds the line. Recommend: accept for now (stated under *Consequences*); a
   label check in `merge-pr.ts` (`guest-in-flight` on the linked issue) would
   close it if wanted.

## 5. Split

The rewrite is 74 lines, slightly over the guide. Two decisions could stand
alone when ADRs are reorganised: "what the gate checks and when it may skip"
and "who merges and the human-merge exceptions". Not split now (first pass is
1:1).

## 6. Prompt friction

- The ADR holds two decisions (the gate, and merge authority), the second added
  by amendment. The prompt assumes one decision per ADR; the title had to name
  both.
- Two parts (the base-drift Friction grading and the "later prose push may rely
  on CI" allowance) lived only in the ADR and its summary rule. The rule may
  not decide anything the ADR doesn't, but they are mechanics. They needed new
  homes, so "mechanics: name the file that enforces it" didn't fit until a home
  was drafted.
- The refs file (4322 lines) was too long to read in full; I relied on the
  expectations checklist and spot-checked the callers it cites.
- The L0-L3 labels sit between plain language and keeping what code needs; I
  kept them because many code comments cite them.

## 7. Lines

Old: 237. New: 74.
