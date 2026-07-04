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
ci/gate.yml                         # the safety gate; a maintainer installs it to
                                    #   .github/workflows/ (CI is human-only, ADR-0004)
.agents/skills/ , .claude/skills/   # committed Skills (general + platform-operation)
```

## Self-verification — the safety gate (ADR-0004)

Run this before proposing any change. CI (`ci/gate.yml`) runs the same set,
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

## Status

Milestone 1 (foundation) exists: manifest → generator → gated-render pipeline for
one Tenant (`journal`) with two Spaces (`current`, `archived`) and two Collections
(`pages`, `skills`); full safety gate green (ADR-0006/0007). Still deferred:
more Tenants, the platform-operation Skills (`spawn-tenant`, `add-space`, …), and
the autonomous jobs (`sync`, `drift-check`, …). Consult the ADRs for what is
decided vs. deliberately left open before building.
