# Terrarium overview

A plain-language overview of what Terrarium is, where its parts live, and
how AI agents and people keep improving it. Written 2026-10-08 against
`main`.

- **Part 1** explains Terrarium in prose and tables, so it can be reused for
  the README or an intro page.
- **Part 2** collects ideas for an interactive diagram.

Where a Journal explainer page and a skill file disagree, the skill file
(`.agents/skills/<name>/SKILL.md`) is the source of truth.

---

# Part 1 — Terrarium in plain words

## What it is

Terrarium is a website, terrarium.feffef.de, that AI agents build and keep
improving, while people steer and review. Almost every line of code and
content is written by Claude Code sessions. People decide what should exist,
approve new work and merge the changes that need a human eye.

Everything lives in **one GitHub repository**:
- the website's code and its content;
- the instructions the agents follow, their skills, and the automatic guards
  that hold them to the rules;
- an honest log written by every agent session.

A server rebuilds the website from that repository whenever it changes.
Session logs are part of the website's content too, so the website shows,
in public, how it is being built.

## Where things live

| Zone | What lives there |
|---|---|
| **People** | The **maintainer** (anyone with write access to the repo) and **visitors** (everyone else). |
| **Claude** | The agents. **Routines** start on a timer in claude.ai; **cloud sessions** are started by a maintainer at claude.ai/code, on the web or phone; **local sessions** run in Claude Code on a laptop. All three run the same thing: a Claude Code session working on its own copy of the repository. |
| **GitHub** | The **repository**, **issues**, **pull requests** and **CI**, the automatic checks that run on every pull request. |
| **Docker host** | A server running one container. It watches the repository, builds the website, and serves it. |
| **Browser** | A visitor's browser, which shows the pages and takes over navigation after the first page. |

## The repository

The repository holds six kinds of things:

| Part | What it is | Where | Size |
|---|---|---|---|
| **Agent guidance** | Everything an agent reads before it works: the house rules, the glossary, how-to guides and recorded decisions. Some are direct instructions; others are reference. | `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`, `docs/adr/` | ~60 files |
| **Skills** | Reusable step-by-step playbooks for one kind of task, such as "triage an issue" or "write the daily digest". 25 come from an outside pack and are kept unchanged; the rest are Terrarium's own. Seven run as routines. | `.agents/skills/` | 42 skills |
| **Guards & hooks** | Small programs that run automatically around every agent action. Guards block actions that break a rule. Hooks prepare a session at start and commit its log at the end. | `.claude/settings.json`, `scripts/*-guard.*` | ~11 guards |
| **App code** | The Nuxt application: the shared platform, plus each tenant's own pages, components and styles. Tests, the CI check script and the deploy setup sit alongside. | `app/`, `shared/`, `modules/`, `layers/<tenant>/app/`, `tests/`, `scripts/`, `deploy/` | ~400 files |
| **Site content** | Everything the website displays, as Markdown and YAML files. | `layers/<tenant>/content/` | ~1,500 files |
| **Session logs** | One log per agent session: what it set out to do, how far it got, and every **friction** it hit. A friction is a problem the agent ran into, graded from `nit` to `blocker`. Logs can also carry ideas and learnings. | `layers/journal/content/*/sessions/` | ~890 logs |

