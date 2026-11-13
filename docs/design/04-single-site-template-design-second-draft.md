# A single-site template: second design draft

**Status: a proposal by the writing agent; decides nothing.** Written on
2026-11-13 from the repo at `c425261e1`, by the agent that wrote the breakdown,
without reading the first draft
([`03-single-site-template-design-draft.md`](./03-single-site-template-design-draft.md)),
so the two can be compared. It answers
[`02-single-site-template-requirements.md`](./02-single-site-template-requirements.md)
(cited as **REQ §n**, or **R0.n** for its four numbered requirements) and
[`01-single-site-template-breakdown.md`](./01-single-site-template-breakdown.md)
(cited as **BD §n**). Each choice cites the requirement it meets; the evidence
stays in the requirements. A choice that rests on a fact nobody has tested is
marked **[untested]** where it appears, and section 13 collects every one.

Three owner answers given after the requirements were written shape this
draft: every sweep and the dashboard ship in the template and a clone may
remove them; a separate agent identity is an option not yet set up; and the
template is greenfield, so Terrarium's ADRs bind nothing here. Where this
draft names one, it is as evidence of what was tried.

## 1. Design principles

1. **One definition of each thing, run the same way everywhere.** Verification
   is one step list that a laptop, a cloud session and CI all run through one
   command. Two copies need a parity test; one copy needs none (REQ §1.1,
   BD §1).
2. **A rule that a cheap check can enforce gets the check; judgement stays in
   prose.** Lint rules, types, tests and command refusals come first. A guard
   on tool calls is the last resort, because guards were three of the top
   recurring problems (R0.1, R0.2).
3. **The machine records machine facts; the agent writes only judgement.** Ids,
   commit ids, timings, tokens and PR state are never typed (REQ §2.2, §3.3,
   §3.4).
4. **What can be derived is derived at read time, never stored.** A log's
   status, a cause's fix state and a sweep's silence follow from records that
   already exist (REQ §2.3).
5. **Records live apart from the site.** Logs, findings and run costs sit on
   their own branch, so writing one never deploys the site, never needs a
   bypass on `main`, and can never flow back to the template (REQ §2.2, §5.2,
   BD §3 "Where logs live").
6. **Every sweep is removable.** Sweeps talk to each other only through one
   record format. Deleting a sweep's Skill and its schedule leaves
   verification green and the other sweeps working (owner, this session).
7. **Everything is bounded from the start.** Each read has a cap and a total
   count, each run a work limit, each output a size limit. A view or run that
   grows with history is a defect (REQ §2.3, §4.1, §4.6).
8. **A standard before our own code, and plain files before a package.** The
   platform is files in the site repo, because plugins do not load in cloud
   sessions (BD §5). The Skill pack does the pack's jobs (REQ §3.8).

## 2. Concepts

Terms are plain lowercase words, written the same in prose, commands, file
names and Skill names. A term enters the glossary on its second use (REQ §3.1).

| Term | Meaning |
|---|---|
| site | One repo made from the template: one website and its content. |
| platform | The files the template owns and updates: commands, hooks, Skills, guidance. |
| seed | Files the template provides once and the site then owns, such as the hello-world page. |
| session | One Claude Code conversation working on the site. |
| log | A session's record: the agent's judgement plus machine facts. |
| problem | Something that cost a session time or went wrong, graded by what it cost. |
| finding | One record a session or sweep hands on: a problem, an idea or a learning, with evidence. |
| cause | The root of one or more problems, with its fixes and derived state. |
| sweep | A Skill run on a schedule or on demand that looks after the site. |
| verification | The fixed checks a change passes before it may merge; `verify` runs them. |
| protected path | A file only the owner merges changes to. |
| preset | The one setting, chosen at setup, that says what agents may merge. |
| ruling | A standing owner instruction every sweep run obeys. |
| dashboard | The owner's pages showing sessions, causes, sweeps and cost. |
| guide | Pages that explain how this site and its platform work. |

**Rationale (not shipped).** The requirements already use problem, sweep,
dashboard and verification (REQ header); this draft keeps them. "Finding" is
new: it gives the five sweeps one word for what they exchange. "Ruling"
replaces "owner decision", which collides with "decision record". "Preset"
avoids "tier", because the setting does not sort paths by risk (REQ §5.4).
"Protected path" replaces "Human-only" because the breakdown already renamed
it (BD §3). The pack's own words (map,
ticket, spec, hand-over) are used as the pack defines them and are not
redefined (REQ §3.8).

Terrarium terms that disappear: Tenant, Space, Collection as a platform term,
manifest, Catalog, Aggregator, Trusted and Public, Friction, Friction Ledger,
Routine, Journal, Glass Box, Skill Inventory, seedling, prune trial, gate,
Human-only, Persona.

## 3. Repo shape

