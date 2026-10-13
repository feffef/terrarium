# ADR rewrites vs callers' checklists: summary

Ten rewrites (`rewrites/NNNN.md`, ADR-0030 format) checked against the blind callers' checklists (`expectations/NNNN.md`, live references only). Each ADR's detail is in `comparison/NNNN.md`. Facts were checked against the repo at `a700e6e63`.

"Contradicted" counts items where the rewrite and a caller disagree. In 7 of the 9 cases the rewrite is right and the caller is stale. The other two: ADR-0003's Dependabot row is ahead of reality, and ADR-0025's "Ordinary Tenants never read across" is contradicted by code.

| ADR | Answered | Missing | Contradicted | Rightly absent | References to repoint / fix |
|---|---|---|---|---|---|
| 0003 Agent operating model | 10 | 1 | 3 (2 stale callers, 1 vs reality) | 2 | 12 amendment/name cites + ~10 stale-remit callers |
| 0004 Safety gate | 14 | 2 | 1 (stale callers) | 2 | ~32 (dated-amendment comments, "high-risk set", tiers) |
| 0008 Journal | 6 | 0 | 0 | 2 | 1 map row + 2 stale "derived from repo state" |
| 0014 #routing | 7 | 0 | 1 (stale caller) | 1 | 1 ("wiring #3") + 3 stale claims |
| 0015 Skill Inventory | 11 | 2 | 1 (stale caller) | 2 | 5 dated-amendment comments |
| 0019 Content-load recovery | 8 | 0 | 1 (stale caller) | 1 | 4 + file-rename decision |
| 0020 Trust tiers | 13 | 2 | 0 | 1 | ~17 ("rule 1/2/3", enum location, "write isolation") |
| 0022 Triage sweep | 7 | 2 | 1 (stale caller) | 0 (sub-parts only) | 2 (Skill's "Decision section" pointer, ADR-0023 quote) |
| 0025 Cross-Tenant reads | 11 | 0 | 0 vs callers, **1 vs code** | 4 | 3 + 2 miscitations |
| 0028 Server payloads | 7 | 2 (minor) | 0 | 1 | 2 (research note) |
| **Total** | **94** | **11** | **9** | **16** | **~80 lines** |

## Missing and contradicted, most important first

1. **ADR-0025: "Ordinary Tenants never read across" is false in code.** The Blog calls `queryPages()` for the Journal's Digest (`layers/blog/app/pages/t/blog/[space]/[...slug].vue:48-54`, labelled "sanctioned (ADR-0025)"). Either the rule allows any Tenant to read through the primitive, or the Blog breaches it.
2. **ADR-0003: the Dependabot row says these PRs are "merged on a green Gate with no agent involved".** No such workflow exists (`.github/workflows/` holds `gate.yml` and `pr-authorassociation-label.yml` only); `docs/proposals/1633-dependabot-automerge.md` is unapplied, and `pr-workflow.md:87` says to leave them alone. `.github/dependabot.yml:2` repeats the false claim.
3. **The ADR-0003 and ADR-0022 rewrites disagree with each other.** ADR-0022 calls `auto-triage` "one of ADR-0003's chartered jobs". ADR-0003's ledger, which "bounds what each may change", has no `auto-triage` row and lists it only as a standing green-light.
4. **ADR-0020: does "every Public PR" cover an agent PR built from a Public issue?** `scripts/merge-pr.ts:189-199` refuses only fork or Public-*authored* PRs. `clear-backlog/SKILL.md:119-120` says such PRs wait for a human "even though `merge-pr.ts` would accept it", and ADR-0004:151 says "Public-originated". Neither rewrite answers it, and the code doesn't enforce it.
5. **ADR-0004 lacks the edge case 22 code comments rely on.** A layer page that reuses `resolveSpaceRoute` read-only ("isolation-respecting, presentation-only (ADR-0004)") does not "decide which Tenant's data a request can reach".
6. **ADR-0022 dropped a trust bound to the Skill.** "A Public comment on a Trusted issue is data, not scope → `ready-for-human`" now lives only in `auto-triage/SKILL.md:74`. It limits the green-light, so it belongs in Scope.
7. **ADR-0020 doesn't say how to tell the owner from an agent.** Agent writes also show as `OWNER`, so an `OWNER` comment counts as the owner only when it has no ADR-0017 marker (`guest-intake/SKILL.md:58-62`). The rewrite names the shared-credential limit but not this test.
8. **ADR-0003 dropped "the `ready-for-agent` label *is* the green-light".** `auto-triage/SKILL.md:67-69` and ADR-0022 rely on it. ADR-0022's Why still says it, so restore it in ADR-0003, which owns it.
9. **ADR-0004 doesn't cover changing an existing dependency.** It names "adds a dependency" only. ADR-0019:108/111 says patching one is human-merged, yet `patches/` and `pnpm-workspace.yaml` are not in the rule's `paths`.
10. **ADR-0015 leaves two things out.** It never says who may change an Inventory entry's `importance` or `role` besides `audit-skills`. Its Why never says why the Inventory exists.
11. **Two smaller ADR-0022 and ADR-0028 gaps.** ADR-0022: needing a human merge is not an escalation reason. ADR-0028: keep payloads to what the page reads, and each uncached navigation costs a full server render.
12. **Stale callers the rewrites correctly contradict** (fix the callers):
    - retired remits `sync`/`consolidate`/`triage`/`codify` and the "fifth remit": ADR-0007, 0008, 0010, 0015, 0020, 0022;
    - "no self-merge": ADR-0009:30/47, ADR-0020:50, ADR-0022:35/58/87;
    - the "low-risk auto-merge tier": ADR-0006:50, ADR-0020:41/111/121/156;
    - `#routing` "knows only `pages`": ADR-0025:36; the code maps every Collection;
    - "e2e list derived at build time": `tests/e2e/smoke.spec.ts:3-4`;
    - "ADR-0019, superseded": `layers/midden/app/utils/strata.ts:70`;
    - "write isolation (ADR-0020)": `app/composables/catalog.ts:12`, `modules/catalog.ts:16`, `layers/commons/app/composables/timeline.ts:9`, ADR-0025:165.

## Decisions needed from the human

1. **Dependabot.** Choose one:
   - say "will merge once #1633 is applied; until then nobody merges them automatically";
   - or apply #1633.

   Then align `.github/dependabot.yml:2`.
2. **Blog's cross-Tenant read.** Choose one:
   - widen ADR-0025 so any Tenant may read through `queryAcrossTenants`/`queryPages` (and update `CONTEXT.md:238`);
   - or call the Blog's read a breach.
3. **`auto-triage` in ADR-0003's ledger.** Choose one:
   - add a row ("labels, comments, closes issues; changes no files");
   - or reword ADR-0022 to "a standing job outside the ledger".
4. **Public-originated PRs.** Choose one:
   - human-merge them, and decide whether `merge-pr.ts` (Human-only) should enforce it;
   - or don't, and fix `clear-backlog/SKILL.md:120` and ADR-0004:151.
5. **Owner identity.** Should ADR-0020 adopt the "no ADR-0017 marker" test?
6. **Dependency changes.** Choose one:
   - make "adds or patches a dependency" explicit, and add `patches/**` and `pnpm-workspace.yaml` to the rule's `paths`;
   - or leave patching under "behaviour no test covers".
7. **Inventory edits.** May a session other than `audit-skills` change `importance` or `role`?
8. **Human-only list homes.** The ADR-0025 rewrite lists eight Human-only paths, but ADR-0004 says the list "lives nowhere else". Recommendation: ADR-0025 names roles, not paths.
9. **ADR-0019 cleanup.**
   - Rename the file (the slug names the rejected patch)? It needs a rule path update and two code cites.
   - Refresh or retire `scripts/repro-236.ts`?
10. **ADR-0028's homes.** Should the research-sourced rejected alternatives and the byte measurements stay in the ADR, or in the research note only? Right now the note says it keeps the rejected avenues, and the ADR copies them.
11. **ADR-0022's Why.** The safety reason changed from "a human merges" to "the Gate". Does that count as "decision unchanged"?
12. **Rule-only facts pulled up into ADRs.**
    - Facts: ADR-0003's harness override and one PR per branch; ADR-0004's Stop hook, the full gate left to CI, and the base-drift `major` Friction; ADR-0014's `pnpm install` after a rebase.
    - Choose one: accept them in the ADRs, or trim the rules.
    - Also fix the ADR-0014 rule's "mirror every `#` alias" line: `#catalog` has no vitest alias.

## Patterns in what the rewrites miss, and prompt changes

The rewrites are strong on the ADR's own text: every amendment applied, history cut, and stale claims checked against code. What they miss comes from never looking at the callers.

1. **Caller-held edge cases are lost.** Items 1, 5, 6, 7 and 8 above are limits that callers rely on but that the old ADR text stated weakly or not at all. The rewrite's inventory reads only the ADR, its amendments and its rule.
   *Prompt change:* add a step 1b: "Grep live callers: `rg -n 'ADR-{NNNN}' --glob '!layers/journal/content/**' --glob '!docs/adr/{NNNN}-*'`. List every claim a caller makes about this ADR. Each claim must end up answered in the rewrite, deliberately contradicted (name the caller to fix), or out of scope (name its home). Done when every live caller is mapped."
2. **Trust and security bounds get filed as mechanics.** Example: ADR-0022's Public-comment rule moved to the Skill.
   *Prompt change, under *See*:* "A limit that narrows a grant, a trust tier or a merge right stays in *Scope and limits*, even when a Skill also states it. Only the steps for applying it move."
3. **Present tense for things not yet built.** Example: the Dependabot auto-merge.
   *Prompt change, in step 2:* "For each mechanism the ADR says exists (a workflow, script, label, setting), confirm it exists. If the decision is adopted but not built, say so in Scope ('until X lands, ...') and list it under Open questions."
4. **No cross-ADR check between parallel rewrites.** Examples: the `auto-triage` ledger row, and the Human-only list in both 0004 and 0025.
   *Prompt changes:*
   - Step 4b: "List every fact this rewrite states that another ADR owns, and check that ADR, including any in-flight rewrite in `rewrites/`, says the same."
   - Add a final consolidation pass across all rewrites before landing.
5. **No repoint list for callers.** Callers cite things that disappear in a rewrite:
   - dated amendments, section names ("Decision section", "Consequences"), numbered items ("rule 2", "wiring #3");
   - verbatim quotes (ADR-0023 quotes "a sweep fired from a Public context", and the rewrite changed it to "run");
   - dropped terms ("autonomy tier", "high-risk set", "auto-merge exemption ledger", "low-risk tier").

   Only some reports listed these.
   *Prompt changes:*
   - New report section 7, "Callers to repoint": file:line → new anchor, for each such citation.
   - "Keep a phrase verbatim when a live caller quotes it, unless it is wrong."
6. **The line between constants and duplicates is unclear.**
   - Some numbers stay in the ADR as limits (40 days, 60 s, ~2 minutes), which is fine.
   - Other content duplicates another home: the byte measurements and rejected avenues (research note), the Inventory members and the "disuse never lowers a grade" rule (`CONTEXT.md`), and Human-only paths (the rule's `paths`).

   *Prompt change:* "Keep a number or list in the ADR only if an agent acts on it and no other file is its home. If another file is the home, point to it and don't copy."
7. **Rule-only procedure gets pulled into ADRs.** ADR-0030 says the ADR is the source, so writers lifted procedural rule lines into Scope. Examples: "log a `major` Friction", "even when the Stop hook asks".
   *Prompt change, in step 4:* "If a rule-only fact is procedure, propose moving it from the rule to `docs/agents/` instead of adding it to the ADR. Add only rule-only *decisions*."
8. **Miscitations are caught only by chance.** Example: ADR-0025's rewrite caught "write isolation (ADR-0020)", but the ADR-0020 rewrite did not.
   *Prompt change:* covered by 1. Mapping callers exposes citations that cite the wrong ADR.