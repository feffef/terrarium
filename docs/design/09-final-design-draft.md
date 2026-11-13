# Samara: design draft for a single-site template

**Status:** a proposal by the writing agent; it decides nothing. "Samara" is a
working title. This document stands alone and is meant as the one baseline:
where it differs from the two earlier drafts or from the decisions file, this
document is the newer statement.

**Sources.** "REQ §n" cites a section of the requirements document
(`05-platform-requirements-neutral.md`); ids such as VER-2 cite one requirement.
"DEC" is the decisions file (`docs/design/08-converged-decisions.md`), which
holds the evidence and the reasoning behind each choice. Counts quoted here
come from DEC: they are from Terrarium's problem ledger over 15 days
(2026-10-30 to 2026-11-13) and its 166 session logs, and some were counted by
a sub-agent and not re-checked.

**Tags.** `[untested En]` rests on a fact nobody has tested; section 13 lists
the experiments. `[owner]` awaits the owner's word; section 14.1 lists them.
*(guess)* is a number with no evidence behind it. Departures from the
requirements are collected in section 14.2 and are all **to be confirmed**.

**Settled by the owner so far:** one repo per site; cloud and laptop sessions
both work; the platform leaves the site free to use any JavaScript framework;
each site maintains its own content checks; the owner area is a separate app
whose access control is not its own concern; "simplest" means the least code
the platform writes itself, so a framework and libraries, not hand-written
HTML and browser script; Astro is acceptable for the owner app and the seed;
the watcher uses a model to judge whether platform skills work, and each
skill carries a short list of things to watch for; a sweep merges Dependabot's
minor and patch updates, with the risk of breaking 0.x updates accepted;
sweeps may merge inside their own surface under the default preset.

## 1. Design principles

1. **The platform knows no site framework.** The site tells the platform how
   to check, test, build and serve itself through a small contract (4.2).
   All six recorded upgrade breaks in Terrarium sat in the framework or the
   content library (DEC 2a).
2. **Two apps that cannot fail each other.** The owner app lives wholly under
   `platform/`. Its checks never fail a site change and the site's checks
   never fail a platform change, except through the contract. With one build
   and one check run, Terrarium's own journal failed unrelated work about 25
   times (DEC 1).
3. **Commands refuse; prose is for judgement.** A rule a command can enforce
   is enforced there, in the change that states the rule (PRIN-1). Hooks are
   the last resort: four ship, against 33 wired in Terrarium, where three and
   a half of the ten most frequent problems were costs of its own hints and
   guards (DEC 3).
4. **The machine records facts; the agent writes judgement.** Session ids,
   commit ids, timings, tokens and costs are never typed (PRIN-7). Ids typed
   by agents were wrong 18 and 8 times.
5. **Derive, do not store.** A log's status, a cause's fix state, a sweep's
   silence and "taken" follow from records that already exist (PRIN-8). The
   machinery that kept a stored status current caused 31 problems.
6. **Records are data on their own branch.** Writing one never touches
   `main`, never builds and never deploys (REC-11).
7. **Least own code.** A standard tool, a framework or a library comes
   before code the platform writes itself (REQ §1.1 point 5; the owner's
   ruling on the stack).
8. **Every sweep is removable and assumes no cadence.** A sweep is a folder
   and a schedule; its first step exits when nothing is new (PRIN-11).
9. **Nothing without a recorded reason.** A part that no requirement or
   recorded problem defends is cut, or starts as one line in the caveats
   document (REQ §14).

## 2. Concepts

Terms are plain lowercase words, written the same in prose, commands and file
names. The first column is the working word. Where the two earlier drafts
used different words and no choice was clearly agreed, the second column
shows the other option `[owner]`.

| Term | Other option | Meaning |
|---|---|---|
| owner | | The person who steers the site and merges what agents may not. |
| site | | This repository: one website and its content. |
| platform | | The files the template owns and updates: the tool, hooks, skills, owner app. |
| seed | starter | Files the template gives once; the site then owns them. |
| contract | | What the site tells the platform about itself: four scripts, two signals, its routes and paths. |
| session | | One agent conversation working on the repo. |
| log | session log | A session's record: the agent's judgement plus machine facts. |
| problem | | Something that cost a session time or went wrong, graded nit to blocker. It lives in the log. |
| finding | | What a sweep reports for follow-up: a problem, an idea or a learning, with evidence. |
| cause | | The root of one or more problems and findings, with its fixes. |
| sweep | | A skill run on a schedule or by hand that looks after the site or the platform. |
| records | | Logs, findings, causes, run rows, merge rows, digests, sweep notes: data, not site content. |
| owner app | owner area | The owner's pages: digests, sessions, the problem ledger, costs, the guide. |
| verification | check | The fixed steps a change passes before it may merge; `verify` runs them. |
| verdict | | The posted review result that names the reviewed commit. |
| protected path | | A path whose changes only the owner merges. |
| preset | | The one setting that says who may merge. |
| ruling | owner rule, standing order | A standing owner instruction every sweep obeys. |
| by-hand step | human step | A change only the owner or a laptop session can apply. |
| watch list | | A skill's short list of specific things the watcher looks for in its runs. |

**Rationale (not shipped).**

- GitHub's own words are used for GitHub's things (pull request, issue,
  ruleset), because the tooling is fixed and a neutral word adds a
  translation step.
- "owner app" replaces "owner area" because it is now a separate app.
- "contract" and "watch list" are new: both are things an agent acts on.
- "verification" stays the noun because the command is `verify`; "check" is
  kept for the site's own fast script in the contract.
- Preset names are `review-all`, `standard`, `hands-off`; the other option
  is supervised, standard, autonomous `[owner]`.

**Requirement terms that do not ship as glossary entries**, because no agent
acts on the word: run row, merge row, taken mark, head, safe surface, memory
file, trial, persona, preview, map, ticket, waiver, stranger, drop zone,
watcher, visitor, digest. Each is a field, a file or a skill below.

## 3. Repo shape

**Provisional.** Every folder and file name in this section is a first
sketch and will be fine-tuned when the template is built. What is meant to
hold is the split into kinds of file and the rules below the listings, not
the names. No compatibility with the skill pack installer's own layout is
sought: skills and agent definitions live under `.claude/`.