```
CLAUDE.md                       # site file; imports platform/guidance.md and both glossaries
GLOSSARY.md                     # site file; the site's own terms
site.yml                        # site settings: preset, template commit, cadences, access
package.json                    # mixed: platform scripts delegate to platform/commands/
src/                            # the site's pages, layouts, components, server routes
  pages/api/                    # server routes (protected path)
  pages/owner/                  # dashboard pages (platform)
  pages/guide/                  # guide routes (platform)
content/                        # the site's Markdown and YAML, one folder per kind
  guide/                        # guide pages (seed, then grown by the site)
content.config.ts               # typed schema per kind of content (seed)
tests/                          # the site's own tests and content rules (seed)
docs/decisions/                 # decision records; about five shipped (seed)
docs/agents/                    # four how-to docs: git and PRs, issues, caveats, hooks (platform)
docs/skill-notes/               # repo docs that adapt pack Skills (seed)
docs/rulings.md                 # the owner's standing rulings (site, protected)
docs/human-steps/               # changes only a human or laptop can apply, both halves in one sitting
platform/
  guidance.md                   # the platform's always-loaded instructions
  glossary.md                   # the terms in section 2
  paths.txt                     # the list of platform paths, one home
  protected-paths.txt           # paths only the owner merges
  package-keys.json             # the package.json scripts and dev dependencies sync owns
  commands/                     # verify, check, log, merge, preview, sync
  hooks/                        # the hook scripts in section 6, and the hooks block for settings
  lib/                          # helpers shared by commands and hooks
  schemas/                      # log, finding, cause, run, merge and site.yml schemas
  tests/                        # tests of commands and hooks
.claude/skills/                 # platform Skills and the installed pack
.claude/rules/                  # a few hand-written path-scoped rules
.claude/settings.json           # mixed: platform hooks, site permissions
skills-lock.json                # pins every installed Skill (platform)
.github/workflows/verify.yml    # checkout, setup, one run step (platform, human-applied)
.github/dependabot.yml          # grouped dependency updates (seed)
deploy/                         # the deploy mechanism setup picked (seed)

# on the `records` branch, checked out at .records/ in every session [untested]
logs/<year>/<month>/            # one file per session
findings/                       # one file per finding
causes/                         # one file per cause
runs/<sweep>.yml                # one row per sweep run: time, cost, coverage
merges/                         # one row per merge the merge command made
digests/                        # one page per finished day
memory/<sweep>.md               # a sweep's size-capped notes
```

Kinds of file (REQ §5.2):

- **platform:** `platform/`, `docs/agents/`, platform Skills, the pack and its
  lock, `.claude/rules/`, `src/pages/owner/`, `src/pages/guide/`, the workflow
  file.
- **seed:** `content.config.ts`, `content/` including `content/guide/`,
  `src/` apart from the two platform folders, `tests/`, `docs/decisions/`,
  `docs/skill-notes/`, `deploy/`, `.github/dependabot.yml`.
- **site:** `CLAUDE.md`, `GLOSSARY.md`, `site.yml`, `docs/rulings.md`,
  `docs/human-steps/`, and everything on the `records` branch.
- **mixed:** `package.json` and `.claude/settings.json` only. Section 10 says
  how sync handles them, and four more files that have one kind but need
  care.

## 4. Stack

**Proposal: Astro with its Node adapter, content collections and Markdoc.**
The owner has not decided the stack (BD §6); this is the writing agent's pick
so the rest of the draft can be concrete.

- **Content validation is built in.** A bad file fails the build and names the
  file and field, so the check REQ §1.2 demands is the framework's own.
- **A mistake in a component block fails the build** with file and line under
  Markdoc, which meets "silently degraded component blocks are caught"
  (REQ §1.2).
- **Server routes and on-demand pages work,** so the dashboard can render per
  request and the site keeps a named place for API routes (BD §5 item 4).
- **Owner-only content stays on the server by default** (BD §6 study 2), which
  the dashboard's access rule needs (section 9).
- **Content pages are prerendered and ship no JavaScript.** Browser-side
  navigation is one opt-in setting, Astro's client router (REQ §2.1).
- **The whole verification ran in about 11 seconds** in the study, so a full
  run every time is affordable and no step-skipping is needed (BD §6).
- **Nothing is loaded into the browser as a database,** so the recovery-path
  and cache-bound requirements have nothing to apply to (REQ §2.1).

Caveats:

- Whether the client router feels as fast as Terrarium's navigation is
  **[untested]**; the requirements name the spike (REQ §8 item 20).
- Astro shipped three major versions in about 18 months (BD §6). The stack
  decision record should say who applies a major upgrade and how sync carries
  it.
- The study did not build a container image or measure build memory
  **[untested]** (REQ §1.5).

Whatever deploy setup picks keeps four rules (REQ §1.5, BD §1): a merge is a
deploy; a failed install or build never replaces the live site and the next
cycle retries; the live commit and build time show in the footer and at
`/version`; the deploy credential never enters the repo's git config.

## 5. Commands

