---
name: audit-docs
description: Audit a rotating part of the live docs and Skills each run for drift, duplication, contradiction, ambiguity, mis-location, and recently-added surfaces missing the reference they deserve — fact-check each finding, fix the safe ones, and file an issue (never ask) only for a factual conflict no primary source settles. Opens one self-merging gated PR, plus one human-reviewed PR for any escalated fix.
disable-model-invocation: true
---

# Audit Docs

Agents act on what the docs say, so a stale or muddled doc is a behaviour
bug. This run keeps the repo's prose true to the code and clear enough to act
on. It runs without a human: reviewers find problems, checkers confirm them,
you fix them and merge your own PR on a green gate. CLAUDE.md's "Keep it
short" governs every edit.

A run opens up to two PRs (§6): the **sweep PR**, holding every fix that
isn't escalated, which you merge; and the **escalation PR**, holding the few
fixes a human must merge.

## What you may edit

- **Live** (fix these): `CLAUDE.md`, `GLOSSARY.md`, `GLOSSARY-MAP.md`,
  `README.md`, `SECURITY.md`, `docs/agents/*`, `docs/research/*`,
  `docs/proposals/README.md`, `tests/README.md`, `deploy/README.md`, each
  `layers/<tenant>/GLOSSARY.md`, our own Skills (not keyed in
  `skills-lock.json`) with their sibling files, the journal's facing pages
  `layers/journal/content/current/pages/{architecture,highlights,history,how-it-works,index,real-and-invented,routines}.md`,
  and Skill Inventory entries (`layers/journal/content/current/skills/*.yml`;
  never their `importance` grade).
- **Decisions:** `docs/adr/*`. An ADR states the current decision
  (ADR-0030). Fix a drifted one in place, but never change what it decided.
  Every ADR edit escalates.
- **Historical:** session logs and blog posts. Never edit them. A journal
  Digest is a summary, not a record: fix a wrong fact in it like any Live
  doc (ADR-0010).
- **Pack-generic:** external pack Skills (keyed in `skills-lock.json`). Never
  edit them; the gate rejects it.
