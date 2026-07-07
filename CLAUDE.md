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
  for consistency rather than the skill's minimal template. It also owns the
  **rule of two** for new vocabulary (coin a glossary/ADR term only on a
  concept's *second* instance) — see `docs/agents/domain.md`.
- **Which Skills to actually use** is curated in the `journal` Tenant's **Skill
  Inventory** — `tenants/journal/content/current/skills/`, rendered at
  `/t/journal/current`. It records each installed Skill's *role and importance to
  this project* (not a copy of the Skill's own description), because the Skills
  come from an external pack. Treat it as the authoritative "use these" list:
  take these Skills seriously and prefer them over ad-hoc approaches, guided by
  each entry's `importance` and `role`.

## Ground rules (from the ADRs)

- One repo, one container, build-time-baked; nothing is created at runtime
  (ADR-0001).
- Agents edit a Tenant's **manifest** (declarative intent); `content.config.ts`
  builds the keyed collections dynamically from the manifests at
  config-evaluation time (ADR-0002/0013). Don't hand-write the keyed cross-product.
- Every change lands as a **gated PR** on a feature branch — no self-merge.
  Autonomy may *propose* freely but *implements* net-new only on human
  green-light (ADR-0003).
- All work must clear the **safety gate** (build/validate/isolation, ADR-0004).
  The routing module, isolation logic, and CI are **human-only** — never
  auto-merge changes touching them.
- **Skills** are generic, repo-committed, and first-class (ADR-0005).
- Runtime routing is by path prefix `/t/<tenant>/<space>/<slug>` (ADR-0006). The
  routing map is derived at build time from the manifests via `modules/routing.ts`
  and exposed as the `#routing` virtual module (ADR-0014) — no committed `GENERATED`
  file remains. `content.config.ts` is NOT generated: it is an ordinary,
  hand-editable module (ADR-0013).
- **Only the `pages` Collection is route-addressable.** The resolver maps a
  slug to a Space's `pages` key only; every other Collection (`sessions`,
  `skills`, digests, …) is surfaced by layer components, not its own slug
  route (ADR-0006). A new page-like addressable Collection is therefore not
  free — it means changing the human-only resolver/routing (ADR-0004/0006).

## Working conventions

- **An empty or missing task prompt (body lost in transit, only a title
  present) is a hard stop-and-ask signal.** Ask the user what they want —
  don't infer a feature from the branch name, prior commits, or a matching
  repo pattern.
- **Single-home every fact — one home, everywhere else points, never restates.**
  Each fact lives in exactly one place; every other surface *references* it. This
  file is the home for repo-wide conventions and an **index** into the ADRs — so
  where it would restate ADR detail, link the ADR instead of copying it (the
  "Ground rules" index-with-pointers below is the right shape; a restated *status
  narrative* is not). `CONTEXT.md` stays **glossary-only**; the ADRs are the
  historical record. When a fact and reality diverge, fix the one home (an
  amending note or superseding ADR), don't fork a second copy. Duplication is how
  contradictory guidance and doc-rot start — and agents act on documented state,
  so in this repo a stale copy is a *behavioral* bug.
- Inspect files with the **Read tool, not `cat`** — the Edit tool refuses to edit
  a file it hasn't seen via Read, so `cat`-then-Edit forces a wasteful re-read.
- **Run process-killing teardown as its own command, never `&&`-chained** before
  steps that must run. Two failure modes, both observed here: `pkill` exits 1
  when nothing matched (routine in idempotent teardown), and `pkill -f` can
  match the invoking shell's own command line and kill the whole chain
  mid-flight — either way everything after the `&&` is silently dropped,
  e.g. a chained `git add` never runs and no error points at it.
- **Don't `&&`-chain a branch rename/creation with the commit/push steps that
  follow it** — the same silent-drop failure mode as the pkill bullet above:
  `git branch -m ... && git commit ... && git push` (or `checkout -b`) fails at
  the rename/create when the branch already exists locally, and every step
  after the `&&` never runs. Check existence first (e.g. `git rev-parse
  --verify <branch>`) and handle the already-exists case explicitly instead of
  chaining blindly.
- **Keep session-log-only commits content-only.** Never let substantive work
  ride along inside a commit titled as a session-log commit — title the commit
  for the work it actually contains instead.
- **Commit messages containing backticks or `$(...)` must be written with
  `git commit -F <file>`** (or a quoted heredoc), never `git commit -m` —
  inside a double-quoted `-m` argument the shell runs the backtick/`$()` span
  as a command and mangles the commit body.
- **For any since-last-merge diff or review, run `git fetch origin main` first
  and anchor on the merge-base** (`git merge-base origin/main HEAD`) or the
  commit under review (`HEAD~1`) — the environment's pre-cloned `origin/main`
  is often stale and inflates the diff to 100+ unrelated files.
- **Keep a PR's description in sync with its content — hard rule.** If you
  fundamentally change what a PR does (switch approach, swap the files it touches,
  answer review with a different solution), update the PR title/description in the
  same push. A description that still sells the old approach is a defect, not a
  nit: reviewers gate on it.
- **Pushing is not landing.** A PR is finished only when it is **merged** or
  **abandoned/escalated** — not at push time; review, CI, and merge are all still
  queued. Babysit the PR you opened through to that terminal state. (This is a
  PR-completion discipline, distinct from *session logging*, which now fires at
  self-judged closure and records an in-review PR honestly — see "Logging your
  session".)
- **When dispatching parallel subagents that touch git, pass `isolation: 'worktree'`
  explicitly** — it is an Agent-tool parameter, not implied by the prompt. Without
  it, "parallel" agents share one checkout and race on branches. Each worktree
  agent must also pin its worktree root (operate from that path) before any git
  op, so it never runs git in the shared main checkout.

## Repo layout

```
CONTEXT.md                          # domain model / ubiquitous language (glossary only)
docs/adr/                           # Architecture Decision Records (read all before planning)
tenants/<tenant>/tenant.config.ts   # the manifest an agent edits (declarative intent)
tenants/<tenant>/content/<space>/<collection>/…   # Documents, isolated per Space
shared/manifest.ts                  # manifest types + defineTenant() + validation
shared/expand.ts                    # pure manifest→keyed-collection expansion (expand(), L3-tested)
modules/routing.ts                  # build-time Nuxt module: manifests → #routing virtual module (ADR-0014)
content.config.ts                   # ordinary module — builds keyed collections dynamically (ADR-0013)
app/pages/t/[tenant]/[space]/[...slug].vue   # runtime routing + ContentRenderer
tests/unit/                         # L3 isolation (keying)
tests/e2e/                          # L2 smoke render
.github/workflows/gate.yml          # the safety gate (installed & live); human-only —
                                    #   CI is never agent-edited (ADR-0004)
.agents/skills/ , .claude/skills/   # committed Skills (general + platform-operation)
```

## Self-verification — the safety gate (ADR-0004)

Run this before proposing any change. CI (`.github/workflows/gate.yml`) runs the same set,
cheapest-first. Both the keyed collections and the routing map (`#routing`) are derived
from the manifests at build time (ADR-0013/0014) — no regenerate step needed.

```
pnpm install     # installs deps, then runs `nuxt prepare` (derives #routing + collections)
pnpm lint        # L0
pnpm typecheck   # L0
pnpm test        # L3 — isolation unit tests (unique, scoped keys)
pnpm build       # L0/L1 — build; strict schemas fail the build on invalid content
pnpm test:e2e    # L2 — smoke-render every (Tenant, Space) entry route (200, renders)
```

**Need a screenshot of a running page** (e.g. to eyeball a render during a session)?
Run `pnpm exec tsx scripts/screenshot.ts <url> <out.png> [WxH]` — it drives the
pre-installed Chromium directly (via `PLAYWRIGHT_BROWSERS_PATH`), no new
dependency or browser download required. The optional `WxH` (e.g. `1280x1600`)
sets the window size — use it to reach below-the-fold content. Use `pnpm dev`
for fast visual iteration when you only need to eyeball a render. For a
production-accurate shot use a built `pnpm preview` instead — the dev server
injects a Nuxt DevTools overlay badge (e.g. a small "26 ms" timing pill) that
can overlap real content and read as a UI bug.

### Verifying UI changes

- **Grepping SSR HTML is not proof a change renders.** The server-rendered
  output includes a serialized `useAsyncData` payload — a string match there can
  succeed even when the actual DOM never picks up the change (or errors trying
  to). Verify presentational changes against the **rendered DOM**, not the raw
  HTML text — take a screenshot with `scripts/screenshot.ts` (see above), or
  drive the page with Playwright.
- **To verify a click/interaction, not just a static render**, write a small
  ad-hoc `playwright-core` script against the same pre-installed Chromium
  `scripts/screenshot.ts` locates (via `PLAYWRIGHT_BROWSERS_PATH`) — launch it
  with `chromium.launch({ executablePath })`. Two gotchas: (1) `tsx` runs the
  ad-hoc script as CJS, so wrap top-level `await` in an `async` IIFE; (2) write
  the script **inside the repo tree** so its imports resolve against
  `node_modules` (any devDependency used in an ad-hoc script — `playwright-core`,
  `yaml`, etc. — is scoped to this repo's `node_modules`, not global).
- **A screenshot can't be trusted to rule out a subtle/scoped CSS change** —
  downscaled or compressed PNGs can mask a style that actually applied. Before
  concluding a scoped style is missing, probe the element's *computed* style
  with the same `playwright-core` pattern above, e.g.
  `page.$eval(selector, el => getComputedStyle(el).propertyName)`. A
  screenshot confirms a render happened; computed-style probing confirms a
  *specific* style took effect.
- **The journal Space landing is a custom dashboard, not a Markdown render.**
  `tenants/journal/app/pages/t/journal/[space]/index.vue` wins over the generic
  catch-all for the Space *root* and builds its own layout (stat tiles, digests,
  session feed, Skill Inventory, …) from the Space's `pages`/`skills`/`sessions`
  Collections. It renders `index.md`'s body only as the small "editorial intro"
  section — most of the page is not `index.md`. Editing `index.md` alone will
  not change what most of that page shows; check the `.vue` file too.

To **add a Space or Collection**: edit the Tenant's `tenant.config.ts`. The keyed
collections update automatically via `content.config.ts`, and the routing map
(`#routing`) is re-derived at the next `nuxt prepare`/`build`. No regenerate step
needed. To **spawn a Tenant**: drop a `tenants/<name>/` folder with a manifest and
content, then run `pnpm install` (or `nuxt prepare`) to pick it up.

## Logging your session

Every session ends with an honest **session log** in the Journal (ADR-0009,
issue #2) — the raw signal the future `consolidate`/`codify` jobs mine. A log
has two halves (ADR-0009 amendment): the **mechanical** trace (timings, models,
tools, files read/edited, subagents) is **derived from the transcript** by a
committed hook — never self-reported; the **interpretive** half (goal, outcome,
summary, and *every* friction) only you can write. The **`log-session`** Skill
authors the interpretive half to a scratch file; a committed hook derives the
rest and commits to `main` **live, normally well before session teardown** —
see the `log-session` Skill for which hook lands it and why.

**You self-judge closure — invoke `log-session` when the session's active work
is complete and coherent.** No "are we done?" ask, no waiting for merge: closure
means the work is in an honest, coherent state (a log records an in-review PR
truthfully). Authoring the scratch *is* the "done" signal — the hook commits
**only if** it exists, so a mid-work freeze logs nothing. Re-invoking is safe:
it refreshes the scratch, and the hook overwrites the single per-session log
with a superset (diff-guarded — an unchanged re-derive never touches `main`). So
if you call closure and then do more, just invoke `log-session` again.

Because authoring no longer commits and re-firing self-heals, `log-session` is
**model-invocable** — invoke it yourself at closure rather than on a human
prompt. This mechanism serves autonomous sessions too: they write the scratch
before ending, on purpose.

## Status

Current-state facts — which Tenants, Spaces, and Collections exist, and what's
still deferred (more Tenants, the platform-operation Skills, the autonomous jobs)
— are single-homed elsewhere, not restated here where they rot: the **ADRs**
record what is *decided vs. deliberately left open*, and the `journal` Tenant
(`/t/journal/current`) narrates where the build actually is. Read those before
building rather than a milestone summary duplicated in this file.

## Agent skills

Per-repo configuration for Matt Pocock's engineering skills lives in `docs/agents/`.

### Issue tracker

Issues and PRDs are tracked as GitHub issues in `feffef/terrarium` (via the `gh` CLI, or the GitHub MCP tools when `gh` is absent); external PRs are also pulled into the triage queue. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Tenant-layer conventions

Nuxt-layer gotchas for editing a Tenant (alias resolution, layer-local imports, CSS token inheritance). See `docs/agents/tenant-layers.md`.
