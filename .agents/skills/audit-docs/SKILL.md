---
name: audit-docs
description: Audit every live doc and Skill for drift, duplication, contradiction, and ambiguity against the code — fact-check each finding, fix the safe ones, and file an issue (never ask) for anything needing a human call. Opens one gated PR for a human to merge.
disable-model-invocation: true
---

# Audit Docs

Keep the repo's prose honest against the code. Agents act on documented state, so
here a stale doc is a **behavioural** bug (`CLAUDE.md`). This is a
`consolidate`-family maintenance sweep (ADR-0003): it fact-checks each finding and
**fixes it bravely**, opening one gated PR for a human to merge — filing an issue
only for the rare case it genuinely can't tell which of two conflicting facts is
correct. It runs start to finish **without interaction**.

> **Autonomous, bounded.** Runs unattended, fact-checks every finding, and
> **fixes bravely** — but the merge itself follows ADR-0003's default for
> `consolidate`-family jobs: **gated PR, human merge.** `audit-docs` has no
> auto-merge exception of its own (`digest`'s is the sole named one, scoped to
> that one Skill — ADR-0003 amendment); claiming one here would be exactly the
> kind of unauthorized-overclaim this Skill exists to catch elsewhere. It edits
> only *live* docs, **never** rewrites a historical record's decision or a pack
> template, and is **brave by default**: it decides scope itself and fixes,
> escalating to an issue only for an unresolvable factual conflict.

## The three tiers — what you may touch

Classify every surface **before** editing. This decides everything.

- **Live** — the editable guidance: `CLAUDE.md`, `CONTEXT.md`, `README.md`,
  `docs/agents/*`, `docs/research/*`, `tests/README.md`, `deploy/README.md`, and
  our own Skills' `SKILL.md` + sibling files (`external: false`). **Fix these.**
- **Historical** — the append-only record: `docs/adr/*`, journal digests and
  session logs, blog posts. **Never rewrite a decision.** A drifted ADR still gets
  the brave fix — the repo's sanctioned **amendment banner / Status-line pointer**
  (ADR-0018), never a rewrite of the decision — but ADRs are human-only (ADR-0004),
  so that edit rides its own PR, kept separate from step 7's routine reconciliations
  (both are human-merged, but reviewed independently).
- **Pack-generic** — external-pack Skills (`external: true`; e.g.
  `setup-matt-pocock-skills/*`, the `*-FORMAT.md` templates). Generic and
  re-installable, so a rewrite is clobbered on re-install (ADR-0005). **Never
  rewrite them** — where they diverge from repo reality, note the reconciliation
  in a *live* doc instead.

## The four lenses

Fan out one read-only reviewer per lens (Agent tool, in parallel), each returning
findings as `file:line + quoted evidence`:

- **Drift** — a doc describes a mechanism, path, or term the code no longer
  matches. Sharpest source: a decision reversed at its *new* home but not swept
  back to its referrers — grep the removed noun (`generator`, a deleted job name,
  an old path) across all docs.
- **Duplication** — a fact restated in >1 place instead of single-homed. The home
  keeps it; every copy becomes a pointer.
- **Contradiction** — two docs (or two parts of one) instruct opposite things, or
  assert facts that can't both be true *now*.
- **Ambiguity** — an undefined threshold that gates an action, an enum listed only
  by its endpoints at its own home, or a "see X" whose named owner doesn't hold
  the thing.

## Fact-check before you touch anything

Every finding is a **hypothesis** until verified against **primary sources** — the
actual file at the cited line, and the code it describes (`content.config.ts`,
`shared/expand.ts`, `modules/routing.ts`, the schemas). Dispatch one independent
checker that re-derives each claim from scratch and returns **CONFIRMED /
CONFIRMED-BUT** (corrected line or quote) **/ WRONG**. Act only on CONFIRMED(-BUT).
A plausible-but-wrong finding acted on is a fresh drift *you* authored.

## Fix bravely — escalate only a true factual conflict

**Fix every confirmed finding. That is the default, and be brave about scope** —
reconcile the doc to the code and primary sources, single-home the duplicates,
resolve the contradiction by making the prose match reality, pin the undefined
threshold, retire a term whose premise is dead. Don't stop to ask how far to
reach, and don't file an issue for a judgement call — **decide it and fix it.**

**File a `needs-triage` issue for one thing only: a factual conflict you genuinely
cannot resolve.** Two sources state contradictory facts and the primary sources
(code, schemas, ADRs) don't settle which is correct — the right value turns on
human-held intent you can't recover. Then file it (both readings + your best
guess), leave that one finding, and move on. Search first (`search_issues`), never
re-file an open one, and append the provenance footer (ADR-0017). This is the
*sole* reason to file — everything else, you fix.

## 1. Branch off `origin/main`

Branch `journal/audit-docs-<today-UTC>` off `origin/main` (CLAUDE.md's
chartered-job branch convention — a caller-pinned designated branch overrides
this default name). Done when you are on a fresh branch off the latest
`origin/main`.

## 2. Inventory & classify

Glob every `*.md` outside `node_modules`, plus each `.agents/skills/*/`. Sort every
surface into the three tiers above; a Skill's tier comes from its `external` flag
(Skill Inventory `.yml` / its own frontmatter). Done when every surface is tiered.

## 3. Review across the four lenses

Fan out the four read-only reviewers and pool their findings. Done when all four
have reported.

## 4. Fact-check the findings

Dispatch the independent checker over the pooled findings; drop every WRONG,
apply every CONFIRMED-BUT correction. Done when each surviving finding is
CONFIRMED(-BUT) with an accurate `file:line`.

## 5. Fix bravely

Fix every surviving finding in place, deciding scope yourself; file a
`needs-triage` issue **only** for an unresolvable factual conflict (search first,
never re-file). Done when every confirmed finding is fixed or — for a true factual
conflict — filed, with none left undecided.

## 6. Clear the safety gate

Run `pnpm gate` (ADR-0004; CLAUDE.md's **Self-verification** section owns what
it runs). Most doc edits don't touch the build, but run it anyway — a Skill's
frontmatter or a moved path can. Done when it's green.

## 7. Commit, push, open one gated PR

Commit the fixes (one run rides one commit/PR), push with retry, and open **one
gated PR** listing what was fixed and any issue filed. **A human merges it** —
never self-merge or enable auto-merge (ADR-0003): `consolidate`-family sweeps get
the same gated-PR/human-merge default as any other autonomous job, and
`audit-docs` carries no auto-merge exception of its own (`digest` is the sole
named one, scoped to that one Skill). Subscribe to the PR's activity and babysit
it to merge/close (CLAUDE.md); keep the PR description in sync with what it
contains. Leave a one-line PR comment as the audit trail.

**Keep human-only-surface fixes out of this PR.** A fix that touches an ADR's
amendment banner, CI, isolation logic, or the manifest-expansion/routing modules
never rides in the routine-reconciliation PR above — file it as its own, separate
PR (see the Historical-tier note above). If the gate is red for a reason that
isn't yours, diagnose and fix on the branch rather than merging red; if it's
genuinely not yours to fix, say so honestly in the PR instead. Done when the PR
is merged, or open and honestly escalated.