Each command is a package script that runs one file in `platform/commands/`.
An agent and a person type the same thing.

| Command | What it does | Meets |
|---|---|---|
| `verify` | Runs one step list: dependency freshness, lint, types, content, unit tests, build, browser smoke test, plus the platform's own checks named in later sections (commit trailers, pinned Skills, guide excerpts, the copies sync owns). It reinstalls stale dependencies before it trusts a failure. It records HEAD and the tree at the start and aborts if either changed by the end. It refuses a shallow checkout. With `--ci` it installs from the frozen lockfile, names the failing step in the run summary, and posts a comment on green so a waiting session wakes. | REQ §1.1, §1.3 |
| `check` | The seconds-fast subset for iterating: content against its schema, YAML traps (an unquoted `#`, a folded line ending in a hyphen), references between content files, and that no platform Skill shares a name with a pack Skill. It never replaces `verify`. | REQ §1.2, §3.8 |
| `log` | Takes the agent's judgement file and lands the session's log on `records`. The session id comes from the hook payload **[untested]**, never from the agent. Times are UTC, and a log is filed under the day its session ended. The machine half comes from the transcript and git. A second run replaces the machine half and merges the authored half. A failure prints one loud line and exits non-zero. A log in an unknown schema version is held, not dropped. The authored half is pushed when written, so it survives a reclaimed container. | REQ §2.2 |
| `merge` | `merge verdict <pr>` posts a review verdict whose commit id the command reads from the PR head. `merge <pr>` waits for CI on that head in the background-friendly way, then merges pinned to it, so a late push fails the merge. It reads protected paths from `main`, follows renames, and refuses when the list is unreadable. It applies the preset. It parses closing keywords as GitHub does and refuses one that names an issue not approved. It closes issues GitHub left open, and reports "merged" only after GitHub confirms. It writes one merge row to `records`. It never turns on GitHub's auto-merge. An owner waiver is quoted in the merge record and lifts only the protected-path refusal. | REQ §3.4, §5.4 |
| `preview` | `start`, `stop` and `shot`. It owns its server by process id and its stop always succeeds. Each preview gets its own port. `shot` builds for production, waits for a real page, and captures light and dark at desktop and phone size in one call, at the pixel size asked for. It can also assert on the rendered DOM. | REQ §3.5 |
| `sync` | `sync take` and `sync offer`; section 10. It runs its own checks, because a session with two repos attached loads no hooks **[untested]**. | REQ §5.3 |

**Shared helpers** live in `platform/lib/`: reading `site.yml`, finding the
session id, writing to the `records` checkout with a rebase-and-retry push,
talking to GitHub, and one bounded reader for records (newest first, a cap, a
total count) that every dashboard view and sweep uses (REQ §2.3). Logs and
findings have a file name unique to their session, so sessions never write the
same file. Only sweeps write causes, run rows and the `taken` mark; `merge` writes one
new file per merge. A push that loses a race rebases and retries.

**A new rule** follows R0.1. If a lint rule, a type, a test or a step in
`verify` can enforce it, the same PR adds that check and no prose. Only a
judgement call becomes a line in `platform/guidance.md`. A tool-call guard is
added only after a problem recurs despite a cheaper check, and the PR that
adds it names what it replaces (R0.2).

**`platform/guidance.md`** starts as the eleven lines REQ §3.1 lists and the
order "review, then `verify`, then push" (REQ §1.1), and nothing else.

No step is skipped by changed paths at first. A proven, fail-closed skip stays
possible later if a full run ever gets slow; skipping review for prose that
steers later sessions does not (REQ §3.2).

## 6. Hooks

1. **Session start.** Installs dependencies from the frozen lockfile, fetches
   full history, checks out `records` at `.records/`, and stores the session
   id for the commands. **Fails open** with a loud line; `verify` and `merge`
   fail closed later on what it left undone (REQ §1.1, §2.2).
2. **Provenance guard, before a GitHub write.** Refuses an issue, PR, comment
   or review body that lacks this session's header, and prints the exact line
   to paste, so the id is never typed from memory. **Fails closed.** A commit
   hook adds the commit trailer, and `verify` fails when a branch commit lacks
   it (REQ §3.3).
3. **Workflow-file guard, before a commit.** In a cloud session it refuses a
   commit that touches `.github/workflows/` and points to
   `docs/human-steps/`. **Fails closed**, because one such commit strands the
   whole push (REQ §1.3).
4. **Stop.** If a log was authored, refreshes its machine half. If the session
   made a commit or opened or merged a PR and authored no log, blocks the
   stop once, with one message; it never speaks mid-run. **Fails open**
   (REQ §2.2, "The finding behind most of this").
5. **Session end.** A fallback that pushes an authored log that has not
   landed. **Fails open**; the watcher finds what it missed (REQ §4.1).

A hook's failure mode, its test and how to add one are one page in
`docs/agents/` (BD §3 "Keep the convention").

Deliberately not carried over:

