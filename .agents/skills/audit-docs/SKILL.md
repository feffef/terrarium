---
name: audit-docs
description: Audit every live doc and Skill for drift, duplication, contradiction, and ambiguity against the code — fact-check each finding, fix the safe ones, and file an issue (never ask) for anything needing a human call. Opens one gated PR.
disable-model-invocation: true
---

# Audit Docs

Keep the repo's prose honest against the code. Agents act on documented state, so
here a stale doc is a **behavioural** bug (`CLAUDE.md`). This is a
`consolidate`-family maintenance sweep (ADR-0003): it fixes drift and duplication
directly and defers every genuine judgement call to an **issue**, never a
question — it runs start to finish **without interaction**.

> **Autonomous, bounded.** Runs unattended: it edits only *live* docs, **never**
> historical records or external-pack templates, **never** self-merges, and turns
> every human-trade-off decision into a filed issue rather than a prompt. Opening
> the gated PR and subscribing to it is automatic (`CLAUDE.md`).

## The three tiers — what you may touch

Classify every surface **before** editing. This decides everything.

- **Live** — the editable guidance: `CLAUDE.md`, `CONTEXT.md`, `README.md`,
  `docs/agents/*`, `docs/research/*`, `tests/README.md`, `deploy/README.md`, and
  our own Skills' `SKILL.md` + sibling files (`external: false`). **Fix these.**
- **Historical** — the append-only record: `docs/adr/*`, journal digests and
  session logs, blog posts. **Never edit.** An ADR records a decision *as it was
  made*; body drift is corrected by an amendment — a human call → an **issue** —
  never by rewriting history (ADR-0018).
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

## Fix, or file — the autonomy line

For each confirmed finding, exactly one of:

- **Fix it** when the target is **live**, the change is unambiguous, and it only
  *reconciles the doc to an already-decided ADR or to reality* — it decides
  nothing. (Aligning `CLAUDE.md`'s human-only list to ADR-0004, enumerating an
  enum at its glossary home, collapsing a duplicate to a pointer: all fixes.)
- **File an issue** — `needs-triage`, **never ask, never edit** — when the fix
  needs a **human trade-off**: amending an ADR or governance prose; **coining or
  retiring glossary vocabulary** (the rule of two is a human call —
  `docs/agents/domain.md`); or choosing *how far a cleanup reaches*. State the
  finding, the options, and your recommendation, then **proceed with the
  conservative default** (leave untouched whatever needed the call) so the run
  still completes. Append the provenance footer (ADR-0017).
- **Skip** a pack-generic or historical target — record a reconciliation in a live
  doc if warranted, else leave it.

The reconciliation-to-an-existing-decision vs. deciding-something distinction *is*
the line: match the doc to a decision already on record → fix; make or change a
decision → file.

## 1. Branch off `origin/main`

`git fetch origin main` and branch `journal/audit-docs-<today-UTC>` off
`origin/main`. A caller-pinned designated branch overrides this name (branch it
off `origin/main`). Done when you are on a fresh branch off the latest `origin/main`.

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

## 5. Fix, or file

Apply the fix-or-file rule to each surviving finding. Edit live docs in place;
file `needs-triage` issues for the human-call findings — **search first**
(`search_issues`) and never re-file one already open. Done when every confirmed
finding is fixed, filed, or explicitly skipped, with none left undecided.

## 6. Clear the safety gate

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Most doc edits don't touch the build, but run it anyway (ADR-0004) — a Skill's
frontmatter or a moved path can. Done when every step is green.

## 7. Commit, push, open one gated PR

Commit the fixes (one run rides one commit/PR), push the branch with retry, and
open **one gated PR** listing what was fixed and every issue filed. A **human
merges** — never self-merge or enable auto-merge (these edits touch
`CLAUDE.md`/`CONTEXT.md`, ADR-0004's human-only set). Subscribe to the PR and
babysit it to merge/close; keep its description in sync with its content
(`CLAUDE.md`). Done when the gate is green and the PR is open for review.