```
CLAUDE.md                       site; imports platform/guidance.md and both glossaries
GLOSSARY.md                     site; the site's own terms (skill pack convention)
site.yml                        site; preset, template commit, the contract, paths, owner-app deploy
package.json                    seed; the site's scripts and dependencies; one script entry "samara"
pnpm-workspace.yaml             seed; makes platform/ and platform/owner-app/ workspace packages
pnpm-lock.yaml                  site; one lockfile for site, tool and owner app
src/                            seed; the hello-world site (section 4.3)
tests/                          seed; the site's own tests
guide/                          platform chapters (listed in paths.txt) and the site's own chapters
docs/adr/                       decision records; about five shipped (protected)
docs/agents/                    site; written by the pack's setup skill to adapt pack skills
docs/rulings.md                 site; the owner's standing rulings (protected)
docs/by-hand/                   site; by-hand steps with a runnable checklist
deploy/                         seed; the recipe picked at setup (protected)
platform/
  guidance.md                   the always-loaded platform text: twelve lines (section 5.3)
  glossary.md                   the terms in section 2
  paths.txt                     the one list of platform paths
  protected-paths.txt           the protected list (section 11)
  settings.json                 the hooks block and the deny entries sync owns
  package.json                  the tool's few pinned dependencies
  bin/                          the tool: verify, log, ship, merge, preview, sync
  lib/                          shared helpers (section 5.1), the data-format helper
  hooks/                        the session-start hook, the provenance guard, two git hooks
  schemas/                      log, finding, cause, run row, merge row, site.yml
  briefs/                       three fixed briefs: triage, build, review
  docs/                         how-tos for agents: git and pull requests, issues and labels,
                                caveats, adding a hook, writing a platform skill
  owner-app/                    the owner app; its own package and its own contract entries
  tests/                        tests of commands and hooks
.claude/skills/samara-*/        platform skills; a sweep's folder also holds sweep.yaml
.claude/skills/<pack>/          installed pack skills, never edited
.claude/agents/                 two agent definitions: reader, visitor (protected)
.claude/rules/                  a few hand-written path-scoped rules
.claude/settings.json           mixed: sync owns two named parts (section 10)
skills-lock.json                pins every installed skill (protected)
.github/workflows/verify.yml    one `uses:` line; applied by a person
.github/actions/verify/         setup, the `verify` call, the comment on green
.github/dependabot.yml          two groups: minor-and-patch, and majors one by one (protected)
```

Branch `records` (no shared history with `main`, never checked out):

```
logs/<yyyy>/<mm>/<day>-<session>.json     one per session
findings/<day>-<sweep>-<session>.json     one per sweep run
causes/<cause>.json                       one per cause; the improvement sweep writes
runs/<sweep>/<day>-<session>.json         one run row per sweep run: time, work, coverage, cost
merges/<number>.json                      one merge row per merge made by `merge`
digests/<day>.md                          one per finished day; written once
memory/<sweep>.md                         a sweep's size-capped notes
shots/<number>/                           screenshots linked from a pull request
```

Kinds of file (REPO-1):

- **platform:** every path in `platform/paths.txt`: `platform/**`, the
  `samara-*` skills, the pack skills and `skills-lock.json`, `.claude/agents/`,
  `.claude/rules/`, the platform chapters in `guide/`, the shipped decision
  records, `.github/actions/verify/` and the workflow file.
- **seed:** `package.json`, `pnpm-workspace.yaml`, `src/`, `tests/`,
  `deploy/`, `.github/dependabot.yml`. Given once; sync never touches them.
- **site:** everything else on `main`, and the whole `records` branch.
- **mixed:** `.claude/settings.json` only.
- No platform file sits in the site's source tree. That was the owner's worry
  about sync, and it is why the owner app is a second app.
- The template commit last taken is site state and lives in `site.yml`, not
  in a platform file.

A writer never collides with another: a session writes only files named for
itself; only the improvement sweep writes `causes/`; only `merge` writes
`merges/`. A record is written as a commit built from the remote tip and
pushed by id, with three attempts and then one failure line (REC-12). That
shape landed all 166 current logs in Terrarium.

## 4. Stack and the contract

### 4.1 The platform's own stack

**Proposal:** the tool is TypeScript run directly by a pinned Node; the owner
app and the seed are Astro with its Node adapter `[untested E5]`.