- a guard that denies a first call until a doc is read (REQ §3.1);
- hints that point to a doc after an edit (REQ §3.1);
- generated summary rules for decision records, and tracking of which rules
  loaded (BD §3);
- Terrarium's guards against cloud and tool quirks: each starts as a line in
  the caveats doc and becomes a guard only when it recurs (BD §3, R0.2);
- locks, slots and step-skipping around verification (BD §1).

## 7. Skills

**Naming.** A platform Skill is named for what the owner asks for, in one or
two plain words, and never shares a name with a pack Skill; `check` enforces
that against `skills-lock.json` (REQ §3.8).

| Skill | Purpose | Replaces in Terrarium |
|---|---|---|
| `setup-site` | Walks a new site through section 12 and hands over the human steps as a runnable checklist. | nothing; new (BD §5) |
| `close` | Judges that a session has reached an honest stopping point and runs `log`. | `close-session`, `log-session` |
| `steer` | Works the backlog: triage every open issue read-only, ask the owner once, then build. Serial at first; parallel later (REQ §3.6). | `clear-backlog`, `auto-triage` |
| `improve` | The one self-improvement sweep (section 8.3). | `frictions-to-fixes`, `harvest`, `prune-trial` |
| `watch` | Catches what sessions did not notice about themselves (section 8.2). | `audit-skills` |
| `tend-docs` | Keeps docs, decision records and the guide true to the code (section 8.4). | `audit-docs`, `glassbox-update`, `glassbox-curate` |
| `visit` | Sends visitor agents through a preview and reports what they find (section 8.5). | `visitor-loop` |
| `digest` | Writes one page per finished day (section 8.6). | `digest` |
| `sync-template` | Runs `sync take` or `sync offer` and resolves conflicts. | nothing; new (BD §5) |
| `update-pack` | Updates the installed pack, lists changed Skills, and re-reads every skill note. | by-hand updates (REQ §1.4) |
| `next-session` | Writes a hand-over and starts the next session with it. | by-hand session creation (REQ §3.7) |

**Pack Skills shipped by default:** `grilling`, `code-review`, `tdd`,
`diagnosing-bugs`, `domain-modeling`, `triage`, `to-spec`, `to-tickets`,
`prototype`, `research`, `wizard`, `writing-for-agents`, `retro`, `wayfinder`,
`handoff` and `setup-matt-pocock-skills`. **Optional:** `implement`,
`grill-with-docs` (REQ §6). Every installed Skill is pinned at install, and
`verify` fails on drift (REQ §1.4).

### How platform Skills relate to the pack

- A platform Skill calls a pack Skill by name for the pack's job and adds only
  its own step. `next-session` runs `handoff`, then starts the session.
  `steer` runs `triage` per issue and `code-review` per branch. `improve`
  runs `retro` for a single session (REQ §3.8).
- Where the platform needs different behaviour, the difference is a file in
  `docs/skill-notes/` that the pack Skill reads. The pack's setup Skill
  writes those files and the site owns them. One ships filled in: only triage
  sets a ready label (REQ §5.1).
- An installed Skill is never edited. `update-pack` handles an upstream rename
  or deletion as its own listed step and says in its PR which skill notes it
  re-read (REQ §1.4).

**Work too big for one session** is planned with `wayfinder` as a map with
decision tickets, one ticket per session. `next-session` is the one command
between sessions: it writes the hand-over (the map, the ticket claimed, the
Skills to load, and pointers to issues and branches, not copies), then starts
the next session. `platform/guidance.md` tells a session to hand over before
its context fills. Starting a session from a session works in the cloud; on a
laptop the command prints the prompt to paste **[untested]** (REQ §3.7).

## 8. Sweeps

Five sweeps ship. Each is a Skill plus one schedule entry, and each can also
be run by hand (BD "The loop runs on demand or from a Routine").

### 8.1 The finding record

Every sweep and every session hands work on in this one shape (REQ §4.4). A
command writes it; no agent types the id or the commit.

```yaml
id: 2026-11-13-visit-0007     # made by the command: date, source, counter
source: visit                 # session | watch | tend-docs | visit | retro
kind: problem                 # problem | idea | learning
where: /blog/hello-world      # a route, a file path or a Skill name
what: The footer link to the feed returns 404.
evidence: preview at phone size; link target /feed.xml   # quote, path or screenshot
commit: 3f2a9c1               # the commit the source looked at
verified: true                # checked against the source and the rendered page
severity: minor               # nit | minor | moderate | major | blocker; problems only
session: session_01...        # the session that wrote it, from the hook payload
cause: null                   # set by improve when it files the finding
taken: null                   # the improve run that consumed it
```

A session's problems are findings too: `log` writes one per problem, so
`improve` has a single input (REQ §4.2).

### 8.2 `watch`

- **Inputs:** logs and run rows since its last run, GitHub's PR and issue
  state, each Skill's text at the commit a run started from (REQ §4.1).
