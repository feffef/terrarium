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
