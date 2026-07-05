---
name: digest
description: Bring the Journal's front pages up to date — write a Digest for each closed UTC day (from git + session logs) and regenerate the index overview — and open one gated PR.
disable-model-invocation: true
---

# Digest

Bring the Journal's front pages up to date. Two products, one run: a **Digest**
per closed UTC day — a short, human **catch-up** on everything that happened
across the Platform that day (ADR-0010) — and a regenerated **index** overview of
the Platform's current state and capabilities. A thin, tested helper
(`scripts/digest.ts`) does the deterministic gathering; **you write the prose**.

> **Invoked manually — follow the steps.** Like `log-session`, this Skill is
> user-invoked (`disable-model-invocation: true`) so it never self-fires; run it
> when asked, or as a future scheduled job would. It is a manual precursor to the
> chartered `sync` job (ADR-0003) — do not call it `sync`.

Digests land through the **ordinary gated PR** (ADR-0003) — *not* the `log-session`
direct-to-main path (that exception is bounded to inert `data`; a Digest is a
rendered page).

## 1. Branch off `origin/main`

`git fetch origin main` and branch `journal/digest-refresh-<today-UTC>` from
`origin/main`, so the digest PR is independent of any work branch.

Done when you are on a fresh branch off the latest `origin/main`.

## 2. Find the days to write

```
pnpm exec tsx scripts/digest.ts list
```

It prints the **closed** UTC days that have activity but no digest yet — the
backfill set, oldest first. Today is never listed (a day is digested only once its
midnight UTC has passed). An empty list means no new Digests — skip to step 4 and
still refresh the index.

Done when you hold the list of days to author.

## 3. Write one Digest per day

For each listed `<date>`:

```
pnpm exec tsx scripts/digest.ts gather <date>
```

The JSON gives you `prs` (merged/referenced), `otherCommits` (direct-to-main
work), `sessions` (goal/outcome/status + frictions), and a `rollup`. Author a
short catch-up from it and save to
`tenants/journal/content/current/pages/digests/<date>.md`:

```markdown
---
title: Digest — <date>
summary: <one–two sentence headline of the day — this feeds the index preview>
---

# <date>

<1–3 short paragraphs: the day's story and through-line — what the Platform
gained, anything notable or surprising. Link inline by number: PRs as
[#22](https://github.com/feffef/terrarium/pull/22), issues as
[#2](https://github.com/feffef/terrarium/issues/2).>

**Shipped:** [#22](…) route-resolver tests · [#21](…) friction analysis
**Sessions:** 3 (all completed) · **Frictions:** 5 logged (2 minor, 3 nit) — sharpest: <one line>.
```

Write for a **human catching up**, not a changelog: lead with narrative, keep it
short (~120 words of prose), fold the counts into the one-line footer. **Include
the frictions rollup** — visible self-improvement is the Journal's point — as a
severity tally plus the 1–3 sharpest, never a dump of every nit. Issue/PR links
are constructable from numbers; optionally enrich with issues active that day via
the GitHub MCP, but degrade gracefully to git-only when it is unavailable.

Done when every listed day has a `<date>.md` whose `summary` is set and whose body
leads with narrative and carries the skim footer.

## 4. Regenerate the index overview

```
pnpm exec tsx scripts/digest.ts index-data
```

Rewrite `tenants/journal/content/current/pages/index.md` from it — the index is an
**Inventory**, regenerated to match current state:

1. A short intro (what Terrarium is: one Platform, many Tenants, baked at build).
2. **Platform state** — every Tenant → its Spaces → its Collections, and the
   installed **Skills** (count + the `core` ones). Enumerate fully.
3. **Capabilities** — what the Platform can do *today*, grounded in the Skills
   that exist and the manifest→generator→gated-render pipeline. Do not claim the
   still-deferred autonomous jobs as if they run.
4. **Recent digests** — from `recentDigests`, newest first:
   `- [<date>](/t/journal/current/digests/<date>) — <summary>`.
5. Footer links (about, the archived Space).

Done when `index.md` reflects the current inventory and lists the recent Digests.

## 5. Clear the safety gate

Run the gate (ADR-0004), cheapest first:

```
pnpm gen && pnpm gate:drift && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Done when every step is green.

## 6. Commit, push, open one gated PR

Commit the new Digest(s) + `index.md` (a backfill of several days rides one
commit/PR), push the branch with retry, and open **one gated PR**. A human
merges — never self-merge or enable auto-merge (ADR-0003). Keep the PR description
in sync with what it contains (`CLAUDE.md`).

Done when the gate is green and the PR is open for review.
