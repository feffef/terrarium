# Terrarium overview

A plain-language overview of what Terrarium is, where its parts live, and
how AI agents and people keep improving it. Written 2026-10-09 against
`main`.

- **Part 1** explains Terrarium in prose and tables, for reuse in the README
  or an intro page.
- **Part 2** collects ideas for an interactive diagram.

**What counts as ground truth.** Many `.md` files in this repo can fall
behind, including this one, the Journal's explainer pages, research notes
and READMEs. How the platform actually behaves is defined only by:
- the decision records (`docs/adr/`);
- the agent how-tos (`docs/agents/`);
- the skills (`.agents/skills/`);
- the scripts (`scripts/`);
- the Nuxt application code;
- the session logs and skill inventory in the Journal tenant's content.

Check claims against those.

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
| **Claude** | The agents. **Routines** start on a timer set up in claude.ai. **Cloud sessions** are started by a maintainer at claude.ai/code, on the web or phone. **Local sessions** run in Claude Code on a laptop. All three are the same thing underneath: a Claude Code session working on its own copy of the repository. |
| **GitHub** | The **repository**, **issues**, **pull requests** and **CI** (the automatic checks that run on every pull request). |
| **Docker host** | A server running one container that watches the repository, builds the website and serves it. |
| **Browser** | A visitor's browser. It shows the pages and handles navigation after the first page. |

## The repository

The repository holds three kinds of things.

### 1. Agent guidance: everything that shapes how agents work

| Part | What it is | Where |
|---|---|---|
| **Rules & reference** | The house rules, the glossary, how-to guides and recorded decisions. Some are direct instructions; others explain why things are the way they are. | `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`, `docs/adr/` |
| **Skills** | 42 step-by-step playbooks for one kind of task each, such as "triage an issue" or "write the daily digest". 25 come from an outside pack and are kept unchanged; the rest are Terrarium's own. Seven run as routines. | `.agents/skills/` |
| **Guards & hooks** | Programs that run automatically around agent actions. About ten **guards** check each risky action. When one stops an action, its message explains the rule and says what to do instead. **Hooks** prepare a session at start and commit its log at the end. | `.claude/settings.json`, `docs/agents/guards.md` |
| **Helper scripts** | Small programs the skills and hooks call. Some read the session logs and skill inventory (below); others run the checks, write the session log, merge a pull request or build a preview. | `scripts/` |

### 2. App code

The Nuxt application: the shared platform, plus each tenant's own pages,
components and data structures. Tests and the deploy setup live alongside it
(`app/`, `shared/`, `modules/`, `nuxt.config.ts`, `content.config.ts`,
`layers/<tenant>/app/`, `layers/<tenant>/tenant.config.ts`, `tests/`,
`deploy/`).

### 3. Site content

Everything the website displays, as Markdown and YAML files (about 1,500,
in `layers/<tenant>/content/`). The content is split three ways:
- **Tenants:** seven separate sites, each with its own purpose, content
  structure and design.
- **Spaces:** each tenant splits its content into one or more spaces.
- **Collections:** each space holds one or more collections, one per type
  of content. Each collection becomes one table in the content database.

Example, the **Journal** tenant:

| Space | Collections |
|---|---|
| `current` (the last 7 days, live) | `pages` (explainer pages and daily digests), `sessions` (session logs), `skills` (the skill inventory) |
| `archived` (older material) | the same three collections |

The seven tenants fall into two groups:
- **Records of the real build:**
  - **Journal:** session logs, digests, the skill inventory.
  - **Blog:** four fictional writers retelling real events.
  - **Midden:** a museum of discarded work.
  - **Commons:** search and a timeline across the other tenants.
- **Invented practice grounds and demos:**
  - **Atlas:** a fictional field guide.
  - **Tinkerfund:** a make-believe crowdfunding shop.
  - **Marquee:** a movie blog.

