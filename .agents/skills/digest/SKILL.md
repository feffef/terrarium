---
name: digest
description: Bring the Journal's front pages up to date — write and fact-check a Digest for each closed UTC day (from git + session logs), sweep aged-out Digests/sessions from `current` to `archived`; the index overview refreshes itself live — then open one gated PR and merge it once the safety gate is green.
disable-model-invocation: true
---

# Digest

Bring the Journal's front pages up to date: write a **Digest** per closed UTC
day — a short, human **catch-up** on everything that happened across the
Platform that day — and archive aged-out content. The index overview refreshes
itself (step 4). A thin, tested helper (`.agents/skills/digest/scripts/digest.ts`) does the
deterministic gathering; **you write the prose**.

> **Command-only — follow the steps.** A scheduled Routine or a human runs
> `/digest`; `disable-model-invocation: true` keeps a session from invoking it
> unprompted.

Digests land through an ordinary gated PR, never the `log-session`
direct-to-main path (ADR-0010). You merge it yourself once the gate is green
(step 7).

> **Keep it short** (CLAUDE.md) governs it if this run touches the Platform or
> its agent instructions.

## 1. Get on a working branch

CLAUDE.md's "Stay on the branch your session started on" rule.

## 2. Find the days to write

```
pnpm exec tsx .agents/skills/digest/scripts/digest.ts list
```

It prints the **closed** UTC days that have activity but no digest yet — the
backfill set, oldest first. Today is never listed (a day is digested only once its
midnight UTC has passed). An empty list means no new Digests — skip to step 5;
the archive sweep still runs.

Done when you hold the list of days to author.

## 3. Write one Digest per day

For each listed `<date>`:

```
pnpm exec tsx .agents/skills/digest/scripts/digest.ts gather <date>
```

The JSON gives you `prs` (merged/referenced), `otherCommits` (direct-to-main
work), `sessions` (goal/outcome/status, frictions, learnings, ideas), and a `rollup`.
Above ~20,000 characters `gather` writes the JSON to a file instead (default
`digest-gather-output.json` in the temp dir; `--out PATH` overrides) and prints
its path; Read that file.
**A dry run must call `gather` for its numbers too** — never re-derive a day's
session set by reading session-log files and filtering on the filename's date.
`gather` cuts each day by a session's own UTC `endedAt`, which can silently
disagree with a filename-date filter and change the count. Author a
short catch-up from it and save to
`layers/journal/content/current/pages/digests/<date>.md`:

```markdown
---
title: Digest — <date>
summary: "<one plain sentence: what happened today — this feeds the index preview>"   # keep the quotes: a colon in unquoted text breaks the YAML
---

# <date>

<1–3 short paragraphs: what changed and why it matters. Link inline by number:
PRs as [#22](https://github.com/feffef/terrarium/pull/22), issues as
[#2](https://github.com/feffef/terrarium/issues/2).>

**Also shipped:** [#22](…) tests for page links · [#21](…) review of recent problems
**Sessions:** 3 (all completed) · **Problems noted:** 5 (2 minor, 3 trivial) — worst: <one line>.
```

