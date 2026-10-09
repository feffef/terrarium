# Terrarium overview

A plain-language overview of what Terrarium is, where its parts live, and
how AI agents and people keep improving it.

- **Part 1** explains Terrarium in prose and tables, for reuse in the README
  or an intro page.
- **Part 2** specifies an interactive diagram built on Part 1.

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
| **People** | The **maintainer** (the repo's owner) and **visitors** (everyone else). |
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
- **Skills.** Step-by-step playbooks, each for one kind of task, such as
  "triage an issue" or "write the daily digest". Most come from an outside
  pack and are kept unchanged; the rest are Terrarium's own. Seven of them
  run as routines.
- **Guards & hooks.** Programs that run automatically around agent actions.
  - **Guards** check some actions before they run. When one stops an
    action, its message explains the rule and says what to do instead.
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
| `current` (the explainer pages and skill inventory, plus the logs and digests of the newest 7 dates that have any) | `pages` (explainer pages and daily digests), `sessions` (session logs), `skills` (the skill inventory) |
| `archived` (older logs and digests, and retired skills) | the same three collections |

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

- **Session logs.** One per agent session. Each has two halves:
  - **Written by the agent:** what it set out to do, how far it got, every
    **friction** it hit (a problem graded from `nit` to `blocker`), and any
    ideas or learnings.
  - **Added by a script from the session's transcript:** timings, models and
    the tools and files it used.
- **The skill inventory.** One entry per skill: its role and how much it
  matters.

Both are ordinary site content that the Journal shows to visitors. Helper
scripts also read them as data, and the routines act on it. Digests and blog
posts are written for visitors; the only agent that reads them back is
`blog-post`, which reads recent posts so it doesn't repeat itself.

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
2. **Hovering, then clicking to a tenant's page** (anything under `/t/`).
   When the pointer rests on a link, the browser fetches that page's code
   and its **`_payload.json`**: just its data, prepared by the server. On the
   click, Vue builds the page in the browser. The server keeps each `/t/`
   page and its `_payload.json` for 60 seconds, so visitors in that minute
   get the same copy.
3. **Clicking to a page the server doesn't keep:** the home page and
   Tinkerfund's search. These pages have no `_payload.json`, so their
   queries run in the browser itself. Nuxt Content loads a browser copy of
   the database (SQLite in WebAssembly), fetching each collection's data
   from the server, and queries it there. If a `_payload.json` ever fails to
   load, the page falls back to this browser copy as well.

The content database is never edited while the site runs. After each
deploy, the server fills each collection's table from the build's output
the first time that collection is asked for.

## How a change goes live

1. A change is merged into `main` on GitHub.
2. The **updater** in the container checks `main` every two minutes and
   pulls any new commit, session logs included. It does not wait for CI.
3. The **build** runs. Packages are installed first only if the lockfile
   changed.
   - Nuxt Content packs every collection into a database dump. The server
     keeps it and hands it to browsers that ask.
   - Nuxt bundles the app once for the server and once for browsers.
4. The new build is copied over the old one and the server restarts, a
   second or two of downtime. If the build fails, the old version keeps
   running until the next commit brings a new build.

Content and code take the same path. A new blog post, a session log and a
code fix all go live through the same pull, build and restart.

## How agents work

Every agent session, whether started by a routine, in the cloud or locally,
follows the same steps:
1. **Start.** It gets its own copy of the repository, and a start-up hook
   installs dependencies.
2. **Read.** It reads the rules and the skill it was asked to run.
3. **Work.** It works on its own branch, sometimes with helper agents.
   Guards check some of its actions before they run.
4. **Check.** It runs the checks locally, and sometimes an agent code review
   of its change against the repo's standards and the original request.
5. **Pull request.** It opens a pull request, and CI runs the same checks on
   GitHub. If a check fails or a reviewer asks for changes, it fixes the work
   and pushes again.
6. **Log.** When the pull request opens, it writes its **session log**. A
   hook commits the log straight to `main`, the only change that skips a
   pull request: a log can't break anything, and waiting for review would
   tempt agents to skip it or water it down. When the work merges, the
   session updates the log, and the hook commits it again.
7. **Merge.** The change is merged: by the maintainer, or by a routine
   itself if the change stays within the scope that routine was approved
   for.

Agents work under the owner's GitHub account. `main` requires a pull request
with green CI, but that account can bypass the rule; the bypass is how
session logs land directly. So GitHub shows the owner as the author of
everything. To tell agent from human, every issue, pull request and comment
an agent writes opens with a 🤖 line naming the model and linking to its
session.

## How work enters: issues

Issues are the shared to-do list. Visitors, the maintainer, sessions and
routines all file them. A new issue has no label; triage adds one, and the
label says whose move it is:
- `needs-triage`: the maintainer still has to decide.
- `needs-info`: waiting for the reporter to answer a question.
- `ready-for-agent`: approved for an agent to build.
- `ready-for-human`: needs a person.
- `wontfix`: closed without action.

A **triage** session sorts new issues. When the maintainer starts the batch
version, `auto-triage`, it may approve issues written under the owner's
account (by the maintainer or by agents) for agents by itself, if the design
is clear. A visitor's issue always waits for the maintainer's approval. No
routine builds approved issues: the maintainer starts a session for that,
often the same one that ran `auto-triage`. Big pieces of work are first
split into a plan and a set of smaller issues (`wayfinder`, `to-spec`,
`to-tickets`).

## The self-improvement loop

> work → session log with frictions → routines and the maintainer act →
> better guidance → fewer frictions next time

Seven **routines** run on timers set up in claude.ai, about once a day.
Each routine is one skill:

| Routine | What it does |
|---|---|
| `frictions-to-fixes` | The heart of the loop: turns recent frictions into fixes. |
| `audit-docs` | Reviews the docs and the repo's own skills from eight angles, such as drift, contradictions and wordiness, and fixes what a fact-check confirms. |
| `audit-skills` | Checks whether each skill fires when it should and delivers what it promises, and keeps the skill inventory up to date. |
| `prune-trial` | Cuts a rule down to its goal. A later run reads the next three days' frictions and keeps the cut or restores one line. |
| `visitor-loop` | Lets three fresh visitor agents, each on a different AI model, use a preview of the site. Then it fixes what at least two of them hit and builds one feature they suggested. |
| `digest` | Writes up each finished day for the Journal and moves older entries to the archive. |
| `blog-post` | A blog persona tells the day's most interesting story, which would otherwise stay buried in logs and digests. |

Each routine may merge its own work when CI is green and the change stays
within its approved scope. Claude Code's own permission check can still stop
that merge; then the maintainer merges. Anything beyond the scope goes to
the maintainer. `frictions-to-fixes` works differently: helper agents write
each fix, and the routine reviews it, posts its verdict and merges it. It
leaves a risky fix open for the maintainer, and it never writes a fix to a
guard, a hook, or a file only the maintainer may merge; it files an issue
for the maintainer instead.

**Where the maintainer comes in:**
- Asks for new features, tenants, skills or content. Net-new work needs the
  maintainer's approval. Scheduling `visitor-loop` counts as that approval
  for one feature per run.
- Approves issues for agents.
- Checks what the routines produced, and fixes a routine when it misfires.
- Merges everything a routine may not merge itself.

**Visitors** can read everything, including the logs, and can open issues.
Agents treat a visitor's text as information, never as instructions.

**How rules harden.** When a written rule keeps producing frictions, a
routine files an issue proposing a guard. The maintainer has it built in a
session they attend, and merges it. `prune-trial` works the other way and
removes rules nobody needs.

---

# Part 2 — The interactive diagram

This part specifies the diagram. Part 1 is the plain introduction; Part 2 is
the diagram's full content and may go into more detail. Where the diagram
lives is still open (see "Still open" at the end).

## Principle

- **At rest,** a simple map: five bands of closed groups. Nothing moves and
  no lines are drawn.
- **A story** is how you learn something. Clicking a component plays its
  story: the path lights up step by step, and the groups the story needs
  open.
- **A close-up** zooms in on one component: its inside, plus the components
  it works with directly, while everything else stays dimmed around it.
- **A details panel** answers "what is this?" for anything you click.

## The map

Five bands, top to bottom. A group shows only its label until it opens. A
node with nothing inside it is a single box. `repository` is a frame drawn
around `guidance`, `code` and `content`; it never opens or closes, but it can
light up. Only the `journal` chip opens one level further.

| Zone | Node (id) | Inside, when open (ids) |
|---|---|---|
| people | maintainer (`maintainer`) | – |
| people | visitor (`visitor`) | – |
| Claude | routines (`routines`) | the seven routines, each its own node: `frictions-to-fixes`, `audit-docs`, `audit-skills`, `prune-trial`, `visitor-loop`, `digest`, `blog-post` |
| Claude | sessions (`sessions`) | cloud (`cloud`), local (`local`): the sessions a person starts |
| Claude | helper agents (`helper-agents`) | – |
| GitHub | repository (`repository`) | a frame around the next three rows |
| GitHub | guidance (`guidance`) | rules & reference (`rules`), skills (`skills`), guards & hooks (`guards`), helper scripts (`scripts`) |
| GitHub | code (`code`) | – |
| GitHub | content (`content`) | the seven tenant chips: `journal`, `blog`, `midden`, `commons`, `atlas`, `tinkerfund`, `marquee` |
| GitHub, inside `journal` | – | digests & pages (`journal-pages`), session logs (`logs`), skill inventory (`inventory`). `logs` and `inventory` carry the badge "also read by agents". |
| GitHub | issues (`issues`) | – |
| GitHub | pull requests (`prs`) | – |
| GitHub | CI (`ci`) | – |
| Docker host | caddy (`caddy`) | – |
| Docker host | container (`container`) | – (its inside is a close-up) |
| browser | browser (`browser`) | – (its inside is a close-up) |

Notes:
- **A group** is a node with something inside: `routines`, `sessions`,
  `guidance`, `content` and `journal`.
- **A routine node is that routine's own session.** A routine is a timer, a
  skill and the session the timer starts. `sessions` holds only the sessions
  a person starts.
- **`helper-agents`** is one node that stands for any number of helper
  agents. Routines and sessions both send them out; the step text says how
  many and what they do.
- **Issue labels are not nodes.** A story shows the label as a tag on
  `issues`.
- **Some words in stories are not nodes.** They appear only in step text:
  the timer, `main`, a reviewer or fact-checker, the preview, a persona, Vue,
  Nuxt Content and SQLite. Where one of them matters, it is a close-up part.

## Interaction

The diagram has three views: the **map**, a **story** and a **close-up**.
Nothing opens on a separate page.

### What a click does, at rest

| You click | What happens |
|---|---|
| a ▶ marker | Its story plays. |
| a node that owns a story (see the story list) | Its story plays. The panel shows the node's details, then the steps. |
| a group that owns no story | It opens where it stands. The panel shows its details and lists what is inside. |
| any other node | The node lights up, with every node it shares a story step with. The panel shows its details and the stories it appears in, each with a ▶. |
| "look inside" in a panel | The close-up opens. |
| empty space | Back to the map. |

### Start markers

A ▶ marks three places to start: `visitor`, `maintainer` and
`frictions-to-fixes`. When a ▶ belongs to a node inside a closed group, the
group's label shows it instead: `routines` with `▶ frictions-to-fixes`. The
▶ is its own tap target; the rest of the label opens the group. At rest, the
panel says what the diagram shows and suggests these three.

### While a story plays

- When the story starts, every group that holds one of its nodes opens,
  including `content` and `journal` when a step names `logs`. They open
  together, so nothing moves between steps. All other groups close.
- **Lit:** every node the story names, from the first step on. **Dimmed:**
  everything else, faded but readable. Dimmed nodes can still be clicked.
- **The current step:** its nodes get a ring and the step's number, and its
  line is drawn strong. Lines of earlier steps stay faint. Lines of later
  steps are not drawn yet; stepping back hides them again.
- **The panel** shows the numbered steps, with the current one marked. Prev
  and Next move one step, the ← and → keys do the same, and clicking a step
  jumps to it.
- **Clicking a lit node** only shows its details; the story keeps playing.
  If that node owns a story, its details offer ▶ to play it. If it has a
  close-up, its details offer "look inside".
- **Clicking a dimmed node** ends the story; then the click acts as at rest.
- On the last step, the panel offers "back to the map".

### Close-ups

Some nodes have a close-up (see "Close-ups" below). It opens from "look
inside" in the node's panel, or from a step that says "look inside".
- The view zooms onto the node. Its box grows into a small diagram of its
  parts, 5–8 of them.
- The nodes it works with directly (those that share a story step with it)
  stay lit around it, with their lines to it. Everything else is dimmed.
- During a story, the parts the current step names are lit.
- There is only one close-up level. A part never opens further; its
  details are in the panel.
- Esc, or the breadcrumb, goes back out.

### Open groups

- By hand, one top-level group is open at a time. Opening another closes the
  first. Inside an open `content`, `journal` may also be open.
- A story opens every group it needs. They close when the story ends.

### Going back

- A breadcrumb above the diagram shows where you are, for example
  `map › a friction becomes a fix (step 3 of 9) › frictions-to-fixes (inside)`.
  Click any part to go back to it.
- **Esc** goes one part back along the breadcrumb.

### At phone width (under 30rem)

- At rest, the closed map fits the screen, with at most six short labels per
  band. Every label is big enough to tap.
- The panel sits below the diagram.
- During a story, the diagram zooms to the current step and the one before
  it, and moves along as you step. Prev and Next stay pinned at the bottom.
- A close-up fills the screen, with the breadcrumb on top.

### For every width

- Nothing needs hover.
- Every visible node can be reached with Tab, and Enter does the same as a
  click.
- Lit never relies on colour alone: the ring and the step number show it
  too. A warm or accent step also says so in its text.
- Opening, zooming and pulsing take about a third of a second. If the device
  asks for reduced motion, they happen at once and nothing pulses.

## How stories are written

### A step

Each step has:
- **by:** the one node that acts.
- **to:** optional; the one node something goes to, or is read from. With no
  **to**, the node acts alone and pulses; no line is drawn.
- **via:** optional; one guidance item (`rules`, `skills`, `guards`,
  `scripts`) used during the step.
- **kind:** `moves` (the default), `uses`, `log` or `loop`. See the legend.
- **parts:** optional; the close-up parts this step uses.
- **text:** one or two short sentences. Other nodes may be named here; they
  are not lit by this step.
- **cite:** optional; one repository path, shown as a small link.

`by`, `to` and `via` are always node ids from the map table. One step is one
actor and one move.

A story opens every group that holds a node its steps name. No one keeps a
separate list of what a story opens.

### Guidance inside a session

A session works on its own copy of the repository, so its rules, skills,
guards and scripts run inside it. A step with `via` draws a dashed line from
that guidance item to the step's `by` node.

### Legend

| Style | Comes from | Meaning |
|---|---|---|
| solid line | `kind: moves` | something moves: a request, a pull request, a commit, a page |
| dashed line | `kind: uses`, or any `via` | used from the session's own copy: reading a rule or skill, a guard checking an action, a script reading the session logs |
| thick line | `kind: loop` | the loop closes: the next session reads the improved guidance |
| accent colour | `kind: log` | the session log goes straight to `main`, the only change that skips a pull request |
| warm colour | `by: maintainer` | a step the maintainer takes |

Pattern, weight and colour can mix: the loop step is thick and dashed.
- The accent steps appear only in story 2, steps 7 and 10. Every session
  writes a log; story 2 shows it once, from first write to final.
- The thick step ends stories 3, 6 and 8, the stories that change guidance.

### Branches

Stories 1, 2, 3 and 5 have decision steps. Under such a step, the step list
shows a row of chips, one per outcome. The usual outcome is chosen at the
start, so Prev and Next play the usual path. Choosing another chip plays that
branch instead:
- the branch's steps are numbered after the decision step (4a, 4b);
- the lit path on the map follows the branch;
- the branch rejoins the usual path at a named step, or ends.

Authoring notes: at most two decisions per story and three chips per
decision; a branch has at most three steps; a chip is a real outcome named
in a skill, script or decision record, never an internal retry. Playing a
story again chooses the usual outcomes again.

In the other stories, other outcomes are a sentence in the step text.

### Merging

Every step where a routine merges its own work ends with "may merge itself".
Its details add: "Claude Code's own permission check can still refuse the
merge. The pull request then waits for the maintainer."

### The object card

In stories 2, 3 and 5, one thing changes form along the way. A small card
beside the step list follows it: its current name and one line of what it
looks like at this step (an example, written in the data file). Other stories
have no card.

## The stories

Each story names the node that plays it, its steps, its branches and its
close-ups. In the steps, "(uses)", "(accent)" and "(thick)" give the step's
kind.

### 1. Opening a page — ▶ `visitor`

1. `visitor` opens a page in `browser`.
2. `browser` sends the request to `caddy`.
3. `caddy` passes it to `container`. Look inside: `container`.
4. The server checks what it keeps (parts: page store). A `/t/` page from
   the last 60 seconds goes back as it is.
5. Otherwise Nuxt Content asks SQLite (parts: Nuxt Content, SQLite). The
   first time a collection is asked for after a deploy, SQLite loads it from
   its dump.
6. Vue renders the page to HTML, with the page's data inside (parts:
   renderer).
