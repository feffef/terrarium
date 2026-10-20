---
name: audit-docs
description: Audit every live doc and Skill for drift, duplication, contradiction, ambiguity, needlessly complicated or verbose wording and stale-narration (one doc family per run), mis-location, and recently-added surfaces missing the reference they deserve — fact-check each finding, fix the safe ones, and file an issue (never ask) only for a factual conflict no primary source settles. Opens one self-merging gated PR, plus one human-reviewed PR for any escalated fix.
disable-model-invocation: true
---

# Audit Docs

Agents act on what the docs say, so a stale or muddled doc is a behaviour
bug. This run keeps the repo's prose true to the code and plain enough to act
on. It runs without a human: reviewers find problems, checkers confirm them,
you fix them and merge your own PR on a green gate. CLAUDE.md's "Keep it
short" governs every edit.

A run opens up to two PRs:

- **The sweep PR** (§8): every fact-checked fix that §8 doesn't escalate.
  You merge it.
- **The escalation PR** (§8): the few fixes a human must merge.

## 1. Get on a working branch

Goal: work on the right branch from the start.

### Instructions

Follow CLAUDE.md's "Stay on the branch your session started on".

Done when you are on that branch, or on a fresh one cut from `origin/main`.

## 2. Sort every surface into a tier

Goal: know, before any edit, what you may change. Each surface is in one of
four tiers or on the skip list.

### Instructions

1. Glob every `*.md` outside `node_modules`, every `.agents/skills/*/`
   folder and every Skill Inventory entry
   (`layers/journal/content/current/skills/*.yml`).
2. Put each one in a tier, or on the skip list:
   - **Live** (fix these): `CLAUDE.md`, `GLOSSARY.md`, `GLOSSARY-MAP.md`,
     `README.md`, `SECURITY.md`, `docs/agents/*`, `docs/research/*`,
     `docs/proposals/README.md`, `tests/README.md`, `deploy/README.md`, each
     `layers/<tenant>/GLOSSARY.md`, our own Skills (not keyed in
     `skills-lock.json`) with their sibling files, the journal's facing pages
     `layers/journal/content/current/pages/{architecture,highlights,history,how-it-works,index,real-and-invented,routines}.md`,
     and Skill Inventory entries.
   - **Decisions:** `docs/adr/*`. An ADR states the current decision
     (ADR-0030). Fix a drifted one in place, but never change what it
     decided. Every ADR edit escalates (§8).
   - **Historical:** session logs and blog posts. Never edit them.
   - **Pack-generic:** external pack Skills (keyed in `skills-lock.json`, e.g.
     `setup-matt-pocock-skills/*`, the `*-FORMAT.md` templates). A re-install
     overwrites any edit, so never rewrite them. Where one disagrees with the
     repo, note it in a Live doc.
   - **Skip:** Tenant content that makes no claim about the Terrarium
     (`GLOSSARY-MAP.md`'s Relationships section names those Tenants), Glass
     Box pages (`glassbox-update` keeps them), `docs/proposals/<N>-*.md`
     bodies and `.out-of-scope/*.md`.

Done when every surface has a tier or is on the skip list.

### Edge cases

- A journal Digest is a summary, not a record. Fix a wrong fact in it with
  an ordinary PR (ADR-0010).
- In an Inventory entry, never change the `importance` grade.
- Audit the source `.md`, not the rendered page: the dashboard shows only
  part of `index.md`, but all of its source counts.

## 3. Review with the eight lenses

Goal: a pool of findings from four reviewer agents, each looking through two
lenses.

### Instructions

1. Pick this run's **concision family** (for Agent C). Find the newest
   `origin/main` commit whose subject ends `(<name> concision family)` and
   take the next family, wrapping after 4. With no such commit, take number
   `$(( 10#$(date +%j) % 5 ))`. The families:
   - 0 `root`: `CLAUDE.md`, `GLOSSARY*.md`, every Live README, `SECURITY.md`,
     `layers/*/GLOSSARY.md`;
   - 1 `docs/agents`: `docs/agents/*`;
   - 2 `docs/research`: `docs/research/*`;
   - 3 `skills`: our own Skills with their sibling files;
   - 4 `journal`: the journal's facing pages and Inventory entries.
2. Dispatch four read-only reviewer agents in parallel, one per pair of
   lenses below. Each is a leaf: it reviews by itself and returns its
   findings directly, with no subagents and no waiting on other agents.
3. Tell every agent the finding format: the file plus the exact sentence,
   quoted whole with its line breaks, plus replacement text. No line ranges
   (reviewers get them wrong). A finding outside its own lenses is still
   reported, named by its lens, and joins the pool like any other.
4. Save each agent's reply verbatim into one pooled scratchpad file with
   `pnpm exec tsx scripts/session/save-handback.ts <agent-id> <out>`.

**Agent A, Freshness.** Fetch `origin/main` first
(`docs/agents/git-conventions.md`), then start from
`git log --since="48 hours ago" origin/main` and its diff.

- **Drift:** a doc describes a mechanism, path or term the code no longer
  matches. Most often a decision changed at its new home and its referrers
  weren't updated, so grep every noun the diff removed (an old path, a
  deleted job name) across all docs. For a Skill, its Inventory entry's
  `observations` may back up a finding.
