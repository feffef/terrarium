# Design draft: an agent-run platform for single-site content websites

**Status:** a proposal by the writing agent. It decides nothing. It is one of
two drafts to be compared before anything is built.

**Source.** This draft answers the requirements document
(`05-platform-requirements-neutral.md`). "REQ §n" cites a section of it; ids such
as VER-2 or ENV-5 cite single requirements and constraints. Each choice names
the requirement it meets and states its reason in place, so the draft reads on
its own. Nothing is known about any earlier system, by intent; where the
requested shape asks what a part "replaces", this draft says what it wraps or
which requirement it answers.

**Untested facts.** A choice that rests on a fact nobody has tested carries the
tag `[experiment En]` inline. Section 13 collects every tagged item. Numbers
(caps, budgets, cadences) are proposals; section 14 revisits them.

**Assumed tooling (confirmed by the owner):** Claude Code as the agent tool, in
the web interface and on a laptop; GitHub as source host; GitHub Actions as the
automation service; `mattpocock/skills` as the skill pack.

## 1. Design principles

1. **One command line tool holds every guarantee.** Skills say when to act;
   the `site` tool refuses what must not happen. A refusal holds better than
   an instruction line and works the same on a laptop, in a remote session and
   in automation (PRIN-1, PRIN-6).
2. **Hooks are few, and only two can refuse.** Guards became a top source of
   problems before (PRIN-2, GUIDE-2). Everything else is a command that an
   agent runs on purpose, or a reminder that fires once.
3. **Records live beside the site, never in it.** A record write must not
   rebuild, redeploy or meet a content schema (REC-11), so records sit on
   their own branch and every view is a query over them (PRIN-8, REC-13).
4. **The machine writes facts, the agent writes judgement.** Ids, commit ids,
   timings and tokens come from commands and the transcript; the agent never
   types one (PRIN-7, ID-2, MRG-2).
5. **Plain files in the repository, no plugins.** Skills, hooks and settings
   are committed files, because plugins may not load in remote sessions
   (REQ §4). Pack skills are copied in and pinned (PACK-1).
6. **Wrap the pack, never rewrite it.** A platform skill calls a pack skill by
   name and adds one step. Differences live in repository documents the pack
   reads (PACK-2, PACK-3, BIG-5).
7. **A sweep is a folder and a schedule.** Deleting both leaves everything
   else passing. Sweeps share one record shape and nothing else (PRIN-11).
8. **Every part names its reason.** A command, hook, skill or record field
   without a requirement id is cut (REQ §1.1 point 5, REQ §6.2).

## 2. Concepts

Terms are plain lowercase words, written the same everywhere. A term ships
only if an agent must act on it (GUIDE-1).

| Term | Meaning |
|---|---|
| owner | The person who steers the site and merges what agents may not. |
| site | This repository: one website and its content. |
| platform | The files the template owns and updates: instructions, skills, hooks, the `site` tool. |
| session | One agent conversation working on the site. |
| session log | The record a session leaves: its judgement plus machine facts. |
| finding | One problem, idea or learning handed to the improvement sweep, with evidence. |
| cause | The root cause behind one or more findings, with its fixes. |
| sweep | A skill run on a schedule or by hand that looks after the site or the platform. |
| check | The fixed set of steps a change must pass before it may merge. |
| verdict | The posted outcome of a review, naming the exact commit reviewed. |
| protected path | A file or folder whose changes only the owner may merge. |
| preset | The one setting that says who may merge. |
| ruling | A standing owner instruction every sweep obeys. |
| by-hand step | A change only the owner or a laptop session can apply. |
| hand-over | The note one session writes so the next can continue. |

**Rationale (not shipped).**

- "check" stands for "verification": it is the word on the command and on the
  host's status line, so one word covers all three.
- "by-hand step" stands for "drop zone": it names what the owner does, not
  where the file lies.
- "preset" drops "autonomy": only one preset exists, so the short word is safe.
- "session log" and "finding" are kept as the requirements give them; both
  are things an agent writes by command.
- The site's own domain words go in the root `GLOSSARY.md`, which the pack's
  domain skills already read. The platform glossary is a separate file, so
  sync never edits a file the site writes (REQ §8.1).

**Requirement terms that do not ship**, because no agent acts on the word
itself: record, run row, merge row, taken mark, head, safe surface, memory
file, trial, persona, preview, map, ticket, waiver, seed, stranger. Each is
still a field or a file below; the skill that needs it explains it in place.
"map" and "ticket" belong to the pack's `wayfinder` skill.

## 3. Repo shape

