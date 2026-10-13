# Handoff: ADR rewrite

For the next session: the owner reviews and fine-tunes the full rewrite in
PR #1898. This file says where things are and what happened; it points to the
other files rather than repeating them.

## Where things are

- **PR #1898, branch `claude/adr-rewrite`** (one commit on `main` at 41876bde):
  the deliverable. All 30 ADRs rewritten in ADR-0030's shape, every summary
  rule rewritten, ~150 callers repointed, the gate check, the template, and
  everything #1892 carried except this folder. CI green (`safety-gate`,
  `label`). Waits for a human merge (Human-only files). Its description lists
  the 12 decisions for the owner; that list is the review agenda.
- **PR #1892, branch `claude/adr-rewrite-prep-b8fijv`** (this one): the
  working base, kept open and unmerged. It holds this folder and an older copy
  of the ADR-0030 work. Close it unmerged once #1898 lands; its non-folder
  changes are all in #1898.
- **Issues filed this session:** #1895 (`merge-pr.ts` can merge a
  guest-pipeline PR), #1896 (scope the ADR-0022/0023 rules to their Skills),
  #1897 (two `.github/workflows/` comment edits agents can't push; diff in
  `docs/proposals/1897-workflow-comments-adr-rewrite.md` on #1898).

## What happened this session

1. **Grilling** narrowed `decisions.md` into ADR-0030 (now titled *ADRs
   document a decision, not its history*): readers; *Scope* replaces "limits"
   (an agent showed most limits already live in Skills or code, and repeated
   numbers drift); mechanics only pointed to; keep a detail only if a reader
   of some code or doc needs the ADR to understand it; a rejected alternative
   only if someone could plausibly propose it again; fewer glossary terms;
   same-PR rule rewrite, caller repoint and new homes; no "split later" note
   (splits go to a tracking issue). The template moved to
   `docs/adr/TEMPLATE.md`. `CLAUDE.md`'s glossary line changed to match.
2. **Gate check** in `scripts/validate-adr-rules.ts`: every ADR starts with
   `# ADR-NNNN:` and carries no date, status line or amendment banner.
3. **Prompts:** `adr-rewrite-prompt.md` (v7) adds a step that traces each part
   of an ADR to the reason it was added (amendment, `git log`, its PR) and
   sorts it as live, mechanics, leftover or policy question; the run drafts the
   summary rule, caller edits and new homes. `expectations-prompt.md` writes
   items in plain words, tagged decision or mechanic. Refs were regenerated
   (1,181 references).
4. **Test run** (v6) on 0004, 0015, 0022, 0023, 0028 read far better than
   v1–v5; v7 then ran on the other 24 (24 blind checklists, 24 rewrites).
5. **Assembly on the fresh branch:** 3 agents wrote summary rules, 4 agents
   repointed callers by disjoint area (code, Skills, docs, Tenant layers), a
   consistency agent and the `code-review` Skill found contradictions between
   ADRs, and I fixed them (one home per fact, who merges guest and
   Public-request PRs, ADR-0007's overlap, dangling cross-references).
   `gate:scoped` green; 2,145 unit tests pass.

## The working files (this folder)

- `rewrites/NNNN.md` and `-report.md`: each agent's draft and report. **The
  drafts are not the final text**: #1898 changed many of them in the
  consistency pass. Read #1898's `docs/adr/` for the truth. The reports keep
  their value: per-part reasons, policy questions with recommendations, and
  the caller edits drafted.
- `expectations/`, `refs/`: v2 checklists and the regenerated reference maps
  for all 30 ADRs.
- `decisions.md`: the owner's answers, plus this session's (issues for known
  gaps, the ledger goes whole, one-shot rewrite).
- `comparison/SUMMARY.md`: v1's policy questions; most are now settled in
  #1898 or listed in its description.

## Things learned that aren't written down elsewhere

- **Subagents can't load the `writing-for-agents` Skill** (the skill-inline
  guard refuses it); brief them to Read its `SKILL.md`.
- **Agents can't push `.github/workflows/`, and the workflow-edit guard (#897)
  blocks even restoring such a file to `main`'s version.** Keep workflow files
  out of caller-repoint briefs. Here the branch was rebuilt from `main` with a
  patch that excluded them.
- **Parallel rewrites restate shared facts in several ADRs.** A cross-batch
  consistency pass after the rewrites is essential, not optional.
- **Rule agents follow a report's `paths` advice blindly**; the ADR-0029 rule
  lost `docs/agents/**` and had to get it back.
- **One Tinkerfund e2e step** (`tinkerfund-flows.spec.ts:387`, `goForward`)
  timed out once in `gate:scoped` and passed on re-run.

## Contradictions and open points

Known after this session, as #1898 stands. Each report in `rewrites/` has the
detail and a recommendation.

**Contradictions still in the repo**

