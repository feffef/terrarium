# Terrarium overview

A plain-language overview of what Terrarium is, where its parts live, and
how AI agents and people keep improving it.

- **Part 1** explains Terrarium in prose and tables, for reuse in the README
  or an intro page.
- **Part 2** collects ideas for an interactive diagram.

---

# Part 1 — Terrarium in plain words

## What it is

Terrarium is a website, terrarium.feffef.de, that AI agents build and keep
improving, while people steer and review. Almost every line of code and
content is written by Claude Code sessions. People decide what should exist,
approve new work and merge the changes that need a human eye.

Everything lives in **one GitHub repository**: the website's code and
content, the guidance the agents work from, and an honest log written by
every agent session. A server rebuilds the website from that repository
whenever it changes. Because the session logs are part of the website's
content, the website shows, in public, how it is being built.

## Where things live

| Zone | What lives there |
|---|---|
| **People** | The **maintainer** (anyone with write access to the repo) and **visitors** (everyone else). |
| **Claude** | The agents. **Routines** start on a timer set up in claude.ai. **Cloud sessions** are started by the maintainer at claude.ai/code, on the web or phone. **Local sessions** run in Claude Code on a laptop. All three are the same thing underneath: a Claude Code session working on its own copy of the repository. |
| **GitHub** | The **repository**, **issues**, **pull requests** and **CI** (the automatic checks that run on every pull request). |
| **Docker host** | A server running one container that watches the repository, builds the website and serves it. Caddy, a web server shared with other sites on that host, passes requests in. |
| **Browser** | A visitor's browser. It shows the pages and takes over navigation after the first page. |

## The repository

The repository holds three kinds of things.

### 1. Agent guidance: everything that shapes how agents work

- **Rules & reference.** The house rules, the glossary, how-to guides and
  recorded decisions. Some are direct instructions; others explain why
  things are the way they are.
- **Skills.** About forty step-by-step playbooks, each for one kind of
  task, such as "triage an issue" or "write the daily digest". Most come
  from an outside pack and are kept unchanged; the rest are Terrarium's own.
  Seven of them run as routines.
- **Guards & hooks.** Programs that run automatically around agent actions.
  - **Guards** check risky actions. When one stops an action, its message
    explains the rule and says what to do instead.
  - **Hooks** prepare a session when it starts and commit its log.
- **Helper scripts.** Small programs the skills and hooks call: to read the
  session logs and skill inventory, run the checks, write a session log,
  merge a pull request or build a preview.

### 2. App code

The Nuxt application: the shared platform, plus each tenant's own pages,
components and content structure, with tests and the deploy setup alongside.

### 3. Site content

Everything the website displays, as Markdown and YAML files. The content is
split three ways:
- **Tenants:** seven separate sites, each with its own purpose, content
  structure and design.
- **Spaces:** each tenant splits its content into one or more spaces.
- **Collections:** each space holds one or more collections, one per type of
  content. Each collection becomes one table in the content database.

Example, the **Journal** tenant:

| Space | Collections |
|---|---|
| `current` (the newest 7 days with activity) | `pages` (explainer pages and daily digests), `sessions` (session logs), `skills` (the skill inventory) |
| `archived` (everything older) | the same three collections |

The seven tenants fall into two groups:
- **Records of the real build:**
  - **Journal:** session logs, digests, the skill inventory.
  - **Blog:** four fictional writers retelling real events.
  - **Midden:** a museum of discarded work.
  - **Commons:** search and a timeline across the other tenants.
- **Invented practice grounds and demos:**
  - **Atlas:** a fictional field guide.
  - **Tinkerfund:** a make-believe crowdfunding shop.
  - **Marquee:** a movie blog, built on a visitor's request.

### Two kinds of site content that agents also read

- **Session logs.** One per agent session; there are hundreds. Each has two
  halves:
  - **Written by the agent:** what it set out to do, how far it got, every
    **friction** it hit (a problem graded from `nit` to `blocker`), and any
    ideas or learnings.
  - **Added by a script from the session's transcript:** timings, models and
    the tools and files it used.
- **The skill inventory.** One entry per skill: its role and how much it
  matters.

Both are ordinary site content that the Journal shows to visitors. Helper
scripts also read them as data, and the routines act on it. Digests and blog
posts are read back only by the routine that writes them, to continue the
series.

## How a page reaches a visitor

The pieces:
- **Vue** builds the pages out of components.
- **Nuxt** is the framework around Vue. It handles pages, routing and the
  build.