- **Least own code.** A framework does routing, rendering and escaping; a
  library is used wherever it saves own code, charts for one. The platform
  hand-writes no server, templates or DOM code (owner's ruling).
- **Renders on request, ships client code only where a component asks.** The
  owner app reads records when a page is requested, so no record triggers a
  build (REC-11).
- **Content apart from templates.** The seed keeps a Markdown file with a
  typed schema apart from the template that renders it, which is what the
  owner valued in the previous content library (CON-1).
- **A client framework inside the owner app is allowed** where it saves code
  (owner's ruling). No data store is shipped to the browser: Terrarium's
  browser-side content database was the source of its load failures.
- **Few pinned platform dependencies:** the browser driver, the test runner,
  the framework, a chart library. A dependency is never patched; it is
  replaced or lived with.

Caveats:

- The only evidence for Astro is one test build that was not kept. It did
  not test client-side interactivity, a container image or the development
  server.
- Every site starts with one framework's upgrades. The contract keeps that
  cost inside the owner app and the seed; a site that replaces the seed
  carries its own.
- One install serving the site, the tool and the owner app has no evidence
  at all, and the design rests on it `[untested E4]`.

### 4.2 The contract between platform and site

The platform knows no framework. `site.yml` holds what it needs, and the
owner app declares the same entries in its own package.

```yaml
preset: standard
template: 3f2a9c1                 # template commit last taken
contract:
  check: check                    # package script; seconds-fast
  test: test
  build: build
  serve: serve                    # starts the built site on the port it is given
  ready: /version                 # answers 200 only once the site can serve pages
  page-ready: null                # optional expression; default: load event plus network idle
  routes: routes                  # script or file that prints every route
paths:
  content: [src/content]
  ui: [src/layouts, src/components, src/styles]
  server-routes: [src/pages/api]
owner-app:
  deployed: true
```

- **Assumption:** JavaScript only; one package manager and one lockfile for
  site, tool and owner app. Anything else is outside the contract.
- **The site must serve `/version`** with its commit and build time (DEP-3).
- **First rule:** neither side's checks can fail the other except through
  these entries.
- **The platform's smoke test** asserts, for every listed route: it answers
  2xx, has a top heading, and loads with no console or page error; and
  `/version` is not empty. Everything else is the site's `test` (REQ §6.2).
- **Content checks are the site's** (owner's ruling). The seed's `check`
  validates its content against its schema. The two data-format traps (a
  value silently cut at an unquoted `#`, a folded line ending in a hyphen)
  ship as a small framework-free helper in `platform/lib/` that the seed's
  `check` calls, so a fix reaches other sites; a site may stop calling it
  (CON-2, CON-3).
- Without `page-ready` a screenshot guesses with a delay or must know the
  framework; shots of a loading or stale page were recorded 6 times (UI-3).

### 4.3 The seed

A minimum hello world on the owner app's stack:

- one page; one Markdown content file with a typed schema, rendered by a
  template;
- one server route in its named place; one page rendered on demand;
- `/version`; a `routes` script;
- a `check` that validates the content file and calls the data-format
  helper; one browser test that selects by role.

Components inside content, design tokens, browser-side navigation and
diagrams are documented paths in the guide, not seed files. A site may
replace the whole seed with another JavaScript framework that meets the
contract.

## 5. Commands

One tool, six commands, run as `pnpm samara <command>` by agents and people
alike. Each fails closed and is tested against the rules in its row.

| Command | Rules it keeps | Meets |
|---|---|---|
| `verify` | One step list. First always the frozen install. Records head and tree at the start and aborts before the next step if either moved. Then the site's `check`, `test` and `build`, the platform's framework-free checks (commit trailers, skill pins, the copies sync owns, guide excerpts), and the platform's smoke test against that build. In automation it writes the failing step to the job summary and an error annotation; there is no separate automation mode. No lock, no edit guard, no size caps, no skipping by path; the owner app's own check runs only when `platform/owner-app/` changes. `--fast` runs the site's `check` and never installs. | VER-1 to VER-7, LIFE-3, PACK-1 |
| `log` | The only writer of a session's record. The agent passes judgement as JSON on stdin or a file; the command adds machine facts and the session id and pushes at once. A second run replaces the machine half and merges the authored half. A failure is one line and a non-zero exit. It prints the severity scale when a problem has none. | REC-2 to REC-13, ID-2 |
| `ship` | Refuses when this session has no log. Pushes the branch and checks the remote ref equals the local commit; runs `verify` on that pushed commit; only if it passed, opens the pull request naming that commit, with the session mark and closing lines written from an explicit list of issue numbers. For UI paths it takes screenshots, commits them to `records` and links them. Prints "subscribe to this pull request". A plain push is allowed at any time. | WM-1, VER-2, REC-1, UI-4, ID-1 |
| `merge` | Eleven rules, listed in 5.2. `merge verdict` reads the head from GitHub and posts the verdict. | MRG-1 to MRG-11, AUT-2, AUT-3 |
| `preview` | Owns its server by process id; stop always succeeds; own port per preview. Works the same for the site and the owner app through `build`, `serve`, `ready` and `page-ready`. `shot` builds for production, waits for `page-ready`, captures light and dark at desktop and phone size in one call, and can assert on the rendered DOM. | UI-1 to UI-7 |
| `sync` | `take` and `offer` (section 10). Runs its own checks, because a session with two repos attached loads no hooks. | SYNC-1 to SYNC-8, REPO-3 |

Evidence behind the less obvious rules:

- **`ship` pushes before it verifies.** The agent tool's own end-of-turn
  "commit and push" reminder was the second most frequent problem (67), so
  nothing may sit unpushed while `verify` runs. A push opens nothing.
- **`ship` refuses without a log,** because every other way of forcing a log
  misfired (31 problems). The gap is stated in section 14.3.
- **No stated order "review, verify, push".** It slipped 21 times through
  seven prose fixes. The one enforced fact is a verdict on the head at merge.
- **`verify` always installs first,** so a laptop, a cloud session and
  automation run the same thing and a stale install is never read as a break.

### 5.1 Shared helpers

In `platform/lib/`, each used by more than one command and unit-tested:

- **Session id:** from the environment in a cloud session, from the
  transcript on a laptop; no command takes it as an argument. A sub-agent
  gets its parent's id `[untested E7]`.
- **GitHub requests:** REST only; `gh api` if present, else HTTPS with a
  token variable, else one loud failure line `[untested E3]`. Adds the
  session mark to every post and throws on a paging gap.
- **Records:** the writer described in section 3, and one bounded reader
  that returns newest first with a cap and a total count (PRIN-9). After a
  push it compares the remote ref with the local commit.
- **Contract reader:** reads `site.yml` and the owner app's entries.
- **Transcript reader:** timings, models, tokens, tools, sub-agents, skills
  used (a skill counts as used when its file was read or its slash command
  expanded), and the `entrypoint` field. It runs inside the session, because
  a transcript exists only on the machine that ran it.

### 5.2 The eleven rules of `merge`

1. Read the preset and the protected list from `main`; refuse if unreadable.
2. Refuse a change to a protected path without the owner's waiver. The file
   list comes from git with rename detection off, so both names of a rename
   are checked.
3. One exception to rule 2: Dependabot's pull request for minor and patch
   updates, merged by the dependency sweep. How `merge` recognises one is
   left to experiment 14 `[untested E14]`.
4. Require a verdict that names the head.
5. Refuse on a merge conflict; a conflicted pull request gets no check runs.
6. Wait for checks in a way fit for a background run: zero runs is pending,
   one failure is red.
7. Refuse a closing keyword anywhere outside the one block `ship` wrote, and
   refuse if a listed issue is reserved for the owner.
8. Merge pinned to the head, so a late push fails the merge. Never use
   GitHub's auto-merge.
9. Report "merged" only from GitHub's reply.
10. Write the merge row: who, what, preset, verdict, and the waiver quote if
    one was given. A waiver lifts only rule 2.
11. Refresh this session's log and print one line inviting problems met
    since it was written.

Left out on purpose: a retry for issues GitHub left open (one incident; the
watcher reports them), version parsing of dependency changes, and stored
pull request state (a pull request with a merge row is merged; otherwise the
reader asks GitHub once per page and shows "unknown" if it cannot).

### 5.3 The always-loaded platform text

`platform/guidance.md` is these twelve lines and nothing else (GUIDE-1):

1. Verify before you state: check ids, counts, causes and sub-agent claims
   against their source this turn.
2. Question the premise; add nothing beyond the ask.
3. Ask before building what the owner will see; show a sample first; settle
   a stored field's shape with the owner.
4. An empty task prompt means stop and ask.
5. Stay on the branch the session started on; from the default branch, cut
   a new one.
6. Push whenever you like; open a pull request only with `ship`; subscribe
   to it and stay with it until it is merged or closed. A merge needs a
   review verdict on its head.
7. A session that opens no pull request runs `log` once before it ends.
   Report every problem, however small.
8. Run long commands in the background and end the turn; after a restart,
   check that background work is alive before reporting it.
9. Read a required document whole.
10. Hand over before long work fills the context.
11. Leave to the owner a change whose behaviour no check can observe.
12. Use plain words; coin a term only on its second use.

**How a new rule gets enforced.** A mechanical rule becomes a step of
`verify` or a refusal in the command that performs the action, in the same
pull request. A judgement call becomes one line here or in a skill. A quirk
of the environment starts as one line in `platform/docs/caveats.md` and
becomes a guard only when it recurs. A hook is the last resort and names
what it replaces (PRIN-1, PRIN-2).

**Review** (WM-3 to WM-5): one fresh round by an agent that did not write
the code, the builder fixes, nits never block, one reviewer per branch.
Terrarium's review loop hit its cap on cosmetic findings in five of six
small branches.

## 6. Hooks

Four hooks. Each has a test and a documented failure mode;
`platform/docs/adding-a-hook.md` is the one page (PRIN-5).

1. **Session start** (tool lifecycle hook; fails open, loud). Frozen
   install, full history with a timeout on the fetch, one fetch of the
   `records` ref, set the git hooks path, print what loaded (LIFE-1, LIFE-2).
2. **Provenance guard** (the one tool-call guard; fails closed). Refuses a
   GitHub write through the direct write tools when the body lacks the
   session mark, and prints the line to use. Nothing for the shell path: the
   platform's own writes go through the helper, which adds the mark (ID-1 to
   ID-3). Prose alone failed five times before a guard existed.