- **Mechanical checks, no agent:** a merged PR whose session left no log; a
  log listing a PR that GitHub says is closed; a sweep with no run in two
  cadences; a stop that needed the hook's block; an installed Skill that
  drifted.
- **Agent checks, capped at five Skills a run:** only for Skills whose text or
  runs changed since the last run. Each grades a run against the Skill text in
  effect then, and each finding is checked against its source before it is
  written.
- **Rules:** an inconclusive scan is reported as inconclusive, never as zero.
  A possible sweep stop is an observation, not a failure. Output is findings
  only, at most twenty a run.
- **Outputs:** findings, one run row with its own cost. It files no issues;
  `improve` decides what becomes one.

### 8.3 `improve`

1. **Collect** every finding with no `taken` mark, from the last run's start
   minus a one-day margin (REQ §4.2).
2. **Dedupe once, for every source:** against open and closed issues,
   decision records, rulings, accepted causes and open trials. A title match
   is a hint, not a match.
3. **File** each finding under a cause, new or existing, by a command that
   copies text; nothing is retyped.
4. **Route** each cause that crossed a threshold (proposal: three occurrences
   or one `major`):
   - a cause that regressed after a fix goes to the owner as an issue naming
     that fix, before any new fix (R0.3);
   - an accepted cause is never proposed again (R0.4);
   - a safe fix becomes one reviewed, verified PR that prefers a deletion and
     follows R0.1;
   - anything touching an installed Skill, a decision record, a hook or
     settings becomes an issue.
5. **Ideas and learnings** become issues labelled for triage.
6. **Report** once: every number with its source, every dropped item with its
   reason.

Bounds (proposal): five causes and three PRs a run. A cause's fix state is
derived from occurrences dated after the fix. The sweep's own briefs are a
`where` like any other, so its own problems reach it. Trials: a cut may be
marked as a trial on its cause and judged by later occurrences; the draft
ships no separate trial machinery (REQ §8 item 16).

### 8.4 `tend-docs`

- **Scope:** `platform/guidance.md`, `docs/`, Skill texts, decision records
  and the guide, against the code and the records.
- **Coverage** rotates by the last run row, which lists what was actually
  read, not by the calendar (REQ §4.3).
- **A finding is applied only after an independent checker** compares it with
  the primary source. For a rewrite, the checker first lists every rule,
  exception and reason in the original; a rewrite that loses one, or is not
  shorter or plainer, is rejected.
- **A decision record's decision never changes in this sweep.** A PR that
  touches one is protected and the owner merges it.
- **A conflict no source settles becomes an issue** the sweep files itself,
  with a finding that carries the issue's number, so it never waits on
  `improve`'s thresholds.
- **Steering:** every run reads `docs/rulings.md` whole. Only the owner changes
  it. The sweep's own decisions live in `memory/tend-docs.md`; the
  command that writes it refuses a file over its size cap.
- **The guide:** a guide page that cites code names the commit it was checked
  at, and `verify` fails when a cited excerpt no longer matches (REQ §4.3).
- **Bounds (proposal):** one area and ten applied findings a run. A diff over
  200 changed lines gets `code-review` even when mechanical. A scheduled run
  never asks the owner for a focus.

### 8.5 `visit`

- **Inputs:** the real route list from the build, not a link crawl; rulings,
  open issues, merged PRs and the last runs' findings (REQ §4.4).
- **Scope** comes from the coverage in its run rows: pages, viewport, colour
  scheme and persona not yet covered come first.
- **Personas:** first-time reader, task-directed visitor, keyboard-only
  visitor, returning visitor.
- **Each finding is verified** against the source and the rendered page before
  it is written. A repeat is attached to its earlier finding or issue.
- **Bounds (proposal):** twelve pages and forty screenshots a run; a
  screenshot-reading agent has a hard cap of fifteen images (REQ §3.5).
- **It builds nothing.** Problems and ideas go out as findings.

### 8.6 `digest`

- A script finds finished UTC days with activity and no digest, and gathers
  one day's material from logs, merged PRs and run rows (REQ §2.3).
- The Skill writes the prose. A separate checker compares every claim with the
  merged diffs; a cadence word needs a source.
- The page lands once on `records` and is never rewritten. It is data the
  dashboard renders, so it needs no PR; the checker stands in for the review
  REQ §4.5 asks for. A run writes at most three missing days. This departs
  from Terrarium, where a digest is a site page; section 14 item 18 asks the
  owner.

### 8.7 Cadence, cost and bounds

| Sweep | Default cadence (proposal) |
|---|---|
| `digest` | daily |
| `watch` | weekly |
| `improve` | weekly, the day after `watch` |
| `tend-docs` | weekly |
| `visit` | every two weeks |

- Setup asks for each cadence and writes it to `site.yml`; "off" is a valid
  answer. The schedules themselves are created in Claude Code by the owner or
  by `setup-site`.