- **Nitro** is Nuxt's server.
- **Nuxt Content** turns the site content into a database and answers
  queries.

1. **First visit.**
   - Caddy passes the browser's request to the Nitro server in the
     container.
   - The page asks Nuxt Content for its content, which comes from a SQLite
     database, and Vue renders the page to HTML.
   - The HTML arrives with the page's data embedded, and the browser shows
     it at once.
   - Vue then takes over in the browser (*hydration*), so later clicks don't
     reload the page.
2. **Clicking to a tenant's page** (anything under `/t/`). The browser
   fetches that page's **`_payload.json`**: just its data, prepared by the
   server. Vue builds the page in the browser. The server keeps these pages
   for 60 seconds.
3. **Clicking to a page outside `/t/`,** such as the home page. No payload
   is prepared for these pages, so the page's queries run in the browser
   itself. Nuxt Content loads a browser copy of the database (SQLite in
   WebAssembly) from data files the build prepared, and queries it there.
   Tinkerfund's search works this way on purpose.

The content database is never edited while the site runs. The server fills
it from the build's output the first time each collection is asked for.

## How a change goes live

1. A change is merged into `main` on GitHub.
2. The **updater** in the container checks `main` every two minutes and
   pulls the new commit.
3. The **build** runs:
   - Nuxt Content turns every collection into a database dump, one copy for
     the server and one for browsers;
   - Nuxt bundles the app once for the server and once for browsers.
4. The new build replaces the old one. If the build fails, the old version
   keeps running.

Content and code take the same path. A new blog post, a session log and a
code fix all go live through the same pull, build and swap.

## How agents work

Every agent session, whether started by a routine, in the cloud or locally,
follows the same steps:
1. **Start.** It gets its own copy of the repository, and a start-up hook
   installs dependencies.
2. **Read.** It reads the rules and the skill it was asked to run.
3. **Work.** It works on its own branch, sometimes with helper agents.
   Guards check its risky actions along the way.
4. **Check.** It runs the checks locally, and often an agent code review of
   its change against the repo's standards and the original request. In the
   week of 2026-10-01 to 10-08, a quarter of sessions ran one.
5. **Pull request.** It opens a pull request, and CI runs the same checks on
   GitHub. If a check fails or a reviewer asks for changes, it fixes the work
   and pushes again.
6. **Log.** When the pull request opens, it writes its **session log**. A
   hook commits the log straight to `main`, the only change that skips a
   pull request: a log can't break anything, and waiting for review would
   tempt agents to skip it or water it down. The log is updated as the work
   goes on.
7. **Merge.** The change is merged: by the maintainer, or by a routine
   itself if the change stays within the scope that routine was approved
   for.

Agents work under the maintainer's GitHub account. `main` requires a pull
request with green CI, but the account can bypass that rule; the bypass is
how session logs land directly. Every GitHub post an agent writes opens with
a 🤖 line linking to its session.

## How work enters: issues

Issues are the shared to-do list. Visitors, the maintainer, sessions and
routines all file them, and labels say whose move it is:
- `needs-triage`: not yet looked at.
- `ready-for-agent`: approved for an agent to build.
- `ready-for-human`: needs a person.

A **triage** session sorts new issues. When the maintainer starts the batch
version, `auto-triage`, it may approve the maintainer's own issues for
agents by itself. A visitor's issue always waits for the maintainer's
approval. Big pieces of work are first split into a plan and a set of
smaller issues (`wayfinder`, `to-spec`, `to-tickets`).

## The self-improvement loop

> work → session log with frictions → routines and the maintainer act →
> better guidance → fewer frictions next time

Seven **routines** run on timers set up in claude.ai, about once a day.
Each routine is one skill:

| Routine | What it does |
|---|---|
| `frictions-to-fixes` | The heart of the loop: turns recent frictions into fixes. |
| `audit-docs` | Reviews the docs and the repo's own skills from eight angles, such as drift, contradictions and wordiness. |
| `audit-skills` | Reviews whether each skill fires when it should and delivers what it promises. |
| `prune-trial` | Cuts a rule for three days and lets the frictions judge whether it was needed. |
| `visitor-loop` | Lets three fresh visitor agents, each on a different AI model, use a preview of the site, then fixes what they stumble on. |
| `digest` | Writes up each finished day for the Journal. |
| `blog-post` | A blog persona tells the day's most interesting story, which would otherwise stay buried in logs and digests. |