3. **Commit message** (git hook; fails open, loud). Adds the session
   trailer; `verify` fails on a commit without it (ID-4).
4. **Pre-commit** (git hook; fails closed). Refuses a workflow-file change
   in a cloud session and points to `docs/by-hand/`, because one such commit
   strands the whole push (ENV-2).

- A hook that cannot run prints its own name and a one-call bypass, and
  still refuses. A crashed fail-closed guard once blocked every shell call.
- **Removing a hook:** a denial is reported as a problem whose `where` is
  the hook. When a hook causes more problems than it prevents, the
  improvement sweep files an owner issue proposing removal.

Deliberately not built (GUIDE-2 and DEC 3):

- a guard that denies a first call until a document is read (66 denials
  against 3 occurrences of its problem);
- reminders mid-run, and hints after edits (103 + 38 firings, "85 of 86
  changed nothing");
- generated rules mirroring decision records, and tracking of which rules
  loaded;
- a stop hook or session-end hook for logs (the session-end hook landed 0 of
  166 logs);
- an edit guard or a lock around verification.

## 7. Skills

**Naming.** Platform skills carry the working prefix `samara-`, so they
never clash with a pack skill (REPO-4). The second name in each row is the
other draft's name for the same job `[owner]`.

| Skill | Other name | Purpose | Uses |
|---|---|---|---|
| `samara-setup` | setup-site | The one guided setup session (section 12). | `setup-matt-pocock-skills`, `wizard` |
| `samara-steer` | clear-backlog | Triage every open issue read-only, ask the owner once, then build, review, `ship` and report one line per issue. Serial. | `triage`, `code-review`, `tdd` |
| `samara-next` | next-session | Hand over to a fresh session: about three lines. | `handoff` |
| `samara-sync` | sync-template | Run `sync take` or `sync offer` and resolve conflicts. | none |
| `samara-skills` | update-pack | Update the pack, list changed, renamed and deleted skills, re-read every adapting note, re-pin. | none |
| `samara-watch` | sweep-watch | Section 8.2. | none |
| `samara-improve` | sweep-improve | Section 8.3. | `retro` |
| `samara-docs` | sweep-docs | Section 8.4. | `writing-for-agents` |
| `samara-visit` | sweep-visit | Section 8.5. | none |
| `samara-digest` | sweep-digest | Section 8.6. | none |
| `samara-deps` | dependabot sweep | Section 8.7. | none |

No close skill: `log` prints the severity scale, and `ship` refuses without
a log.

**Each platform skill folder holds a `watch.md`:** at most five *(guess)*
specific things the watcher looks for in that skill's runs, for example "the
question round was asked before any builder started". It is written with
the skill and the owner may edit it (owner's ruling). Watch lists are
protected: a sweep that could edit one could weaken what it is judged by.

**Pack skills shipped by default** (`mattpocock/skills`, copied in, pinned
in `skills-lock.json`, synced from the template): `setup-matt-pocock-skills`,
`grilling`, `grill-with-docs`, `code-review`, `tdd`, `diagnosing-bugs`,
`domain-modeling`, `triage`, `to-spec`, `to-tickets`, `implement`,
`prototype`, `research`, `wizard`, `writing-for-agents`, `retro`,
`wayfinder`, `handoff`. A default skill with no recorded use becomes a
finding to remove it (PACK-6).

### 7.1 How platform skills relate to pack skills

- A platform skill or a brief that needs another skill **names that skill's
  file to read whole** and follows it; it adds only its own step (PACK-2,
  BIG-5). At least seven pack skills can only be invoked by a person, and
  reviewers told to paraphrase a review skipped steps. In ordinary sessions
  the skill tool is used as normal.
- What differs for this platform lives in `docs/agents/`, written by the
  pack's setup skill and owned by the site (PACK-3, SET-6).
- An installed skill is never edited; `verify` fails on drift from
  `skills-lock.json`, which is protected (PACK-1). A builder once edited an
  installed skill and re-pinned it.
- Only the label that reserves an issue for the owner has a mechanical
  meaning; the other four inbox labels are the owner's view (WM-7).

### 7.2 Steering and sub-agents

- **Serial first** (REQ §8.6 allows it). Parallel-only problems are caveats
  lines until parallel work is built.
- **Read-only by tool list.** Two agent definitions in `.claude/agents/`: a
  "reader" with no GitHub write tools and no shell (triage, every checker),
  and a "visitor" with a browser tool `[untested E10]`. A triage agent once
  commented on ten issues and closed one (ST-1, DSP-2).
- **Three fixed briefs** in `platform/briefs/` with named slots. Each names
  its model: the cheaper one for triage and build, the default for review
  (DSP-3, DSP-10).
- **Questions** go to the owner as one numbered list with no stated total.
  No builder starts until every answer is in (ST-3, ST-4).
- **The cost line** before the owner's final step reports work: sub-agents,
  review rounds, minutes. Money is added later by the cost step and never
  typed (ST-7).

### 7.3 Work too big for one session

The pack's `wayfinder` plans it as a map of tickets, one ticket per session
(BIG-1). `samara-next` follows the pack's hand-over skill, starts a session
with the hand-over as its prompt if a tool for that is present, and
otherwise prints the prompt `[untested E13]`. It is for owner-started
sessions only: a scheduled run cannot message or start a session. Terrarium
records no hand-over problem, so there is no command and no context
threshold.

## 8. Recurring automated work

Six sweeps ship. Each is a skill folder with a `sweep.yaml` (its safe
surface, its work caps and, for the visitor, its tasks) plus one schedule
the owner can change or delete. Deleting both removes the sweep (PRIN-11).

### 8.1 What sweeps share

A finding is written by a command, which makes the id and reads the commit
(REQ §11.1):

```json
{
  "id": "2026-11-13-visit-0007",
  "source": "visit",
  "session": "session_01...",
  "kind": "problem",
  "severity": "minor",
  "where": "/blog/hello-world",
  "what": "The footer link to the feed returns 404.",
  "evidence": "preview at phone size; link target /feed.xml",
  "commit": "3f2a9c1",
  "verified": true,
  "match": null,
  "proposal": null
}
```

`source` is watch, docs, visit or deps. `kind` is problem, idea or learning.
`severity` is for problems only: nit (seconds), minor (minutes), moderate
(rework inside the session), major (the owner had to step in or work was
lost), blocker (the session could not finish).

- **A session's problems stay in its log.** The improvement sweep reads logs
  and findings through one reader. Nothing stores a "taken" mark: an entry
  is taken once a cause lists it, or an improvement run row lists it as
  dropped (IMP-3).
- **The first step of every sweep is a script** that asks "anything new
  since my last run row?" and exits with a run row if not. A daily default
  then costs little on a quiet site, and no skill assumes a cadence.
- **"Possibly stopped"** is derived from the gaps between a sweep's earlier
  run rows (WAT-8).
- **A sweep bounds its work,** not its spend, and its run row records work
  against each cap (COST-3).
- **A sweep that cannot open its pull request** pushes the branch and says
  so in its run row.
- **Steering:** every sweep reads `docs/rulings.md` whole. A sweep's own
  notes live in `memory/<sweep>.md`, capped by the command that writes it
  (DOC-7).

### 8.2 Watcher (`samara-watch`)

- **Script checks, no agent:** a sweep that is possibly stopped; a pull
  request or commit naming a session with no log; a merge without a verdict;
  an issue a merged pull request named that is still open; a run row without
  cost; a sweep branch with no pull request (WAT-2, REC-16).
- **Agent checks** (owner's ruling): for platform skills whose text or runs
  changed since the last run, at most five skills a run *(guess)*. An agent
  reads the run against the skill text in effect when that run started and
  against the skill's `watch.md` (WAT-3).
- **It reports only news.** The agent is given the session's own log and
  writes a finding only for something the log does not already hold. Of 20
  old watcher notes checked, 16 repeated what the session had reported.
- **Rules:** every claim is checked against its source before it is written;
  an unfinished scan is reported as inconclusive, never zero (WAT-5, WAT-7).
- **Output:** findings only, at most twenty a run *(guess)*. It files no
  issues; the improvement sweep decides what becomes one.
- **Cost:** the old watcher was the most expensive job at about $12.66 a
  run. The caps and the news-only rule are meant to cut that; by how much is
  unknown.

### 8.3 Improvement sweep (`samara-improve`)

1. Collect every problem, idea, learning and finding not yet taken.
2. Dedupe once: against open and closed issues (listed in bounded pages and
   filtered locally, no search calls), decision records, rulings and causes
   the owner said no to (IMP-2).
3. File each entry under a cause, new or existing (IMP-1).
4. Route each cause that has three occurrences or one major *(guess)*:
   - a cause that came back after a fix goes to the owner as an issue naming
     that fix (PRIN-3);
   - a second prose fix for the same cause is not allowed; it files an issue;
   - "the owner said no" is a state of a cause, set by closing its issue
     with a label, and is never proposed again (PRIN-4, IMP-13);
   - a fix on its safe surface becomes one reviewed, verified pull request
     that prefers a deletion and removes as much as it adds (IMP-4);
   - anything on the protected list becomes an issue (IMP-5).
5. Ideas and learnings become issues labelled for triage (IMP-14).
6. Report once: every number with its source, every dropped entry with its
   reason (IMP-9).

Its safe surface is whatever is off the protected list and inside its
`sweep.yaml`: platform skills, `platform/docs/`, briefs, path-scoped rules.
Watch lists are not in it; a change to one becomes an issue. Bounds: five causes and three pull requests a run
*(guess)*. Most runs end in a short report and no change. No trial state is
kept.

### 8.4 Docs upkeep (`samara-docs`)

- **Scope:** `platform/guidance.md`, `docs/`, `platform/docs/`, skill texts,
  decision records and the guide, against the code and the records (DOC-1).
- **Each run** checks the docs touched by what merged since its last run,
  reports contradictions between docs, and reads one further area chosen
  from what earlier run rows say was read (DOC-6).
- **Every finding passes a separate checker** before it is applied (DOC-2).
  Terrarium's checker rejected about 59% of draft findings.
- **A change to a decision record** states what the record allows, forbids
  and excepts, before and after. Decision records are protected, so the
  owner merges it (DOC-4).
- **Rewrites for brevity are off** unless a ruling turns them on `[owner]`.
  They were most of the volume and the source of the one recorded harm.
- **A conflict no source settles** becomes an issue the sweep files (DOC-5).
- **The guide:** a page that cites code names the commit it was checked at,
  and `verify` fails when a cited excerpt no longer matches (DOC-8).
- A scheduled run never asks the owner for a focus (DOC-10).

### 8.5 Visitor (`samara-visit`)

- **Reports only;** its safe surface is empty (VIS-1). The old run built
  fixes and the owner reverted or reworked them at least 5 times.
- **Its first-step script exits** when no UI or content path changed since
  the last run.
- **Inputs:** the contract's `routes`; rulings, open issues, merged pull
  requests and recent findings, read before visiting (VIS-3, VIS-5).
- **Coverage** (pages, viewport, colour scheme, persona) goes in the run
  row; the least-covered comes next (VIS-4, VIS-9).
- **Personas:** three at first *(guess)*; tasks live in `sweep.yaml` and the
  owner edits them (VIS-6).
- **Each finding is verified** against the source and the rendered page; a
  repeat names its earlier item in `match` (VIS-2).
- **Bounds:** twelve pages and forty screenshots a run, fifteen images for
  any one screenshot-reading agent *(guess)* (VIS-7, DSP-8).

### 8.6 Digest (`samara-digest`)

1. A script finds finished UTC days with activity and no digest, and
   computes every number from logs, merge rows and GitHub, never from commit
   subjects (DIG-2, DIG-4).
2. The agent writes at most 250 words, for the owner.
3. A separate checker compares each sentence with the merged pull requests;
   a word such as "weekly" needs a source. This is the one part that cannot
   be cut: the check caught wrong claims in 12 of 13 drafts.
4. The writer lands `digests/<day>.md` once and refuses to overwrite it
   (DIG-3). No pull request, no code review. At most three missing days a
   run *(guess)*.

**The cost step lives here.** A run never reports its own cost (that failed
7 times). A sub-agent with the session tool reads the figure for finished
runs that lack one, a capped number per pass, and the writer stores it as
given with the four token counts beside it. There is no price table: one
came out 1.0 to 1.6 times above the tool's figure. The figure is labelled
"session cost, sub-agent share unknown", and a cost that cannot be read is
stored as "unreported" (COST-1, COST-2). If the digest is removed or its
schedule lacks the session tool, every cost shows as unreported
`[untested E7]`.

### 8.7 Dependency sweep (`samara-deps`)

- Dependabot opens one grouped pull request for minor and patch updates and
  one pull request per major update (VER-10).
- The sweep's first-step script lists open Dependabot pull requests and
  exits if there are none.
- For Dependabot's minor-and-patch pull request with verification green:
  the sweep posts a verdict and merges it under rule 3 of `merge`.
- `.github/dependabot.yml` defines what counts as minor and patch, so it is
  protected: widening its group would widen what the sweep merges.
- Major updates and new dependencies stay with the owner (AUT-5).
- It runs under `standard` and `hands-off`. Accepted risk (owner): a minor
  update of a package below version 1.0 can break.
- A green check does not vet a package's code; dependency build scripts stay
  off in the container.

### 8.8 Schedules and cost

- **Default: every sweep daily.** Setup asks for each; "off" is valid
  (SET-3, COST-7). Schedules live in the agent tool, not in the repo.
- **Reference figures** at list price per run in Terrarium: watcher $12.66,
  visitor $7.93, docs $6.13, improvement $4.08, digest $1.79. The forms
  above should cost less; by how much is unknown.
- Every figure shown is labelled a list-price estimate (COST-4). No hard
  budget cap is known for a scheduled run.

## 9. Observability: the owner app

The owner's requirement, in their words: "The journal is can contain any
code that turns the raw data into brows able content. Reading digests first,
session summaries to get an overview and only drill down as required with
accordion ui and tool tips. Friction ledger becomes readable and drill down
able, graphs for cost development over time".

- **Landing page:** digests first, then recent session summaries, then a
  compact row of number tiles, each naming the window it covers and linking
  to its detail page.
- **Drill-down by accordion and tooltips.** Digests and session cards open
  in place, one at a time, with the open item's anchor in the URL. A card's
  detail is fetched when it opens; the page never ships every log up front
  (Terrarium's landing page passed 10 MB).
- **Problem ledger:** causes as readable rows that open to their occurrences
  and fixes; most severe and most frequent; a "last N days" filter. Fix
  state is derived from occurrences after the latest fix.
- **Cost:** charts of cost over time per sweep, with a weekly table beneath.
  An unreported run is a gap, never filled in.
- **Session card:** summary, derived status, problems with severity,
  sub-agent token share, skills used, and a link to the agent session.
- **Further pages:** ideas and learnings with the issues they became;
  skills with use counts and open findings; sweeps with last run, coverage
  and "possibly stopped"; the guide; the live commit and build time of the
  site and of the app.
- **Works on a phone and in dark mode** by the system setting; text pages
  are a centred column of about 82 characters. The app's own browser test
  asserts both, and asserts something a chart draws.
- **Not built unless asked:** explainer pages, feeds, a "worst problems"
  panel, a tile for pull request counts, graded importance.

**Where the data is read from.** Every view is a query over the records
through the bounded reader, so a new record shows with no page edit and no
build. On a container the deploy keeps a clone and fetches the `records`
ref each tick; on a host with no disk the reader asks GitHub with a
read-only token and a short cache `[untested E8]`. Grouping and trends are
computed when a page is read; nothing derived is written back.

**Access.** Authentication is not the app's concern (owner's ruling). The
check sits in front of the app, in the proxy or the host's own access
feature; which one is left open `[owner]`. The app carries no access code.
On a laptop it runs through `preview` with no check.

**Two limits hold whatever the stack:** reads stay bounded, and the app's
code and checks can never fail a site change.

## 10. Mixed files and sync

| File | Approach |
|---|---|
| `CLAUDE.md` | Site. It imports `platform/guidance.md`, `platform/glossary.md` and `GLOSSARY.md`; sync never edits it (REQ §8.1). |
| `.claude/settings.json` | The only mixed file. Sync owns the `hooks` key and a named list of `permissions.deny` entries, both copied from `platform/settings.json`. `verify` checks the file contains them; everything else is the site's. |
| `package.json` | Seed, not mixed. The tool and the owner app are workspace packages with their own manifests; the root keeps one script entry (SYNC-8). |
| `pnpm-lock.yaml` | Site. After a take changes platform dependencies, sync refreshes it in the same pull request. |
| `skills-lock.json` | Platform. A site's extra skills are listed in `site.yml`, and sync keeps those entries (REPO-5). |
| `platform/protected-paths.txt` | Platform. A site adds its own paths in `site.yml`. |
| workflow file | Platform, never applied by a cloud session. Sync writes it to `docs/by-hand/`; `verify` fails while the base's workflow differs from the expected copy, so a change that needs it stays red until a person applies it (VER-9, SYNC-6). |
| `guide/` | Platform chapters are listed by file; chapters the site adds are the site's. |

**Taking updates** (`sync take`, SYNC-2):

- fetch the template at the commit in `site.yml` and at its latest
  `[untested E9]`;
- apply the template's changes to the paths in `platform/paths.txt`,
  three-way where the site changed a file;
- write the new commit to `site.yml` in the same pull request, so a partial
  take fails `verify`;
- open one pull request; it touches protected paths, so the owner merges it.

**Offering changes** (`sync offer`, SYNC-3, SYNC-5):

- select only paths in `platform/paths.txt` that differ from the template
  at the recorded commit; refuse anything else (REPO-3);
- put the change on a branch of the template or of a fork and open an
  ordinary pull request there; the template's automation builds a fresh site
  from it and runs `verify`;
- write a patch file to `docs/by-hand/` only when neither is attached.

Only the trigger is manual (SYNC-4). Sync is the newest and least-tested
part; it is tested in the template's automation, not on a pilot site
(experiment 9).

## 11. Autonomy

One value in `site.yml`, read by `merge` from `main`, says who may merge.
Every preset keeps the verdict, the pinned head and green checks (AUT-2).

| Preset | Sessions merge | Sweeps merge | Added to the protected list |
|---|---|---|---|
| `review-all` | nothing | nothing | none |
| `standard` (default) | changes outside the list | changes inside their `sweep.yaml` surface | the UI paths `site.yml` names |
| `hands-off` | changes outside the list | the same | none |

**The protected list** (one list, read from `main`; AUT-4):

- the `merge` command, the list itself and `site.yml`;
- hooks and tool settings; `skills-lock.json`; the agent definitions; each
  sweep's `sweep.yaml`; each skill's `watch.md`; `.github/dependabot.yml`;
- the workflow file and its action; the verification step list;
- deploy files; server routes; dependency entries (except rule 3 of
  `merge`);
- the owner's rulings; decision records.

Off the list until a problem is recorded: path-scoped rules, the content
schema, the framework config. Terrarium records 24 notes where a fix was
dropped because its file was protected, and no incident for these three.

- **UI under `standard`:** `ship` has linked the screenshots; the owner
  merges after looking. This answers "visual work published unseen" (3); it
  does not prevent UI built before the owner decided (section 14.3).
- **Sweep or session:** `merge` reads the `entrypoint` field in the
  transcript; the sweep is the first turn's slash command; unreadable
  refuses `[untested E7]`.
- **Direct merges** are denied by one settings line, which also denies the
  two GitHub tools that create commits directly `[untested E2]`. If the line
  is not honoured, only the ruleset remains: a direct merge then needs green
  checks but no verdict and no protected-path test. That risk is accepted
  under a shared account and removed by a separate agent identity.
- **A waiver** is the owner's word in the session, quoted in the merge row;
  it lifts only the protected-path refusal (MRG-8).

## 12. Identity, setup and deploy

**Identity** (ID-6):

- **Shared account (default).** Agents act as the owner. The session mark
  tells an agent's post from the owner's, and the merge rules live in
  `merge` because GitHub cannot tell the two apart (ENV-8).
- **Separate account (option).** GitHub can then require the owner's review
  on protected paths `[untested E12]`.
- **GitHub App.** Possible only if its token is minted outside the session;
  not planned.

**Setup,** run by `samara-setup` in a single-repo cloud session or on a
laptop (SET-1 to SET-11):

1. Print the by-hand steps as one runnable checklist, before anything else.
2. Ask: preset, each sweep's schedule, whether the owner app is deployed,
   which framework the site uses (keep the seed or replace it), deploy
   recipe, identity. Whether the repository is public or private is the
   repo owner's own business; the platform does not ask and does not depend
   on it.
3. Write `site.yml`.
4. Install the pack and pin it in one step; run the pack's setup skill.
5. Create the `records` branch, the empty rulings file and the guide's
   platform chapters `[untested E1]`.
6. Wait for the owner to confirm the ruleset on `main`, with verification
   required, before the first agent pull request. Read labels back.
7. Run `verify`; `ship` the hello-world site and merge it under the preset.
8. Create the sweep schedules; check the digest's schedule has the session
   tool.
9. Deploy the site and the owner app; read `/version` from outside.
10. Warn that the agent tool's own classifier can still refuse a merge the
    owner allowed.

By-hand steps (ENV-11): the workflow file; the ruleset and repository
settings; the five issue labels; the deploy host, its secrets and the access
check in front of the owner app; the cloud environment's setup script and
network access; a separate account, if wanted.

**Deploy** (DEP-1 to DEP-5). Two recipes ship in `deploy/`; setup deletes
the unused one.

- **Self-updating container (default for the owner's sites).** One state
  variable, the last commit that built and went live. Each tick: if `main`
  differs from it, install and build in a full second checkout; on success
  swap directories, run `serve` in the live one and record the commit; on
  failure change nothing, so the next tick tries again. A dead server is
  restarted from the last good build. Cost: two checkouts with installed
  packages on disk, or a shared package store; build memory must be provided
  (the old site's build peaked near 2.1 GB).
- **Managed host (alternative).** Atomic deploys and no server to run; its
  framework-specific parts belong to the site, the owner app needs a token
  to read records, and it is untested end to end.
- **Either way:** a merge is a deploy; the pull credential reaches git only
  through an askpass script reading the environment; `/version` always
  answers, and a visible build stamp is on the home page only by default;
  a change under `deploy/` is a by-hand step.
- **The owner app** is built and served the same way at its own address.

## 13. Experiments before building

1. **Records.** Create the `records` branch at setup from a cloud session
   and read it through the fetched ref. Pushing to an existing second branch
   is proven. Also: a cloud session is pinned to one branch, so how serial
   steering pushes one branch per pull request. Sections 3, 7.2, 12.
2. **Deny line.** Is a `permissions.deny` entry honoured in a single-repo
   cloud session? Section 11.
3. **GitHub helper.** A script opens a pull request, posts a verdict and
   merges, from a cloud session and from a scheduled run. Section 5.1.
4. **One install for three packages. This one carries the design.** A root
   install serves the site, the tool and the owner app; the tool's binaries
   are where hooks call them, in a fresh worktree too; build memory for two
   apps. Sections 3, 4.1.
5. **Stack.** The owner app on Astro, built far enough to show a digest
   list, one session card opening in place and one cost chart, counting the
   lines the platform had to write itself; a record holding markup comes out
   as text. For the seed: a content file that breaks its schema fails the
   seed's `check`, naming the file and the field. Sections 4.1, 4.3.
6. **Verification in automation.** Does one step's summary and annotation
   name the failing check clearly; does the comment on green wake a session?
   Section 5.
7. **Cost and transcript.** Which scheduled runs have the session tool;
   whether its figure includes sub-agents; the `entrypoint` field on a
   laptop scheduled run; whether a compacted or resumed session keeps one
   transcript with right timings; the session id inside a sub-agent.
   Sections 5.1, 8.6, 11.
8. **Owner app.** Reading records at request time on a container and on a
   managed host; the access check in front of the app; the deploy loop
   swapping whole checkouts for two apps. Sections 9, 12.
9. **Sync.** In the template's automation: a site from an older template
   tag, one platform file edited, take and offer; a site that replaced the
   seed with another framework still takes an update; fetching the template
   without attaching it. Section 10.
10. **Agent definitions.** Does a sub-agent honour a tool list from a repo
    file in a cloud session? Section 7.2.
11. **Screenshots.** Does a link to an image on the `records` branch render
    for the owner on a private repo? Section 5.
12. **Identity.** A separate account's token in a cloud session. Section 12.
13. **Starting a session from a session** with a hand-over as its prompt.
    Section 7.3.
14. **Dependabot.** How `merge` can tell Dependabot's minor-and-patch pull
    request from any other, reliably, and whether verification runs on a
    Dependabot pull request with what it needs. Sections 5.2, 8.7.

**Least evidence.** After sync, the owner app and the seed's server pieces
have the least behind them: Terrarium has no server route, no
access-controlled page, no second app and no separate deploy.

## 14. What is still open

### 14.1 For the owner

1. **Names.** "Samara" as the final name; every row in section 2 and
   section 7 that shows two options; the preset names.
2. **The access check in front of the owner app:** the proxy's or the
   host's. Left open at the owner's request.
3. **Docs sweep:** rewrites for brevity off by default.
4. **Watch lists:** who writes a skill's first list (the skill's author, by
   default), and whether five items is the right cap.
5. **Every number marked a guess:** the caps in section 8, the improvement
   threshold, three personas.
6. **Does the template repo run the platform itself,** and who reviews an
   offered change?
7. **How long records are kept.** Logs and findings only grow; no retention
   is proposed.
8. **Agent identity:** shared account, or a separate one.
9. **What browser-side navigation is for** (WEB-2). The requirements say
   speed; Terrarium's decision record says in-page state and view
   transitions should survive navigation. It is now a path a site chooses.
10. **Where the build stamp shows:** the home page only by default.
11. **Laptop sessions waiting for green:** poll in the background (default),
    or hand back to the owner.
12. **May the owner app compute views of its own** from the records?
    Default: yes, when a page is read.
13. **Managed host:** whether its recipe ships in the first version at all,
    given it is untested.
14. **The departures in 14.2.**
15. **May a sub-agent run `log`?** The decisions file says never: it shares
    its parent's session id, so it would write into its parent's log.
16. **Must the comment on green name the pull request's head commit?** In
    Terrarium it once named the merge commit instead (3 problems).
17. **A merge is code execution on the server,** because the container
    builds what was merged. Is the protected list enough, or does the deploy
    need a rule of its own?
18. **The watcher files no issues.** WAT-6 asks it to file one when a
    finding is significant or repeated; here the improvement sweep decides.
    Keep that, or let the watcher file?

### 14.2 Departures from the requirements as worded (all to be confirmed)

| Requirement | Departure | Reason |
|---|---|---|
| WM-2 (review, then verification, then push) | No order is stated; a verdict on the head at merge is the one enforced fact. | 21 slips, seven prose fixes, then accepted by the owner. |
| REC-1 (every substantive session lands a record unasked) | Forced only for sessions that `ship`; others rest on one guidance line and a watcher check. | The forcing machinery caused 31 problems. |
| REC-17 (reminders) | None. | Same. |
| MRG-7 (close issues GitHub left open, with a retry) | A watcher script check reports them. | One incident. |
| REPO-2 (path list and template version in one file) | The version is in `site.yml`. | A platform file must not hold site state. |
| CON-1 to CON-4, VER-5 (the platform checks content) | The site's `check` does; the seed's meets them; the platform ships only the data-format helper. | The owner: each site maintains its own. |
| WEB-2, WEB-7 (opt-in browser-side navigation; little client code) | The seed's starting state, not platform rules. | The owner: the site opts in or out as it requires. |
| REQ §13.4 (the seed shows every extension point) | A minimum hello world with one content file; the rest is a documented path. | The owner's "minimum hello world". |
| OBS (dashboard inside the site) | A second app under `platform/`. | The owner: sync and access. |
| VER-6 (no skipping by changed path) | The owner app's own check runs only when its folder changes. | The two apps share nothing. |
| VER-4 (summary names the failing step) | Conditional on experiment 6. | One step is otherwise what VER-4 rules out. |
| PRIN-5 (guards fail closed) | The commit-message hook fails open; `verify` checks trailers. | A fail-closed trailer hook that cannot run stops every commit. |
| ID-1, ID-3 (every write path refused without a mark) | Only the direct write tools are guarded. | The shell half of the old guard had no recorded catch. |
| DEP-3 (version in the footer) | `/version` always; a visible stamp on the home page only. | The owner corrected a stamp on every page. |
| COST-5 (each sweep's first step records costs) | One sweep, the digest, has the cost step. | The session tool is not reliably present in scheduled runs. |
| VIS-6 (four personas) | Three at first. | A guess; cost. |
| BIG-2 (one command to hand over) | A three-line skill. | No recorded hand-over problem. |
| BIG-3 (hand over before context fills) | One guidance line; no threshold. | A session cannot read its own context use. |
| IMP-11 (trials) | No trial state; "prefer a deletion" is a rule of the sweep. | No mechanism without a recorded need. |
| ST-*, DSP-* (parallel steering) | Serial first; the design allows parallel later. | Every parallel-only problem disappears. |
| REQ §11 (five sweeps) | Six: a dependency sweep is added. | The owner asked for it. |

### 14.3 Known unsolved

No cheap check is known for these; each is one guidance line at most.

- Facts stated from memory (36) and sub-agent claims relayed unchecked (24).
- UI built before the owner decided (6, three prose fixes failed) and design
  settled without asking (7). The UI rule only gives the owner a veto after
  the work.
- The owner's answer misread (16).
- Problems after `ship` missing from the log; `merge` only invites them.
- Brief defects (13, through six fixes).
- A dependency update that changes output without failing a check: two of
  six recorded upgrade breaks. The dependency sweep makes this more likely
  to pass unseen.

### 14.4 Caveats lines

Each is one line in `platform/docs/caveats.md`; none has a check.

- After a merge, push plainly; never amend or force a pushed commit.
- Commands and briefs use absolute paths; a bare `cd` moved the working
  directory 12 times.
- One state-changing git command per call (a chained step failed unseen 7
  times).
- Read another branch's file with `git show`, not a checkout.
- Pass a commit message from a file, never inline.
- Check that a revision resolves before reading history from it.
- No rule depends on verified commit signatures.
- A screenshot cannot confirm a colour; read the computed style. Narrow
  fallback fonts in the test browser hide overflow.
- Check dark mode on the built site, not the development server.
- A browser test waits for the state it needs, never for time. "Keep the
  clicked row in place while it opens" needs its own test.
- If a site adds a page cache, it varies on every request input and has a
  size bound (WEB-4).
- A site's reference check is best kept generic: an id in one file must
  exist in another.
- No site-wide check for broken links or missing images ships, and no
  accessibility checker; a site may add either as a test.
- More than two full verifications at once in one container died of memory.
- The container's git is older than automation's.
- State made only in the session (a scheduled job, a background sub-agent,
  a scratch file) can vanish across a resume.
- Repository settings such as rulesets cannot be written from a cloud
  session.
- Diagrams and inlined graphics are not in the first version.