```
.
├── CLAUDE.md                  # seed: imports platform/instructions.md, both glossaries; site part below
├── GLOSSARY.md                # site: domain words (pack convention)
├── site.config.yaml           # site: preset, sweep cadences, deploy target, models per role
├── package.json               # seed: site stack; one script entry "site"
├── pnpm-workspace.yaml        # seed: makes platform/ a workspace package
├── pnpm-lock.yaml             # site: frozen everywhere (VER-10)
├── renovate.json              # seed: grouped dependency updates
├── astro.config.ts            # seed
├── src/
│   ├── content/               # site: prose (.mdx) and data (.yaml)
│   ├── content.config.ts      # seed: typed schemas (CON-1)
│   ├── components/            # seed: one example component used in content
│   ├── pages/                 # seed: hello page, one on-demand page
│   ├── pages/api/             # seed: the named place for server routes (WEB-3); protected
│   ├── pages/owner/           # platform: dashboard pages, behind access control
│   ├── pages/version.json.ts  # platform: live version and build time (DEP-3)
│   └── styles/tokens.css      # seed: design tokens as CSS custom properties
├── tests/                     # site: unit tests and site content rules (CON-6)
├── tests/smoke.spec.ts        # seed: loads every page, fails on a console error
├── platform/
│   ├── manifest.yaml          # the one list of platform paths + template version (REPO-2)
│   ├── instructions.md        # always-loaded platform text, under 40 lines (GUIDE-1)
│   ├── glossary.md            # section 2
│   ├── protected.txt          # platform's protected paths
│   ├── settings.json          # platform half of the tool settings
│   ├── package.json           # platform dependencies (SYNC-8)
│   ├── bin/site.ts            # the `site` tool entry
│   ├── lib/                   # shared helpers (section 5)
│   ├── check/                 # check steps and lint rules
│   ├── hooks/                 # five hook scripts, each with a test
│   └── docs/                  # how-tos: git and change requests, issues and labels,
│                              #   environment caveats, adding a hook, writing standard
├── site/
│   ├── protected.txt          # site's own protected paths (REPO-5)
│   ├── settings.json          # site half of the tool settings (optional)
│   └── rulings.md             # owner rulings; starts empty; protected
├── .claude/
│   ├── settings.json          # generated from the two halves; check fails on drift
│   ├── skills/<platform>/     # platform skills, listed in the manifest
│   ├── skills/<pack>/         # pack skills, copied in, pinned in skills.lock
│   ├── skills.lock            # site: one content hash per installed skill (PACK-1)
│   └── rules/                 # hand-written path-scoped rules (GUIDE-3)
├── docs/
│   ├── adr/                   # decision records (pack convention); protected
│   ├── agents/                # written by the pack's setup skill; site-owned (PACK-3)
│   └── guide/                 # platform chapters from the template, site chapters later
├── by-hand/                   # by-hand steps: files plus a runnable checklist (VER-9)
├── deploy/                    # seed: the recipe picked at setup
└── .github/workflows/check.yml  # platform; minimal; never pushed from a remote session
```

Branch `records` (no shared history with `main`, checked out at `.records/`):

```
sessions/<yyyy-mm>/<start-utc>-<session-id>.yaml   # one per session
findings/<yyyy-mm>/<finding-id>.yaml               # one per finding
causes/<slug>.yaml                                 # written by the improvement sweep only
runs/<yyyy-mm>.jsonl                               # run rows and merge rows, append-only
digests/<yyyy-mm-dd>.md                            # written once
memory/<sweep>.md                                  # size-capped
```

Kinds of file (REPO-1):

- **platform:** every path in `platform/manifest.yaml`: `platform/**`, the
  platform skills and rules under `.claude/`, `src/pages/owner/**`,
  `src/pages/version.json.ts`, the platform chapters in `docs/guide/`, the
  five shipped records in `docs/adr/`, and the workflow file.
- **seed:** marked "seed" above. The template gives it once; sync never
  touches it again.
- **site:** everything else, and the whole `records` branch.
- A path is platform if and only if the manifest lists it. A check step fails
  on a manifest entry that does not exist.

## 4. Stack

**Proposal:** Astro with typed content collections and MDX, the Node adapter,
TypeScript, pnpm, Vitest and Playwright.

- Content schemas are typed and a schema violation fails the build with file
  and line (CON-1, CON-5).
- Pages are prerendered by default; a page or route opts into on-demand
  rendering with one line (WEB-1, WEB-3).
- Content pages ship no client code unless a component asks for it (WEB-7).
- Browser-side navigation is one component in the layout, switched by a value
  in `site.config.yaml` (WEB-2).
- Middleware gates `src/pages/owner/`, and owner pages are on-demand, so no
  build artefact carries owner-only content (WEB-5).
- The Node adapter runs unchanged in a container and has managed-host
  equivalents (section 12, DEP-*).
- Platform scripts are TypeScript run directly by a pinned Node with no build
  step, so the tool works before the site builds (LIFE-2).
- Playwright serves the smoke test and the screenshots, so one browser tool
  is pinned (UI-*).

Caveats:

- The fast content check must load the same schemas outside a build. This
  works if schemas sit in a plain module both sides import `[experiment E6]`.
- References between content files are not proven to fail the build, so the
  platform ships its own reference check (CON-4) `[experiment E6]`.
- The remote environment has its own browser; the pinned Playwright version
  must match it or name its path (ENV-11). This starts as a line in the
  caveats document (REQ §14).

## 5. Commands

