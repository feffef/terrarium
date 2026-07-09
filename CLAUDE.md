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
  reverse · surprising without context · a real trade-off**. Note: this repo
  diverges from that skill's generic templates in two ways — every ADR uses the
  fuller `Context / Decision / Consequences` form (not the skill's minimal
  template), and `CONTEXT.md` is a `## Glossary` of `### Term` entries (not the
  skill's `## Language`/`_Avoid_` layout); match the repo's actual files. This
  repo's **rule of two** for new vocabulary (coin a glossary/ADR term only on a
  concept's *second* instance) is defined in `docs/agents/domain.md`,
  complementing that skill's 3-part test.
- **Which Skills to actually use** is curated in the `journal` Tenant's **Skill
  Inventory** — `layers/journal/content/current/skills/`, rendered at
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
  green-light (ADR-0003). **Opening that PR is automatic — don't ask.** A session
  that committed substantive work opens the gated PR itself once the work is
  coherent; it doesn't stop to ask "shall I open a PR?" (more commits can always
  follow). **"Substantive work" means at least one commit on the feature branch
  beyond the session-log-only commit** (the ADR-0009 direct-to-`main` exception
  below) — a real code/content/doc change, not just exploration or reading. A
  session that commits nothing, or only a session log, isn't substantive and has
  nothing to gate; a session that lands even one working commit is and opens the
  PR itself. This gates *opening*, not *deciding to do the work* — net-new
  autonomous work still needs a green-light first (ADR-0003 amendment). The
  session-log direct-to-`main` exception (ADR-0009) is untouched. **Watching the
  PR is automatic too** — on opening it, subscribe to its activity and babysit it
  to merge/close; don't ask "shall I watch it?". **Before announcing intent to
  open a PR, check whether one already exists on the current branch** (e.g.
  `mcp__github__search_pull_requests` or `list_pull_requests` scoped to the
  branch) — don't tell the user you're about to open one without checking first.
- All work must clear the **safety gate** (build/validate/isolation, ADR-0004).
  The manifest-expansion and routing modules (`content.config.ts`,
  `shared/expand.ts`, `modules/routing.ts`), isolation logic, CI, and
  governance/ADRs are **human-only** — never auto-merge changes touching them
  (ADR-0004's high-risk set). "Human-only" gates *merging*, not editing:
  `content.config.ts` is hand-editable (below), but a PR touching it still
  needs a human to merge.
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
- **A chartered autonomous job's first step is always: `git fetch origin main`,
  then branch off it with that job's own default branch name** (e.g.
  `journal/audit-docs-<today-UTC>`, `journal/digest-<today-UTC>`). **A
  caller-pinned designated branch overrides that default name** — branch the
  pinned name off `origin/main` instead. This is the one canonical statement of
  that step; a chartered job's own Skill only needs to give its default name and
  point here, not restate the fetch/branch/override mechanics.
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
- **Never restate a Routine's schedule (a cron expression, "nightly", etc.) in a
  Skill, ADR, or any other committed doc.** A Routine lives entirely outside
  git — it can be rescheduled, paused, or deleted (`update_trigger`,
  `delete_trigger`) without a single commit, so a hardcoded cadence isn't a
  same-repo duplicate the way two doc copies are; it's a claim about state this
  repo has no way to keep in sync at all. There is no in-repo "one home" for a
  Routine's schedule to point to — the live trigger registry (`list_triggers`)
  is the only source of truth, and it isn't committed content. State that a Skill
  *is* scheduled if that's relevant to how it behaves; don't state *when*.
- Inspect files with the **Read tool, not `cat`** — the Edit tool refuses to edit
  a file it hasn't seen via Read, so `cat`-then-Edit forces a wasteful re-read.
