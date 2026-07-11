---
name: audit-docs
description: Audit every live doc and Skill for drift, duplication, contradiction, ambiguity, verbosity, stale-narration of a superseded state, mis-location, and recently-added surfaces missing the reference they deserve — fact-check each finding, fix the safe ones, and file an issue (never ask) for anything needing a human call. Opens one gated PR and self-merges it on a green gate.
disable-model-invocation: true
---

# Audit Docs

Keep the repo's prose honest against the code. Agents act on documented state, so
here a stale doc is a **behavioural** bug (`CLAUDE.md`). This is a
`consolidate`-family maintenance sweep (ADR-0003): it fact-checks each finding and
**fixes it bravely**, self-merging its own gated PR on green — filing an issue only
for the rare case it genuinely can't tell which of two conflicting facts is
correct. It runs start to finish **without interaction**.

> **Autonomous, bounded.** Runs unattended and **self-merges** its gated PR on a
> green gate (ADR-0003 amendment) — the PR carries only fact-checked
> reconciliations that touch no human-only surface (ADR-0004's low-risk content
> tier). It edits only *live* docs, **never** rewrites a historical record's
> decision or a pack template, and is **brave by default**: it decides scope
> itself and fixes, escalating to an issue only for an unresolvable factual
> conflict.

> **Command-only.** This Skill is invoked as `/audit-docs`, not via the Skill
> tool — it stays Skill-tool-invocation-blocked (`disable-model-invocation`)
> even when preloaded by the slash command.

## The three tiers — what you may touch

Classify every surface **before** editing. This decides everything.

- **Live** — the editable guidance: `CLAUDE.md`, `CONTEXT.md`, `README.md`,
  `docs/agents/*`, `docs/research/*`, `tests/README.md`, `deploy/README.md`, our
  own Skills' `SKILL.md` + sibling files (`external: false`), and the **current
  journal's facing pages** —
  `layers/journal/content/current/pages/{architecture,how-it-works,index}.md`, the
  descriptive front a reader lands on. **Fix these.** (Audit their *source* `.md`;
  no rendering. `index.md` is only partially rendered by the dashboard, so a
  finding on its body may not surface at `/t/journal/current` — that's fine, the
  source is still Live prose worth keeping honest.)
- **Historical** — the append-only record: `docs/adr/*`, journal digests
  (`layers/journal/content/*/pages/digests/*.md` — they're pages, but the
  `digest` job generates them, so Historical despite living under `pages/`) and
  session logs, blog posts. **Never rewrite a decision.** A drifted ADR still gets
  the brave fix — the repo's sanctioned **amendment banner / Status-line pointer**
  (ADR-0018), never a rewrite of the decision — but ADRs are human-only (ADR-0004),
  so that edit rides its own human-reviewed PR, not the self-merged one (step 7).
- **Pack-generic** — external-pack Skills (`external: true`; e.g.
  `setup-matt-pocock-skills/*`, the `*-FORMAT.md` templates). Generic and
  re-installable, so a rewrite is clobbered on re-install (ADR-0005). **Never
  rewrite them** — where they diverge from repo reality, note the reconciliation
  in a *live* doc instead.

## The eight lenses, in four paired agents

Eight lenses, fanned out as **four read-only reviewer agents** (Agent tool, in
parallel) — each agent carries a **pair** of lenses that share either a theme or a
mechanism, keeping agent count down while widening coverage. Every finding comes
back as `file:line + quoted evidence`.

**Agent A — Freshness** (what moved recently, and did the docs catch up?). Both
lenses start from the **same git-history read** — `git log --since="48 hours ago"`
(and its diff) over the tree — so they share one agent:

- **Drift** — a doc describes a mechanism, path, or term the code no longer
  matches. Sharpest source: a decision reversed at its *new* home but not swept
  back to its referrers — grep the removed noun (`generator`, a deleted job name,
  an old path) across all docs. The recent diff surfaces exactly which nouns to
  grep.