All commands are subcommands of one tool, run as `pnpm site <command>`.

| Command | What it does | Meets |
|---|---|---|
| `site check` | Runs the check steps in order from one list: dependency freshness, lint (code, prose, data), types, content, unit tests, build, smoke, then platform checks (commit trailers, skill hashes, generated settings, manifest, guide excerpts). Records head and tree at the start and fails if either moved by the end. Refuses on a shallow checkout. `--fast` runs the seconds-long subset: schemas, data-format traps, references, skill-name clashes. In automation it writes one summary line per step and, on green, posts a comment naming the commit. | VER-1 to VER-7, CON-1 to CON-4, CON-7, PACK-1, REPO-4, LIFE-3 |
| `site shot` | Builds for production, starts the server as its own child process on a free port, waits for the real page to be interactive, captures light and dark at desktop and phone size in one run, then stops the child by process id. Writes into the caller's own scratch folder. | UI-1 to UI-7, DSP-9 |
| `site log` | Writes records. `finding` creates one finding with a made id. `close` lands the session log: authored half from flags, machine half from the transcript and git; a second close replaces the machine half and merges the authored half. `run` appends a run row. `cost` fills cost for finished runs that lack it. `audit` runs the watcher's mechanical checks. Every write pushes to `records` at once, rebases and retries on a lost race, and fails loudly. | REC-1 to REC-13, COST-1, COST-5, WAT-2 |
| `site land` | `verdict` posts a review verdict naming the commit read from git. `merge` refuses unless the check passed on that commit and a verdict names it; reads preset and protected paths from the default branch, follows renames, and refuses if either is unreadable; merges pinned to that commit; confirms with the host before saying "merged"; closes issues the host left open, never one labelled for a human; appends a merge row. `--wait` waits for green in the background. `--waiver "<quote>"` lifts only the protected-path refusal and is quoted in the row. | MRG-1 to MRG-11, AUT-2, AUT-3 |
| `site sync` | `take` applies the template's changes to manifest paths since the recorded version, three-way where the site changed a file, and records the new version in the same change. `offer` selects by the manifest allow-list, refuses anything outside it, and opens a change on the template or writes a patch file. Workflow changes go to `by-hand/` in both directions. Runs its own checks. | SYNC-1 to SYNC-8, REPO-3 |
| `site next` | Starts the next session with a hand-over file as its prompt. Where it cannot start a session, prints the prompt. | BIG-2 |

**Shared helpers** (`platform/lib/`): the session id reader (from the
environment the start hook set, never from an argument); the host client,
which adds the session mark to every post (ID-1); the records writer; the
protected-path reader; the closing-keyword parser (MRG-6). Each is used by
more than one command and has unit tests.

**How a new rule gets enforced.** A mechanical rule becomes a lint rule or a
step in the check list, in the change that states the rule (PRIN-1). A rule
about an action becomes a refusal in the command that performs the action. A
judgement call becomes one line in `platform/instructions.md` or a skill. A
hook is the last resort and must name what it replaces (PRIN-2).

## 6. Hooks

Each hook is one script in `platform/hooks/` with a test and a documented
failure mode. `platform/docs/adding-a-hook.md` is the one page (PRIN-5).

1. **Session start: fails open, loud.** Installs from the frozen lockfile,
   fetches full history if shallow, checks out `records` at `.records/`,
   exports the session id for commands, sets the git hooks path, prints what
   loaded and what failed (LIFE-1, LIFE-2, ENV-4, ENV-14).
2. **Commit message (a git hook): fails closed.** Adds the session trailer to
   every commit. The check verifies trailers again (ID-4).
3. **Before a host write: fails closed.** Refuses a post to the host (tool
   call, `gh`, raw HTTP) that lacks the session mark, and prints the exact
   line to paste. Refuses a merge that does not go through `site land`
   (ID-1 to ID-3, MRG-3). Settings also deny the direct merge commands.
4. **Before a push (a git hook): fails closed.** Refuses a push from a remote
   session that changes a workflow file and points to `by-hand/`, because
   such a push strands every commit in it (ENV-2, SYNC-6).
5. **On stop: fails open.** At most one reminder per event, never mid-run: a
   change request opened without a subscription, a merge with no log refresh
   after it, a refused record, an unpushed branch (REC-17, WM-6, DSP-6). At
   session end it runs `site log close` for the machine half, so a session
   never leaves no record at all (REC-1, REC-16).

Deliberately not built (GUIDE-2):

- a guard that denies a first tool call until a document is read;
- a reminder that interrupts mid-run;
- hints that point to a document after each edit;
- generated rules that mirror decision records, and tracking of which rules
  or documents a session loaded.

## 7. Skills

**Naming.** A platform skill's name is a plain verb phrase and each
description starts with a leading word and one trigger per case (PRIN-10).
Sweeps start with `sweep-`. A check step fails when a platform skill name
equals a pack skill name or a glossary term (REPO-4).

