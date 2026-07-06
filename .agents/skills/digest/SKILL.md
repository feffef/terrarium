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
`origin/main`, so the digest PR is independent of any work branch. If the caller
pinned a designated branch for this session, branch that name off `origin/main`
instead — a caller-pinned branch overrides this suggested name.

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

## 4. The index refreshes itself — nothing to bake

The Journal's Space landing (`/t/journal/current`) is a **live dashboard**: it
queries this Space's collections at request time — state tiles, the session-log
feed, the friction signal, the Skill catalogue, and a **Recent digests** panel
that reads the digest pages directly. A Digest you wrote in step 3 therefore
appears with **no edit to `index.md`**.

`index.md` still owns two things — its **free-form editorial intro** (its Markdown
body, rendered above the dashboard) and its title/description. Touch those only
when the standing introduction itself should change, **never** to bake a per-run
overview or a digest list (the dashboard already lists them, live).

Done when you have confirmed the new Digest(s) will show — no index edit is needed.

## 5. Clear the safety gate

Run the gate (ADR-0004), cheapest first:

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Done when every step is green.

## 6. Commit, push, open one gated PR

Commit the new Digest(s) + `index.md` (a backfill of several days rides one
commit/PR), push the branch with retry, and open **one gated PR**. A human
merges — never self-merge or enable auto-merge (ADR-0003). Keep the PR description
in sync with what it contains (`CLAUDE.md`).

Done when the gate is green and the PR is open for review.