- **Orphan-addition:** something added in the last 48 hours that lacks the
  reference it needs. Only two cases count:
  1. a new `docs/agents/*` doc named neither in CLAUDE.md's "Docs you must
     read first" nor by a `.claude/rules/` rule (ADR-0029): add the link.
     `docs/research/` is unindexed on purpose.
  2. a new ADR that changes another ADR's decision while the old one still
     states it (ADR-0030): rewriting the old ADR escalates (§8).

  Older additions are out of scope. Never add a hand-kept ADR list to
  `CLAUDE.md`.

**Agent B, Single-home.** Run `pnpm exec tsx scripts/session/audit-skills.ts`
for `docReadCounts` (how many recent sessions opened each doc). A fact in a
doc nobody opens is in the wrong home, however correct. Use a count only to
back up a finding reached another way; the field's docstring says why it
undercounts.

- **Duplication:** a fact stated in more than one place. The home keeps it;
  every copy becomes a pointer. A file stating its own specific case plus a
  pointer to the home is fine. The ADR summary rules in `.claude/rules/` are
  a deliberate copy of their ADRs; `validate-adr-rules` keeps the two in
  step.
- **Mis-location:** a fact or file in the wrong home: implementation detail
  in `GLOSSARY.md`, a status story in `CLAUDE.md`, a repo-wide convention
  buried in a `docs/agents/*` topic file (move it, leave a pointer), or a
  misfiled file (`git mv` it).

**Agent C, Concision.** Cut words, never meaning or a load-bearing "why".
Brief it with the concision family's full file list.
It reads every file in full and reports every finding, with no cap. Split
the family across agents if one can't hold it.

- **Verbose:** wording more complicated than its meaning: the same fact said
  twice, filler, long or nested sentences, stacked caveats and
  parentheticals, jargon or coined terms where a plain word is exact. Rewrite it in the plainest words that keep every
  rule, condition, exception and pointer. If that can't be done without
  losing one, leave it.
- **Stale-narration:** a doc correct about the present that still tells a
  superseded past ("we used to do X"). Cut it to the rule plus a pointer to
  where the history lives (an issue or PR), and only where the history
  changes no reader's action.

**Agent D, Coherence.**

- **Contradiction:** two docs, or two parts of one, give opposite
  instructions or state facts that can't both be true now.
- **Ambiguity:** no single clear instruction can be read out: an undefined
  threshold that gates an action, an enum listed only by its endpoints at
  its home, or a "see X" where X doesn't hold the thing.

Done when every agent has reported, every file in the concision family was
read in full, and every reply is in the pooled file.

### Edge cases

- **Keep "don't regress" reasons.** Stale-narration never cuts a reason that
  stops the old way coming back (e.g. `CLAUDE.md`'s never-`pkill` rule,
  `dispatch-subagents`' worktree-HEAD rule, `environment-caveats.md`'s
  `permissions.allow` bullet). Retiring one is a Prune Trial's call.
- Moving a journal `pages/*.md` changes its route (ADR-0006), so that move
  escalates (§8).

## 4. Merge overlapping findings

Goal: one finding per stretch of text, so two fixes never fight over the
same words.

### Instructions

1. Merge findings whose quotes overlap, across agents too.
2. Where two agents reach opposite verdicts on the same text, read the
   primary source and keep one.

Done when no two findings cover the same text.

## 5. Fact-check every finding

Goal: act only on findings an independent checker confirmed, never on your
own inline check. A wrong finding acted on is new drift you wrote.

### Instructions

1. Dispatch independent checkers over the whole pool (split a large pool).
   Point each at the pooled file to read; never retype findings into a
   prompt.