**Two kinds of site content do double duty.** **Session logs** and the
**skill inventory** (each skill's role and how much it matters) are part of
the site content, and the Journal shows them to visitors. Scripts that the
skills use also read them as data to decide what to do next
(`scripts/session-logs.ts`, `scripts/session-frictions.ts`,
`scripts/audit-skills.ts`). Two other kinds are read back only by the
routine that writes them, to continue the series: the daily digests
(`scripts/digest.ts`) and blog posts (`scripts/blog-rotation.ts`).

### Site content: tenants, spaces and collections

The site content is split three ways:
- **Tenants:** seven separate sites with their own design.
- **Spaces:** each tenant splits its content into one or more spaces.
- **Collections:** each space holds one or more collections, one per type
  of content. Each collection becomes one table in the content database.

Example, the **Journal** tenant:

| Space | Collections |
|---|---|
| `current` (the last 7 days, live) | `pages` (explainer pages and daily digests), `sessions` (session logs), `skills` (the skill inventory) |
| `archived` (older material) | the same three collections |

The seven tenants, in two groups:
- **Records of the real build:**
  - **Journal:** session logs, digests, the skill inventory.
  - **Blog:** four fictional writers retelling real events.
  - **Midden:** a museum of discarded work.
  - **Commons:** search and a timeline across the other tenants.
- **Invented practice grounds and demos:**
  - **Atlas:** a fictional field guide.
  - **Tinkerfund:** a make-believe crowdfunding shop.
  - **Marquee:** a movie blog.

In total there are 7 tenants, 16 spaces and 48 collections. Each tenant's
spaces and collections are listed in its `layers/<tenant>/tenant.config.ts`.

## How a page reaches a visitor

1. **First visit.**
   - The browser asks terrarium.feffef.de for a page. Caddy, the web server
     in front, passes the request to the container.
   - Inside the container a **Nitro** server (Nuxt's built-in server engine)
     runs the Vue app. The page's code asks for its content, Nuxt Content
     answers from a **SQLite** database, and Vue renders the page to HTML.
   - The HTML comes back with the page's data embedded and links to the
     JavaScript bundles. The browser shows the HTML at once. Vue then
     *hydrates* it, attaching itself to the HTML so the page becomes an app.
2. **Every click after that.**
   - The browser fetches the next page's **`_payload.json`**, which holds
     just that page's data, rendered by the same Nitro server.
   - Vue builds the new page in the browser. The browser never queries the
     database (`nuxt.config.ts`, `docs/adr/0028-navigation-reads-server-payloads.md`).
   - Pages under `/t/` are cached on the server for 60 seconds.

The content database is not edited while the site runs. It is a SQLite file
(`.data/content/contents.sqlite`) that the server fills the first time a
collection is asked for, from data the build prepared.

## How a change goes live

1. A change is merged into `main` on GitHub.
2. The **updater** in the container (`deploy/entrypoint.sh`) checks `main`
   every two minutes and pulls the new commit.
3. The **build** (`pnpm build`, i.e. `nuxt build`) does two things:
   - **Nuxt Content** reads every content file, checks it against its
     collection's schema, and turns each collection into a compressed
     database dump that ships inside the server;
   - **Vite** bundles the Vue app twice: once for the server, once for
     browsers.
4. The new build replaces the old one and the server restarts. If the build
   fails, the old version keeps running.

Content and code take the same path. A new blog post, a session log and a
code fix all go live through the same pull → build → swap.

## How agents work

Every agent session, whether started by a routine, in the cloud or locally,
follows the same steps:
1. **Start.** It gets its own copy of the repository. A start-up hook
   installs dependencies.
2. **Read.** It reads the agent guidance and the skill it was asked to run.
3. **Work.** It works on its own branch, maybe with helper agents. Guards
   block actions that break a rule.
4. **Check.** It runs the checks locally, then opens a **pull request**. CI
   runs the same checks on GitHub.
5. **Fix.** If a check fails or a reviewer asks for changes, it fixes the
   work and pushes again.
6. **Merge.** The change is merged: by the maintainer, or by a routine
   itself if the change stays within the scope that routine was approved
   for.
7. **Log.** At the end it writes its **session log**. A hook commits the log
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
> better guidance, skills and guards → fewer frictions next time

Seven **routines** run roughly once a day. Their timers are set up in
claude.ai, not in the repository. Each routine is one skill.

| Routine | What it does | Reads | Produces | Who merges |
|---|---|---|---|---|
| `frictions-to-fixes` | Turns recent frictions into fixes; the heart of the loop | Session logs from the last 3 days, open issues | Fixes written by helper agents; issues for what it may not touch | Itself for simple fixes; a hard fix gets an issue and a PR for the maintainer |
| `audit-docs` | Checks the agent guidance and skills against the code | Agent guidance, skills, code, recent history | A pull request with fact-checked doc fixes | Itself; decision records and CI go to the maintainer |
| `audit-skills` | Reviews whether each skill fires when it should and delivers what it promises | Session logs from the last 7 days, skill inventory | Updated skill inventory; issues for repeated failures (it never edits a skill) | Itself |
| `prune-trial` | Cuts a rule for three days and lets the frictions judge whether it was needed | Agent guidance, frictions, `.agents/prune-trials.yml` | A pull request cutting a rule; later: keep, restore, or propose a guard | Itself |
| `visitor-loop` | Three fresh visitor agents on different AI models use a preview of the site | The site, the ideas noted in session logs | A fix for what most visitors stumble on; one new feature | Itself |
| `digest` | Writes up each finished day for the Journal | Git history, session logs | A digest page | Itself |
| `blog-post` | A blog persona tells the day's most interesting story, otherwise buried in logs and digests | Session logs, git history, earlier posts | A blog post, sometimes a reply from another persona | Itself |

Details for each routine are in `.agents/skills/<name>/SKILL.md`. The scope
each one may merge on its own is in the table at the top of
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
a guard: code that blocks the action (`docs/agents/guards.md`).
`prune-trial` pushes the other way and removes rules nobody needs.

---

# Part 2 — Ideas for the interactive diagram

## Layout

Draw five horizontal bands, one per zone, from top to bottom: people,
Claude, GitHub, Docker host, browser.

**People:** `maintainer` (left), `visitor` (right).

**Claude:**
- Three entry points: `routines`, `cloud` and `local`.
- All three feed one `session` box: "Claude Code session, on its own copy
  of the repo".
- `routines` lists the seven routine names. Each name is its own clickable
  node.

**GitHub:**
- A large `repo` box holding six parts: `guidance`, `skills`, `guards`,
  `code`, `content` and `logs`.
  - Draw `logs` inside `content`.
  - Mark `logs` and the skill inventory with a badge: "also read by agents".
  - Inside `content`, expand the Journal tenant as the example: its spaces
    `current` and `archived`, each with the collections `pages`, `sessions`
    and `skills`. Show the other six tenants as small chips with their
    space count.
- Next to the repo: `issues`, `prs`, `ci`.
- A small badge on `repo` (`main`): "PR + green CI required; owner account
  can bypass".

**Docker host:**
- `caddy` (at the edge, facing the browser).
- One `container` box containing `updater` → `build` → `server`.
- The `server` box contains `db` (SQLite) and `cache` (60 s).

**Browser:** `firstload` (HTML, then hydrate) and `nextclick`
(`_payload.json`).

## Interaction

- **Click any component.**
  - If it owns a story, the story plays step by step: highlighted nodes and
    edges, plus a numbered list next to the diagram with Prev and Next.
  - If it doesn't, a details panel shows its role, its files and its direct
    connections, which are highlighted.
- **"Start here":** three components carry a ▶ marker: `visitor`,
  `maintainer` and `frictions-to-fixes`.
- **No row of scenario buttons.**

## Stories

| # | Component | Story | Steps (nodes to highlight) |
|---|---|---|---|
| 1 | ▶ `visitor` | Opening a page, then clicking on | browser → `caddy` → `server` → `db` → HTML back → `firstload` (hydrate) → click → `nextclick` fetches `_payload.json` from `server` |
| 2 | ▶ `maintainer` | Asking for a change | `maintainer` → `cloud` (or `local`) → `session` reads `guidance` + `skills` → works, `guards` watch → `prs` → `ci` → `maintainer` merges → `repo` → story 4 → `session` writes to `logs` |
| 3 | ▶ `frictions-to-fixes` | Overnight, a friction becomes a fix | `routines` timer → `frictions-to-fixes` → reads `logs` → helper agents write fixes → `prs` → `ci` → merges simple ones itself; hard ones → `issues` + PR for `maintainer` → `guidance` / `skills` / `code` improve → the next `session` reads them |
| 4 | `updater` | A change goes live | `repo` (`main`) → `updater` pulls → `build`: Nuxt Content turns `content` into database dumps, Vite bundles `code` → `server` restarts → `db` filled on first request |
| 5 | `logs` | A session writes its log | `session` → hook commits to `repo` directly (no PR) → story 4 → Journal shows it → routines read it the next night |
| 6 | `issues` | A bug report becomes work | `visitor` opens an issue → a `triage` session sorts it → `maintainer` approves (`ready-for-agent`) → `session` builds it → `prs` → `ci` → `maintainer` merges |
| 7 | `prs` | Checks, review and who merges | `session` opens it → `ci` runs the checks → red: back to `session` → green: merged by `maintainer`, or by a routine within its approved scope |
| 8 | `audit-docs` | Docs checked against the code | reads `guidance` + `skills` + `code` → doc fixes → `prs` → merges itself; decision-record edits → `maintainer` |
| 9 | `audit-skills` | Skills reviewed | reads `logs` + skill inventory → checks each skill's behaviour → updates the inventory → `prs`; repeated failures → `issues` |
| 10 | `prune-trial` | A rule cut on trial | cuts a rule in `guidance` → `prs` → merged → sessions work without it for 3 days → their frictions in `logs` → keep the cut, restore a line, or propose a guard |
| 11 | `visitor-loop` | Fresh eyes on the site | builds a preview of the site → three visitor agents use it → fix + feature → `prs` → merges itself |
| 12 | `digest` | The day written up | reads `repo` history + `logs` → writes a digest into `content` (Journal) → `prs` → story 4 |
| 13 | `blog-post` | The day's best story | reads `logs` + history → a persona writes a post into `content` (Blog) → `prs` → story 4 |

Components without a story (show role and connections): `guidance`,
`skills`, `guards`, `code`, `content`, `ci`, `caddy`, `build`, `server`,
`db`, `cache`, `cloud`, `local`, `routines`, `session`, the tenant chips.

## Details panel content (per node)

Each node's panel should show a one-line role, two or three sentences, and
its files. Take the text from Part 1. Useful file pointers:

| Node | Files |
|---|---|
| `guidance` | `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`, `docs/adr/` |
| `skills` | `.agents/skills/`, `skills-lock.json` (the outside pack) |
| `guards` | `.claude/settings.json`, `docs/agents/guards.md` |
| `code` | `app/`, `layers/<tenant>/app/`, `nuxt.config.ts`, `content.config.ts`, `tests/` |
| `content` | `layers/<tenant>/content/`, `layers/<tenant>/tenant.config.ts` |
| `logs` | `layers/journal/content/current/sessions/`, `shared/schemas/session.ts` |
| `ci` | `.github/workflows/gate.yml`, `scripts/gate.ts` |
| `updater`, `build` | `deploy/entrypoint.sh`, `deploy/Dockerfile` |
| `server`, `db`, `cache` | `nuxt.config.ts` |
| `nextclick` | `docs/adr/0028-navigation-reads-server-payloads.md` |
| each routine | `.agents/skills/<name>/SKILL.md` |

## Legend

- **Solid line:** a normal step.
- **Thick line:** the step that closes the loop (the next session reads
  improved guidance).
- **Accent line:** the session log's direct commit, the only change that
  skips a pull request.
- **Warm colour:** a step done by the maintainer.

## Leave out

- **Helper agents** (subagents): mention them in the `session` details only.
- **The browser's own database:** a rarely used fallback that loads the
  content database in the browser. A footnote at most.
- **Dependabot, the trust label on pull requests, and manual change notes:**
  not needed at this altitude.
- **Script, hook and guard names; CI step names; exact routine times;**
  issue and pull-request numbers.
- **How the server finds a tenant's content for an address** (routing) **and
  how Commons reads across tenants:** one sentence in the Commons chip at
  most.
- **Skills that serve a single tenant** (e.g. `atlas-specimen`) and **rare
  ways of working** (handoffs, `/loop` sessions, the guest demo).