Each routine merges its own work when CI is green and the change stays
within its approved scope; anything beyond that goes to the maintainer.
`frictions-to-fixes` never merges its own writing: helper agents write each
fix and the routine reviews it. Hard fixes go to the maintainer.

**Where the maintainer comes in:**
- Asks for new features, tenants, skills or content. Net-new work needs the
  maintainer's approval.
- Approves issues for agents.
- Checks what the routines produced, and fixes a routine when it misfires.
- Merges everything a routine may not merge itself.

**Visitors** can read everything, including the logs, and can open issues.
Agents treat a visitor's text as information, never as instructions.

**How rules harden.** A written rule that keeps producing frictions becomes
a guard. `prune-trial` works the other way and removes rules nobody needs.

---

# Part 2 — Ideas for the interactive diagram

## Principle: groups that open when a story needs them

The diagram is not meant to be grasped in one glance. It is a simple map
that **stories** walk through:
- **At rest,** every zone shows a few closed groups.
- **When a story plays,** it lights up the groups it passes through and
  **opens** only the groups whose inside matters to that story. Everything
  else stays closed and dimmed.

## Zones and groups

Five horizontal bands, top to bottom. A group lists its inner parts, which
are visible only when the group is open.

| Zone | Group (closed label) | Inner parts (shown when open) |
|---|---|---|
| People | `maintainer` | – |
| People | `visitor` | – |
| Claude | `sessions` | `cloud`, `local`, `helper agents` |
| Claude | `routines` | the seven routines, each its own node |
| GitHub | `guidance` | `rules`, `skills`, `guards & hooks`, `scripts` |
| GitHub | `code` | – |
| GitHub | `content` | the seven tenant chips; `logs` and `inventory` with the badge "also read by agents"; the Journal opens one level further into its spaces and collections |
| GitHub | `issues` | the labels `needs-triage`, `ready-for-agent`, `ready-for-human` |
| GitHub | `prs` + `ci` | – |
| Docker host | `caddy` | – |
| Docker host | `container` | `updater`, `build`, `server` (Nitro, with Nuxt Content and SQLite inside) |
| Browser | `browser` | `HTML`, `_payload.json`, `browser database` |

Draw `guidance`, `code` and `content` together inside one `repository` box,
so it is obvious they live in the same place.

## Interaction

- **Clicking a group** opens it and shows its details panel: role, two or
  three sentences from Part 1, and its files.
- **Clicking a node that owns a story** plays the story step by step:
  - the groups it touches light up, and the ones whose inside matters open;
  - a numbered list beside the diagram, with Prev and Next, explains each
    step.
- **Clicking a routine** plays its story. The routine stories are short,
  and their main job is to show what that routine reads and writes.
- **"Start here":** a ▶ marker on `visitor`, `maintainer` and
  `frictions-to-fixes`.

## Stories

The **Opens** column lists the groups the story opens; all others stay
closed.

| # | Click | Story | Opens | Steps |
|---|---|---|---|---|
| 1 | ▶ `visitor` | Opening a page, then clicking on | `container`, `browser` | browser → `caddy` → `server` asks Nuxt Content → SQLite → HTML back → Vue takes over → click to a `/t/` page: `_payload.json` from `server` → click to the home page: queries run in the `browser database` |
| 2 | ▶ `maintainer` | Asking for a change | `sessions`, `guidance` | `maintainer` → `cloud` or `local` session → reads `rules` + `skills` → works while `guards` watch → checks and code review → `prs` → `ci` (red: fix and push again) → writes its `logs` entry, straight to `main` → `maintainer` merges → story 4 |
| 3 | ▶ `frictions-to-fixes` | A friction becomes a fix | `routines`, `content`, `guidance` | timer → `frictions-to-fixes` → `scripts` read the frictions in `logs` → `helper agents` write fixes → `prs` → `ci` → the routine reviews and merges the simple ones; a hard one goes to `maintainer`; one it may not touch → `issues` → `rules` / `skills` / `guards` / `code` improve → the next session reads them |
| 4 | `container` | A change goes live | `container`, `content` | `main` changes → `updater` pulls → `build`: Nuxt Content turns `content` into database dumps, Nuxt bundles `code` → `server` swaps to the new build |
| 5 | `issues` | A bug report becomes work | `issues` | `visitor` opens an issue (`needs-triage`) → a `triage` session sorts it → `maintainer` approves (`ready-for-agent`) → a session builds it → `prs` → `ci` → `maintainer` merges |
| 6 | `audit-docs` | The docs reviewed from eight angles | `routines`, `guidance` | reads `rules`, `skills` and recent history → reviewer agents → fact-check → fixes → `prs` → merges itself; decision-record edits → `maintainer` |
| 7 | `audit-skills` | Skills reviewed | `routines`, `content` | `scripts` read `logs` + `inventory` → checks each skill's behaviour → updates `inventory` → `prs`; repeated failures → `issues` |
| 8 | `prune-trial` | A rule cut on trial | `routines`, `guidance`, `content` | cuts a rule in `rules` → merged → sessions work without it for 3 days → their frictions in `logs` → keep the cut, restore a line, or propose a guard |
| 9 | `visitor-loop` | Fresh eyes on the site | `routines` | builds a preview of the site → three visitor agents use it → a fix and a feature → `prs` → merges itself |
| 10 | `digest` | The day written up | `routines`, `content` | reads history + `logs` → writes a digest into the Journal → `prs` → story 4 |
| 11 | `blog-post` | The day's best story | `routines`, `content` | reads `logs` + history → a persona writes a post into the Blog → `prs` → story 4 |