2. Each checker re-derives every claim from scratch and returns
   **CONFIRMED**, **CONFIRMED-BUT** (with the corrected line or quote) or
   **WRONG**, checking each lens against its source:
   - **Drift, Contradiction:** the code (`scripts/`, `content.config.ts`,
     `shared/`, `modules/`, the schemas) and the ADRs.
   - **Duplication, Mis-location, Ambiguity:** the home convention: which
     doc owns the fact, and does it really hold it. A cited read count is
     re-run, never remembered. For Mis-location, first read any originating
     issue or PR the target doc names or implies; a placement stated there
     wins.
   - **Orphan-addition:** git history (added within 48 hours?) and the
     expected home (is the reference really missing?).
   - **Verbose:** the original text. List every rule, condition, exception
     and pointer in it. The rewrite must keep each one and be shorter or
     plainer; anything lost or changed makes it **WRONG**.
   - **Stale-narration:** the superseded state (really gone?). A cut that
     loses a "don't regress" reason is **WRONG**.
   - **Any lens, when the fix edits an ADR or its summary rule:** from the
     original text, state what the ADR allows, forbids and excepts. A
     rewrite that changes any of them is **WRONG**.
3. Drop every WRONG; apply every CONFIRMED-BUT correction.

Done when every finding has a verdict, and every CONFIRMED(-BUT) one has an
accurate `file:line`.

## 6. Fix

Goal: every confirmed finding fixed, without asking anyone.

### Instructions

1. Check `.agents/prune-trials.yml` first. Text inside an open Prune
   Trial's territory is terse on purpose and under watch: keep it as it is,
   record the finding as a Friction for `prune-trial` to weigh, and move on.
2. Fix every other surviving finding in place, using only the
   checker-confirmed text. Decide scope yourself. Don't ask, and don't file an issue for a
   judgement call.
3. Two ADRs that contradict each other: fix it in the escalation PR, keeping
   the more specific ADR unless git history or the code shows it is a
   leftover. If neither settles it, file an issue (item 4).
4. File a `needs-triage` issue for one thing only: two sources state
   conflicting facts and no primary source (code, schemas, ADRs) settles
   which is true. Check for an open duplicate first
   (`scripts/github/list-open-issues.ts` or a scoped `list_issues`;
   `docs/agents/github-integration.md`) and never file one twice. Write it
   per `docs/agents/issue-tracker.md`'s "Filing an issue", with the
   provenance header, both readings and your best guess. Leave that finding
   unfixed and move on.

Done when every finding is fixed, or filed as a true factual conflict.

### Edge cases

- If the confirmed text leaves a gap (it names a place but doesn't word the
  fix), send the gap back to a checker as a new finding. Never fill it
  yourself.

## 7. Commit, review and gate

Goal: a committed, reviewed head with a green gate, ready to push.

### Instructions

Follow step 1 of `docs/agents/pr-workflow.md`'s "Closing a scheduled run's
PR": commit, review, then run `pnpm gate:scoped` last, on the final head.

Done when the gate is green.

### Edge cases

- Run the gate even for doc-only edits. An edit under `layers/` (an
  Inventory `.yml`, a journal page) runs the full gate, and even the
  smallest gate still runs `verify:skills-lock` and `validate:content`.

## 8. Open the PRs and merge

Goal: the sweep PR merged on green, and any escalated fixes in front of a
human.

### Instructions

1. Follow the rest of `docs/agents/pr-workflow.md`'s "Closing a scheduled
   run's PR" for **one** sweep PR with one commit:
   - its subject ends with the concision family's name, e.g.
     `audit-docs: 2026-10-14 sweep (docs/research concision family)`;
   - its body lists the fixes and any issue filed;
   - its verdict comment records the audit in one line plus
     `Reviewed: <head sha>` (`pr-workflow.md`'s "The recipe", step 4).
   Merge it yourself on green (ADR-0004).
2. Move these fixes into **one** separate escalation PR for a human to
   review and merge:
   - any change to a Human-only path, which includes every ADR edit (an
     Orphan-addition fix too);
   - isolation logic;
   - a journal `pages/*.md` move that changes its route.
   Subscribe to it and follow it until it merges or closes.
3. Log the session (ADR-0009). Its summary names the concision family and
   the verdict counts (CONFIRMED / CONFIRMED-BUT / WRONG).

Done when the sweep PR has merged green, or is open and honestly escalated.

### Edge cases

- If an earlier sweep's escalation PR is still open and touches the same
  file, add to it instead of opening another.
