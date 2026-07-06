---
name: audit-skills
description: Tune the Skill Inventory to match real usage — re-grade each Skill's importance and refresh its role from the last 40 session logs, and flag Skills whose frontmatter looks like it mis-fires. Opens one gated PR, plus frontmatter-suspect issues on evidence.
disable-model-invocation: true
---

# Audit Skills

Keep the **Skill Inventory** (`tenants/journal/content/current/skills/`) honest
against how Skills are *actually used*. This is a `sync`-family maintenance Skill
(sibling of `digest`, ADR-0003/0015): `digest` keeps the digest feed honest, this
keeps the Inventory honest. A thin, tested helper (`scripts/audit-skills.ts`) does
the deterministic gathering; **you make every judgement.**

> **Invoked manually — follow the steps.** Like `digest`/`log-session`, this Skill
> is user-invoked (`disable-model-invocation: true`) so it never self-fires; run it
> when asked, or as a future scheduled job would. On-demand for now; a schedule is
> deferred (ADR-0015).

Two products from one run, both **gated** (ADR-0003) — never the `log-session`
direct-to-main path:
- an **Inventory PR** — `importance` + `role` updates that reflect observed usage;
- **frontmatter-suspect issues** — filed only on the evidence in step 4.

**Never edit `.agents/skills/`.** This Skill writes *only* Inventory `.yml` entries.
A Skill's own `SKILL.md` (its triggering `description`) is `frictions-to-fixes`'s
surface — you *refer* drift there (step 4), you do not patch it.

## 1. Branch off `origin/main`

`git fetch origin main` and branch `journal/audit-skills-<today-UTC>` off
`origin/main`, so the PR is independent of any work branch. A caller-pinned
designated branch overrides this suggested name (branch it off `origin/main`).

Done when you are on a fresh branch off the latest `origin/main`.

## 2. Gather the scorecard

```
pnpm exec tsx scripts/audit-skills.ts
```

It prints JSON: the **window** (the 40 newest sessions by `endedAt`, each with
`kind`/`goal`/`summary`/`skillsUsed`) and, per Skill, `onDisk`, `catalogued`,
current `importance`/`role`, its SKILL.md `description`, and `usedIn` (every
windowed session that invoked it). Pass `--window N` to widen/narrow.

Done when you hold the scorecard.

## 3. Re-grade importance and refresh role

`importance` is **conditional essentialness** (`CONTEXT.md`), re-derived from the
window — *never* raw frequency. For each Skill, read `usedIn` **and the `goal`/
`summary`/`kind` of the sessions that used it** (and the sessions that plausibly
*should* have), then set the grade:

- **essential** — used across *many kinds* of session; its absence would be felt broadly.
- **specialist** — *the* tool for a specific kind of work, even if that work is rare
  (used in ~all sessions of its kind, few overall — e.g. `blog-post` in blog sessions).
- **supporting** — useful but not essential; work proceeds without it.
- **peripheral** — little pull even when it could have applied.

**Rules:**
- **Rarity alone never lowers a grade.** A Skill unused only because *its kind of
  session did not occur* keeps its grade — frequency lives in the `role` prose, not
  the grade.
- **Demote only on opportunity-missed evidence** (the step-4 signal): a Skill absent
  from **≥2 windowed sessions of the kind it serves** drops toward `peripheral`.
- **Create a missing entry** for any `onDisk && !catalogued` Skill you observed in
  use — write it from what the sessions show. Leave *never-observed* uncatalogued
  Skills alone (that coverage is other `sync` work).
- **External (`external: true`) Skills are tuned too.** Their Inventory grade + role
  record their *fit to this project*, which drifts like any other — grading a pack
  Skill's importance-here is not *evolving the Skill*, so "used, not evolved here"
  holds. (Only step 4 differs for them.)
- Refresh `role` when usage contradicts it. **Keep `role` ≤ ~50 words** (schema
  guideline): role + importance-to-project, not a copy of the Skill's own description.

Edit the `.yml` files in place. Done when every entry's grade + role matches the
evidence, and observed-but-uncatalogued Skills have entries.

## 4. Flag frontmatter-suspect Skills (issues)

A Skill that was **absent from ≥2 windowed sessions whose work was clearly in its
domain** probably has a `description` that mis-fires (progressive disclosure: the
frontmatter alone decides whether it triggers).

**This step is for our own (`external: false`) Skills only.** A pack Skill's
SKILL.md is not ours to patch (a re-install would clobber it, ADR-0005), so never
refer its frontmatter to `frictions-to-fixes`. If an *external* Skill looks
under-used despite the opportunity, the only lever we own is its Inventory `role`
(already handled in step 3) — reflect the mismatch there and move on.

For each own opportunity-missed Skill:

- **Search first** (`search_issues`, `is:issue is:open audit-skills <name>`): if an
  open issue already names it, skip — never re-file.
- Otherwise **file one issue** naming the ≥2 sessions as evidence and the hypothesis
  (`description` mis-triggers → `frictions-to-fixes` candidate, since it owns
  SKILL.md — vs the `role` needs to sell it better, which you already fixed in step 3).
  Label `needs-triage`. Do **not** propose the SKILL.md edit yourself.

Importance is **not** a gate here — a low-graded Skill is exactly where a broken
`description` hides. Done when every own opportunity-missed Skill is either flagged
or already tracked.

## 5. Clear the safety gate

Run the gate (ADR-0004), cheapest first:

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Done when every step is green.

## 6. Commit, push, open one gated PR

Commit the Inventory edits (one run rides one commit/PR), push the branch with
retry, and open **one gated PR** summarising the re-grades and any issues filed. A
human merges — never self-merge or enable auto-merge (ADR-0003). Keep the PR
description in sync with what it contains (`CLAUDE.md`).

Done when the gate is green and the PR is open for review.