Write in **plain English for someone who knows software but not this
project**: they should understand what actually happened without the glossary.
Name things by what they do ("the scheduled docs check" — never how often it
runs), not by project names
(`audit-docs`, Tenant, prune trial, Friction); leave out file, script and ADR
names and git commands. The `summary` headline matters most — it must read
clearly on its own. Lead with narrative, not a changelog; keep it to 100–250
words of prose: about 100 for a quiet day of scheduled jobs, up to 250 for a
busy day when it stays interesting. Fold the counts into the footer. The prose tells only the interesting
work; routine PRs (yesterday's digest, a scheduled clean-up with nothing
notable) go in **Also shipped** instead, never both. A session's
`learnings` or `ideas` earn a sentence only when a reader would find them
genuinely interesting. **Keep the
opening paragraph's first ~10 words plain prose — no backticks, links, or bold**:
`layers/journal/tests/e2e/journal.spec.ts`'s `digestBodySnippet()` literal-matches the first
six rendered words against the rendered HTML, and MDC renders inline markdown
(e.g. a backtick code span) as an HTML tag, breaking that match (issue #903).
**Include
the problems the sessions ran into** (their logged frictions) — visible
self-improvement is the Journal's point — as a severity tally (nit = trivial)
plus the 1–3 worst, never a dump of every small one. Issue/PR links
are constructable from numbers; optionally enrich with issues active that day via
the GitHub MCP, but degrade gracefully to git-only when it is unavailable.

**Then fact-check each Digest.** Spawn a fresh read-only subagent (`model:
"sonnet"`) per saved Digest. It lists every factual claim and checks each
against its primary source — the PR's diff (`git show --stat` of its merge
commit), description and linked issues, and the day's commits; git alone when
GitHub is unavailable. *Where* a change landed is settled by the files it
touched, never by a label in a PR title or session goal (a "(homepage)" focus
tag once became "the homepage gained…" for a Journal page). It returns one row
per claim: claim · source checked · verdict `ok` / `wrong` / `unverifiable`.
It ends with: For each rule and doc you loaded or read: its path, why it loaded or was read, and whether it was useful (yes, partly, no).
Fix every `wrong` claim; keep an `unverifiable` one.

Done when every listed day has a `<date>.md` whose `summary` is set, whose body
leads with narrative and carries the skim footer, and whose fact-check has no
unfixed `wrong` claim.

## 4. The index refreshes itself — nothing to bake

The Journal's Space landing (`/t/journal/current`) is a **live dashboard**
that queries this Space's collections at request time
(`layers/journal/GLOSSARY.md`, "What lives where"), so a Digest from step 3
appears with **no edit to `index.md`**.

`index.md` owns only its **editorial intro** (its Markdown body, rendered above
the dashboard) and its title/description. Edit those only when the standing
introduction should change, **never** to bake a per-run overview or a digest
list: the dashboard lists them live.

Done when you have confirmed the new Digest(s) will show — no index edit is needed.

## 5. Archive aged-out content

Run the retention sweep so the `current` Space doesn't keep growing (issue #672):

```
pnpm exec tsx .agents/skills/digest/scripts/archive-journal-content.ts --write
```

This `git mv`s the Digests and session logs that fall outside the retention
budget — the newest `RETAIN_DATES` dates of each kind, per
`.agents/skills/digest/scripts/archive-journal-content.ts` — from `current` to `archived` (preserving
history); every other Journal Collection is untouched. The script never commits itself; its moves ride the **same**
commit/PR as this run, alongside whatever Digest(s) step 3 wrote. Run it on
**every** invocation of this Skill, not only on days that also produce a new
Digest — the sweep is what keeps `current` bounded, and this Skill is its
only scheduled trigger.

Done when the sweep has run (even a no-op day, reported as such) and any moves
it made are staged for the commit below.

## 6. Clear the safety gate

Run `pnpm gate:scoped` — step 1 of `docs/agents/pr-workflow.md`'s "Closing a
scheduled run's PR" sequence. Done when it's green.

## 7. Commit, review, push, open one gated PR — self-merge on green

Commit the new Digest(s) and this run's archive sweep together (a backfill of
several days, plus the sweep, rides one commit/PR). Keep the PR description in
sync with its contents (`docs/agents/pr-workflow.md`) and include the
fact-check tally ("N claims checked, M fixed, K unverifiable" — list any
unverifiable ones).

Then follow `docs/agents/pr-workflow.md`'s "Closing a scheduled run's PR".
The diff may hold only Digest pages under
`layers/journal/content/current/pages/digests/`, the Journal index's editorial
intro, and the `current` → `archived` moves step 5 makes. If anything else
rode into the PR, do **not** run `merge-pr.ts`; leave it open for a human
(ADR-0003).

Done when the PR has **merged with a green gate**, or — in the escalation
cases above — is open and honestly awaiting a human.

## 8. Log this session before you finish

Log the session.