| Skill | Purpose | Wraps, and why it exists |
|---|---|---|
| `setup-site` | The one guided setup session (section 12). | Wraps `setup-matt-pocock-skills` and `wizard` for by-hand steps. UC-1, SET-*. |
| `make-change` | One change from ask to merge: question, build, review, check, screenshots, change request, land, log. | Wraps `grilling`, `tdd`, `code-review`, `pr`; adds the order in WM-2 and the `site` calls. UC-2. |
| `clear-backlog` | Triage every open issue, ask the owner once, then build what was approved. | Wraps `triage`; adds the fixed result schema, the single question round and the cost line. UC-3, ST-*. |
| `next-session` | Hand over before context fills and start the next session. | Wraps `handoff`; adds `site next`. BIG-2 to BIG-4. |
| `sync-template` | Take template updates or offer platform changes. | No pack skill; drives `site sync`. UC-8. |
| `update-pack` | Update pack skills, list changed, renamed and deleted ones, re-read every adapting document, re-pin. | No pack skill. PACK-4, PACK-5. |
| `sweep-watch` | Catch what sessions did not notice about themselves. | Section 8.2. WAT-*. |
| `sweep-improve` | Turn every finding into a fix or an issue. | Wraps `retro` for one session. Section 8.3. IMP-*. |
| `sweep-docs` | Keep instructions, decision records and the guide true. | Wraps `writing-for-agents` for rewrites. Section 8.4. DOC-*. |
| `sweep-visit` | Browse the site as a user and report. | Section 8.5. VIS-*. |
| `sweep-digest` | Write the owner's summary of each finished day. | Section 8.6. DIG-*. |

**Pack skills shipped by default** (copied into `.claude/skills/`, pinned):
`setup-matt-pocock-skills`, `grilling`, `grill-with-docs`, `code-review`,
`tdd`, `diagnosing-bugs`, `domain-modeling`, `triage`, `to-spec`,
`to-tickets`, `implement`, `pr`, `prototype`, `research`, `wizard`,
`writing-for-agents`, `retro`, `wayfinder`, `handoff`.

**Optional:** `grill-me`, `codebase-design`, `improve-codebase-architecture`,
`to-questionnaire`. Nothing from the pack's `in-progress` or `misc` folders
ships. The dashboard counts skill use; a default skill with no use after a
proposed 60 days becomes a finding to remove it (PACK-6).

### 7.1 How platform skills relate to pack skills

- A platform skill names the pack skill to run, then lists its own added
  steps. It never restates the pack skill's steps (PACK-2, BIG-5).
- What differs for this platform lives in `docs/agents/`, written by the
  pack's setup skill: the issue tracker, the five triage labels, the domain
  document layout, and the rule that only `triage` sets the "ready for an
  agent" label (SET-6, WM-7, PACK-3).
- Installed skills are never edited. `site check` compares each skill folder
  with `.claude/skills.lock` and fails on a changed or unrecorded skill
  (PACK-1). Whether the pack installer's own lock can serve is untested
  `[experiment E7]`.

### 7.2 Work too big for one session

The pack's `wayfinder` plans the work as a map of tickets on the issue
tracker; each ticket is done in its own session (BIG-1). `next-session` runs
`handoff`, which names the map, the ticket claimed and the skills to load and
points to issues and branches, then calls `site next` (BIG-4). The skill tells
the session to hand over at a proposed 60% of context; how a session reads
its own context use is untested `[experiment E5]` (BIG-3).

## 8. Recurring automated work

Each sweep is a skill folder holding `SKILL.md` and `sweep.yaml` (its safe
surface, caps and default cadence), plus one scheduled run whose prompt is the
skill's name. Removing both removes the sweep (PRIN-11).

### 8.1 One record shape

Sessions and sweeps hand work on only as findings, written by
`site log finding`, never typed (REQ §11.1).

```yaml
id: f-20261113-7k2q        # made by the command
source: session            # session | watcher | docs | visitor | retro
kind: problem              # problem | idea | learning
where: src/pages/about.astro   # route, file or skill
what: "footer link 'feeds' returns 404"   # quotes the thing itself
evidence: "site shot about, phone-dark.png"  # command, measurement, screenshot or source line
commit: 4f1c9e2            # commit seen, read from git
verified: true             # checked against the source this turn
severity: minor            # problems only: nit | minor | major | blocker
session: <session id>      # from the environment, never typed
cause: null                # set later by the improvement sweep
taken_by: null             # the improvement run that consumed it
match: null                # optional: earlier finding it repeats
proposal: null             # optional: suggested fix
```

Run rows and merge rows are lines in `runs/<yyyy-mm>.jsonl`: time, sweep or
merge, session, work done against each cap, coverage, cost or "unreported".

### 8.2 Watcher

- **Inputs:** records since its last run row, the host's change and issue
  states, skill hashes.
- **Mechanical step** (`site log audit`, no agent): a merged change whose
  session has no log; a log listing a change the host says is closed; a merge
  with no verdict; a sweep with no run row in two cadences; skill drift; runs
  without cost; memory file sizes (WAT-2, REC-16).
