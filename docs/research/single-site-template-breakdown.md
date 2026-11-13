# What Terrarium does today, and what a single-site template could take from it

A breakdown of everything Terrarium does at build time, at runtime, in
interactive sessions and in Routines, each with a recommendation for a possible
spin-off. Written on 2026-11-13 from the repo at `42d8d760b`. **Status:
reference; decides nothing.** Every verdict is the writing agent's proposal.

## The task

The owner asked which parts of this repo to keep, adapt or redesign for a
different use: instead of an experimental multi-Tenant Platform, a GitHub
template for simple single-site content websites. A new site would be created
from the template; a Claude Code session would first help set it up (issue
labels, the installed Skill pack, a deploy), leaving a hello-world site with
the Skills and hooks for a working model like Terrarium's. The owner then
steers at product-owner level: chats, files and reads issues, approves the
important merges. A much smaller set of rules still ensures that changes are
reviewed, tested and documented.

The owner then set this deliverable: read every Glass Box lesson, dig into the
source and the recorded state (session logs, Friction Ledger, Skill Inventory),
and break down what Terrarium does at build time, at runtime in the browser
(mostly the Journal and Glass Box), in interactive sessions and in Routines,
with a recommendation to keep, simplify, adapt, drop or replace each part.

## What the owner settled first

- **For whom:** the owner's own sites first, usable by a stranger.
- **Goal:** ship real sites, and show that keeping only what works gives a much
  simpler project. Simpler means clear and consistent concepts, clear extension
  points, an architecture that is easy to understand, fewer custom terms, and a
  standard in place of custom code wherever one exists.
- **How the owner works:** through claude.ai/code and slash commands. Cloud and
  laptop sessions must both work.
- **Sites:** content sites, with content kept as Markdown and YAML files in the
  repo. Fully static output is not required. Server-side API routes must be
  possible. The stack is not decided.
- **Start empty:** a Terrarium part enters the template only with a reason.
- **Platform and site kept apart.** The platform part may be changed in a site.
  Changed Skills, instructions and scripts may flow back to the template; a
  site's session logs and Frictions never do. That flow is automated by
  platform Skills except for the trigger.
- **Three kinds of files** (platform, seed, site) is an acceptable split; other
  splits are open.
- **Public or private** repos both work; an owner-only area behind access
  control is acceptable.
- **The loop** runs on demand or from a Routine; both stay possible.
- **Autonomy** is a choice made at setup.
- **No outside contributors** to a site.
- **Documented** means ADRs and a glossary; generated developer docs are a
  later, second-priority feature.
- **No pilot site** is planned.

## Sources and how to read them

- All 74 Glass Box guide pages: 22 read in full by the writing agent, 52
  digested by three subagents.
- Five subagent inventories of the code and the recorded state, and two stack
  studies: one from official docs with one-page tests, and one that built the
  same small site in Astro and in Nuxt Content. Their test projects were
  throwaway and are not kept; the writing agent spot-checked the second
  study's build logs.
- File and line counts were re-checked by the writing agent with `wc` and `ls`.
- Usage figures (sessions, Frictions, costs) come from a subagent's scripts over
  all session logs and were **not** re-run.
- The full ADRs were not read; reasons are taken from the lessons and the ADR
  summary rules.

**Verdicts.** **Keep** as is · **Simplify** (same idea, far less machinery) ·
**Adapt** (same goal, different shape) · **Replace** (a standard tool in place
of our code) · **Drop** · **Later** (not in a first version; add when a site
needs it).

## The short version

Almost everything in Terrarium exists for one of six reasons, and the template
has only the first:

| Reason | Examples | Template |
|---|---|---|
| Agents build the repo | gate, review, session log, Friction loop, protected paths | has it |
| Several Tenants in one app | manifests, expansion, routing map, catalog, layers, 10 of 30 ADRs | gone |
| Outside contributors | trust tiers, guest pipeline, fork refusals | gone |
| A public experiment that documents itself | Journal, Glass Box, Blog, digests | gone, or optional |
| Volume and parallel agents | worktrees, locks, retries, ledger, Skill Inventory, 11 Routines | gone at first |
| Workarounds (cloud environment, Nuxt Content) | about half the hooks; content validation, payload cache | most gone |