- **Skip:** Tenant content that makes no claim about the Terrarium
  (`GLOSSARY-MAP.md`'s Relationships section names those Tenants), Glass Box
  pages (`glassbox-update` keeps them), `docs/proposals/<N>-*.md` bodies and
  `.out-of-scope/*.md`.

## 1. Review with the six lenses

Goal: a pool of findings from three reviewer agents, each looking through two
lenses.

### Instructions

1. Fetch `origin/main` (`docs/agents/git-conventions.md`).
   Read the summaries of the last two audit-docs session logs
   (`grep -l '^trigger: audit-docs'` in
   `layers/journal/content/current/sessions/`). Tell Agents B and C to skip
   the areas their `Covered:` line names, unless a file in one changed since
   that run (`git log --since=<its date>`).
2. Dispatch three read-only reviewer agents in parallel, one per pair of
   lenses below.
3. Tell every agent the finding format: the file plus the exact sentence,
   quoted whole with its line breaks, plus replacement text. No line ranges
   (reviewers get them wrong). A finding outside its own lenses is still
   reported, named by its lens, and joins the pool like any other. Tell them
   to skip text an open trial in `.agents/prune-trials.yml` covers (ADR-0027).
   Tell each to end its reply with the Live files it did not read.
4. Save each agent's reply verbatim into the pool, a new scratchpad folder:
   `pnpm exec tsx scripts/session/save-handback.ts <agent-id> <pool>/<agent-id>.md`.
   Never resume a reviewer to finish; the next run covers what it skipped.

**Agent A, Freshness.** Start from `git log --since="48 hours ago"
origin/main` and its diff.

- **Drift:** a doc describes a mechanism, path or term the code no longer
  matches. Most often a decision changed at its new home and its referrers
  weren't updated, so
  grep every noun the diff removed (an old path, a deleted job name) across
  all docs. For a Skill, its Inventory entry's `observations` may back up a
  finding.
- **Orphan-addition:** something added in the last 48 hours that lacks the
  reference it needs. Only two cases count:
  1. a new `docs/agents/*` doc named neither in CLAUDE.md's "Docs you must
     read first" nor by a `.claude/rules/` rule (ADR-0029): add the link.
     `docs/research/` is unindexed on purpose.
  2. a new ADR that changes another ADR's decision while the old one still
     states it (ADR-0030): rewrite the old ADR (it escalates).

  Older additions are out of scope. Never add a hand-kept ADR list to
  `CLAUDE.md`.

**Agent B, Single-home.**

- **Duplication:** a fact stated in more than one place. The home keeps it;
  every copy becomes a pointer. A file stating its own specific case plus a
  pointer to the home is fine. The ADR summary rules in `.claude/rules/` are
  a deliberate copy of their ADRs; `validate-adr-rules` keeps the two in
  step.
- **Mis-location:** a fact or file in the wrong home: implementation detail
  in `GLOSSARY.md`, a status story in `CLAUDE.md`, a repo-wide convention
  buried in a `docs/agents/*` topic file (move it, leave a pointer), or a
  misfiled file (`git mv` it).

**Agent C, Coherence.**

- **Contradiction:** two docs, or two parts of one, give opposite
  instructions or state facts that can't both be true now.
- **Ambiguity:** no single clear instruction can be read out: an undefined
  threshold that gates an action, an enum listed only by its endpoints at
  its home, or a "see X" where X doesn't hold the thing.

Done when every agent has reported and every reply is in the pool.

### Edge cases

- Moving a journal `pages/*.md` changes its route (ADR-0006), so that move
  escalates.

## 2. Merge overlapping findings

Goal: one finding per stretch of text, so two fixes never fight over the
same words.

### Instructions

1. Merge findings whose quotes overlap, across agents too.
2. Where two agents reach opposite verdicts on the same text, read the
   primary source and keep one.

Done when no two findings cover the same text.

## 3. Fact-check every finding

Goal: act only on findings an independent checker confirmed, never on your
own inline check. A wrong finding acted on is new drift you wrote.

### Instructions

1. Dispatch independent checkers over the whole pool (split a large pool).
   Point each at the pool folder to read; never retype findings into a
   prompt.
2. Each checker re-derives every claim from its primary source (code,
   schemas, ADRs, git history) and returns **CONFIRMED**, **CONFIRMED-BUT**
   (with the corrected line or quote) or **WRONG**. For a rewrite or cut, it
   first lists every rule, condition, exception, pointer and "why" in the
   original (for an ADR: what it allows, forbids and excepts); a fix that
   loses or changes one, or is not shorter or plainer, is **WRONG**. For
   Mis-location, it first reads any originating issue or PR the doc names or
   implies; a placement stated there wins.
3. Drop every WRONG; apply every CONFIRMED-BUT correction.

Done when every finding has a verdict, and every CONFIRMED(-BUT) one has an
accurate `file:line`.

## 4. Fix

Goal: every confirmed finding fixed, without asking anyone.

### Instructions

1. Fix every surviving finding in place, using only the checker-confirmed
   text. Decide scope yourself. Don't ask, and don't file an issue for a
   judgement call.
2. Two ADRs that contradict each other: fix it in the escalation PR, keeping
   the more specific ADR unless git history or the code shows it is a
   leftover.
3. File a `needs-triage` issue for one thing only: two sources state
   conflicting facts and no primary source settles which is true, including
   two ADRs that neither history nor code settles. Search open issues first, then file per
   `docs/agents/issue-tracker.md`'s "Filing an issue" with both readings and
   your best guess. Leave that finding unfixed.

Done when every finding is fixed, or filed as a true factual conflict.

### Edge cases

- If the confirmed text leaves a gap (it names a place but doesn't word the
  fix), send the gap back to a checker as a new finding. Never fill it
  yourself.

## 5. Commit, review and gate

Goal: a committed, reviewed head with a green gate, ready to push.

### Instructions

Follow step 1 of `docs/agents/pr-workflow.md`'s "Closing a scheduled run's
PR": commit, review, then run `pnpm gate:scoped` last, on the final head.

Done when the gate is green.

## 6. Open the PRs and merge

Goal: the sweep PR merged on green, and any escalated fixes in front of a
human.

### Instructions

1. Follow the rest of `docs/agents/pr-workflow.md`'s "Closing a scheduled
   run's PR" for **one** sweep PR with one commit:
   - its subject is `audit-docs: <date> sweep`;
   - its body lists the fixes and any issue filed;
   - its verdict comment records the audit in one line plus
     `Reviewed: <head sha>` (`pr-workflow.md`'s "The recipe", step 4).
   Merge it yourself on green (ADR-0004).
2. Put the fixes a human must merge into **one** separate escalation PR:
   any change to a Human-only path (`.claude/rules/adr-0004-human-merge.md`),
   which includes every ADR edit, and any journal `pages/*.md` move that
   changes its route. Subscribe to it and follow it until it merges or
   closes.
3. Log the session (ADR-0009). Its summary gives the verdict counts
   (CONFIRMED / CONFIRMED-BUT / WRONG) and ends with the areas Agents B and
   C read in full, e.g. `Covered: docs/agents/*, GLOSSARY.md, Skills a-f`,
   even on a no-PR run.

Done when the sweep PR has merged green, or is open and honestly escalated.