- **Agent step:** only for skills whose text or runs changed since the last
  run, capped at a proposed 3 skills per run. Each run is graded against the
  skill text at that run's start commit (WAT-3).
- **Rules:** every state it writes is read back from the host; every
  sub-agent finding is checked against its source; an unfinished scan is
  reported as inconclusive, never zero (WAT-4, WAT-5, WAT-7).
- **Outputs:** findings; an issue only for a major or repeated finding; a
  comment on an open thread, a new linked issue if that thread is closed
  (WAT-6). A sweep that may have stopped is reported as an observation
  (WAT-8).
- **Budget:** proposed 10 findings and 2 issues per run (WAT-9).

### 8.3 Improvement sweep

1. Record costs for finished runs (COST-5). Read findings with no `taken_by`
   since the last run row minus one day (IMP-3).
2. Dedupe each finding once against open and closed issues, decision records,
   rulings, accepted causes and open trials. A title match is a hint only
   (IMP-2).
3. Attach each finding to a cause in `causes/`, or create one. A cause holds
   its fixes; whether a fix worked is derived from later findings (IMP-1).
4. Route. Proposed: a cause with two occurrences, or one at major or above,
   gets a fix. A cause that came back after its fix goes to the owner naming
   that fix. An accepted cause is never raised again (IMP-6, IMP-12, PRIN-3,
   PRIN-4). Only the owner marks a cause accepted, by label (IMP-13).
5. Fix only on its safe surface: platform skills, `platform/docs/`, lint
   rules. Prefer a deletion; a fix removes as much as it adds. Installed
   skills, decision records, hooks and settings become issues (IMP-4, IMP-5).
6. Ideas and learnings become issues labelled for triage (IMP-14).
7. Mark each finding taken. Write one report: every number sourced or marked
   unverified, every dropped item with its reason (IMP-9).

- **Budget:** proposed 15 findings, 3 fixes and 5 issues per run. Findings are
  read by script in pages; the sweep sees summaries, not files (IMP-7).
- **Steering:** `site/rulings.md`, read whole.

### 8.4 Docs upkeep and the guide

- **Inputs:** documents agents read, the code they describe, records, the
  previous run's coverage in its run row.
- **Coverage** starts with what the previous run did not read (DOC-6). A
  scheduled run never asks for a focus (DOC-10).
- **Each finding** is applied only after a separate sub-agent checks it
  against the primary source (DOC-2).
- **For a rewrite**, the checker first lists every rule, exception and reason
  in the original. A rewrite that loses one, or is not shorter or plainer, is
  dropped (DOC-3).
- **Decision records** are protected paths, so the owner merges any change to
  them and the sweep cannot change a decision alone (DOC-4, GUIDE-4).
- **A conflict no source settles** becomes an issue the sweep files (DOC-5).
- **Steering:** rulings, read whole; the sweep's own decisions sit in
  `memory/docs.md`, capped at a proposed 60 lines. `site log` refuses a
  longer write and a unit test covers that refusal (DOC-7, DOC-12).
- **Guide pages** cite code as an excerpt with path and commit. A check step
  fails when the cited lines no longer match (DOC-8).

### 8.5 Visitor

- **Builds nothing;** its safe surface is empty (VIS-1).
- **Scope** comes from the least-covered cell of pages × viewport × colour
  scheme × persona in earlier run rows (VIS-4, VIS-9).
- **Routes** come from the build's route list plus on-demand routes, not from
  a link crawl (VIS-5).
- **Personas:** first-time, task-directed, keyboard-only, returning. Tasks
  are proposed in `sweep.yaml` and the owner edits them (VIS-6).
- **Before reporting**, a finding is checked against the rendered page and
  the source, then against rulings, open issues, recent merges and recent
  findings; a repeat sets `match` (VIS-2, VIS-3).
- **Budget:** proposed 12 pages and 40 screenshots per run; a
  screenshot-reading sub-agent gets at most 8 images (VIS-7, DSP-8).
- **Outputs:** findings and a run row with coverage and cost (VIS-8).

### 8.6 Digest

1. A script lists finished UTC days with activity and no digest (DIG-4).
2. For each, up to a proposed 3 per run, a script gathers the day's sessions,
   merges and run rows and computes every count (DIG-2).
3. The agent writes prose around those counts.
4. A fresh sub-agent checks each claim against the merged changes. A cadence
   word needs a source (DIG-2, DIG-5).
5. `site log` writes `digests/<day>.md` and refuses to overwrite one (DIG-3).

The digest is a record, not site content, so the checker in step 4 stands in
for a review (DIG-5).

### 8.7 Cadence, bounds and cost

| Sweep | Proposed default | Why |
|---|---|---|
| watcher | weekly | The mechanical step is cheap; the agent step was the costly part (REQ §11). |
| improvement | weekly, after the watcher | Needs a week of findings to see repeats. |
| docs | every two weeks | Coverage rotates, so a slower beat still covers everything. |
| visitor | every two weeks | A quiet site changes little. |
| digest | daily | Stops after its script step when no day is missing. |

