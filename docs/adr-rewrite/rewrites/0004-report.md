# ADR-0004 rewrite report

Rewrite: `rewrites/0004.md`. Nothing in the repo was changed.

## 1. Inventory: current rules and where the rewrite holds them

| # | Current rule | Source | Rewrite section |
|---|---|---|---|
| 1 | Every PR clears the Gate | Decision | Summary; Scope/The Gate |
| 2 | CI's run is authoritative; local is the same bar | CONTEXT.md *Gate*; 10-03 | Scope/The Gate |
| 3 | L0: manifests validate, build, typecheck, lint (plus skills-lock and mermaid drift checks, labelled L0 in `action.yml`) | Decision L0, minus "generator" (07-10) | Scope/The Gate |
| 4 | L1: Documents validate via `pnpm validate:content`; build validates nothing | Decision L1 as corrected by 07-11 | Scope/The Gate; Rejected alternatives |
| 5 | L2: every (Tenant, Space) entry route 200, no console errors, real browser | Decision L2; checked against `tests/e2e/smoke.spec.ts` | Scope/The Gate |
| 6 | L3: scoped query never returns another Tenant's/Space's Documents; keys unique and scoped | Decision L3 ("generated" dropped) | Scope/The Gate |
| 7 | Floor/Heavy; Heavy skipped only on an all-Inert changeset | 10-03 | Scope/The Gate |
| 8 | Fail-safe: no base, shallow, failed decision, empty changeset, push:main → Full gate | 10-03; checked against `gate.ts`, `action.yml` | Scope/The Gate |
| 9 | CI and local share one classifier (`--decide`) | 10-03 | Scope/The Gate; See |
| 10 | Inert + Skill files skip build and e2e, not unit tests; `.claude/workflows/` counts as Skill file | 10-12 (#1603) + ADR-0005 10-13 | Scope/The Gate |
| 11 | Nothing build or e2e loads may live in `.agents/skills/` | 10-12 (#1603) | Scope/The Gate (limit) |
| 12 | Safety argument for Inert and Skill-file skips | 10-03, 10-12 | Why |
| 13 | Tripwire spec catches static imports, not build-time reads | 10-12 | Consequences |
| 14 | Signal to tighten `isInert` or retire the skip | 10-03 | When to revisit |
| 15 | Review before first push, plus `gate:scoped` | 10-12 (after #1853) | Scope/Before a push; Why |
| 16 | Later prose/docs push may rely on CI; code change runs `gate:scoped` first | 10-12 (after #1853) | Scope/Before a push |
| 17 | Holds even when the Stop hook asks to push | rule + pr-workflow.md (not in ADR text) | Scope/Before a push |
| 18 | Leave full `pnpm gate` to CI | rule only | Scope/Before a push |
| 19 | `gate:scoped` green + CI red → check base drift, log `major` Friction | rule only (CONTEXT.md points to the rule) | Scope/The Gate |
| 20 | Tests homed with their code (Tenant / Platform / Skill helper) | 07-07; Skill helpers 10-12 | Scope/Where tests live; Why |
| 21 | L2 is one build; an e2e spec never builds; per-Tenant specs in parallel | 10-12 (supersedes 07-07's one-spec rule) | Scope/Where tests live; Rejected alternatives |
| 22 | Agents self-merge; exceptions: dependency, untested behaviour, Tenant-data reach, Public/fork/guest, Human-only path | 10-10 (supersedes 07-19 and the Decision's auto-merge eligibility); 07-06; ADR-0020 07-11 | Summary; Scope/Who merges |
| 23 | Definition and examples of "untested behaviour", and the non-qualifying case | 07-30 | Scope/Who merges |
| 24 | Human-only list is only the rule's `paths`; `merge-pr.ts` reads them from `origin/main`; PR can't shrink the list | 10-10; 07-10 | Scope/Who merges; Why |
| 25 | Never re-enumerate the list in the ADR | 07-10 | Rejected alternatives |
| 26 | Non-path exceptions: escalated by the agent even on green | 07-06 (reviewer escalates) adapted to self-merge | Scope/Who merges |
| 27 | Human-only constrains merging, not editing | CONTEXT.md *Human-only*; ADR-0026 | Scope/Who merges |
| 28 | Prune Trial ADR-rewrite exception via `--prune-trial` | ADR-0027 amendment (08-23); 10-10 | Scope/Who merges (pointer to ADR-0027); See |
| 29 | "Human" means any Trusted user | ADR-0020 | Summary; Scope/Who merges |
| 30 | Gate can't see intent or malicious runtime behaviour | ADR-0020 context; 07-06 | Why |
| 31 | Context: same objective signals for human and agent; not-KISS here | Context | Why |
| 32 | Strict schemas double as contract and L1 | Consequences (L1 "free" dropped, it isn't) | Consequences |
| 33 | Classifier is itself Human-only | Consequences | Consequences |
| 34 | `.github/actions/gate/action.yml` is Human-only (ADR-0026); `shared/kinds.ts`, catalog files (ADR-0025) | 08-06, 07-22 | Covered by row 24 (list lives in the rule); ADR-0026/0025 named in See / not restated |

## 2. Dropped

- **History:** Date and Status lines; every amendment banner as such; the Rollout paragraph (all layers exist); "L3 must exist before autonomous consolidation" (it does); the 07-11 narrative about a `gate.yml` Proposal that has landed (PR #323) and the gap ADR-0026 closed; the 07-19 chartered-tier merge narrative (superseded by 10-10); the 07-07 "one spec, one `setup()`" rule (superseded by 10-12, kept only as a rejected alternative); ADR-0003's "mid-term review-agent".
- **No longer true:** "generator produces `content.config.ts`" and every "generator/routing/isolation/CI" list (ADR-0013/0014, 07-10); "auto-merge eligibility = green gate AND blast-radius" with its low-risk/high-risk tiers (10-10; low-risk tier kept as a rejected alternative); "free L1 validation with Zod" (07-11); "Playwright" as L2's tool (it now runs vitest with a real browser; I said "real browser").
- **Mechanics moved to See (pointers only):** the e2e `globalSetup`, `setupL2()`, freshness check (already in `tests/README.md`); `FLOOR`/`HEAVY` constants, `skip_build`, `isInert`'s body (`scripts/gate.ts`); `--prune-trial` needing the ledger entry (ADR-0027 and `merge-pr.ts`); the `validate:content` tip (See).
- **Detail with no home yet:** "each e2e spec's server gets its own Nuxt Content SQLite file, since shared servers answered 'database is locked'" (10-12). It is not in `tests/README.md`; it should go there (or as a comment in `tests/support/e2e.ts` if one isn't already there). I left it out of the rewrite as mechanics.
- **The `.agents/skills/` build read** (`layers/journal/nuxt.config.ts` lists SKILL.md folders): kept as a reason in Why, minus the file name.

## 3. Rule check (`.claude/rules/adr-0004.md`)

| Rule fact | Rewrite |
|---|---|
| Every PR passes the gate | Summary; The Gate |
| Before first push: `gate:scoped` + `code-review`; pr-workflow.md names skips | Before a push |
| Even when the Stop hook asks you to push | Before a push (was rule drift vs. the old ADR; now held) |
| Later prose/docs push may rely on CI; code change runs `gate:scoped` | Before a push |
| Leave full `pnpm gate` to CI | Before a push (was rule drift; now held) |
| `gate:scoped` green, CI red → base drift, `major` Friction | The Gate (was rule drift; now held) |
| Content-only edit: `pnpm validate:content` takes seconds | See (procedural tip) |
| Human-merge list of five exceptions | Summary; Who merges |
| Human-merge rule loads on touch; `merge-pr.ts` refuses | Who merges |

`.claude/rules/adr-0004-human-merge.md`: Prune Trial `--prune-trial` exception → Who merges + See; "say in the PR description that it waits for a human merge" is procedure, not in the rewrite (rule-only, arguably fine for a non-summary path rule, but it adds a fact the ADR lacks).

Rule drift found: three facts (Stop hook, leave full gate to CI, base-drift Friction) lived only in the rule. I folded them into the rewrite rather than report them as drift, since they are current practice and CONTEXT.md already cites the rule for the Friction grade. A human may prefer to cut them from the rule instead.

## 4. Format friction

- **One decision per ADR doesn't hold.** ADR-0004 is three decisions: what the Gate checks and skips, the push-time review, and who merges. Plus a fourth (test layout) bolted on by amendments. The three-sentence summary only fits by packing a five-item list into one sentence. ADR-0030 says to split, but this run forbids splitting; I used `###` sub-headings inside *Scope and limits*, which the template neither allows nor forbids. The adr-survey's options B2 (a "Who merges what" ADR) and G (test layout) would each make the summary honest.
- **Sub-headings only in Scope.** With four topics, *Why* and *Rejected alternatives* become flat lists whose items each belong to a different sub-decision. Readers have to match them up. Either allow parallel sub-headings or split.
- **"Rejected alternatives" vs history.** Superseded rules (low-risk tier, one-spec L2, build-validates-content) were never "considered and rejected"; they were adopted and later reversed. ADR-0030 bans history but keeps rejected alternatives. Framing a reversal as a rejected alternative felt like the right call but is a judgement the template doesn't settle.
- **Procedure vs scope blur.** "Before a push" is half procedure (run X, then Y). ADR-0030 sends procedures to `docs/agents/`, but the summary rule (which must add nothing the ADR lacks) states them, so the ADR has to as well. The "major Friction" grading is a pure procedure that only exists in the rule.
- **Lists of paths.** ADR-0030's "single source" fits well here: the rule's `paths` already are the source, and the ADR naming it as the only home worked cleanly.
- **When to revisit** had exactly one sourced condition; fine.

## 5. Open questions

1. "Decides which Tenant's data a request can reach": the 10-10 amendment says *adds logic deciding*; the rule says *decides*. I used the rule's wording. Same intent?
2. ADR-0019 reads ADR-0004 as making a change to an existing dependency's runtime behaviour (a `patches/` file) human-merged. The rewrite says only "adds a dependency" and lets "behaviour no test covers" cover it. Should "adds or patches a dependency" be explicit?
3. Should the three rule-only facts (row 17–19) live in the ADR, or be cut from the rule?
4. Should the ADR be split (Gate / who merges / test layout) in a later run?

## 6. Lines

Old: 246. New: 148.