What remains is a short chain: **short CLAUDE.md → one gate → PR and review → a
merge script with protected paths → a session log with Frictions → a periodic
retro that fixes recurring causes.** Around it: decision records, one glossary,
issue labels as the owner's inbox, and the installed engineering Skills. Each
lesson's "Try it in your project" section already describes the minimal form of
its practice, so the lessons are close to a spec for "start empty".

Scale of what is left behind:

| | Terrarium | Template target (proposal) |
|---|---|---|
| Skills | 52 (27 installed, 25 own) | about 12 installed, about 6 own |
| Rules in `.claude/rules/` | 40 (4 always loaded) | a handful, none generated |
| ADRs | 30 | about 5 shipped |
| Hook commands wired | 33, backed by 2,632 lines | 2 or 3 |
| Session-log scripts | 5,443 lines in `scripts/session/` | one small script |
| Gate scripts | 2,223 lines in `scripts/gate/` | one package script |
| Routines | 11 | none required, 1 optional |
| Always-loaded guidance | about 3,300 words | under a screen of CLAUDE.md plus a short glossary |

## 1. Build time

| What Terrarium does | Why | Verdict | In the template |
|---|---|---|---|
| Turns each Tenant's manifest into Collections for every Space (`shared/manifest.ts`, `shared/expand.ts`, `content.config.ts`) | several Tenants | **Drop** | One hand-written content config. Keep the principle: a typed schema per kind of content. |
| Builds the `#routing` map and resolves `/t/<tenant>/<space>/…` (`modules/routing.ts`, `shared/routing.ts`, `useSpace`) | several Tenants | **Drop** | The framework's own file routing. |
| Builds the `#catalog` and reads across Tenants (kinds, `queryAcrossTenants`, the Commons) | several Tenants | **Drop** | Nothing. Site search, if wanted, is an ordinary site feature. |
| One Nuxt layer per Tenant, wrapper classes and name prefixes to keep them apart | several Tenants | **Drop** | One app. |
| Home page that showcases the Tenants (941 lines) | experiment | **Drop** | The site's own home page; the seed is a hello-world page. |
| Validates content against its schema with our own script (170 lines) | Nuxt Content doesn't | **Replace** or keep | Depends on the stack (section 6). |
| Checks references and component use inside content for three Tenants (786 lines) | Tenant content rules | **Drop** | The pattern stays as an extension point: a site's own content rules are unit tests in the site. |
| Pre-renders Mermaid diagrams to themed SVG and checks them (555 lines in five files; 4 pages use a diagram) | no browser in production | **Later** | A site that wants diagrams commits SVGs made with the standard Mermaid CLI. |
| SVG safety filter for SVG held in content | inline SVG from content | **Later** | Only when a site inlines SVG from content. |
| Checks ADR summaries against their ADRs, Skill Inventory wording, the prune-trial ledger, Glass Box page lengths | machinery we built | **Drop** | The things they check are dropped. |
| Pins installed Skills by hash through the Skill Inventory | a reinstall would undo edits silently | **Simplify** | A checksum file for installed Skills, checked in the gate. |
| `pnpm gate`: lint, type check, content validation, unit tests, build, browser tests | agents merge on it | **Keep** | The core. One package script, run locally and by CI. |
| `gate:scoped`: skips steps by changed paths, locks, slots, detects edits during a run (370 lines) | volume, parallel agents | **Drop** | Run the whole gate; a small site's gate is quick. Add a fail-closed docs-only skip if it ever hurts. |
| CI as a thin workflow plus a composite action, a parity test, and a "green" comment to wake the session | a cloud token can't push workflow files | **Simplify** | One workflow that runs the package script, so changing the gate never means editing the workflow. No parity test needed. |
| Workflow that labels PRs by author trust | outside contributors | **Drop** | |
| Dependabot grouped updates | any repo | **Keep** | Config only. |
| Self-updating container: polls `main`, builds beside the live site, swaps only a good build (160 lines) | content baked into the build | **Adapt** | Keep the two rules: merging is deploying, and a failed build never replaces the live site. The mechanism depends on the stack and host; setup picks it. |
| Build stamp in the footer | know what is live | **Keep** | |
| Frozen lockfile, pinned package manager, a person approves new dependencies | supply chain | **Keep** | |
| 170 spec files; most Platform specs test agent tooling (hooks, gate, session scripts) | tooling needs tests | **Simplify** | Tests shrink with the tooling. The site gets one smoke test that loads every page and fails on a console error. |