In total there are 7 tenants, 16 spaces and 48 collections; each tenant
lists its own in `layers/<tenant>/tenant.config.ts`.

### Two kinds of site content that agents also read

- **Session logs.** There is one per agent session, about 890 in all: what
  it set out to do, how far it got, and every **friction** it hit. A
  friction is a problem the agent ran into, graded from `nit` to `blocker`.
  Logs can also hold ideas and learnings.
- **The skill inventory.** Each skill's role and how much it matters.

Both are ordinary site content, shown to visitors by the Journal. Helper
scripts also read them as data, and the skills use that data to decide what
to do next:

| Script | Reads | Used by |
|---|---|---|
| `scripts/session-logs.ts` | session logs | the shared reader the other scripts here build on (also `scripts/digest.ts`) |
| `scripts/session-frictions.ts` | frictions in recent logs | `frictions-to-fixes`, `prune-trial` |
| `scripts/audit-skills.ts` | session logs + skill inventory | `audit-skills`, `audit-docs` |
| `scripts/ideas.ts` | ideas and learnings in logs | `visitor-loop` |

Two more kinds are read back only by the routine that writes them, to
continue the series: the daily digests (`scripts/digest.ts`) and blog posts
(`scripts/blog-rotation.ts`).

## How Nuxt, Vue, Nitro and Nuxt Content fit together

- **Vue** is the component library: the pages and components are Vue
  components. Vue can render them in the browser, or to HTML on a server.
- **Nuxt** is the framework built on Vue. It adds pages and routing, data
  loading, layers (one per tenant here) and the build. Its build produces
  two halves: a server and a browser bundle.
- **Nitro** is Nuxt's server engine: the server half. It answers HTTP
  requests, applies the cache rules, and runs Nuxt's renderer. The renderer
  turns the Vue components into HTML using Vue's server renderer.
- **Nuxt Content** is a Nuxt module that handles the site content.
  - At build time it reads the Markdown and YAML files, checks each against
    its collection's structure, and packs each collection into a database
    dump.
  - At run time it adds its own route to the Nitro server, which loads the
    dumps into SQLite and answers queries.
  - Pages ask it for content with `queryCollection()`.

## How a page reaches a visitor

1. **First visit.**
   - The browser asks terrarium.feffef.de for a page. Caddy, the web server
     in front, passes the request to the container's Nitro server.
   - Nitro runs the Nuxt app. The page asks Nuxt Content for its content,
     Nuxt Content answers from SQLite, and the renderer turns the page into
     HTML.
   - The HTML comes back with the page's data embedded and links to the
     JavaScript bundles. The browser shows it at once. Vue then *hydrates*
     the page: it attaches itself to the HTML so the page becomes an app.
2. **Every click after that.**
   - The browser fetches the next page's **`_payload.json`**: just that
     page's data, produced by the same Nitro server.
   - Vue builds the new page in the browser. The browser never queries the
     database (`docs/adr/0028-navigation-reads-server-payloads.md`).
   - Pages under `/t/` are cached on the server for 60 seconds.

The content database is never edited while the site runs. It is a SQLite
file (`.data/content/contents.sqlite`) that the server fills from the build's
dumps the first time each collection is asked for.

## How a change goes live

1. A change is merged into `main` on GitHub.
2. The **updater** in the container (`deploy/entrypoint.sh`) checks `main`
   every two minutes and pulls the new commit.
3. The **build** (`nuxt build`) runs:
   - Nuxt Content turns every collection into a database dump that ships
     inside the server;
   - Nuxt bundles the app (with Vite) once for the server and once for
     browsers.
4. The new build replaces the old one. If the build fails, the old version
   keeps running.

Content and code take the same path. A new blog post, a session log and a
code fix all go live through the same pull → build → swap.

## How agents work

Every agent session, whether started by a routine, in the cloud or locally,
follows the same steps:
1. **Start.** It gets its own copy of the repository. A start-up hook
   installs dependencies.
