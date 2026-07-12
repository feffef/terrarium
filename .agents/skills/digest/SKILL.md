---
name: digest
description: Bring the Journal's front pages up to date — write a Digest for each closed UTC day (from git + session logs); the index overview refreshes itself live — then open one gated PR and merge it once the safety gate is green.
disable-model-invocation: true
---

# Digest

Bring the Journal's front pages up to date. Two products, one run: a **Digest**
per closed UTC day — a short, human **catch-up** on everything that happened
across the Platform that day (ADR-0010) — and a live, self-refreshing **index**
overview of the Platform's current state and capabilities. A thin, tested helper
(`scripts/digest.ts`) does the deterministic gathering; **you write the prose**.

> **Invoked, never self-fired — follow the steps.** This Skill is user-invoked
> (`disable-model-invocation: true`): a scheduled Routine fires `/digest`, and
> a human can run it on demand, but a session never reaches for it
> unprompted. Scheduled, it was the first live self-improvement Skill keeping the
> Journal's derived content current (ADR-0003/0015).

Digests land through the **ordinary gated PR** (ADR-0003) — *not* the `log-session`
direct-to-main path (that exception is bounded to inert `data`; a Digest is a
rendered page). The PR is **eligible to merge as soon as the gate is green**
(ADR-0003 amendment, activating ADR-0004's content-only low-risk tier); repo-level
GitHub auto-merge is available (`CLAUDE.md`), so you enable it and the PR lands
automatically on green — see step 6 for the boundary and the merge mechanics.

## 1. Branch off `origin/main`

Branch `journal/digest-refresh-<today-UTC>` off `origin/main` (CLAUDE.md's
chartered-job branch convention — a caller-pinned designated branch overrides
this default name), so the digest PR is independent of any work branch.

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
`layers/journal/content/current/pages/digests/<date>.md`:

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
feed, the friction signal, the Skill Inventory, and a **Recent digests** panel
that reads the digest pages directly. A Digest you wrote in step 3 therefore
appears with **no edit to `index.md`**.

`index.md` still owns two things — its **free-form editorial intro** (its Markdown
body, rendered above the dashboard) and its title/description. Touch those only
when the standing introduction itself should change, **never** to bake a per-run
overview or a digest list (the dashboard already lists them, live).

Done when you have confirmed the new Digest(s) will show — no index edit is needed.

## 5. Clear the safety gate

Run `pnpm gate` (ADR-0004; CLAUDE.md's **Self-verification** section owns what
it runs). Done when it's green.

## 6. Commit, push, open one gated PR — auto-merge on green

Commit the new Digest(s) (a backfill of several days rides one commit/PR), push
the branch with retry, and open **one gated PR**. Keep the PR description in
sync with what it contains (`CLAUDE.md`).

Then **let it land once the CI gate is green** (ADR-0003 amendment; ADR-0004's
content-only low-risk tier) — allowed **only** while the PR contains nothing
beyond the digest scope (digest pages under `…/pages/digests/`, at most plus the
index's editorial intro):

- **Enable GitHub auto-merge on green.** Repo-level auto-merge is available
  (`CLAUDE.md`), so **enable it** (`enable_pr_auto_merge`) right after opening the
  PR and it lands automatically once the gate reports green — no watching
  required. Pushing is not landing (`CLAUDE.md`), so subscribe to the PR's
  activity to catch a red gate.
- A **red gate is never merged** — auto-merge only lands on green. Diagnose and
  fix on the branch (the green re-run then auto-merges), or leave the PR open and
  escalate to a human if the failure isn't yours.
- If anything **outside the digest scope** rode into the PR, do **not** enable
  auto-merge — leave it open for human review (ADR-0003's default).

Done when the PR has **merged with a green gate**, or is **set to auto-merge and
will land when the running gate goes green** — or, in the escalation cases above,
is open and honestly awaiting a human.

## 7. Log this session before you finish

Invoke `close-session` (CLAUDE.md's front door for closure) before ending, even
though this run is likely **autonomous**: it authors the log via `log-session` —
mark `kind: autonomous`, list this PR under `prs`, and note any friction from
the run (e.g. a red gate you had to fix). This matters more here than in an
interactive session — a scheduled digest run has no human present to notice a
missing log and prompt you to add one (issue #176), so the scratch you author
now is the only thing that makes any of the logging hooks commit a log at all.

Done when the scratch is authored — a committed hook lands it on `main` from
there, live and normally well before this run ends (see the `log-session`
Skill for which hook and when).