- **Don't tear down a preview/dev server with `pkill` — use `scripts/preview.ts`.**
  (`shot` for a one-shot screenshot; `start`/`stop` to keep one running — see the
  screenshot section below.) Hand-rolled `pkill -f <pattern>` teardown silently
  corrupted work **three times** (#102 → #183 → #240) and the fix is now a tool,
  not more prose: `pkill -f` matches the invoking shell's *own* command line
  (self-match — it SIGTERM-kills the chain mid-flight) and, in a shared container,
  *other agents'* servers too; `preview.ts` instead kills only the specific child
  PID it started, on its own ephemeral port, and its `stop` always exits 0.
- **For any *other* process-killing teardown, run it as its own command, never
  `&&`- or `;`-chained** before steps that must run. Two failure modes: `pkill`
  exits 1 when nothing matched (routine in idempotent teardown), and a kill that
  matches the chain's *own* shell drops everything after the separator — a chained
  `git add` never runs and no error points at it. When a teardown/`pkill` step
  *does* match and kill its target the command it kills commonly reports exit code
  **144** (128 + 16, i.e. terminated by `SIGTERM`); that's the expected result of a
  successful kill, not itself evidence of a problem — don't re-derive it as a
  failure signal each session.
- **Don't `&&`-chain a branch rename/creation with the commit/push steps that
  follow it** — the same silent-drop failure mode as the pkill bullet above:
  `git branch -m ... && git commit ... && git push` (or `checkout -b`) fails at
  the rename/create when the branch already exists locally, and every step
  after the `&&` never runs. Check existence first (e.g. `git rev-parse
  --verify <branch>`) and handle the already-exists case explicitly instead of
  chaining blindly.
- **A session-closure Stop hook "Unverified" commit flag isn't automatically
  this session's to fix.** The hook can flag commits that are actually
  inherited history — landed on `main` before this branch existed, reachable
  from `origin/main`. Before acting on the flag, run `git log
  origin/main..HEAD`: if the flagged commits aren't in that list, they predate
  this branch and must **not** be rebased/rewritten (e.g. via the hook's
  suggested `--reset-author`) — doing so would rewrite public history. Only
  commits that *are* in `origin/main..HEAD` are this session's own and fair
  game to fix.
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
  queued. Babysit the PR you opened through to that terminal state — **subscribe
  to its activity automatically when you open it, don't ask first**. (This is a
  PR-completion discipline, distinct from *session logging*, which now fires at
  self-judged closure and records an in-review PR honestly — see "Logging your
  session".) **Repo-level GitHub auto-merge (`enable_pr_auto_merge`) is
  currently unavailable on this repo pending a repo-owner Settings change**
  (`Settings → General → Allow auto-merge`, tracked in #231) — don't attempt to
  enable it yourself. Merge manually once the gate reports green **only where the
  change is already auto-merge-eligible** (the digest / reviewer-agent tiers,
  ADR-0003/0004); an ordinary work PR is still merged by a human, never
  self-merged (see "no self-merge" above).
- **Opening the PR is the first session log.** The moment you open the gated PR
  is a closure point: invoke `close-session` right then (it authors the log via
  `log-session`), with status **`in-review`** (the PR is open, not merged — never
  `completed`). It's not finished; more commits and a re-fired log can follow
  (re-invoking is safe, the last landed state wins), and a later session flips the
  status to `completed` on merge.
- **Three distinct worktree-isolation mechanisms exist in this environment — pick
  the one that matches the task, don't conflate them:**
  1. **`EnterWorktree`/`ExitWorktree`** (interactive, session-level) — switches
     *this whole session's* working directory into a new git worktree. Use it
     only when the user explicitly says "worktree", or CLAUDE.md/memory directs
     the current task to run in one — never invoke it proactively for routine
     work.
  2. **The Agent tool's `isolation: 'worktree'` parameter** (per-subagent) — the
     mechanism for dispatched subagents, especially parallel ones, that will
     touch git. Pass it **explicitly** — it is an Agent-tool parameter, not
     implied by the prompt. Without it, "parallel" agents share one checkout and
     race on branches.
  3. **Plain manual `git worktree add`** — an ordinary git operation with no
     session-switching or Agent-tool wiring. Use it only for an ad-hoc, one-off
     worktree you'll manage by hand yourself (e.g. inspecting another branch's
     tree side by side) — it is not a substitute for either tool above, and a
     subagent brief that says "use `git worktree add`" instead of passing
     `isolation: 'worktree'` is doing mechanism 2's job with the wrong mechanism.
  - **For mechanism 2, "pin its worktree root" is not enough on its own — the
    sharp edge is that a dispatched subagent's Bash tool does not preserve
    working directory across separate tool calls.** A single `cd` into the
    worktree root early in a subagent's work does **not** carry over to a later,
    separate Bash invocation — each call starts from whatever cwd the harness
    resets to. So when briefing a worktree-isolated subagent, **every
    git-touching command in the brief must itself include the
    `cd <worktree-root> &&` step** — never phrase the brief as "cd into your
    worktree, then run these git commands," since that reads as a one-time
    setup step the subagent will (correctly, given how the tool actually
    behaves) fail to repeat.
  - **A mechanism-2 worktree has also been observed starting from a stale or
    unrelated HEAD instead of `origin/<default-branch>`** — this has hit
    multiple parallel worktree-isolated subagents in the same session. Don't
    assume the freshly provisioned worktree is already on top of
    `origin/<default-branch>`: after dispatch, verify the worktree's branch
    HEAD matches `origin/<default-branch>` before any commit, and rebranch
    explicitly if it doesn't.
- **Every agent-authored interaction with GitHub, or any other external
  system, carries a two-line provenance footer, no exemptions** (ADR-0017):
  ```
  Co-Authored-By: <model name> <noreply@anthropic.com>
  Claude-Session: <session URL>
  ```
  Commits already get this for free from the harness's own commit template —
  nothing to do there. Everything else an agent creates outside this repo's own
  git history — issues, PR descriptions, PR/issue comments (top-level *and*
  inline review comments), or a post to any future non-GitHub integration —
  doesn't: append the same two lines yourself as the last lines of the body.
  There is no "top-level only" carve-out. This exists because agent-driven
  API calls run under the human owner's own authorized connection, so
  `user`/`merged_by`/comment-author always read as the owner regardless — the
  footer is how attribution survives anyway, without fixing (or needing to
  fix) those fields. It's a **documented convention, not gate-enforced**:
  external-system content isn't part of the build the safety gate checks.

## Repo layout

```
CONTEXT.md                          # domain model / ubiquitous language (glossary only)
docs/adr/                           # Architecture Decision Records (read all before planning)
layers/<tenant>/tenant.config.ts    # the manifest an agent edits (declarative intent)
layers/<tenant>/content/<space>/<collection>/…   # Documents, isolated per Space
                                    #   (Tenant layers live under Nuxt's `layers/`, auto-extended — ADR-0018)
layers/<tenant>/tests/              # this Tenant's OWN tests (unit + e2e module) — see tests/README.md
shared/manifest.ts                  # manifest types + defineTenant() + validation
shared/expand.ts                    # pure manifest→keyed-collection expansion (expand(), L3-tested)
modules/routing.ts                  # build-time Nuxt module: manifests → #routing virtual module (ADR-0014)
content.config.ts                   # ordinary module — builds keyed collections dynamically (ADR-0013)
app/composables/space.ts            # useSpace(): route → keyed collections or 404 (auto-imported wrapper)
app/pages/t/[tenant]/[space]/[...slug].vue   # runtime routing + ContentRenderer
tests/unit/                         # PLATFORM unit tests (L3 isolation, shared/, scripts/)
tests/e2e/smoke.spec.ts             # the ONE L2 smoke build; imports each Tenant's e2e module
tests/support/ , tests/README.md    # shared e2e helpers + the test-homing convention (ADR-0004)
.github/workflows/gate.yml          # the safety gate (installed & live); human-only —
                                    #   CI is never agent-edited (ADR-0004)
.agents/skills/ , .claude/skills/   # committed Skills (general + platform-operation)
```

## Self-verification — the safety gate (ADR-0004)

Run this before proposing any change. **`pnpm gate`** is the one command — the exact
steps it runs are single-homed in `package.json`'s `gate` script, not restated here,
so this doc can't drift from it — and CI (`.github/workflows/gate.yml`) runs the same
steps. Both the keyed collections and the routing map (`#routing`) are derived from
the manifests at build time (ADR-0013/0014) — no regenerate step needed.

```
pnpm install     # installs deps, then runs `nuxt prepare` (derives #routing + collections)
pnpm gate        # the layered gate, cheapest-first — L0/L1/L2/L3 are defined in ADR-0004
```

**Iterating on content only?** `pnpm validate:content` (`scripts/validate-content.ts`) is the
one command that actually runs each Document's data through its Collection's Zod schema
(`.safeParse()`) — `pnpm build` only uses the schema to derive SQL column types, it never
validates real content against it. `validate:content` checks every Tenant's content in ~1-2s,
without paying for `nuxt build` or `pnpm test:e2e`. It is a **local, additive supplement for
fast feedback during content-only edits — not a replacement for the full gate above**, which
stays the mandatory, unchanged merge gate (ADR-0004; see Ground rules above — CI is never
agent-edited).

**Need a screenshot of a running page** (e.g. to eyeball a render during a session)?
Run `pnpm exec tsx scripts/preview.ts shot <route> <out.png> [WxH] [--dev]` — it
starts a server on its own ephemeral port, screenshots the route, and tears the
server down again, all in **one command**, so there is no separate server to
start or `pkill` to get wrong (issue #240). It defaults to a production-accurate
`preview` server (needs a prior `pnpm build`); pass `--dev` for fast iteration
against `nuxt dev` — but the dev server injects a Nuxt DevTools overlay badge
(e.g. a small "26 ms" timing pill) that can overlap real content and read as a
UI bug, so prefer preview for a shot you're trusting. The optional `WxH` (e.g.
`1280x1600`) sets the window size — use it to reach below-the-fold content.

**Need the server to stay up** across several captures (e.g. `scripts/plate-gallery.ts`
or an ad-hoc Playwright probe)? `scripts/preview.ts start [--dev]` prints a `PID=`
and a `URL=` and leaves the server running; `scripts/preview.ts stop <pid>` tears
it down (always exits 0 — safe to chain). To screenshot a URL that is *already*
serving, `scripts/screenshot.ts <url> <out.png> [WxH]` drives the pre-installed
Chromium directly (via `PLAYWRIGHT_BROWSERS_PATH`, no new dependency or browser
download) — it's the lower-level capture that `preview.ts shot` uses under the hood.

### Verifying UI changes

- **Grepping SSR HTML is not proof a change renders.** The server-rendered
  output includes a serialized `useAsyncData` payload — a string match there can
  succeed even when the actual DOM never picks up the change (or errors trying
  to). Verify presentational changes against the **rendered DOM**, not the raw
  HTML text — take a screenshot with `scripts/screenshot.ts` (see above), or
  drive the page with Playwright.
- **To verify a click/interaction, not just a static render**, write a small
  ad-hoc `playwright-core` script against the same pre-installed Chromium
  `scripts/screenshot.ts` uses — import `resolveChromiumPath()` from
  `scripts/chromium-path.ts` rather than re-deriving the `PLAYWRIGHT_BROWSERS_PATH`
  lookup by hand, and launch it with `chromium.launch({ executablePath: resolveChromiumPath() })`.
  Two gotchas: (1) `tsx` runs the ad-hoc script as CJS, so wrap top-level `await`
  in an `async` IIFE; (2) write the script **inside the repo tree** so its imports
  resolve against `node_modules` (any devDependency used in an ad-hoc script —
  `playwright-core`, `yaml`, etc. — is scoped to this repo's `node_modules`, not
  global).
- **A screenshot can't be trusted to rule out a subtle/scoped CSS change** —
  downscaled or compressed PNGs can mask a style that actually applied. Before
  concluding a scoped style is missing, probe the element's *computed* style
  with the same `playwright-core` pattern above, e.g.
  `page.$eval(selector, el => getComputedStyle(el).propertyName)`. A
  screenshot confirms a render happened; computed-style probing confirms a
  *specific* style took effect.
- **The journal Space landing is a custom dashboard, not a Markdown render.**
  `layers/journal/app/pages/t/journal/[space]/index.vue` wins over the generic
  catch-all for the Space *root* and builds its own layout (stat tiles, digests,
  session feed, Skill Inventory, …) from the Space's `pages`/`skills`/`sessions`
  Collections. It renders `index.md`'s body only as the small "editorial intro"
  section — most of the page is not `index.md`. Editing `index.md` alone will
  not change what most of that page shows; check the `.vue` file too.

To **add a Space or Collection**: edit the Tenant's `tenant.config.ts`. The keyed
collections update automatically via `content.config.ts`, and the routing map
(`#routing`) is re-derived at the next `nuxt prepare`/`build`. No regenerate step
needed. To **spawn a Tenant**: drop a `layers/<name>/` folder with a manifest and
content, then run `pnpm install` (or `nuxt prepare`) to pick it up — Nuxt
auto-extends every `layers/*`, so no `nuxt.config.ts` `extends` edit is needed
(ADR-0018).

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

**You self-judge closure — invoke the `close-session` Skill when the session is
wrapping up.** `close-session` is the single **front door** for Session closure
(glossary): it runs the closing sequence — coherent state → gated-PR discipline
(if any) → the session log, which it authors by calling `log-session`. Its
trigger is deliberately **loose and early** ("am I winding down?"), so reach for
it while you can still act rather than after checking out. No "are we done?" ask,
no waiting for merge: closure means the work is in an honest, coherent state (a
log records an in-review PR truthfully).

Authoring the scratch *is* the "done" signal — the committed `Stop` hook lands it
**only if** it exists, so a mid-work freeze logs nothing. Re-invoking is safe: it
refreshes the scratch, and the hook overwrites the single per-session log with a
superset (diff-guarded — an unchanged re-derive never touches `main`). So if you
call closure and then do more, just invoke `close-session` again.

Because authoring no longer commits and re-firing self-heals, both Skills are
**model-invocable** — invoke `close-session` yourself at closure rather than on a
human prompt (call `log-session` directly only to *amend* an already-written
log). This mechanism serves autonomous sessions too: they close before ending, on
purpose. Whether the affordance actually gets invoked is measurable — the
`close-session` invocation rate is the signal that would justify (or retire) a
heavier automatic safety net (ADR-0009).

## Status

Current-state facts — which Tenants, Spaces, and Collections exist, and what's
still deferred — are single-homed elsewhere, not restated here where they rot
(an earlier example list in this very sentence rotted and had to be cut): the **ADRs**
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