- **Cost is read by the next run, not by the run itself.** Each sweep's first
  step records cost and tokens for finished runs that lack them, because a run
  reading its own cost failed and reading a finished run's cost worked
  (REQ §4.6). A figure that cannot be read is stored as "unreported".
- **Attribution to subagents** needs OpenTelemetry export **[untested]**;
  until then a run row carries the session total only.
- **No hard budget cap exists** for a scheduled cloud run, so each sweep is
  bounded by work (the limits above) and its run row records an overrun
  (REQ §4.6).
- Every cost is labelled a list-price estimate. On a subscription the view
  also shows usage-window pressure, if a run can read it **[untested]** (section 13 item 3).

## 9. Observability

The dashboard is a set of pages under `/owner/`, rendered on request. It shows
(REQ §2.3):

- **Sessions:** newest first, fifty a page with the total; goal, derived
  status, outcome, kind, PRs, problem counts by severity, time, models, and
  the subagent share of tokens and run time.
- **Causes:** one row per cause over a time window (default seven days), with
  occurrences, fixes and a fix state derived from later occurrences.
- **Sweeps:** last run, cost per run and per week as a list-price estimate,
  coverage, and "possibly stopped" after two missed cadences.
- **Skills:** each Skill's use count and the watcher's open findings on it.
- **Headline tiles:** sessions by kind, problems by severity, sweep spend,
  open ideas.
- **Digests:** one per day, newest first.
- **Ideas:** open idea findings and the issues they became.

A new log, finding or run row appears with no page edit, because every view is
a query over a folder (REQ §2.3).

**Access.** `/owner/` is owner-only by default: server middleware checks a
secret held in the host's environment, and the pages are never prerendered.
`site.yml` has one switch that makes the dashboard public for a demo site
(REQ "Owner decisions"). On a static host the same paths sit behind the
host's access control (BD §6).

**Where the data is read from (a proposal).** The dashboard reads a checkout
of the `records` branch that the deploy keeps beside the site and refreshes
on its update cycle. A new log therefore shows within one cycle without
rebuilding the site. On a host with no file system at request time, a
scheduled job rebuilds the dashboard pages instead **[untested]**. A log's
status is derived by joining its PR numbers with merge rows that `merge`
writes to `records`; a PR the owner merged by hand is caught by `watch`.

## 10. Mixed files and sync

Imports remove most mixing: `CLAUDE.md` is a site file that
imports `platform/guidance.md`, `platform/glossary.md` and the site's
`GLOSSARY.md`, so sync never edits a file the site writes in.

| File | Approach |
|---|---|
| `package.json` | Sync owns the scripts and dev dependencies named in `platform/package-keys.json` and touches nothing else. `verify` fails when a platform script differs from that file. |
| `.claude/settings.json` | Sync owns the `hooks` key, copied from `platform/hooks/settings-hooks.json`. Permissions and everything else are the site's. `verify` checks the copy. |
| `skills-lock.json` | Platform. A site that installs an extra Skill lists it in `site.yml`, and sync keeps that entry. |
| `platform/protected-paths.txt` | Platform. A site adds its own in `site.yml`; `merge` reads both from `main`. |
| `.github/workflows/verify.yml` | Platform, but never applied by a cloud session: sync writes the new file to `docs/human-steps/` with the command to apply it. |
| `content/guide/` | Seed. Sync offers new template guide pages as additions and never overwrites a page the site changed. |

**Taking updates (`sync take`)** (REQ §5.3):

- reads the template commit last taken from `site.yml`;
- computes the template's changes to the paths in `platform/paths.txt` since
  that commit and applies them as a three-way patch;
- leaves conflicts for the `sync-template` Skill to resolve;
- writes the new commit to `site.yml` in the same PR, so a partial sync fails
  `verify`;
- opens one PR, which the owner merges because it touches protected paths.

**Offering changes (`sync offer`)**:

- selects by allow-list: only paths in `platform/paths.txt`, compared with the
  template at the recorded commit;
- refuses if the selection contains anything from `records` or `content/`;
- opens a PR on the template when the template repo is attached to the
  session; otherwise writes a patch file the owner can apply (BD §5 open
  problem);
- the template's CI makes a fresh site from the PR and runs `verify` on it.