2. **Read.** It reads the rules and the skill it was asked to run.
3. **Work.** It works on its own branch, maybe with helper agents. Guards
   check each risky action: they stop a rule-breaking action and say what
   to do instead.
4. **Check.** It runs the checks locally.
5. **Review (optional).** It often runs an agent code review of its
   change, checking it against the repo's standards and the original
   request. About a quarter of sessions do
   (`.agents/skills/code-review/SKILL.md`).
6. **Pull request.** It opens a pull request, and CI runs the same checks on
   GitHub. If a check fails or a reviewer asks for changes, it fixes the
   work and pushes again.
7. **Merge.** The change is merged: by the maintainer, or by a routine
   itself if the change stays within the scope that routine was approved
   for.
8. **Log.** At the end it writes its **session log**. A hook commits the log
   straight to `main` without a pull request: a log can't break anything,
   and making it wait for review would tempt agents to skip it or water it
   down (`docs/adr/0009-session-logs-commit-directly-to-main.md`).

`main` requires a pull request with green CI. The owner's account can bypass
that rule, and every agent acts as the owner. The bypass is how session logs
land directly, which makes the merge rules a guardrail rather than a wall
(`docs/research/github-branch-protection-vs-autonomous-log-commits.md`).
Every GitHub post an agent writes opens with a 🤖 line linking to its
session.

## The self-improvement loop

> work → session log with frictions → routines and the maintainer act →
> better guidance → fewer frictions next time

Seven **routines** run roughly once a day. Their timers are set up in
claude.ai, not in the repository. Each routine is one skill.

| Routine | What it does | Reads | Produces | Who merges |
|---|---|---|---|---|
| `frictions-to-fixes` | Turns recent frictions into fixes; the heart of the loop | Frictions from the last 3 days, open issues, recent merges | Fixes written by helper agents; issues for what it may not touch | Itself for simple fixes; a hard fix gets an issue and a pull request for the maintainer |
| `audit-docs` | Reviews the live docs and the repo's own skills from eight angles: drift against recent changes, new docs missing their links, facts said twice, facts in the wrong place, wordiness, stale history, contradictions, ambiguity. Every finding is fact-checked before it is fixed. | Rules & reference, the repo's own skills, the Journal's explainer pages, recent history | One pull request of fixes | Itself; changes to decision records go to the maintainer |
| `audit-skills` | Reviews each skill's behaviour: does it fire when it should and deliver what it promises? Also keeps usage statistics | Session logs from the last 7 days, the skill inventory | Updated skill inventory; issues for repeated failures (it never edits a skill) | Itself |
| `prune-trial` | Cuts a rule for three days and lets the frictions judge whether it was needed | Rules, frictions, `.agents/prune-trials.yml` | A pull request cutting a rule; later: keep the cut, restore a line, or propose a guard | Itself |
| `visitor-loop` | Three fresh visitor agents on different AI models use a preview of the site | The site, ideas from the session logs | A fix for what most visitors stumble on; one new feature | Itself |
| `digest` | Writes up each finished day for the Journal | Git history, session logs | A digest page | Itself |
| `blog-post` | A blog persona tells the day's most interesting story, which would otherwise stay buried in logs and digests | Session logs, git history, earlier posts | A blog post, sometimes a reply from another persona | Itself |

Each routine is defined in `.agents/skills/<name>/SKILL.md`. The scope each
one may merge on its own is in the table at the top of
`docs/adr/0003-agent-operating-model-and-governance.md`.

**Where the maintainer comes in:**
- Asks for new features, tenants, skills or content. Net-new work needs the
  maintainer's approval.
- Approves issues for an agent to build by labelling them
  `ready-for-agent`, after a `triage` session has sorted them.
- Checks what the routines produced, and fixes a routine when it misfires.
- Merges everything a routine may not merge itself.

