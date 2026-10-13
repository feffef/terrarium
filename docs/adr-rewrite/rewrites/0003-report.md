# ADR-0003 rewrite report

Sources read: `decisions.md`, ADR-0030, the template, ADR-0003 and its rule,
the expectations (`.md` and `.yml`), the rewrites of 0004, 0022 (and report),
0023, 0008/0015/0028 reports, ADR-0020, the ADR-0003 parts of ADR-0007, 0008,
0009, 0010, 0012, 0015, 0024, 0026, 0027, 0029, `docs/agents/pr-workflow.md`,
the Skills that cite the ledger, the session-log usage background, and
`git log --follow` on the ADR (key commits a0c73b7e, c34386f4, 2586983f,
65ab28e2, 1a1cbebb, 871eb93e).

## 1. Parts

| # | Old part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Ledger intro (single-home note, scope vs mechanics split with pr-workflow) | leftover | The table goes whole (decisions.md) | dropped |
| 2 | Ledger row `digest` | split | Merge right: leftover (every agent merges its own, a0c73b7e). Scope (Digest pages, index intro, archive moves): live, but its home is the Skill | New home: `digest/SKILL.md` step 7 |
| 3 | Row `frictions-to-fixes` ("reviewer, not author") | split | The merge grant and "no self-merge holds because the merger never authored": leftover. That the run reviews and merges its impl agents' PRs and escalates high-risk ones: the Skill's own design, already in SKILL.md §5-6 | `frictions-to-fixes/SKILL.md` (already there); pr-workflow "Who merges" |
| 4 | Row `audit-docs` | split | Merge grant: leftover. Scope (live docs and Skills; ADR, CI, isolation, routing edits escalate): live, already in SKILL.md steps 1 and 8 | `audit-docs/SKILL.md` (already there) |
| 5 | Row `audit-skills` | split | Merge grant: leftover. Scope (Inventory `.yml` only, evidence rule): live, already in SKILL.md step 6 | `audit-skills/SKILL.md` (already there) |
| 6 | Row `blog-post` | split | Merge grant: leftover. Scope (the post, one pingback stub): live, already in SKILL.md step 11 | `blog-post/SKILL.md` (already there; drop its "ledger row" label) |
| 7 | Row `prune-trial` (reversibility bound; files a hook issue, never writes one) | split | Merge grant: leftover. Bound: live, already in `prune-trial/SKILL.md` §3, §5 and *Bounds*, and ADR-0027 | `prune-trial/SKILL.md` (already there) |
| 8 | Row `visitor-loop` (one fix PR, one feature PR, inside existing Tenant layers; out-of-remit list) | split | Merge grant: leftover. What a run may build: live, and its only home was this row (SKILL.md:15 points here) | New home: `visitor-loop/SKILL.md` "Remit" (drafted below) |
| 9 | Row `dependabot` (bot merges minor/patch on green) | policy question | No merge workflow exists (`.github/workflows/` holds only `gate.yml` and `pr-authorassociation-label.yml`); the PRs change `package.json`, which is Human-only (ADR-0004). The row grants a permission nothing exercises | Policy question 1 |
| 10 | Ledger footer: a run merges only an in-scope diff on green; else leaves the PR for a human, never falls back to the ordinary rule | live | The owner chose this reading on 2026-10-11 (c34386f4, #1759), after self-merge became the default. The reason holds: the Trusted user who started the run approved only what its Skill describes | *Scope* "A run no one watches"; *Why* |
| 11 | Amendment ADR-0018: `tenants/` paths are pre-rename | leftover | History; the paths leave with the table | dropped |
| 12 | Amendment 2026-07-07: open the PR without asking; it is a closure point; watch it to merge/close | split | Open without asking, follow to the end: live (rule and many callers). "Closure point, log `in-review`": mechanics, `close-session` / `log-session` SKILL.md:30 and `shared/schemas/session.ts:37` (checked) | *Scope* "Opening the PR", "Following it"; *See* |
| 13 | Amendment 07-06..07-30 (1): a charter is a remit realised by several Skills (`sync` spans digest and audit-skills) | leftover | "Chartered job" goes (decisions.md); `sync` is a retired term (CONTEXT.md:358) | dropped |
| 14 | (2): the mid-term review-agent is live as `frictions-to-fixes` | leftover | Every agent now merges its own PR; the review-agent was a step toward that | dropped; fix caller f2f:12 |
| 15 | (3): session `kind` is log vocabulary, not a merge permission | leftover | Its point (a `delegated` session merges only what the ledger allows) went with universal self-merge. Kinds live in CONTEXT.md **Session** | dropped |
| 16 | (4): ledger merge mechanism lives in pr-workflow.md; never `enable_pr_auto_merge` | mechanics | `docs/agents/pr-workflow.md` "The recipe" step 5 (checked) | *See* |
| 17 | Amendment ADR-0020: the green-light is a Trusted one; Public text never is | live | ADR-0020 rule 2 owns it; ADR-0003 states who approves | *Scope* "Who can approve" |
| 18 | Amendment ADR-0022: auto-triage, the "one relaxation", a standing green-light | split | "Fifth chartered remit": leftover. Starting a run as approval: live, generalised (decisions.md: Routine or `/loop` counts as starting); ADR-0022 owns the sweep | *Scope* approval bullet 3; pointer to ADR-0022/0023 |
| 19 | Amendment ADR-0027: prune-trial joins; retiring a Skill or Routine is filed for a human | split | Joining the ledger: leftover. Retiring needs approval: live; ADR-0015:213 and prune-trial *Bounds* say the same | *Scope* "Removing a Skill or a Routine"; *Why* |
| 20 | Amendment 2026-09-24: visitor-loop's standing green-light for consensus fixes and one feature; why (self-growing Platform) | split | Ledger entry: leftover. Starting the Skill approves its described work: live (approval bullet 3). Its exact bound: new home in the Skill | *Scope*; visitor-loop "Remit" |
| 21 | Amendment 2026-10-10: agents merge their own PRs; ADR-0004 names the exceptions | live, owned by ADR-0004 | The rewritten ADR-0004 states it in *Scope* "Who merges" | *Scope* bullet 1 points to ADR-0004 |
| 22 | Context: agents develop the Platform interactively and on a schedule; unbounded autonomy over self-editing tools is a foot-gun | live | Still the reason for both PRs and the approval rule | *Why* ¶1; *Rejected alternatives* 1 |
| 23 | Decision: two operating modes (interactive, autonomous) | leftover | Pure description; the split decides nothing once charters go. Session kinds live in CONTEXT.md | dropped (approval forms cover both) |
| 24 | Decision: enumerated charter `sync`/`consolidate`/`triage`/`codify` | leftover | Never built under those names; `sync`/`consolidate` are retired terms; `triage` clashes with the Skill. Real Skills replaced them | dropped; fix callers |
| 25 | Decision: two tiers split at implementation; propose freely, build net-new only after a green-light | live | The core decision; CLAUDE.md, ADR-0020/0022/0023 and many Skills rely on it | Summary; *Scope* "Proposing is free", "Building new work needs approval" |
| 26 | Decision: merge always gated, no self-merge | split | "Every change is a gated PR from a feature branch": live. "No self-merge": leftover (reversed 2026-10-10) | *Scope* bullet 1 |
| 27 | Decision: session-log exception (ADR-0009) | live, owned by ADR-0009 | Still true | *Scope* bullet 1, pointer |
| 28 | Decision: now human merges; mid-term review-agent | leftover | Overtaken by self-merge | dropped |
| 29 | Consequence: "consolidate" is one bounded job | leftover | No such job | dropped |
| 30 | Consequence: review-agent and human need the same objective signals | leftover / owned by ADR-0004 | ADR-0004 *Why* states the gate's objectivity | dropped |
| 31 | Consequence: assumes GitHub | leftover | Obvious | dropped |
| 32 | Rule only: "first check that no PR exists for the branch" | mechanics | A how, not a decision; kept as an instruction in the summary rule (pr-workflow.md holds the related "check it isn't merged" step) | summary rule |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | What must a person approve before an agent builds new work (retiring a Skill included) | answered (*Scope* "Building new work needs approval") |
| 2 | May an agent merge its own PR (CONFLICT) | answered by pointer: ADR-0004 owns it. Fix callers ADR-0009:30,47 and ADR-0020:50 that still say "no self-merge" (below) |
| 3 | Which scheduled jobs may merge, and what each may change (CONFLICT) | answered: no table. Each Skill states its own limits; the general bound is in *Scope*. Fix callers (pr-workflow:72-88, terrarium-overview:878, ADR-0004 old :154, ADR-0027:61, ADR-0010:23, ADR-0015:17) |
| 4 | Which scheduled jobs the ADR sets up (sync, consolidate, triage, codify, drift-check, auto-triage) | fix the caller: leftover. ADR-0007:21, ADR-0008:8,46, ADR-0010:73, ADR-0015:173,217, ADR-0020:97,104, ADR-0022 old :44 |
| 5 | Whose go-ahead counts | answered (*Scope* "Who can approve"); ADR-0020 owns the tiers |
| 6 | Who reviews and merges other agents' PRs | mechanics: `frictions-to-fixes/SKILL.md` §5-6 owns it; pr-workflow "Who merges" names its extra risk check. Fix the caller f2f:12,172,253,265 |
| 7 | Every change is a PR from a feature branch through the gate; session logs the only exception | answered (*Scope* bullet 1) |
| 8 | A scheduled job merges only its bounded change, else leaves it for a person | answered (*Scope* "A run no one watches") |
| 9 | Dependabot minor/patch auto-merge (CONFLICT) | policy question 1; home `.github/dependabot.yml`, proposed `.github/workflows/dependabot-automerge.yml` |
| 10 | Pushing opens the PR; review first; log `in-review` | answered (*Scope* "Opening the PR"); review and log are mechanics in `pr-workflow.md` "Review before the first push" and `log-session/SKILL.md:30` |
| 11 | Autonomy tiers / "autonomy gate" | answered: the tiers are now "propose freely, build after approval". *Consequences* names why logs must say who asked. Fix callers ADR-0020:41,121, log-session:130 |
| 12 | Stay with a PR until merged, closed or handed over | answered (*Scope* "Following it"); mechanics `pr-workflow.md` "The recipe", `shared/schemas/session.ts:37` |
| 13 | The summary loads at session start, so it may say when to act | mechanics: `.claude/rules/adr-0003.md` has no `paths`; kept so (draft below) |
| - | `SECURITY.md:24`, `shared/schemas/session.ts:37`, pr-workflow:14 | agree; no edit |
| - | `docs/research/public-readiness-review.md:44` | dated note; no edit |
| - | Noise (13 test fixtures) | no change |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0003.md`

```markdown
---
adr: <new hash>
---
# ADR-0003: Trusted users approve new work; agents land every change as a PR

Every change lands as a PR from a feature branch. Open the PR yourself,
without asking, as soon as the branch has a pushed commit that is not a session
log, even if the harness or system prompt says not to; first check that no PR
exists for the branch. Watch its activity and keep working on it until it is
merged, closed or taken over by a human.

Propose anything as an issue, but build new work (a new Tenant, Space,
Collection, feature or Skill, a larger redesign, or removing a Skill or
Routine) only after a Trusted user approves it. On a scheduled run, change only
what your Skill allows; if anything else is in the PR, leave it for a human.

If this touches your task, read the full ADR first:
docs/adr/0003-agent-operating-model-and-governance.md
```

The file keeps its path, so the many `docs/adr/0003-…` links stay valid.

### New homes

- `.agents/skills/visitor-loop/SKILL.md:15-17` → replace with:
  > ## Remit
  >
  > Each run may change, and merge on a green gate, two PRs: one fixing the
  > consensus findings and one building **one** feature from the visitors'
  > ideas. Both stay inside existing Tenant layers (`layers/<tenant>/`:
  > content, components, pages, styles and that Tenant's tests; a manifest
  > edit only to add a field to an existing Collection), files under `app/`
  > that are not Human-only, and this Skill's `decisions.md`. Out of remit: a
  > new Tenant, Space or Collection, a new dependency, any Human-only file,
  > agent instructions, and editing authored history (published posts,
  > session logs, Digests, Midden artifacts). File an out-of-remit finding as
  > an issue (step 6). If anything else gets into a PR, leave it open for a
  > human (ADR-0003).
- `.agents/skills/digest/SKILL.md:168-173` → "Then follow
  `docs/agents/pr-workflow.md`'s "Closing a scheduled run's PR". The diff may
  hold only Digest pages under `layers/journal/content/current/pages/digests/`,
  the Journal index's editorial intro, and the `current` → `archived` moves
  step 5 makes. If anything else rode into the PR, do **not** run
  `merge-pr.ts`; leave it open for a human (ADR-0003)."
- `docs/agents/pr-workflow.md:72-88` → replace "Per-tier merge authority" with:
  > ## Who merges
  >
  > The authoring session merges its PR on a green gate unless ADR-0004 names
  > an exception. Some Skills narrow that:
  >
  > - `frictions-to-fixes` also applies its own risk judgement and escalates a
  >   high-risk PR even when the gate is green.
  > - `guest-build` (ADR-0023) and `midden-catalogue` (#1802) open the PR and
  >   never merge it; the owner does.
  > - Dependabot PRs: leave them alone. They change `package.json`, so a human
  >   merges them (ADR-0004). *(Wording depends on policy question 1.)*
- `CONTEXT.md` retired-terms list (near :358) → add: "**chartered job**,
  **ledger row** — ADR-0003's former table of what each scheduled job may
  change. Say "scheduled Skill" and point to its `SKILL.md`."

### Caller edits

- `docs/agents/pr-workflow.md:5`: "Why a tier merges on green: ADR-0003. What
  needs a human merge: ADR-0004's rules, …" → "Who merges, and what needs a
  human merge: ADR-0004, with `.claude/rules/adr-0004-human-merge.md` for the
  paths. What a scheduled run may change: its Skill (ADR-0003)."
- `docs/agents/pr-workflow.md:90-107`: heading "Closing a self-merged chartered
  run" → "Closing a scheduled run's PR"; :92-93 "The tiers above that merge on
  a green gate alone close the same way" → "Scheduled Skills that merge their
  own PR close the same way"; :105-107 "a chartered run merges only its own
  bounded diff (ADR-0003 ledger), whatever the rule for an ordinary work PR
  says" → "a scheduled run merges only what its SKILL.md allows (ADR-0003)".
- Heading renamed above, so update the quoted name in:
  `digest/SKILL.md:157,168`, `blog-post/SKILL.md:243`,
  `audit-docs/SKILL.md:210,216`, `audit-skills/SKILL.md:178`,
  `visitor-loop/SKILL.md:103`, `prune-trial/SKILL.md:144`.
- `.agents/skills/digest/SKILL.md:22-24`: "eligible to self-merge as soon as
  the gate is green (ADR-0003's 2026-10-10 amendment)" → "merges once the gate
  is green (ADR-0004)".
- `.agents/skills/audit-docs/SKILL.md:218-219`: "It self-merges on green
  (ADR-0003's 2026-10-10 amendment), like `digest`." → "It merges on green
  (ADR-0004), like `digest`."
- `.agents/skills/blog-post/SKILL.md:246`: "**Scope** (ADR-0003 ledger row):"
  → "**Scope**:".
- `.agents/skills/prune-trial/SKILL.md:144-145`: "Your tier is bounded by
  **reversibility, not by file** (ADR-0003's ledger row):" → "Your bound is
  **reversibility, not file**:".
- `.agents/skills/frictions-to-fixes/SKILL.md:12-14`: "you act as the mid-term
  **review-agent** that ADR-0003 foresaw (the impl agents author the PRs; you
  review and merge them against the ADR-0004 gate)" → "the impl agents author
  the PRs; you review and merge them against the ADR-0004 gate".
- `frictions-to-fixes/SKILL.md:172`: "(ADR-0003's row for this Skill)" → drop.
- `frictions-to-fixes/SKILL.md:252-253`: "**never merges and never enables
  auto-merge** (ADR-0003)" → drop "(ADR-0003)".
- `frictions-to-fixes/SKILL.md:265`: "you are the ADR-0003 review-agent" →
  "you are the reviewer".
- `frictions-to-fixes/SKILL.md:294`: "(the ADR-0003 rule)" → keep.
- `.agents/skills/auto-triage/SKILL.md:67-76`: as ADR-0022's report drafts
  (section becomes a pointer to ADR-0022).
- `.agents/skills/log-session/SKILL.md:130`: "ADR-0003's autonomy gate" →
  "ADR-0003's approval rule".
- `CONTEXT.md:251-253`: "give the ADR-0003 net-new green-light, and
  review/merge gated PRs (agents merge their own; the exceptions ADR-0004 names
  need *a* Trusted human)" → "approve new work (ADR-0003), and merge the PRs
  ADR-0004 reserves for a human".
- `CONTEXT.md:296-297`: "never auto-merged by any chartered Skill" → "never
  merged by an agent".
- `CONTEXT.md:358`: "speculative names for chartered self-improvement *jobs*"
  → "speculative names for scheduled self-improvement *jobs*".
- `.github/dependabot.yml:1-3`: per policy question 1. Recommended: "#
  Dependabot version updates. They change `package.json`, so a human merges
  them (ADR-0004). Proposal #1633 would auto-merge npm minor/patch bumps."
- `docs/proposals/1633-dependabot-automerge.md:5,14,84`: "ADR-0003 ledger row
  `dependabot`" → ":5 #1633 (Dependabot config)"; :14 and :84 → "the
  ADR-0004 exception for Dependabot minor/patch bumps" if the owner adopts
  it, else leave the proposal as is.
- `docs/diagrams/interactive-map/terrarium-overview.md:878-880`: "Who may merge
  what comes from ADR-0003; how a merge lands, from pr-workflow.md. Outside a
  routine's scope, the maintainer merges." → "Who merges comes from ADR-0004;
  what each routine may change, from its `SKILL.md` (ADR-0003)." Rename the
  column "May merge itself only if" → "May change" and keep each cell as a
  plain summary, or replace the column with a pointer to each Skill.
- `terrarium-overview.md:857`: "`sessions`, `cloud`, `local` … ADR-0003" →
  keep: sessions open and follow PRs under ADR-0003.
- `docs/adr/0009-session-logs-commit-directly-to-main.md:30-31`: "*every change
  lands as a gated PR on a feature branch — no self-merge.*" → "*every change
  lands as a gated PR on a feature branch.*"; :47 "a deliberate, bounded
  exception to ADR-0003's no-self-merge rule" → "a deliberate, bounded
  exception to ADR-0003's every-change-is-a-PR rule".
- `docs/adr/0010-digests-derived-append-only-journal-pages.md:23-24`: "and
  ADR-0003's auto-merge ledger for `digest`'s exemption scope" → "and
  `digest/SKILL.md` step 7 for what a run may change"; :73 "the chartered,
  still-deferred `sync` job (ADR-0003) will one day formalize" → drop the
  sentence.
- `docs/adr/0015-audit-skills-and-conditional-importance.md:16-17`: "third
  name on ADR-0003's exemption list, after `digest`/`audit-docs`" → drop
  (ADR-0015's rewrite drops the amendment); :172-175 and :216-218 (the `sync`
  remit) → drop, as ADR-0015's report already drafts.
- `docs/adr/0020-requester-trust-tiers.md:41`: "orthogonal to the existing
  autonomy tier (ADR-0003) and blast-radius tier (ADR-0004)" → "alongside
  ADR-0003's approval rule and ADR-0004's merge exceptions"; :50-52 "(the "no
  self-merge" rule and ADR-0004's human-only surfaces are unchanged — but the
  "human" they require is *any* Trusted user)" → "(the "human" ADR-0004
  requires is *any* Trusted user)"; :95-104 drop "even under the chartered
  issue-implementation job (ADR-0003's confusingly-named `triage` charter)"
  and the "Note the name clash" sentence; :121 "ADR-0003's autonomy tiers and
  ADR-0004's blast-radius tiers" → "ADR-0003's approval rule and ADR-0004's
  merge exceptions"; :154-155 amendment note → drop at its rewrite.
- `docs/adr/0027-prune-trials.md:60-62`: "The exemption's exact scope is a row
  in ADR-0003's auto-merge exemption ledger, which single-homes it" → "What a
  trial may change is in `prune-trial/SKILL.md`".
- `docs/adr/0007-generated-config-committed-drift-checked.md:21-22`: "ADR-0003
  charters a **drift-check** job to detect …" → drop the sentence (drift-check
  was retired, ecb871be).
- `docs/adr/0008-self-documentation-tenant-is-a-journal.md:8-9,46`: handled by
  ADR-0008's rewrite (its report drops the framing).
- `docs/adr/0012:69`, `0015:197`, `0010:62`, `0009:344`: "gated PR (ADR-0003)"
  agrees; no edit.
- `docs/adr/0024:33`, `0026:7`, `0027:6`, `0029:6`: "green-lit (ADR-0003)"
  banners are history; they go at each ADR's rewrite. `0029:66` agrees.

### Other ADRs

| Fact the rewrite states | Owner | Agrees? |
|---|---|---|
| Who merges; which PRs wait for a human | ADR-0004 | yes (rewrite *Scope* "Who merges") |
| Session logs go straight to `main` | ADR-0009 | yes; its "no self-merge" quote is stale (edit above) |
| Only Trusted users approve; Public text never does | ADR-0020 | yes (rule 2); tier wording stale (edits above) |
| A Trusted user starting a run approves its work | ADR-0022, ADR-0023 rewrites | yes; both say starting by hand, Routine or `/loop` is the approval, for that run |
| `ready-for-agent` is the approval to build | ADR-0022 rewrite, `triage-labels.md` | yes |
| Removing a Skill needs approval | ADR-0015:213, `prune-trial/SKILL.md` *Bounds* | yes |

## 4. Policy questions

1. **Dependabot auto-merge.** The ledger row lets Dependabot npm minor/patch
   PRs merge on green with no person, but no workflow does it (proposal #1633
   is unapplied), and those PRs change `package.json`, which is Human-only.
   The permission has no home once the table goes. Recommend: a human merges
   them for now (fix `dependabot.yml`'s comment). If #1633 is applied, the
   exception belongs in ADR-0004, which owns who merges. ADR-0004's report
   asked for this to be decided here.
2. **Does an agent-filed issue count as Trusted-authored?** Agent writes show
   under the owner's account (ADR-0017), so a new-work idea an agent filed
   could be labelled `ready-for-agent` by the triage sweep, skipping "propose
   freely, build after approval". ADR-0022's report raised it. Recommend:
   decide it in ADR-0022 (its judgment-call list already catches most cases);
   no ADR-0003 text needed.
3. **"New work" boundary.** The rewrite lists what counts (Tenant, Space,
   Collection, feature, Skill, larger redesign, removing a Skill or Routine)
   and says fixes and upkeep inside an approved task don't. The old text said
   "a new Tenant, a new concept, a larger rethink". Recommend: keep the list;
   adding "feature" and "Skill" matches how visitor-loop and prune-trial
   already treat them.
4. **"Removing a Skill or Routine" for every agent, not only prune-trial.**
   It came from the prune-trial row, but ADR-0015:213 states it for
   audit-skills too, and the reason (no check catches a mistaken removal)
   holds for any agent. Recommend: keep it general, as written.

## 5. Split

71 lines, one over the guide. No split needed. The two halves ("every change
is a PR the agent follows" and "Trusted users approve new work") could stand
alone when ADRs are reorganised.

## 6. Prompt friction

- The ADR mixes two decisions joined only by history (PR discipline and the
  approval rule); the title had to name both.
- The ledger-footer bound (part 10) was added after self-merge became the
  default and is the one ledger part that stays live as a general rule. The
  owner's note says the ledger goes "whole"; I read that as the table, and
  kept the footer's general bound because the owner chose it on 2026-10-11.
  Flag if "whole" meant the footer too.
- Several ledger rows' scopes already live in their Skills; only visitor-loop
  and digest relied on the row. The prompt's "move into the Skill" framing fit
  those two; for the others the step was just dropping a label.
- I did not read `docs/adr-rewrite/refs/0003.md`; the expectations checklist
  and spot reads of each cited line sufficed.

## 7. Lines

Old: 159. New: 71.