1. **Cross-Tenant reads.** ADR-0025 lets any Tenant layer use the read
   functions (the Blog already reads Journal Digests); the old "only a
   governed set of Aggregators" rule is gone from `CONTEXT.md`. But the
   ADR-0025 rule's `paths` cover only `layers/commons/**` among the layers, so
   it won't load where the Blog uses the permission.
2. **Digests.** ADR-0010 says a wrong fact in a landed Digest is fixed by an
   ordinary PR; `audit-docs` and `frictions-to-fixes` still call Digests
   historical records that are never edited.
3. **Digest links.** Digests have their own page (ADR-0010), but the Commons
   Timeline links them to the Journal dashboard; ADR-0025 was softened to "where
   its owner shows the item" to cover it.
4. **PRs built from a Public request** need a human merge (ADR-0004, ADR-0020),
   but `merge-pr.ts` can't detect them; only the agent's judgement stops a
   merge. Same gap for guest-pipeline PRs (#1895).
5. **Dependabot.** `dependabot.yml` and `pr-workflow.md` now say a human merges
   its PRs; proposal #1633 wants auto-merge, which would need an ADR-0004
   exception. ADR-0004's "adds a dependency, or changes how one behaves" may
   or may not cover a plain version bump.
6. **Open prune trial on ADR-0009** (opened 2026-10-12, shell-read text), while
   ADR-0027 now keeps trials away from ADRs. #1898 rewrites that text and
   repoints the trial's territory; the trial's verdict is unsettled.
7. **Fail-open hooks.** The "a trial-proposed hook warns and exits 0" rule is
   dropped from ADR-0027 and the prune-trial Skill; the hint scripts no longer
   cite ADR-0027 for failing open. Whether any doc should own a fail-open
   policy is open (`docs/agents/guards.md` states it per hint).
8. **ADR-0007** is recast as "derived files are built, not committed" — a
   synthesis no single source stated. It overlaps ADR-0013 and ADR-0014, and
   its new rule loads on the same files as theirs.
9. **File names contradict titles**: 0007 (`generated-config-committed…`),
   0013 (`…committed-routing-map`), 0017 (`provenance-footer…`), 0019
   (`patched-…`), 0011 (`poc-…`). Kept as stable ids.
10. **ADR-0012** is a Blog-only decision, though ADR-0021 says demo Tenants get
    no ADR.
11. **Pingbacks** are edited and deleted with their posts, yet ADR-0009's
    "the schema only grows, logs are never migrated" covers them (ADR-0012).
12. **Same fact, several homes:** "cut an instruction before adding one" is in
    `CLAUDE.md`, ADR-0027 and its rule; the glossary sentence in `CLAUDE.md`
    overlaps `docs/agents/domain.md` and ADR-0030.
13. **`.github/workflows/` comments** still cite "ADR-0004's high-risk set"
    and old ADR-0020 wording (#1897).

**Unclear, for the owner to decide**

14. Do issues an agent files count as Trusted-authored for `auto-triage`?
    Agents post as the owner (ADR-0022, ADR-0020).
15. Is the session header alone enough to mark a post as AI-written? Guest
    Skills say yes, `auto-triage` adds a notice (ADR-0017). Should writes
    through `gh api` be checked too?
16. Should an `audit-skills` issue about our Skill go through ordinary triage
    or to a human, and does its non-Inventory PR wait for a human (ADR-0015)?
17. Should a failed database download reload the page once by itself, like a
    failed code chunk (ADR-0019)?
18. Must a published URL stay fixed when its file moves (ADR-0006)?
19. A demo Tenant's product decisions in its `CONTEXT.md` are agent-mergeable,
    while the same decision in an ADR needs a human merge (ADR-0021). Intended?
20. ADR-0001 now decides "no store that visitors write to", and its rule no
    longer loads every session. ADR-0011 is no longer called a PoC; should the
    deploy install skip package scripts (`--ignore-scripts`)?
21. `pr-workflow.md` says `midden-catalogue` PRs are owner-merged (#1802);
    not checked against the Skill.
22. ADR-0009 (93 lines) and ADR-0030 (84) stay over the 40–70 guide. Splits
    belong in the tracking issue, which doesn't exist yet.

## Suggested next steps

1. Review #1898 against its "Decisions for the owner" list; ask for changes
   per item. Each ADR's reasons and options are in `rewrites/NNNN-report.md`.
2. Read the shortest-changed and most-cited ADRs first: 0003, 0004, 0020,
   0022, 0023, 0025 (governance) and 0009 (93 lines, over the guide).
3. Decide whether ADR-0007's recast ("derived files are built, not committed")
   stays, and whether ADR file names should change to match their new titles
   (names were kept as stable ids; several now contradict their titles).
4. After #1898 merges: apply #1897, close #1892, open the tracking issue for
   ADR splits and reorganisation, and delete this folder's branch.