## 2. Runtime: server and browser (Journal and Glass Box)

| What Terrarium does | Why | Verdict | In the template |
|---|---|---|---|
| Renders every page per request and caches it for 60 seconds; nothing is prerendered | payloads for in-app navigation | **Replace** | Prerender content pages; render on the server only what needs it. Details depend on the stack. |
| Ships a SQLite database to the browser as a fallback, with a recovery dialog when it fails to load | Nuxt Content behaviour | **Drop** or avoid | Stack-dependent. |
| Recomputes dashboards in the browser after the server rendered them | hydration | **Drop** or avoid | Stack-dependent. |
| No server routes of our own (no `server/` folder) | kept out on purpose | **New** | The template needs a named place for server routes, and a rule that a new one is the owner's merge. |
| **Journal**: session feed with detail cards, KPI tiles, Friction Ledger page, ideas page, Skill Inventory page, Routine cost charts, daily Digests, an archive Space | the experiment shows itself | **Drop** from the core | The owner asks a slash command for a summary. A minimal owner area (a list of session logs and open Frictions behind access control) is a later module. |
| Journal landing loads up to 1,000 full session logs into one page | grew with volume | **Drop** | |
| **Glass Box**: 75 guide pages pinned to commits, term pop-ups, code excerpts, reading progress, a workshop Space | a textbook of the Platform | **Drop** | How the platform works is documented once, in the template repo. Generated developer docs for a site (the owner's second-priority idea) can reuse two things: pages pinned to a commit, and excerpts checked against it. |
| **Commons** search and timeline | several Tenants | **Drop** | |
| Components inside Markdown, with a checklist for when to use one in place of a frontmatter field | authoring | **Keep** | As an extension point with the same short rule. |
| Design tokens as CSS custom properties, dark mode, reduced motion | web standards | **Keep** | One tokens file in the seed. No wrapper classes or prefixes. |
| ARIA practice, tested through roles in browser tests; no automated accessibility check | web standards | **Keep** | The ARIA lesson itself names the missing automated check as a gap. |

## 3. Interactive sessions

### Guidance

| What Terrarium does | Why | Verdict | In the template |
|---|---|---|---|
| `CLAUDE.md` (1,021 words) with "before X, read Y" triggers | every session reads it | **Simplify** | Same shape, a fraction of the length. |
| Platform glossary (1,325 words, always loaded), a map, one glossary per Tenant | several contexts | **Simplify** | One short glossary for the site. Most Platform terms disappear with multi-tenancy. Keep the rule that a term is coined on its second use. |
| 30 ADRs, rewritten in place, no dates or status | why things are so | **Keep** the practice | Ship about five: operating model, gate and merging, session log, platform and site separation, stack. |
| Every ADR mirrored as a summary rule with a hash; hooks that add rules Claude Code didn't load, point to ADRs after edits, and record which rules loaded and whether they helped | rules were skipped | **Drop** | Plain path-scoped rules, written by hand, only where a rule is about certain files. In the usage data the hints for this are among the top Friction causes. |
| 12 how-to docs for agents (11,328 words) | details kept out of CLAUDE.md | **Simplify** | About three short ones: git and PRs, issues and labels, environment caveats. |

### Hooks (33 commands)

| Group | Verdict | In the template |
|---|---|---|
| Session start: install dependencies, fetch full history, probe the network | **Keep** the install | |
| Land the session log at the end of a turn | **Keep**, simplified | See "Where logs live" below. |
| Remind a session that opened or merged a PR to close and log | **Keep** one | The loop depends on logs being written. |
| Guards against Claude Code and cloud quirks (about ten) | **Drop** at first | Start with a line in the caveats doc; add a guard when a Friction recurs. These are exactly what a site should later receive from the template. |
| Provenance guard and commit trailer script (768 lines) | **Simplify** | One instruction: start a post with the session link. Owner and agents share one GitHub account, so the mark is still useful; a guard is not needed at this size. |
| Guard that forces a read of the subagent Skill; hints to read docs first | **Drop** | Third and first in the Friction Ledger (62 and 93 occurrences). A shorter CLAUDE.md needs them less. |
| Shared hook plumbing, guard roster, fail-closed convention, wiring test | **Keep** the convention | One page: how to add a guard, how it fails, how it is tested. This is the extension point. |

### Skills and scripts

| What Terrarium does | Verdict | In the template |
|---|---|---|
| 27 installed engineering Skills | **Keep** fewer | Install what gets used: grilling, code-review, tdd, diagnosing-bugs, domain-modeling, triage, to-spec, prototype, research, wizard, writing-for-agents. Eight installed Skills have no recorded use here. |
| `close-session` and `log-session`; 5,443 lines that derive timings, tools, files read, rules loaded and subagent costs from the transcript | **Simplify** | One Skill and one small script: the agent writes goal, outcome and every Friction; the script adds what git knows (branch, PRs, files changed) and commits. The transcript-derived half feeds the Skill Inventory and rule-use reports, which are dropped. |
| Logs go straight to `main`, built with git plumbing, checked against `main`'s schema, retried | **Adapt** | See "Where logs live" below. |
| `merge-pr.ts` (682 lines): waits for CI, refuses Human-only files read from `main`, checks trust tiers, forks, verdict lines, Dependabot rules, closing keywords | **Simplify** | Keep: wait for green, refuse protected paths (list read from `main`, fail closed), apply the chosen autonomy level, the owner's waiver. Drop the rest. |
| Human-only list as the `paths` of a rule | **Keep** | Call it protected paths; one file. |
| Approval model: agents propose freely, build new work only on the owner's word or a label | **Keep** | |
| Issue labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` | **Keep** | They come with the installed pack. |
| `clear-backlog` with two workflow scripts; `auto-triage` | **Simplify** | One slash command: list open issues, ask the owner everything open in one round, build what was approved, one after another. |
| Preview, screenshot and in-page checks for UI changes (697 lines) | **Simplify** | One script. It matters more here: an owner who doesn't read diffs judges a change by its screenshots. |
| Subagent dispatch rules, worktrees, stranded-work sweep, workflow scripts | **Drop** at first | One session at a time. |
| `inspect-session`, `wayfinder`, guest and Tenant content Skills | **Drop** | |
| Environment caveats doc | **Keep**, short | Maintained in the template and received through sync. |

### Where logs live

Terrarium commits each log to `main` inside the Journal's content, so every log
triggers a rebuild of the site and must pass the site's content schema. The
proposal is to put logs on their own branch. A log then never triggers a deploy
and has no tie to the site's schemas, and `main` could use GitHub's own branch
protection with the gate as a required check, which direct pushes to `main`
otherwise rule out or need a bypass for. The retro reads that branch; an owner
area would too. The cost: logs are not in `main`'s tree. This is the owner's
decision.

One limit shapes the merge script either way: GitHub's branch protection cannot
tell the owner from agents that act under the owner's account, and an author
cannot approve their own PR. So "a person merges these paths" cannot be left to
GitHub's review rules and stays in a script.

## 4. Routines

The usage analysis found 784 of 1,517 logged sessions were started by a
Routine, and 58% of the named Routine runs were upkeep of the working model
itself. The Routine cost files (the newest 30 runs each, about a month) sum to
about $1,240.

| Routine | What it does | Verdict |
|---|---|---|
| `frictions-to-fixes` | groups Frictions by cause in a ledger, fixes the safe ones, files the rest | **Simplify** into one `retro` Skill, run on demand or weekly. Four of its last eight runs landed no fix. |
| `harvest` | turns logged ideas into issues for the owner | **Drop**; the retro files ideas as issues. |
| `prune-trial` | cuts instructions on trial and judges by later Frictions | **Drop** the machinery; keep one line in the retro: a fix should remove as much as it adds. A trial needs many sessions to judge. |
| `audit-skills` | grades every Skill and records Routine costs | **Drop**. The most expensive Routine. |
| `audit-docs` | finds docs that no longer match the code | **Later**, as an occasional check inside the retro. |
| `dependabot-sweep` | merges safe bumps, files issues for majors | **Later**; small and useful for a real site. |
| `visitor-loop` | sends first-time visitor agents through a preview | **Later**, optional. |
| `digest`, `blog-post`, `glassbox-update`, `glassbox-curate` | write the experiment's own sites | **Drop** |

A template site needs no Routine. One optional weekly retro is enough to start.

## 5. What the template needs that Terrarium doesn't have

1. **A setup Skill** that walks the owner through the steps only they can do:
   labels, installing the Skill pack, the deploy target, the autonomy level,
   public or private.
2. **Platform, seed and site kept apart**, with a file that lists the platform
   paths and the template commit last taken.
3. **Sync in both directions.** Taking updates: fetch the template, apply its
   changes since the recorded commit, resolve conflicts, open a PR that passes
   the site's gate. Offering changes: when a session changed a platform file,
   open a PR on the template with only that change. The template's CI builds a
   fresh site from the PR and runs its gate. Each site also gates what it
   takes, so a bad change is caught twice.
4. **A place for server routes**, and an optional owner area.
5. **Autonomy levels** as one line in the merge rule.

Open problem in 3: a cloud session can only push to repositories attached to
it. The owner's own sites can attach the template; a stranger's site can only
send a fork PR, and someone must start the run that accepts it.

One fact that constrains 2 and 3: Claude Code plugins cannot deliver the
platform part. The docs say plugins declared in a repository's
`.claude/settings.json` don't load in cloud sessions, and a cloud session
doesn't add the marketplaces a repository lists
([plugin loading](https://code.claude.com/docs/en/plugins/loading.md),
[skills](https://code.claude.com/docs/en/skills.md), both read 2026-11-13).
Skills committed to `.claude/skills/` do load in a cloud session on one
repository. So the platform's Skills and hooks have to be plain files in each
site repo.

## 6. Stack: not decided

The owner chose not to decide the stack now. Two studies ran on 2026-11-13;
their findings are kept here for that later decision.

**Study 1: official docs and one-page test builds** (Nuxt 4.6.4 with Nuxt
Content 3.16.2, Astro 7.4.11, Eleventy 3.1.8).

- **Nuxt Content does not check content against its schema.** A file with an
  out-of-enum value and an extra key built cleanly and was rendered; a file
  with a bad date was dropped with a warning and the build still passed. This
  is why `scripts/gate/validate-content-schema.ts` exists.
- **Astro checks it out of the box.** The same bad file failed the build with
  an error naming the file and each wrong field.
- **Eleventy** is the smallest to learn, but validation is a function you
  write, and it generates no types.
- **Astro's cost is churn:** major versions in 2024-12, 2026-03 and 2026-06
  (npm registry).
- **Owner-only area on a static host:** Cloudflare Access can protect a path;
  in a container, a proxy such as Caddy can.

**Study 2: the same small site built in both stacks.** A home page, a blog
collection with a schema, a YAML data collection, a component inside Markdown,
a POST API route, one page rendered on demand, an owner-only path behind
server middleware, and a gate (lint, type check, content validation, one unit
test, one browser test, build). Both sites met every requirement and both
gates passed. One agent, one run each:

| | Astro 7.4.11 | Nuxt 4.6.4 + Nuxt Content 3.16.2 |
|---|---|---|
| Bad content file in the build | fails, naming file and field | builds and publishes it |
| Content validation in the gate | built in | a script we write (44 lines in the test) |
| Mistakes in a Markdown component | Markdoc: build fails with file and line. MDX: only some | all build silently |
| Server API route, on-demand page | work | work |
| Owner-only content | stays on the server by default | readable by anyone through `/__nuxt_content/<collection>/` until both the middleware and the prerender config exclude it, per collection |
| JavaScript on a blog post page | none | 12 files, about 244 kB uncompressed |
| Cold build | about 2 s | about 17 to 21 s |
| Whole gate | about 11 s | about 27 s |
| Wrong first guesses by the agent | 2 | 5 |

Against Astro in the same run: `astro check` refuses TypeScript 7 and
announces its own deprecation, a broken reference between collections does not
fail the fast check, and MDX breaks on `{}` or an HTML comment in prose.
Against Nuxt beyond the table: the documented server-side content query fails
the type check until imported explicitly, `nuxt typecheck` skips scripts and
tests, and prerender rules took several builds to get right. The study did not
test client-side interactivity in Astro, a container image, or dev-server
behaviour.

Several rows marked "stack-dependent" above exist only because of Nuxt
Content's runtime model, so the stack choice decides how much of sections 1
and 2 can be dropped.

## 7. Open decisions for the owner

1. **Stack** (section 6).
2. **Logs on their own branch** or on `main`.
3. **A pilot site.** The owner plans none. The writing agent still recommends
   one throwaway site built from the template, because the two-way sync is new,
   is the most complex part, and nothing else would exercise it.
4. **Which installed Skills** ship by default.
5. **Contributions from strangers' sites**: accepted through a run the owner
   starts, or not at all in a first version.
6. **Owner area**: first version or later.