- **Orphan-addition** — the inverse of Drift: something **added in the last 48h**
  that never got the incoming reference it deserves. Scope is deliberately two
  cases (new Skills are `audit-skills`' Inventory turf; new code is too fuzzy):
  (1) a new **`docs/agents/*` or `docs/research/*`** doc **not linked from
  `CLAUDE.md`'s** index section that lists its siblings — fix = add the link
  (Live, self-merge); (2) a new **ADR** that amends/supersedes another **without
  the sanctioned amendment banner / Status-line pointer** (ADR-0018) on the
  superseded ADR — a human-only surface (ADR-0004), so this one **escalates**
  (step 7), never a `CLAUDE.md` ADR-list entry (CLAUDE.md says read the `adr/`
  dir, never hand-maintain a list). *Boundary:* an un-referenced addition **older**
  than the 48h window is out of this lens's scope.

**Agent B — Single-home** (right fact, right home, once):

- **Duplication** — a fact restated in >1 place instead of single-homed. The home
  keeps it; every copy becomes a pointer.
- **Mis-location** — a fact living in the *wrong* home, or a whole file in the
  wrong directory. Two forms: (1) **prose** in the wrong doc — implementation
  detail in `CONTEXT.md` (glossary-only), a status narrative in `CLAUDE.md` (it
  forbids those), a repo-wide convention buried in a `docs/agents/*` topic file;
  fix = move the prose to its correct home + leave a pointer. (2) A **misfiled
  file** — e.g. a research note under `docs/agents/` that belongs in
  `docs/research/`; fix = `git mv`. **Caveat:** moving a journal `pages/*.md`
  file changes its route (ADR-0006) — that move escalates, see step 7.

**Agent C — Concision** (careful cuts only — never gut load-bearing "why"):

- **Verbose** — **redundancy & filler only**: the same fact stated twice within
  one doc, a restated section header, empty throat-clearing that carries zero
  information. **Not** subjective "could be tighter" style edits — this repo
  prizes dense, heavily-caveated prose, and tightening it is out of scope.
- **Stale-narration** — a doc that is *correct about the present* but
  over-narrates a **superseded pre-edit state** ("we used to do X"). Cut it
  **only** where knowing that history changes no future reader action; **keep**
  every load-bearing "don't regress to the old way" rationale (the pkill saga, the
  worktree-HEAD and `permissions.allow` bullets in `CLAUDE.md` stay — their whole
  point is preventing regression). When you do cut, cut to the **rule plus a
  pointer** to the history's home (the issue/ADR), **never** to a bare ruleless
  rule that strips the why with no forwarding address.

**Agent D — Coherence** (the two failure modes of one clear voice):

- **Contradiction** — two docs (or two parts of one) instruct opposite things, or
  assert facts that can't both be true *now*.
- **Ambiguity** — an undefined threshold that gates an action, an enum listed only
  by its endpoints at its own home, or a "see X" whose named owner doesn't hold
  the thing. (Contradiction is two clear-but-conflicting statements; Ambiguity is
  no clear statement — a reader can't extract one confident instruction from
  either.)

## Fact-check before you touch anything

Every finding is a **hypothesis** until verified against **primary sources** — the
actual file at the cited line, and the code it describes (`content.config.ts`,
`shared/expand.ts`, `modules/routing.ts`, the schemas). Dispatch one independent
checker that re-derives each claim from scratch and returns **CONFIRMED /
CONFIRMED-BUT** (corrected line or quote) **/ WRONG**. Act only on CONFIRMED(-BUT).
A plausible-but-wrong finding acted on is a fresh drift *you* authored.

The primary source depends on the lens: **Drift/Contradiction** verify against the
**code**; **Duplication/Mis-location/Ambiguity** against the repo's home
convention (which doc actually owns the fact, and whether the named owner really
holds it); **Verbose** against the **doc's own text** (is the fact genuinely
stated twice?); **Orphan-addition** against the **git history** (was the surface
really added inside the 48h window?) *and* the expected home (does it genuinely
lack the incoming reference?); **Stale-narration** against the **actual
superseded state** (is the narrated old behaviour really gone?) *and* a second
check the checker must make explicitly — that the proposed cut **preserves any
load-bearing "don't regress" why**. A Stale-narration finding that would delete
regression-preventing rationale is **WRONG**, not CONFIRMED.

## Fix bravely — escalate only a true factual conflict

**Fix every confirmed finding. That is the default, and be brave about scope** —
reconcile the doc to the code and primary sources, single-home the duplicates,
move mis-homed prose to its real home behind a pointer, add the missing incoming
link for a new orphaned doc, cut redundant filler, trim superseded-state narration
(carefully — rule-plus-pointer, never gutting the why), resolve the contradiction
by making the prose match reality, pin the undefined threshold, retire a term
whose premise is dead. Don't stop to ask how far to reach, and don't file an issue
for a judgement call — **decide it and fix it.** Two fixes do *not* ride this
brave, self-merged path — both escalate (step 7): a **Mis-location file move that
changes a journal page's route**, and an **Orphan-addition missing-amendment
finding on an ADR** (a human-only surface).

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
(Skill Inventory `.yml` / its own frontmatter). The current journal's three facing
pages are **Live**; its `pages/digests/*.md` are **Historical** (see the tiers
above). Done when every surface is tiered.

## 3. Review across the eight lenses

Fan out the **four paired-lens reviewer agents** (A Freshness, B Single-home,
C Concision, D Coherence — see above) and pool their findings. Done when all four
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

## 7. Commit, push, open one gated PR, self-merge on green

Commit the fixes (one run rides one commit/PR), push with retry, and open **one
gated PR** listing what was fixed and any issue filed. **Self-merge it once the
gate is green** (ADR-0003 amendment) — the reconciliations are fact-checked and
touch no human-only surface, so this is ADR-0004's low-risk content tier (a
second, bounded grant of the same kind as `digest`'s). Repo auto-merge is
unavailable pending #231 (`CLAUDE.md`), so watch the gate yourself
(`pull_request_read` `get_check_runs` — `docs/agents/issue-tracker.md`) and merge
with the GitHub MCP `merge_pull_request`; pushing is not landing. Leave a one-line
PR comment as the audit trail.

**Keep human-only-surface fixes out of this PR — those escalate instead.** A fix
that touches an ADR's amendment banner, CI, isolation logic, or the
manifest-expansion/routing modules — **or a Mis-location file move that changes a
journal `pages/*.md` file's route** (routing-adjacent, ADR-0006), **or an
Orphan-addition finding that a new ADR supersedes another without the amendment
banner on the old one** (adding that banner is an ADR edit, human-only) — never
rides in the self-merged routine PR above. File it as its own, separately human-reviewed PR
(see the Historical-tier note above), subscribe, and babysit it to merge/close. Likewise, if the gate is
red for a reason that isn't yours, leave the PR open for a human rather than
merging red — fix on the branch or escalate honestly instead. Done when the PR
is merged green, or open and honestly escalated.