- Setup asks for each cadence; "off" is valid (SET-3, COST-7).
- A sweep bounds its work, not its spend, because no hard cap exists. Its run
  row records work against each cap and flags an overrun (COST-3, ENV-7).
- Cost is never read by the run itself. The first step of every sweep runs
  `site log cost`, which reads token counts of finished runs and prices them
  from a table in `platform/lib/` `[experiment E3]`. An unreadable cost is
  stored as "unreported" (COST-1, COST-2, COST-5).
- Every figure is labelled a list-price estimate (COST-4).

## 9. Observability

The dashboard is a set of on-demand pages under `/owner/` (REQ §12):

- **Sessions:** newest first, a proposed 20 per page with the total; goal,
  status derived from change request states, outcome, kind, problem counts by
  severity, duration, models, sub-agent share.
- **Causes:** one row per cause over seven days; occurrences, fixes, fix
  state derived from later findings.
- **Sweeps:** last run, cost per run and week (estimate), coverage, memory
  size, and "possibly stopped", derived from run rows and the cadence.
- **Skills:** use count and open findings per skill.
- **Tiles:** sessions by kind, problems by severity, sweep spend, open ideas.
- **Digests**, newest first; **ideas and learnings** with the issues they
  became; **live** version and build time.

**Access.** Proposed: a shared secret held as a deploy secret; middleware
sets a signed cookie. In a production build with no secret set, `/owner/`
answers "not found" (fails closed). Locally the check is off, so agents can
verify the pages (OBS-3). On a site not yet deployed, the same pages run from
the local preview (OBS-4).

**Where the data is read from (a proposal).** Pages read the `records` branch
at request time: from the host's API when deployed, with a read-only token and
a size-bounded cache; from `.records/` locally. File names sort by time and
sit in month folders, so a page reads one folder listing and a proposed 20
files. Status comes from one bounded host query per page. No record write
rebuilds the site (REC-11, PRIN-9) `[experiment E4]`.

## 10. Mixed files and sync

| File | Approach |
|---|---|
| `CLAUDE.md` | Seed. It imports `platform/instructions.md`, `platform/glossary.md` and `GLOSSARY.md`; the site writes below the imports. Sync never edits it (REQ §8.1). |
| `.claude/settings.json` | Generated from `platform/settings.json` and `site/settings.json`. Sync replaces the platform half; a check step fails if the committed file differs from a fresh merge. |
| `package.json` | Seed. Platform dependencies live in `platform/package.json`, a workspace package. The root carries one `site` script entry. |
| `pnpm-lock.yaml` | Site. After a take changes platform dependencies, sync refreshes the lockfile in the same change (SYNC-8). |
| protected paths | Two files, `platform/protected.txt` and `site/protected.txt`, read together from the default branch (REPO-5, MRG-5). |
| `.claude/skills/` | Platform skills are listed one by one in the manifest; pack and site skills are not, so sync leaves them alone. |
| `docs/guide/`, `docs/adr/` | Platform chapters and the five shipped records are listed by file; pages the site adds are site files. |
| workflow file | Platform, but sync writes changes to `by-hand/`, never onto a branch a remote session pushes (SYNC-6). |

**Taking updates** (SYNC-2):

- Fetch the template at the recorded version and at its latest
  `[experiment E1]`.
- For each manifest path, apply the template's change; where the site also
  changed the file, merge three-way with the old template file as the base.
- Write the new version into the manifest in the same change. A check step
  compares platform files that the site has not changed with the recorded
  version, so a partial take fails.
- Open a change request. It touches protected paths, so the owner merges it.

**Offering changes** (SYNC-3, SYNC-5):

- Select only manifest paths the session changed; refuse if anything else is
  in the selection (REPO-3).
- Where the template is attached, open a change request there. The
  template's automation builds a fresh site from it and runs `site check`.
- Where it is not, write a patch file to `by-hand/`.
- Multi-repository sessions load no hooks, so `site sync` runs the manifest,
  trailer and workflow-file checks itself (SYNC-7, ENV-1).

## 11. Autonomy

Presets are named by who may merge (AUT-2). Every preset needs a passed check
and a verdict on the pinned commit, and every preset refuses protected paths
without a waiver.

| Preset | What sessions may merge | What sweeps may merge | Protected areas |
|---|---|---|---|
| `owner` | Nothing. Sessions open changes; the owner merges. | Nothing. | The base list. |
| `sessions` | Changes outside protected paths, in sessions the owner started. Not new dependencies or server routes (AUT-5). | Nothing; sweeps open changes. | The base list. |
| `sweeps` | As `sessions`. | Changes inside the sweep's own safe surface. | The base list plus the sweep skills, so the improvement sweep cannot change its own skill. |

Base list (AUT-4, for the owner to confirm): `platform/check/`,
`platform/bin/`, `platform/lib/`, `platform/hooks/`, `platform/settings.json`,
`site/settings.json`, `.claude/settings.json`, both protected lists,
`site.config.yaml`, the workflow file, `docs/adr/`, `site/rulings.md`,
`src/pages/api/`, `package.json` dependency sections.

