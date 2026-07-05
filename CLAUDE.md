# CLAUDE.md

Guidance for Claude Code agents working in this repo. Terrarium is developed
**mostly by agents** — you are a first-class contributor here, not a bystander.
This file is the entry point for every session: it holds the conventions, the
repo layout, and how to self-verify. `README.md` is only a primer for humans.

## Read these first

- **`CONTEXT.md`** — the domain model and ubiquitous language. Use these exact
  terms (Platform, Tenant, Space, Collection, Document, Skill, …). If you catch
  yourself using a word that conflicts with the glossary, stop and reconcile it.
- **`docs/adr/`** — Architecture Decision Records. **Read *all* of them before
  any planning or structural work.** The set is deliberately kept small, and each
  records a decision that is easy to violate by accident. Don't rely on a
  hand-maintained list of ADRs anywhere (it rots) — read the directory.
- **Skills** live in `.agents/skills/` (surfaced through `.claude/skills/`
  symlinks). The **`domain-modeling`** skill owns the conventions for the two
  files above: `CONTEXT.md` stays **glossary-only** (no implementation detail),
  and it defines the 3-part test for *when* a decision earns an ADR — **hard to
  reverse · surprising without context · a real trade-off**. Note: every ADR in
  this repo uses the fuller `Context / Decision / Consequences` form — match it
  for consistency rather than the skill's minimal template.
- **Which Skills to actually use** is curated in the `journal` Tenant's **Skill
  catalogue** — `tenants/journal/content/current/skills/`, rendered at
  `/t/journal/current`. It records each installed Skill's *role and importance to
  this project* (not a copy of the Skill's own description), because the Skills
  come from an external pack. Treat it as the authoritative "use these" list:
  take these Skills seriously and prefer them over ad-hoc approaches, guided by
  each entry's `importance` and `role`.

## Ground rules (from the ADRs)

- One repo, one container, build-time-baked; nothing is created at runtime
  (ADR-0001).
- Agents edit a Tenant's **manifest** (declarative intent); a generator produces
  `content.config.ts`. Don't hand-write the keyed collection cross-product
  (ADR-0002).
- Every change lands as a **gated PR** on a feature branch — no self-merge.
  Autonomy may *propose* freely but *implements* net-new only on human
  green-light (ADR-0003).
- All work must clear the **safety gate** (build/validate/isolation, ADR-0004).
  The generator, routing, isolation logic, and CI are **human-only** — never
  auto-merge changes touching them.
- **Skills** are generic, repo-committed, and first-class (ADR-0005).
- Runtime routing is by path prefix `/t/<tenant>/<space>/<slug>` (ADR-0006). The
  generated files are committed and drift-checked (ADR-0007) — never hand-edit a
  file marked `GENERATED`.

## Working conventions

- Inspect files with the **Read tool, not `cat`** — the Edit tool refuses to edit
  a file it hasn't seen via Read, so `cat`-then-Edit forces a wasteful re-read.
- **Keep a PR's description in sync with its content — hard rule.** If you
  fundamentally change what a PR does (switch approach, swap the files it touches,
  answer review with a different solution), update the PR title/description in the
  same push. A description that still sells the old approach is a defect, not a
  nit: reviewers gate on it.

## Repo layout

```
CONTEXT.md                          # domain model / ubiquitous language (glossary only)
docs/adr/                           # Architecture Decision Records (read all before planning)
tenants/<tenant>/tenant.config.ts   # the manifest an agent edits (declarative intent)
tenants/<tenant>/content/<space>/<collection>/…   # Documents, isolated per Space
shared/manifest.ts                  # manifest types + defineTenant() + validation
scripts/generate.ts                 # generator: manifests → keyed collections
content.config.ts                   # GENERATED — keyed Nuxt Content collections
shared/routing.generated.ts         # GENERATED — routing map + L2 entry routes
app/pages/t/[tenant]/[space]/[...slug].vue   # runtime routing + ContentRenderer
tests/unit/                         # L3 isolation (generator/keying)
tests/e2e/                          # L2 smoke render
.github/workflows/gate.yml          # the safety gate (installed & live); human-only —
                                    #   CI is never agent-edited (ADR-0004)
.agents/skills/ , .claude/skills/   # committed Skills (general + platform-operation)
```

## Self-verification — the safety gate (ADR-0004)

Run this before proposing any change. CI (`.github/workflows/gate.yml`) runs the same set,
cheapest-first. Everything is baked from the manifests, so always regenerate first.

```
pnpm install     # installs deps, then runs `pnpm gen` + `nuxt prepare`
pnpm gen         # regenerate content.config.ts + shared/routing.generated.ts
pnpm gate:drift  # L0 — regenerate and fail if the committed GENERATED files drifted
pnpm lint        # L0
pnpm typecheck   # L0
pnpm test        # L3 — generator/isolation unit tests (unique, scoped keys)
pnpm build       # L0/L1 — build; strict schemas fail the build on invalid content
pnpm test:e2e    # L2 — smoke-render every (Tenant, Space) entry route (200, renders)
```

To **add a Space or Collection**: edit the Tenant's `tenant.config.ts`, run
`pnpm gen`, then commit the regenerated files alongside it. To **spawn a Tenant**:
drop a `tenants/<name>/` folder with a manifest and content, then regenerate.
Never hand-edit the `GENERATED` files — the drift gate will reject it.

## Logging your session

Every session ends with an honest **session log** in the Journal (ADR-0009,
issue #2) — goal, outcome, docs read, Skills used, and *every* friction — the
raw signal the future `consolidate`/`codify` jobs mine. The **`log-session`**
Skill authors one and commits it directly to `main`.

There is **no reliable automatic "we're done" signal** for an interactive
session (a `Stop` hook fires every turn, not at session end — explored and
deliberately not used; see ADR-0009). So this is a **reminder, not a gate**:
when the work has actually **landed**, ask once, e.g. *"Are we done? If so I'll
log this session,"* and on a yes invoke `/log-session`.

**Pushing is not landing.** A session isn't over the moment you commit, push, or
open a PR — review, CI, and merge are all still queued, and the frictions from
that follow-up belong in the *same* log. Don't offer to log while a PR you
opened is still in review or CI. A session ends when its work has **merged or
been abandoned**, or the **user calls it** — not at push time. Never log on a
hunch: the entry lands straight on `main`, so a premature or duplicate log is
worse than a late one.

A *deterministic* end-of-session trigger for **autonomous** sessions is
**deferred** until those sessions exist and can be built with one.

## Status

Milestone 1 (foundation) exists: manifest → generator → gated-render pipeline for
one Tenant (`journal`) with two Spaces (`current`, `archived`) and two Collections
(`pages`, `skills`); full safety gate green (ADR-0006/0007). Still deferred:
more Tenants, the platform-operation Skills (`spawn-tenant`, `add-space`, …), and
the autonomous jobs (`sync`, `drift-check`, …). Consult the ADRs for what is
decided vs. deliberately left open before building.

## Agent skills

Per-repo configuration for Matt Pocock's engineering skills lives in `docs/agents/`.

### Issue tracker

Issues and PRDs are tracked as GitHub issues in `feffef/terrarium` (via the `gh` CLI); external PRs are also pulled into the triage queue. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