7. `container` sends the page to `browser`. It shows at once; then Vue takes
   over, so later clicks don't reload it (parts: page, Vue app).
8. The pointer rests on a link. `browser` fetches that page's code and, for
   a `/t/` page, its `_payload.json` from `container` (parts: link
   prefetch).
9. The visitor clicks. *Decision.*

Branches at step 9:
- **a tenant page** (usual): `browser` builds the page from the
  `_payload.json` the server prepared (parts: `_payload.json`). No query runs
  in the browser.
- **the home page or Tinkerfund's search:** the server doesn't keep these, so
  they have no `_payload.json`. Their queries run in the browser database,
  which fetches each collection's dump from `container` (parts: browser
  database).

If a `_payload.json` fails to load, the page falls back to the browser
database; if that fails too, a dialog offers a reload (step 9's text).

Close-ups: `container`, `browser`.

### 2. Asking for a change — ▶ `maintainer`

Object card: the change, from request to merged commit.

1. `maintainer` asks a `cloud` session for a change. (A `local` session works
   the same way.)
2. **Start.** Start-up hooks install dependencies (`cloud`, via `guards`).
   Look inside: a session.
3. **Read.** The session reads `rules` and the skills it needs (uses).
4. **Work.** It edits on its own branch, sometimes with `helper-agents`.
   Before some actions run, a guard checks them (via `guards`). A blocked
   action gets a message that says what to do instead.
5. **Check.** It runs the local checks (via `scripts`), and sometimes an
   agent code review.
6. **Pull request.** It pushes and opens a pull request in `prs`, and
   watches it.
7. **Log, first write.** It writes its session log to `logs` (accent). A
   hook commits that one file straight to `main`. Look inside: a session
   log.
8. **CI.** `ci` runs the same checks. *Decision.* Look inside: the checks.
9. **Merge.** `maintainer` reviews, then merges or tells the session to
   merge. *Decision.*
10. **Log, final.** The session updates its log in `logs` (accent), and the
    hook commits it again.

Branches:
- at step 8: **green** (usual): CI posts a short comment that wakes the
  session. **Red:** CI tells the session, which fixes the work and pushes →
  rejoins at step 8.
- at step 9: **merged** (usual). **Changes asked:** the session fixes the
  work and pushes → rejoins at step 8.

### 3. A friction becomes a fix — ▶ `frictions-to-fixes`

Object card: a friction, then a fix on a branch, then a pull request with
the routine's verdict, then a changed line in a rule, then that file in the
next session's log.

1. **Start.** `frictions-to-fixes` starts on its timer, or when the
   maintainer runs it by hand. It is a session like any other.
2. **Survey.** It sends a helper to `helper-agents`.
3. **Read.** The helper reads the last three days of `logs` through a script
   (via `scripts`). It notes every friction and which docs each session
   opened.
4. **Screen.** The helper checks `issues`. It drops frictions that are
   already fixed on `main`, already tracked in an issue or pull request,
   inside a rule that `prune-trial` is testing, or only fixable in an
   outside skill.
5. **Pick.** `frictions-to-fixes` picks up to ten, at most two of them hard
   (several files, or a design choice). Some runs find nothing worth fixing.
   *Decision.*
6. **Fix.** `helper-agents` write the fixes, each in its own copy of the
   repository, and open pull requests in `prs`: one for all doc fixes, one
   per code fix. A hard fix also gets an issue. Helpers never merge.
7. **Check.** `ci` runs the checks on each pull request.
8. **Review.** `frictions-to-fixes` reviews each pull request in `prs` and
   posts its verdict as a comment. *Decision.*
9. **Merge.** `frictions-to-fixes` may merge itself; the merge script
   refuses without the verdict. The fix lands in `rules` (or in `skills`,
   `scripts` or `code`).
10. **The loop closes.** The next session, in `sessions`, reads the changed
    rule (thick). Its log lists that file among the docs it read.

Branches:
- at step 5: **fix it** (usual) → step 6. **Leave it to the maintainer:** the
  fix would touch a guard, a hook, or a file only the maintainer may merge.
  The routine files a `ready-for-human` issue in `issues` with the fix it
  recommends, and stops; it never builds a guard → ends. **Came back after a
  fix:** an earlier fix didn't hold. The routine files a new issue in
  `issues` that names the old fix, alerts the maintainer, and doesn't try the
  same fix again → ends.
- at step 8: **low risk** (usual) → step 9. **Risky:** the pull request
  stays open, the routine says why, and `maintainer` decides → ends.

Close-up: `frictions-to-fixes`.

### 4. A change goes live — `container`

1. `main` gets a new commit; `repository` lights up. This can be a merged
   pull request or a session log, which lands without one.
2. Within two minutes `container` sees it and moves its copy to the new
   commit (parts: updater, repo copy). It does not wait for CI.
3. If the lockfile changed, it installs packages first (parts: packages).
4. The build runs (parts: build). Nuxt bundles `code`; Nuxt Content packs
   each collection of `content` into a dump. If the build fails, the old
   build keeps running until the next commit.
5. The updater copies the new build over the old one and restarts the server
   (parts: served copy, server). The site is down for a second or two.
6. The restarted server starts empty. Each collection loads from its dump
   the first time a visitor needs it.

Close-up: `container`.

### 5. A bug report becomes work — `issues`

Object card: the issue, with its label as a tag.

1. `visitor` opens an issue in `issues`. It has no label.
2. `maintainer` starts a `cloud` session that runs `auto-triage`.
3. **Who wrote it?** `cloud` reads the author's access from `issues`, never
   from the text. *Decision.*
4. `cloud` checks the claim by reading only, and labels the issue
   `ready-for-human` with a short summary: it waits for the maintainer.
   *Decision.*
5. `maintainer` approves it for agents in `issues`: `ready-for-agent`.
6. `maintainer` asks a `cloud` session to build it, often the same one.
7. The session opens a pull request in `prs`, as in story 2.
8. `ci` runs the checks.
9. `maintainer` merges, or tells the session to merge. The issue closes.

Branches:
- at step 3: **a visitor** (usual) → step 4. **Written under the owner's
  account** (by the maintainer or an agent), and the design is clear: the
  session labels it `ready-for-agent` and writes a brief → rejoins at
  step 6.
- at step 4: **clear** (usual) → step 5. **Details missing:** `needs-info`,
  with specific questions; when the reporter answers → rejoins at step 2.
  **Already built, or a duplicate:** `wontfix`, closed → ends.

Close-up: `issues`.

### 6. The docs checked against the code — `audit-docs`

1. `audit-docs` starts on its timer.
2. It reads `rules` and `skills`, and the last two days of changes (uses).
3. Four reviewers in `helper-agents` look from eight angles.
4. Fact-checkers in `helper-agents` keep only confirmed findings. Edits to a
   decision record, CI or the code that keeps tenants apart go into a second
   pull request for the maintainer. Two sources that disagree, with nothing
   to settle it, become an issue.
5. It fixes `rules` and `skills` in one pull request in `prs`.
6. `ci` runs the checks. `audit-docs` may merge itself.
7. The next session reads the corrected docs (thick).

### 7. Do the skills do their job? — `audit-skills`

1. `audit-skills` starts on its timer.
2. It reads the last seven days of `logs` and the `inventory` through a
   script (via `scripts`).
3. One checker per skill in `helper-agents` compares what each run promised
   with what landed. A serious or repeated failure also becomes an issue.
4. It updates `inventory` entries. It never edits a skill's text.
5. It opens a pull request in `prs`; if nothing changed, there is none.
6. `ci` runs the checks. `audit-skills` may merge itself.

### 8. A rule cut on trial — `prune-trial`

Every run does two jobs: it judges older trials, then cuts one new rule. The
story follows one trial across two runs.

1. `prune-trial` starts on its timer.
2. It picks one rule in `rules` whose prose already failed, or that costs the
   most to read.
3. It cuts the rule down to its goal and records the trial: what the rule was
   for, and the files it covers. While the trial is open, `audit-docs` and
   `frictions-to-fixes` leave those files alone.
4. A smaller model in `helper-agents` reads only the cut text and answers
   real questions with it. If it still answers wrong, the cut is dropped and
   an issue proposes a guard for the maintainer.
5. It opens a pull request in `prs`.
6. `ci` runs the checks. `prune-trial` may merge itself.
7. *Three days later.* A later run reads the frictions in `logs` since the
   cut (via `scripts`). If a serious friction traces to the cut, one line is
   restored.
8. The next session reads the shorter rule (thick).

Close-up: `prune-trial`.

### 9. Fresh eyes on the site — `visitor-loop`

1. `visitor-loop` starts on its timer and picks today's focus: one tenant,
   the home page, or phone width.
2. It builds a preview of the site.
3. Three visitor agents in `helper-agents`, each on a different AI model,
   use the preview without any other context.
4. It keeps the problems at least two of them hit. A problem only one saw
   becomes an idea in its log; one outside what it may change becomes an
   issue.
5. It opens a fix pull request in `prs`, touching `content` or `code`.
6. `ci` runs the checks. `visitor-loop` may merge itself.
7. It opens a feature pull request in `prs` for the one best idea. Scheduling
   this routine is the maintainer's approval for one feature per run.
8. `ci` runs the checks. `visitor-loop` may merge itself.

Close-up: `visitor-loop`.

### 10. The day written up — `digest`

1. `digest` starts on its timer.
2. A script gathers each finished day's merged pull requests, commits and
   `logs` (via `scripts`).
3. It writes a digest into `journal-pages`.
4. A fact-checker in `helper-agents` checks every claim.
5. It moves older digests and logs from `current` to `archived`.
6. It opens a pull request in `prs`.
7. `ci` runs the checks. `digest` may merge itself. If anything else rode
   in, such as a test fix, the pull request waits for the maintainer.

### 11. The day's best story — `blog-post`

1. `blog-post` starts on its timer and picks whose turn it is.
2. It reads recent changes, `logs` and the newest posts of all four writers
   in `blog`.
3. It writes three drafts. A blind reader in `helper-agents` picks one, and
   a fact-checker checks it.
4. It opens a pull request in `prs` with the post for the writer's space in
   `blog`.
5. `ci` runs the checks. `blog-post` may merge itself.
6. A fresh reader judges whether another writer should reply. Usually not;
   if so, the reply takes the same path.

## Close-ups

Each close-up has 5–8 parts, drawn inside the node's box, left to right
where they form a sequence. The nodes it works with directly stay lit around
it.

**`cloud` and `local`: a session** (stories 2 and 5)

| Part | What it shows |
|---|---|
| start hooks | install dependencies and fetch the full history |
| reads | `CLAUDE.md` loads by itself; it sends the agent to the glossary, then to how-tos and decision records when a task touches them; then the skill |
| branch | its own branch, never `main` |
| guards | check some actions before they run; a blocked action gets a message saying what to do instead |
| helper agents | do parts of the work; never write the session log |
| end-of-turn hook | commits the session log if one is waiting |

**`ci`: the checks** (story 2)

| Part | What it shows |
|---|---|
| quick checks | always run: lint, types, content validation and a few integrity checks |
| slow checks | tests, the build and a browser smoke test; skipped only for inert changes (docs outside the tenants) |
| same rule twice | the local run and CI ask one script which checks to skip, so they can't disagree |
| wake-up comment | on green, CI posts a short comment so the waiting session wakes; red reaches it without one |
| on `main` | every push to `main`, session logs included, runs all checks |

**`logs`: a session log** (story 2)

| Part | What it shows |
|---|---|
| the agent's half | goal, status, outcome, summary, every friction |
| waiting file | the agent's half waits in a local file outside git |
| end-of-turn hook | adds the transcript half (timings, models, tools, files) and checks the shape |
| one-file commit | built on the newest `main`; refused if any other file would change |
| bypass | pushed straight to `main` through the owner's bypass |
| statuses | `in-review` when the pull request opens, `completed` when it merges |

**`issues`: issue states** (story 5)

| Part | What it shows |
|---|---|
| no label | new; nobody has looked |
| `needs-triage` | the maintainer still has to decide |
| `needs-info` | waiting for the reporter; a reply sends it back to triage |
| `ready-for-agent` | approved for an agent; a brief is attached |
| `ready-for-human` | needs a person; a visitor's issue waits here for the maintainer |
| `wontfix` | closed without action |
| agent or human? | an agent's post opens with a 🤖 line; that is how triage tells them apart |

**`frictions-to-fixes`** (story 3)

| Part | What it does |
|---|---|
| survey (a helper agent) | gathers three days of frictions with a script |
| screen (same helper) | drops what is fixed, tracked, on trial, or in an outside skill |
| pick | up to ten, at most two hard; sorts each into fix, maintainer or "came back" |
| file | opens issues for hard fixes, for the maintainer's fixes and for fixes that came back |
| fix (helper agents) | one pull request for all doc fixes, one per code fix |
| review & merge | waits for green CI, reviews, posts a verdict, merges or leaves open |
| log | writes the session log, with the routine's own frictions |

**`prune-trial`** (story 8)

| Part | What it shows |
|---|---|
| judge | a later run reads the frictions since each open trial's cut |
| verdict | keep the cut, restore one line, or propose a guard |
| pick | one rule whose prose failed, or that costs the most to read |
| cut | down to its goal; the trial records its files |
| probe | a smaller model answers real questions from the cut text |
| three days | sessions work without the cut text and log their frictions |

**`visitor-loop`** (story 9)

| Part | What it shows |
|---|---|
| focus | today's tenant, the home page, or phone width |
| preview | a production build of the site |
| three visitors | each on a different AI model, with no other context |
| tally | a problem counts when two of three hit it |
| fix | one pull request for the agreed problems |
| feature | one pull request for the best idea |
| leftovers | ideas into the log; out-of-scope problems into issues |

**`container`** (stories 1 and 4)

| Part | What it shows |
|---|---|
| updater | checks `main` every two minutes with a read-only token; never checks CI |
| repo copy | the updater's own copy of the repository |
| packages | installed again only when the lockfile changed |
| build | Nuxt bundles the code; Nuxt Content packs each collection into a dump |
| served copy | the last build that succeeded; the server runs only from here |
| server | page store (each `/t/` page and its `_payload.json` for 60 seconds; never the home page or Tinkerfund's search), renderer (Vue builds HTML), Nuxt Content, SQLite (starts empty after each deploy; never edited by visitors) |

**`browser`** (story 1)

| Part | What it shows |
|---|---|
| page | the HTML from the first visit, with the page's data inside |
| Vue app | takes over after the first page |
| link prefetch | when the pointer rests on a link, fetches that page's code and `_payload.json`; on a phone, on tap |
| `_payload.json` | one page's data, made by the server |
| browser database | SQLite in the browser; loads only when a query runs here |
| error dialog | shows when browser content fails to load, with a reload button |

## Details panels

Every panel has the same rows, in this order. An empty row is hidden.

| Row | What it holds |
|---|---|
| **name** | The node's label and its zone, e.g. "GitHub › CI". |
| **role** | One line, at most 12 words. |
| **about** | Two or three short sentences. |
| **appears in stories** | Every story with a step on this node, each with a ▶. Computed from the steps. |
| **reads / writes** | Routines only; see the table below. |
| **look inside** | Only for nodes with a close-up. |
| **files** | Where the node lives in the repository. An exact path appears on one node only; a more specific path may sit inside another node's folder. |
| **why** | The decision records that explain the node. These may repeat. |

### Files and why

`<tenant>` means each tenant folder; `*` means any space.

| Node | Files | Why |
|---|---|---|
| `maintainer` | none | ADR-0020, ADR-0003 |
| `visitor` | `docs/agents/guest-contributions.md`, `scripts/trust.ts` | ADR-0020 |
| `routines` | none: each timer is set in claude.ai | – |
| each routine | `.agents/skills/<name>/` | ADR-0003 |
| `prune-trial`, also | `.agents/prune-trials.yml` | ADR-0027 |
| `sessions`, `cloud`, `local` | none; see `rules` and `guards` | ADR-0003 |
| `helper-agents` | `.agents/skills/dispatch-subagents/` | – |
| `rules` | `CLAUDE.md`, `CONTEXT-MAP.md`, `CONTEXT.md`, `layers/<tenant>/CONTEXT.md`, `docs/agents/`, `docs/adr/` | ADR-0021 |
| `skills` | `.agents/skills/`, `.claude/skills/`, `skills-lock.json` | ADR-0005, ADR-0015 |
| `guards` | `scripts/*-guard.ts`, `scripts/guard-wrap.sh`, `.claude/settings.json`, `.githooks/`, `docs/agents/guards.md` | ADR-0017 |
| `scripts` | `scripts/` | – |
| `code` | `app/`, `modules/`, `shared/`, `nuxt.config.ts`, `content.config.ts`, `layers/<tenant>/app/`, `layers/<tenant>/nuxt.config.ts`, `layers/<tenant>/tenant.config.ts`, `layers/<tenant>/tests/`, `tests/` | ADR-0001, ADR-0018 |
| `content` | `layers/<tenant>/content/` | ADR-0025 |
| `journal` | `scripts/archive-journal-content.ts` | ADR-0008, ADR-0010 |
| `logs` | `layers/journal/content/*/sessions/`, `shared/schemas/session.ts`, `scripts/log-session.ts` | ADR-0009 |
| `inventory` | `layers/journal/content/*/skills/` | ADR-0015 |
| `issues` | `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `.agents/skills/triage/`, `.agents/skills/auto-triage/` | ADR-0020, ADR-0022 |
| `prs` | `docs/agents/pr-workflow.md`, `scripts/merge-pr.ts` | ADR-0003, ADR-0009 |
| `ci` | `.github/workflows/gate.yml`, `.github/actions/gate/action.yml`, `scripts/gate.ts` | ADR-0004, ADR-0026 |
| `caddy` | `deploy/README.md`; Caddy itself is set up outside the repository | – |
| `container` | `deploy/entrypoint.sh`, `deploy/Dockerfile`, `deploy/docker-compose.yml` | ADR-0011, ADR-0028 |
| `browser` | `app/components/ContentLoadErrorDialog.vue` | ADR-0028, ADR-0019 |

### What each routine reads and writes

Every run also writes its own session log; the table leaves that out. Who
may merge what comes from ADR-0003; how a merge lands, from
`docs/agents/pr-workflow.md`. Outside a routine's scope, the maintainer
merges.

| Routine | Reads | Writes | May merge itself only if |
|---|---|---|---|
| `frictions-to-fixes` | the last three days of session logs, `issues`, `prs`, the history of `main`, the open trials | fixes in `rules`, `skills`, `scripts` or `code`, via helpers' pull requests; issues | its own review passed and the fix is low risk; never guards, hooks or maintainer-only files |
| `audit-docs` | the docs, our own skills, the Journal's explainer pages, the last two days of changes, how often each doc is opened, the open trials | fixes to docs and skills; rarely an issue | the fixes touch current docs and our own skills; decision records, CI and the code that keeps tenants apart go in a second pull request |
| `audit-skills` | seven days of session logs, the inventory, our skills' text, git history, GitHub | inventory entries; issues for serious or repeated failures | only inventory entries change, and every grade change cites at least two sessions |
| `prune-trial` | the open trials, frictions since each cut, the issue tracker, all agent guidance | one cut per run, its trial entry, restored lines, issues that propose a guard | the change is prose that can be undone; a rewritten decision record still decides the same |
| `visitor-loop` | a preview of the site, the visitors' reports, the maintainer's past corrections, its `decisions.md`, a week of logged ideas | one fix and one feature pull request, `decisions.md`, issues | the changes stay inside existing tenants, or app files a routine may merge |
| `digest` | each finished day's merged pull requests, commits and session logs | one digest per day; moves older logs and digests to `archived` | the change is digests and the move |
| `blog-post` | whose turn it is, three days of commits and logs, every writer's newest posts | one post; for a reply, also a short backlink note | the change is that post and at most one note, and every claim survived the fact-check |

"Works with" lines in the routine panels (no lines on the map):
- `prune-trial` → `audit-docs`, `frictions-to-fixes`: while a trial is
  open, they leave its files alone.
- `frictions-to-fixes` → `prune-trial`: an issue about a fix that didn't hold
  counts in the trial's verdict.
- `audit-skills` → every routine: it checks each routine's runs.

## Keeping it true

- **One data file** holds the zones, nodes, stories, close-ups and panels.
  The diagram is drawn from it.
- **A test** reads the data file and fails when:
  1. a file path matches nothing in the repository (`<tenant>` and `*` are
     expanded; `why` entries are matched to `docs/adr/`);
  2. a step names a node id or close-up part that doesn't exist;
  3. two nodes list exactly the same path in `files`;
  4. a routine has no story;
  5. a role or about line contains a pull request or issue number.

## Leave out

- Names of single guards, hooks and CI checks. Panels use folders and
  patterns instead.
- When a routine runs. Say that it runs on a timer, never at what time.
- Counts that change daily: sessions, skills, how often something happened.
- Pull request and issue numbers, session ids and commit ids.
- Line numbers in file pointers.
- How the server finds a tenant's content for an address, and how Commons
  reads across tenants. At most one sentence, on the Commons chip.
- Skills that serve one tenant (e.g. `atlas-specimen`), and rare ways of
  working: handoffs, `/loop` sessions, the guest demo.
- Housekeeping such as Dependabot and pull-request labels.

## Still open

**Where the diagram lives.** The maintainer decides before it is built.

| | claude.ai artifact | HTML file in the repository | page in the Journal |
|---|---|---|---|
| Lands through a pull request and CI | no | yes | yes |
| Needs approval as new work | no repository change | yes | yes: a new feature on the site |
| A human must merge it | – | no site behaviour changes, but CI runs every check | yes, unless a test checks how it behaves in the browser |
| Rules that apply | – | – | it may hold its own data but must not query other tenants; no mermaid code in the browser (ADR-0024) |
| The test in "Keeping it true" runs in CI | only if the data file also lives in the repository | yes | yes |
| Who can see it | whoever it is shared with | readers of the repository | every visitor |

---

**For agents and maintainers: what counts as ground truth.** This overview,
the Journal's explainer pages, research notes and READMEs can fall behind.
How the platform behaves is defined only by:
- the house rules and glossary (`CLAUDE.md`, `CONTEXT.md`), the decision
  records (`docs/adr/`) and the agent how-tos (`docs/agents/`);
- the skills (`.agents/skills/`), scripts (`scripts/`) and hook wiring
  (`.claude/settings.json`);
- the code: the Nuxt application, CI (`.github/`) and deploy (`deploy/`).

What actually happened is recorded in the session logs and git history.
Check claims against those. Last checked against `main` on 2026-10-08.
