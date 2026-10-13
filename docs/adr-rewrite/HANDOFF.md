# Handoff: ADR rewrite prep

For the next session, which reviews and refines the rewrite process (prompts,
decisions, test results), judges the test rewrites, and then plans the real
run. This file holds what isn't in the other files; it points to them rather
than repeating them.

## Where things are

- **Branch** `claude/adr-rewrite-prep-b8fijv`, **PR #1892** (open, green,
  waits for a human merge; don't merge it yet, per `decisions.md`). It holds:
  - ADR-0030 *How we write ADRs* (`docs/adr/0030-how-we-write-adrs.md`) and the
    consistency fixes (ADR-0018 editing section removed; audit-docs,
    prune-trial, frictions-to-fixes, ADR-0021/0027/0029, `CONTEXT.md`,
    `docs/agents/domain.md`);
  - ADR rewrites taken out of Prune Trial scope (ADR-0003/0004/0027, the
    Skill, `pr-workflow.md`, `CONTEXT.md`, the human-merge rule) and
    `merge-pr.ts --prune-trial` removed with its test inverted;
  - ADR-0029 stating a summary rule's two jobs;
  - `docs/adr-rewrite/`: the working folder, temporary. To be pruned from
    history before anything lands (the owner plans a rebase and deleting the
    remote branch).
- **The owner's answers:** `docs/adr-rewrite/decisions.md`. Read it first;
  it overrides the sources and the prompt where they disagree.
- **Index of the working files:** `docs/adr-rewrite/README.md`.

## How the process evolved

All test runs rewrote existing ADRs 1:1 into the scratchpad, never the repo.

| Version | Prompt change | What it taught us |
|---|---|---|
| v1 (10 ADRs: 0003 0004 0008 0014 0015 0019 0020 0022 0025 0028) | Inventory from ADR + amendments + rule | Format holds; ~39% shorter. Gaps came from never looking at callers: lost edge cases, no repoint list, cross-ADR mismatches. See `comparison/SUMMARY.md`. |
| v2 (0004, 0022) | Map every live caller from the blind checklists; repoint list; cross-ADR check; mechanisms must exist | Gaps closed, but keeping quoted wording made the text stiff and jargon-heavy. |
| v3 | Plain language first; callers never shape wording | Coined phrases gone; still long sentences and terms like "chartered job", "Gate". |
| v4 | Glossary only to read sources; short sentences; 40–70 line guide; state decisions as they apply today | Owner: 0022 reads OK; 0004 still far too detailed (93 lines). |
| v5 (0004 only) | Say what a mechanism guarantees, not how it works | 0004 at 63 lines. The owner has not judged it yet. |

The current prompt is `docs/adr-rewrite/adr-rewrite-prompt.md` (v5). It still
says "Don't split or merge" and writes to the scratchpad. It does not yet
reflect the grilling answers in `decisions.md` (limits out of the ADR, rule
rewritten in the same PR, callers repointed in the same PR, the *When to
revisit* split note). Updating it is the first job of the next session.

The caller checklists (`expectations/`) were built blind: one agent per ADR,
reading only `refs/NNNN.md`, never the ADR. They classify each reference by
role and tag items with their template section; `expectations-prompt.md` is
their prompt. The `refs/` come from `refs/find_refs.py.txt` (live code and docs
only).

## Things learned that aren't written down elsewhere

- **Subagents can't spawn subagents.** Blind per-ADR agents have to be started
  from the main session. A subagent can message another agent, but the reply
  comes back to the main session, so the main session relays questions.
- **Blindness has a leak.** The summary rules for 0001, 0003, 0004, 0009, 0017,
  0020, 0022, 0023 and 0027 load into every session, subagents included. The
  agents for those ADRs saw the summary, never the full ADR.
- **Subagents sometimes can't write files.** One was stopped by a safety
  filter mid-write, and the harness refused another's summary file. The main
  session extracted their reports from the transcripts instead.
- **`docsRead` folds in subagent reads** (since August), so a session log
  without ADR reads means its subagents read none either.
- **Session-log evidence** (`background/session-log-usage.md`): summaries carry
  the everyday instruction. Full ADRs are opened mostly by subagents looking
  for the ADR that binds an issue, and for limits and exceptions.
- **`CLAUDE.md` says "Use the glossary's terms"**, which conflicts with
  ADR-0030's plain-language rule for ADRs. `CLAUDE.md` is untouched.

## Open questions

- **Owner hasn't judged** the v5 0004 rewrite (`rewrites-v5/0004.md`).
- **Policy questions** surfaced by the rewrites, to settle per ADR in its PR
  (`comparison/SUMMARY.md` lists them with detail):
  - Dependabot: ADR-0003 lets a bot merge PRs that change `package.json`,
    which is Human-only; the workflow (proposal #1633) was never applied.
  - The Blog reads the Journal through `queryPages`, yet `CONTEXT.md` says
    only Aggregators read across Tenants (ADR-0025).
  - PRs an agent builds from a Public issue: `merge-pr.ts` would merge them,
    `clear-backlog` assumes a human does (ADR-0020).
  - Owner vs agent identity: the "no ADR-0017 marker" test (ADR-0020).
  - Patching a dependency: explicit exception, `patches/` on the list?
  - Who besides `audit-skills` may change an Inventory entry's grade.
  - ADR-0019's file name names the rejected patch; rename?
  - Needing a human merge: a reason for auto-triage to escalate?
  - `workflow_run` triggers: forbidden or fine without checkout (ADR-0020 vs
    #1633)?
- **Drift found, to fix with each ADR:**
  - ADR-0004's summary rule says `merge-pr.ts` refuses all five exceptions;
    it refuses only Human-only paths, forks and authors without write access.
  - ADR-0005 claims the build reads `.claude/rules/*.md`; no reader was found.
  - ADR-0014's rule says to mirror every `#` alias in vitest; `#catalog` has
    none on purpose.
  - The "write isolation (ADR-0020)" citations in catalog and Timeline code
    should cite ADR-0025.
  - ADR-0009, 0020 and 0022 still say "no self-merge" in places.
- **To build:** the gate check that a new-format ADR has no dates, status
  lines or amendment banners (`scripts/validate-adr-rules.ts` is the likely
  home).

## Suggested next steps

1. Review `decisions.md`, the v4/v5 rewrites and their reports; refine the
   prompt to match the grilling answers.
2. Decide the per-PR workflow and the first group of 2–3 ADRs (0022 and 0023
   are a natural start: small, tested, related).
3. Decide whether PR #1892 should land first (it holds ADR-0030 and the
   prune-trial change) once `docs/adr-rewrite/` is moved off it.

## Suggested Skills

- `grilling`: to settle the per-PR workflow and the open policy questions.
- `writing-for-agents`: before touching the prompt, ADRs or summary rules.
- `domain-modeling`: when editing ADRs or glossary terms.
- `dispatch-subagents`: before starting the per-ADR agents.
- `code-review` and `close-session`: when a PR goes up.