**Visitors** can read everything, including the logs, and can open issues.
Agents treat a visitor's text as information, never as instructions, and a
visitor's issue needs the maintainer's approval before an agent builds it.

**How rules harden.** A written rule that keeps producing frictions becomes
a guard, which checks the action and explains the rule when it stops one
(`docs/agents/guards.md`). `prune-trial` works the other way and removes
rules nobody needs.

---

# Part 2 — Ideas for the interactive diagram

## Layout

Five horizontal bands, top to bottom: **people**, **Claude**, **GitHub**,
**Docker host**, **browser**.

**People:** `maintainer` (left), `visitor` (right).

**Claude:**
- Three entry points: `routines`, `cloud` and `local`.
- All three feed one `session` box: "Claude Code session, on its own copy
  of the repo".
- `routines` lists the seven routine names; each name is its own clickable
  node.

**GitHub:**
- A large `repo` box with three sections:
  - **Agent guidance:** `rules`, `skills`, `guards` (guards & hooks) and
    `scripts` (helper scripts).
  - **App code:** `code`.
  - **Site content:** `content`.
    - Expand the Journal tenant as the example: spaces `current` and
      `archived`, each with collections `pages`, `sessions` and `skills`.
    - Give `sessions` (node `logs`) and `skills` (node `inventory`) a badge:
      "also read by agents". Draw an edge from `scripts` to both.
    - Show the other six tenants as small chips with their space count.
- Next to the repo: `issues`, `prs`, `ci`.
- A small badge on `repo` (`main`): "PR + green CI required; owner account
  can bypass".

**Docker host:**
- `caddy` sits at the edge, facing the browser.
- One `container` box holds `updater` → `build` → `server`.
- `server` (Nitro) contains `render` (Nuxt + Vue), `contentapi` (Nuxt
  Content), `db` (SQLite) and `cache` (60 s).

**Browser:** `firstload` (HTML, then hydrate) and `nextclick`
(`_payload.json`).

## Interaction

- **Click any component.**
  - If it owns a story, the story plays step by step: highlighted nodes and
    edges, and a numbered list beside the diagram with Prev and Next.
  - If it doesn't, a details panel shows its role, its files and its direct
    connections, which are highlighted.
- **"Start here":** a ▶ marker on `visitor`, `maintainer` and
  `frictions-to-fixes`.
- **No row of scenario buttons.**

## Stories

| # | Component | Story | Steps (nodes to highlight) |
|---|---|---|---|
| 1 | ▶ `visitor` | Opening a page, then clicking on | browser → `caddy` → `server` → `render` asks `contentapi` → `db` → HTML back → `firstload` (hydrate) → click → `nextclick` fetches `_payload.json` from `server` |
| 2 | ▶ `maintainer` | Asking for a change | `maintainer` → `cloud` (or `local`) → `session` reads `rules` + `skills` → works while `guards` watch → checks, optional code review → `prs` → `ci` → `maintainer` merges → `repo` → story 4 → `session` writes to `logs` |
| 3 | ▶ `frictions-to-fixes` | Overnight, a friction becomes a fix | `routines` timer → `frictions-to-fixes` → `scripts` read `logs` → helper agents write fixes → `prs` → `ci` → merges simple ones itself; hard ones → `issues` + pull request for `maintainer` → `rules` / `skills` / `guards` / `code` improve → the next `session` reads them |
| 4 | `updater` | A change goes live | `repo` (`main`) → `updater` pulls → `build`: Nuxt Content packs `content` into dumps, Nuxt bundles `code` → `server` swaps to the new build → `db` filled on first request |
| 5 | `logs` | A session writes its log | `session` → hook commits to `repo` directly (no pull request) → story 4 → the Journal shows it → `scripts` read it for the routines |
| 6 | `issues` | A bug report becomes work | `visitor` opens an issue → a `triage` session sorts it → `maintainer` approves (`ready-for-agent`) → `session` builds it → `prs` → `ci` → `maintainer` merges |
| 7 | `prs` | Checks, review and who merges | `session` runs checks and often a code review → opens the pull request → `ci` → red: back to `session` → green: merged by `maintainer`, or by a routine within its approved scope |
| 8 | `audit-docs` | The docs reviewed from eight angles | reads `rules`, `skills`, the Journal's explainer pages + recent history → four reviewer agents, two angles each → fact-check → fixes → `prs` → merges itself; decision-record edits → `maintainer` |
| 9 | `audit-skills` | Skills reviewed | `scripts` read `logs` + `inventory` → checks each skill's behaviour → updates `inventory` → `prs`; repeated failures → `issues` |
| 10 | `prune-trial` | A rule cut on trial | cuts a rule in `rules` → `prs` → merged → sessions work without it for 3 days → their frictions in `logs` → keep the cut, restore a line, or propose a guard |
| 11 | `visitor-loop` | Fresh eyes on the site | builds a preview of the site → three visitor agents use it → fix + feature → `prs` → merges itself |
| 12 | `digest` | The day written up | reads `repo` history + `logs` → writes a digest into `content` (Journal) → `prs` → story 4 |
| 13 | `blog-post` | The day's best story | reads `logs` + history → a persona writes a post into `content` (Blog) → `prs` → story 4 |