Only the trigger is manual: the owner asks for a take or an offer (BD "What
the owner settled first").

## 11. Autonomy

The preset varies by who is acting, never by path, so it is not a set of risk
tiers (REQ §5.4). The protected list is the same under every preset.

| Preset | Agents in an owner-started session may merge | Sweeps may merge | Protected areas |
|---|---|---|---|
| `review-all` | Nothing. Every PR waits for the owner. | Nothing. | The list still applies; a waiver is never needed. |
| `standard` (default) | Their own PR on green CI with a verdict on its head, unless it touches a protected path, adds a dependency or adds a server route. | Only a PR inside their Skill's stated surface: a docs or guide fix from `tend-docs`. A fix from `improve` waits for the owner. | Verification's step list, `merge`, hooks and their wiring, `site.yml`, both protected lists, the workflow, decision records, `docs/rulings.md`, `src/pages/api/`. |
| `hands-off` | As `standard`. | As `standard`, plus `improve`'s fixes to platform Skill text. | As `standard`. |

The preset is one value in `site.yml`, which is itself protected, and `merge`
reads it from `main`. Every preset keeps the verdict, the pinned head and the
protected-path refusal (REQ §5.4).

## 12. Identity and setup

Identity (REQ §3.3, §7 item 3):

- **Shared account (default).** Agents act as the owner. The provenance mark
  tells an agent's post from the owner's, and "the owner merges these paths"
  lives in `merge`, not in GitHub's review rules.
- **Machine account.** A second account's token is given to sessions. If
  pushes then show that identity **[untested]**, branch protection can
  require the owner's review on protected paths, and the mark only has to
  name the session.
- **GitHub App.** Possible only if its token is minted outside the session,
  because the cloud proxy blocks the minting endpoint. Not planned.

The design is built for the first option and loses code, not shape, under the
second.

Setup order, run by `setup-site` in a single-repo cloud session or on a laptop
(REQ §5.1):

1. Print the human steps below as one runnable checklist, before anything
   else.
2. Ask the choices: preset, each sweep's cadence, dashboard access, public or
   private, deploy target.
3. Write `site.yml`.
4. Create the issue labels and read them back.
5. Install the pack and pin it in one step; run the pack's setup Skill to
   write `docs/skill-notes/`.
6. Create the `records` branch with its folders.
7. Wait for the owner to confirm branch protection on `main`, with `verify`
   as a required check, before the first agent PR.
8. Run `verify`, open the first PR (the hello-world site), and merge it under
   the preset.
9. Create the sweep schedules.
10. Deploy, and confirm the live commit is visible from outside the server.
11. Warn that the harness's own classifier can still refuse a merge the owner
    authorised (REQ §3.4).

Steps that need a human or a laptop session:

- applying `.github/workflows/verify.yml`;
- branch protection and rulesets;
- repo settings such as visibility;
- the deploy host, its secrets and the dashboard secret;
- the cloud environment's setup script and network access;
- a machine account, if wanted.

## 13. Experiments before building

1. **Pushing to `records` from a cloud session.** Whether a cloud session may
   push a second branch beside its work branch, and whether a `.records/`
   checkout survives a resumed container. Sections 3, 5 and 6 rest on it.
2. **The session id in hook payloads** for cloud, laptop and scheduled runs,
   and whether a subagent sees its parent's. Sections 5, 6 and 8.1.
3. **OpenTelemetry from a scheduled run:** cost per subagent, and whether the
   last interval is flushed before a short run ends; and whether a run can
   read its subscription's usage window. Section 8.7.
4. **A machine account's token in a cloud session:** whether pushes and posts
   show that identity. Section 12.
5. **Client-router navigation against Terrarium's,** on the same three pages,
   timed on a phone. Section 4.
6. **The container:** build memory for an Astro site, and the dashboard
   reading a `records` checkout the deploy refreshes, or rebuilt on a schedule
   where the host has no file system at request time. Sections 4 and 9.
7. **Starting a session from a session** in the cloud and on a laptop, with a
   hand-over as its prompt. Section 7.
8. **Sync across two repos** in one session, which loads no hooks. Section 10.

## 14. What is still unclear about the implementation

Each question ends with where its answer probably lies:

- **[repo]** an agent can settle it from what Terrarium already records; the
  question names what to look at.
- **[owner]** only the owner can choose.
- **[spike]** it needs a small experiment.

### Repo shape and records

1. **Do records belong on their own branch?** The draft says yes, for three
   gains: no deploy per log, real protection on `main`, and nothing to filter
   in sync. The cost is that records are not in `main`'s tree and a clone
   needs a second checkout. **[owner]** **[spike]** (section 13 item 1)
2. **Who may write to `records`?** Nothing reviews a push there. The commands
   write only their own folders, but an agent can still push anything. Is a
   ruleset on that branch wanted? **[owner]** **[repo]**
   `docs/research/github-branch-protection-vs-autonomous-log-commits.md`
   lists what a ruleset can restrict.
3. **Are records private in a public repo?** A `records` branch in a public
   repo is public. Owner-only logs then need a second, private repo, which
   brings the two-repo session limits. **[owner]**
4. **One file per finding, or one file per run?** One per finding keeps writes
   free of conflicts but makes many small files. **[repo]** Count problems
   per session in `layers/journal/content/current/sessions/` to size it.
5. **How much of the transcript-derived half to keep.** The requirements keep
   timings, models, tokens, tools and subagents. How many lines of
   `scripts/session/transcript-trace.ts` those five need is unknown.
   **[repo]** Read that file and `shared/schemas/session.ts`.

### Stack and deploy

6. **Astro or Nuxt.** The draft picks Astro on the study's evidence. The owner
   knows Nuxt from Terrarium and values its navigation. **[owner]** **[spike]**
   (section 13 item 5)
7. **Markdoc or MDX** for components in Markdown. Markdoc fails the build on a
   mistake; MDX is more widely known and breaks on `{}` in prose (BD §6).
   **[owner]**
8. **Which deploy ships as the seed.** Terrarium's self-updating container
   is where the deploy requirements were learned. A static host with an
   adapter is simpler for a stranger but needs the dashboard fallback in
   section 9. **[owner]**
9. **Whether a container build of an Astro site needs the memory care**
   Terrarium's needed. **[spike]** **[repo]** `deploy/entrypoint.sh` shows
   what the current cycle guards against.

### Commands and hooks

10. **Can `verify --ci` name its failing step well enough?** Terrarium
    rejected a single CI step because the run summary lost the step's name.
    The draft writes
    the name to the job summary instead. Whether that reads as clearly as
    separate steps is a judgement. **[spike]** **[owner]**
11. **Is the provenance guard still wanted with a machine account?** The login
    would then mark an agent's post, and the header would only name the
    session. **[owner]** **[spike]** (section 13 item 4)
12. **Which closing-keyword cases `merge` must parse.** The requirement lists
    tense, colon, quotes and negation. **[repo]** The cases are in the tests
    beside `scripts/github/merge-pr.ts`; count which ones a real PR ever hit.
13. **What the stop hook may block on.** The draft blocks once, only after a
    commit or a PR with no log. Eighteen sessions still forgot to log
    after a merge (REQ §3.6). Should `merge` itself refresh the log, making
    the block unnecessary? **[repo]** Read how `scripts/session/log-session.ts`
    is called after a merge today.
14. **Which of Terrarium's quirk guards recur often enough to ship on day
    one.** The draft ships none. **[repo]** Count occurrences per guard-related
    cause in the Friction Ledger for the last month, and list the guards in
    `scripts/hooks/` each would need.

### Skills and steering

15. **How much of parallel steering ships first.** The draft ships `steer`
    serial and leaves room for isolated branches. The requirements' own
    question is the same (REQ §8 item 12). **[owner]**
16. **Can a session start the next session on a laptop?** If not,
    `next-session` degrades to printing a prompt there. **[spike]**
    (section 13 item 7)
17. **Which pack Skills are truly used.** The default list is the
    requirements' list plus `handoff` and `to-tickets`. **[repo]**
    `scripts/session/audit-skills.ts --skill <name>` reports each Skill's use.
18. **Is a digest a record or a site page?** The draft makes it a record with
    a checker and no PR. Terrarium's ADR-0010 chose a gated page, and
    REQ §4.5 asks for a review. **[owner]**
19. **Who may mark a cause accepted.** The draft leaves it to the owner, by
    closing the issue `improve` filed with a fixed label. **[owner]**
    (REQ §8 item 15)

### Sweeps and cost

20. **The default cadences.** Weekly sweeps on a quiet site may find nothing;
    daily ones cost about what Terrarium's did. **[owner]** **[repo]**
    `layers/journal/content/current/routines/*.yml` gives cost per run to
    multiply by any cadence.
21. **The thresholds in `improve`.** "Three occurrences or one major" is a
    guess. **[repo]** Replay it over the Friction Ledger's entries and see
    which causes it would have routed, and when.
22. **What `watch` checks with an agent.** The draft caps agent checks at five
    Skills a run and only for changed Skills. Which findings a mechanical
    check would have caught is unknown. **[repo]** Classify the
    observations in the per-Skill files in
    `layers/journal/content/current/skills/` by whether a script could have
    produced them (REQ §8 item 10). The draft's Skill view shows use count and
    open findings only; whether `watch` also grades each Skill's importance,
    as REQ §2.3 lists, is the owner's call. **[owner]**
23. **Whether nit-level problems become findings.** One file per nit may be
    more than half of all findings (REQ §8 item 9). They could stay in the
    log only. **[repo]** Count problems by severity in
    `layers/journal/content/current/sessions/`. **[owner]**

### Sync, autonomy and setup

24. **Is `sync offer` for the owner's sites only?** A stranger's site cannot
    push to the template; the draft gives it a patch file. **[owner]**
    (REQ §8 item 2)
25. **What a three-way patch does to a platform file the site changed
    heavily.** The draft trusts the Skill to resolve conflicts. A pilot site
    is the only real test (BD §7 item 3). **[spike]**
26. **Are three presets the right three?** The draft varies who merges, not
    where. The owner may want a preset where sweeps merge nothing but
    sessions merge freely, which `standard` does not offer. **[owner]**
27. **The first protected paths.** Section 11 proposes nine areas.
    **[repo]** Compare with the globs in
    `.claude/rules/adr-0004-human-merge.md`, minus the multi-Tenant ones.
    **[owner]** to confirm.