The preset is the `preset` value in `site.config.yaml`. That file is
protected, and `site land` reads it from the default branch (AUT-3).

## 12. Identity and setup

**Identity** (ID-6):

- **Shared account (default).** Agents act as the owner. Every post carries a
  session mark and every commit a trailer; `site land` holds the merge rules,
  because the host cannot tell owner from agent (ENV-8, ID-5).
- **Separate agent account.** The host can then require the owner's approval
  on protected paths through a code-owners rule, and `site land` keeps only
  the pinning. Whether its token works inside a remote session is untested
  `[experiment E2]`.
- **App identity.** Same gain, short-lived tokens; minting a token inside a
  session may be blocked `[experiment E2]`.

**Deploy target** (DEP-*). Both models work; setup picks one.

- **Managed host.** A merge deploys through the host's git link; deploys are
  atomic, so a failed build never replaces the live site; no server and no
  build memory to provide (DEP-1, DEP-2, DEP-4). Costs: the adapter and
  runtime limits are the host's; the dashboard needs a token to read records;
  access control and secrets live in a vendor console.
- **Self-updating container.** One Node runtime the owner controls; it builds
  beside the live site and swaps only on a good build; it can read `records`
  by git. Costs: the owner runs a server, provides build memory, and keeps
  the pull credential out of the repository's git config (DEP-4, DEP-5).
- Either way the footer and `/version.json` show the live commit and build
  time (DEP-3).

**Setup order** (`setup-site`, SET-1 to SET-11):

1. Print every by-hand step as a runnable checklist in `by-hand/` (SET-2).
2. Ask: preset, each sweep's cadence, dashboard access, public or private,
   deploy target, identity (SET-3). Write the answers to `site.config.yaml`.
3. Install the pack and write `.claude/skills.lock` in the same step; run
   the pack's setup skill (SET-6).
4. Create the `records` branch, the empty rulings file and the guide's
   platform chapters (SET-7).
5. Wait for the owner to confirm the by-hand steps; read back labels and
   branch protection where the session can see them (SET-5, SET-8, SET-11).
6. Run `site check`; open and land the hello-world change under the preset
   (SET-9).
7. Create the sweep schedules; deploy; read `/version.json` from outside.
8. Warn that the tool's permission classifier may still refuse an action the
   owner allowed (SET-10).

**Steps that need the owner or a laptop** (ENV-11):

- install `.github/workflows/check.yml`;
- branch protection with the check required, before step 6;
- the five issue labels;
- repository visibility;
- the deploy host, its secrets and the dashboard secret;
- the remote environment's setup script and network access;
- optionally a separate agent identity and telemetry export.

## 13. Experiments before building

1. **E1: a second branch and a second repository.** Can a remote session push
   `records` beside its working branch, does `.records/` survive a resumed
   container, and can it fetch the template without attaching it? Sections 3,
   5, 10. Fallback: records in a `records/` folder on `main`, outside the
   build, landed with each change.
2. **E2: agent identity.** Does a separate account's or an app's token work
   in a remote session, and do pushes and posts show it? Section 12.
3. **E3: transcript and cost.** Is the session id in every hook payload
   (remote, laptop, scheduled, sub-agent)? Does the transcript keep timings,
   tokens and tool counts after compaction or a resume? Can a later session
   read a finished run's tokens? Can a hook tell a scheduled run from an
   owner-started one? Sections 5, 6, 8.7, 11.
4. **E4: dashboard reads.** Does reading `records` through the host's API
   stay inside rate and time limits on a managed host, and in what memory
   does the site build? Sections 9, 12.
5. **E5: starting sessions.** Can a session start another with a hand-over as
   its prompt, remote and laptop, and can it read its own context use? Does a
   comment posted by automation wake a subscribed session? Sections 5, 7.2.
6. **E6: stack checks.** Do schemas load outside a build for the fast check,
   and does a broken reference between content files fail the build? Is
   browser-side navigation fast enough on a phone? Section 4.
7. **E7: pack install.** Does the pack installer copy plain files a remote
   session loads, and does its lock detect an edited skill? Section 7.1.
8. **E8: sync end to end.** With no pilot site planned: a test in the
   template's automation creates a site from an older template tag, edits one
   platform file, runs take and offer, and checks the result. Section 10.

## 14. What is still unclear about the implementation

Tags: `[repo]` answerable by reading a repository or its records, with what
to look for; `[owner]` needs the owner's steering; `[experiment]` needs a
test from section 13.

### 14.1 Repo shape and stack

1. **Is Astro the right stack for the owner's sites?** The proposal fits
   content sites with a little server work. A site that is mostly an app
   would fit a different framework, and the content checks would move with
   it. `[owner]`
2. **Does the stack check content, or a script?** The build checks schemas;
   the platform adds its own checks for references and data-format traps.
   Whether the build already covers references decides if one of them goes.
   `[experiment]` (E6)
3. **Can one repository hold a site with distinct parts?** The layout
   assumes one content tree and one deploy. A blog and a shop would share
   schemas and protected paths, or need a second repository. `[owner]`