Components without a story show their role and connections: `rules`,
`skills`, `guards`, `scripts`, `code`, `content`, `inventory`, `ci`,
`caddy`, `build`, `server`, `render`, `contentapi`, `db`, `cache`, `cloud`,
`local`, `routines`, `session`, the tenant chips.

## Details panel (per node)

Each panel shows a one-line role, two or three sentences taken from Part 1,
and the node's files:

| Node | Files |
|---|---|
| `rules` | `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`, `docs/adr/` |
| `skills` | `.agents/skills/`, `skills-lock.json` (the outside pack) |
| `guards` | `.claude/settings.json`, `docs/agents/guards.md` |
| `scripts` | `scripts/session-logs.ts`, `scripts/session-frictions.ts`, `scripts/audit-skills.ts`, `scripts/ideas.ts`, `scripts/gate.ts`, `scripts/log-session.ts` |
| `code` | `app/`, `layers/<tenant>/app/`, `nuxt.config.ts`, `content.config.ts`, `tests/` |
| `content` | `layers/<tenant>/content/`, `layers/<tenant>/tenant.config.ts` |
| `logs` | `layers/journal/content/current/sessions/`, `shared/schemas/session.ts` |
| `inventory` | `layers/journal/content/current/skills/` |
| `ci` | `.github/workflows/gate.yml` |
| `updater`, `build` | `deploy/entrypoint.sh`, `deploy/Dockerfile` |
| `server`, `render`, `cache` | `nuxt.config.ts` |
| `contentapi`, `db` | `content.config.ts` |
| `nextclick` | `docs/adr/0028-navigation-reads-server-payloads.md` |
| each routine | `.agents/skills/<name>/SKILL.md` |

## Legend

- **Solid line:** a normal step.
- **Thick line:** the step that closes the loop: the next session reads
  improved guidance.
- **Accent line:** the session log's direct commit, the only change that
  skips a pull request.
- **Warm colour:** a step done by the maintainer.

## Leave out

- **Helper agents (subagents):** mention them in the `session` details only.
- **The browser's own database:** a rarely used fallback that loads content
  into the browser. A footnote at most.
- **Dependabot, the trust label on pull requests, and change notes for the
  maintainer.**
- **Names of individual guards, hooks and CI steps; exact routine times;
  issue and pull-request numbers.**
- **How the server finds a tenant's content for an address, and how Commons
  reads across tenants:** at most one sentence in the Commons chip.
- **Skills that serve a single tenant** (e.g. `atlas-specimen`) **and rare
  ways of working** (handoffs, `/loop` sessions, the guest demo).