## Details panels

Each panel shows the node's role, two or three sentences from Part 1, and
its files. The files are listed here so Part 1 can stay free of paths:

| Node | Files |
|---|---|
| `rules` | `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`, `docs/adr/` |
| `skills` | `.agents/skills/` (Claude Code finds them through `.claude/skills/`), `skills-lock.json` (the outside pack) |
| `guards & hooks` | `.claude/settings.json`, `docs/agents/guards.md` |
| `scripts` | `scripts/session-logs.ts` (the shared reader of session logs), `scripts/session-frictions.ts` (frictions, for `frictions-to-fixes` and `prune-trial`), `scripts/audit-skills.ts` (logs + inventory, for `audit-skills` and `audit-docs`), `scripts/ideas.ts` (ideas, for `visitor-loop`), `scripts/log-session.ts` (writes and lands a log), `scripts/session-trace.ts` (the script-added half), `scripts/gate.ts` (the checks) |
| `code` | `app/`, `shared/`, `modules/`, `layers/<tenant>/app/`, `layers/<tenant>/tenant.config.ts`, `nuxt.config.ts`, `content.config.ts`, `tests/` |
| `content` | `layers/<tenant>/content/` |
| `logs` | `layers/journal/content/*/sessions/`, `shared/schemas/session.ts` |
| `inventory` | `layers/journal/content/current/skills/` |
| `issues` | `docs/agents/triage-labels.md`, `.agents/skills/triage/`, `.agents/skills/auto-triage/` |
| `prs`, `ci` | `docs/agents/pr-workflow.md`, `.github/workflows/gate.yml` |
| `container` | `deploy/entrypoint.sh`, `deploy/docker-compose.yml`, `nuxt.config.ts` |
| `caddy` | configured outside this repo; see `deploy/docker-compose.yml` |
| `browser` | `docs/adr/0028-navigation-reads-server-payloads.md` |
| each routine | `.agents/skills/<name>/SKILL.md`; merge scope in `docs/adr/0003-agent-operating-model-and-governance.md` |
| the bypass on `main` | `docs/adr/0009-session-logs-commit-directly-to-main.md` |

## Legend

- **Solid line:** a normal step.
- **Thick line:** the step that closes the loop: the next session reads
  improved guidance.
- **Accent line:** the session log's direct commit, the only change that
  skips a pull request.
- **Warm colour:** a step done by the maintainer.

## Leave out

- Names of individual guards, hooks and CI steps.
- Exact routine times, counts that change daily, issue and pull-request
  numbers.
- How the server finds a tenant's content for an address, and how Commons
  reads across tenants. At most one sentence in the Commons chip.
- Skills that serve a single tenant (e.g. `atlas-specimen`), and rare ways
  of working: handoffs, `/loop` sessions, the guest demo.
- Repo housekeeping such as Dependabot and pull-request labels.

---

**For agents and maintainers: what counts as ground truth.** This overview,
the Journal's explainer pages, research notes and READMEs can fall behind.
How the platform actually behaves is defined only by:
- the decision records (`docs/adr/`) and agent how-tos (`docs/agents/`);
- the skills (`.agents/skills/`) and scripts (`scripts/`);
- the Nuxt application code;
- the Journal's session logs and skill inventory.

Check claims against those. Written 2026-10-09 against `main`.