4. **Does the owner area ship in the first version?** The dashboard needs
   it. Without it, the dashboard is a local page only. `[owner]`

### 14.2 Commands and hooks

5. **Is a red change request acceptable?** The draft runs the full check
   before every push and treats automation as the gate. Pushing first and
   waiting would save minutes per change and show red in the owner's inbox.
   `[owner]`
6. **How does a laptop session wait for green?** No subscription exists
   there. The draft runs `site land merge --wait` in the background and polls
   the host. `[owner]`
7. **Should "never chain a commit with a check" be a refusal?** It is a line
   of prose now. The before-push hook could refuse it, at the price of one
   more guard (PRIN-2). `[repo]`: count findings with this cause in
   `causes/` after a month. `[owner]`
8. **How is a scheduled run told from an owner's session?** `site land`
   needs this to apply the right preset column. If no machine signal exists,
   the sweep's first command sets it, which an agent can skip.
   `[experiment]` (E3)
9. **Does review cover the owner's own commits, and is a waiver per change
   or standing?** The draft treats a waiver as one quoted sentence for one
   merge. `[owner]`

### 14.3 Skills and the pack

10. **Which pack skills earn their place?** The default list follows the
    requirements' list, not use. `[repo]`: read skill use counts from session
    logs after 60 days; check the pack's `README.md` for skills marked
    user-invoked only. `[owner]`
11. **Do the pack's label names match the inbox?** The pack's setup writes
    five default labels. `[repo]`: compare
    `skills/engineering/setup-matt-pocock-skills/SKILL.md` in the pack with
    WM-7; they appear to match one to one.
12. **Can pack skills marked user-invoked be called by a platform skill?**
    Several, such as `handoff` and `wayfinder`, disable model invocation.
    A wrapper may need the owner to call them, or a documented way to load
    them by name. `[repo]`: check the front matter of each default skill.
    `[experiment]` (E7)
13. **Is parallel work in the first release?** `clear-backlog` is written so
    each group of issues gets its own worktree, but the draft would ship it
    serial first, with at most 2 full checks at once later (ENV-13).
    `[owner]`

### 14.4 Sweeps and records

14. **Where do records live if a second branch cannot be pushed?** The
    fallback puts them on `main`, which makes every record write a change
    request and weakens REC-11. `[experiment]` (E1) `[owner]`
15. **Are records public when the repository is public?** A branch in a
    public repository is public. Owner-only records would need a second,
    private repository, which a single-repository session cannot push to.
    `[owner]` `[experiment]` (E1)
16. **Do nit-level problems become findings?** The draft writes every
    problem as a finding and lets the improvement sweep's thresholds ignore
    lone nits. That grows the findings folder fastest. `[repo]`: count nits
    against other severities in `findings/` after a month. `[owner]`
17. **Are the proposed numbers right?** Cadences, the 15/3/5 improvement
    caps, the two-occurrence threshold, the
    400-line review threshold, the 60-line memory cap, the visitor's
    12 pages and 40 screenshots. `[repo]`: read overruns in `runs/`.
    `[owner]`
18. **Do trials exist as a step?** The draft keeps "cut before you add" as a
    rule in `sweep-improve` and stores no trial state. A trial step would add
    a field to causes and a later judgement. `[owner]`
19. **What is kept, and for how long?** Proposed: findings and session logs
    stay for 12 months in month folders, then move to one archive file per
    month; causes and digests stay. `[owner]`
20. **Should the watcher's mechanical step run without any session?** It
    could run as a scheduled job in automation at no agent cost, but that
    puts logic behind the workflow file. `[owner]` `[experiment]` (E1)

### 14.5 Sync and autonomy

21. **Who reviews an offer on the template, and does the template run the
    platform itself?** The draft assumes the owner merges offers and the
    template runs only `site check` on a fresh site. `[owner]`
22. **Are the three presets the right cut?** They vary only by who merges. A
    fourth axis, whether the improvement sweep may change its own skills, is
    fixed to "no" in every preset. `[owner]`
23. **Which changes besides dependencies and server routes need the owner?**
    New major versions are treated as new dependencies. Minor and patch
    updates merge under the preset once the check is green. No security
    review of server routes ships. `[owner]`

### 14.6 Identity, setup and deploy

24. **Which identity is worth its upkeep?** A separate identity removes most
    of `site land`'s owner-or-agent logic and adds token rotation. `[owner]`
    `[experiment]` (E2)
25. **Managed host or container as the template's default?** The draft ships
    both recipes and deletes the unused one at setup. A stranger is better
    served by a managed host; the owner's sites may not be. `[owner]`
26. **Who is the guide for, and how deep?** The draft writes it for the
    owner first, one page per platform part, each with pinned excerpts.
    `[owner]`
27. **Which requirements may degrade on a laptop?** Proposed: starting the
    next session (prints the prompt), waking on green (polls), and cost
    reading (unreported). Everything in `site check` and `site land` holds
    the same. `[owner]`