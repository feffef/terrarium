# A single-site template: combined design draft

**Status: a proposal by the writing agent; decides nothing.** Written on
2026-11-13 from the Terrarium repo at `6f5642f79`. It stands alone: it names
Terrarium's files and Friction Ledger entries as evidence, and needs no other
design note. A choice that rests on a fact nobody has tested is marked
**[untested]**, and section 13 collects them. A number proposed without
evidence is marked *(guess)*.

## The goal

A GitHub template for one content website that agents build and one owner
steers. A new site is made from the template. A Claude Code session sets it up
and leaves a hello-world site with the commands, hooks and Skills below. The
owner then works like a product owner: chats, files and reads issues, and
merges what the chosen preset keeps for them. Content is Markdown and YAML in
the repo, and server routes are possible.

The template takes from Terrarium only what earned its place. Everything that
exists there for several Tenants, outside contributors or the public experiment
is left behind.

## What the owner has settled

- **For whom:** the owner's own sites first, usable by a stranger. A site has
  no outside contributors.
- **One repo per site.** No second repo for records or for the owner area.
- **Cloud and laptop sessions** must both work.
- **Greenfield.** Terrarium's decision records bind nothing here; they are
  evidence of what was tried.
- **Platform and site are kept apart.** Platform changes may flow back to the
  template; a site's records never do. Offering a change back is an ordinary
  pull request on the template.
- **Everything ships, and anything can be removed.** Every sweep and the owner
  area are in the template; a site may delete any of them.
- **Sweeps:** a watcher that catches what sessions miss about themselves, one
  self-improvement sweep, docs upkeep the owner steers with standing rulings, a
  visitor sweep that only reports, and a daily digest.
- **Cadence:** daily by default for fast turnaround, set at setup. No Skill
  may assume a cadence.
- **The digest** appears in the owner area by itself after a fact check, with
  no pull request.
- **The guide, the dashboard and the digests** are kept apart from the site's
  content by folder or, better, by port, so the owner decides who sees what.
- **Three presets** decide what agents may merge (section 11).
- **Parallel steering** may come after a first version, but the design must
  allow it.
- **Browser-side navigation** must be available as an opt-in.
- **Platform Skills carry a project-name prefix.** The name is not chosen;
  `NAME-` stands in for it.
- **Identity:** agents act under the owner's account. A separate agent
  identity is an option, not yet set up.

Not settled: where records live (section 3.1) and the stack (section 4).

## Evidence from Terrarium

Checked by the writing agent on the day of writing, unless marked.

1. A session lands its log with a plain `git push <commit>:refs/heads/main`
   while another branch is checked out (`scripts/session/log-session.ts:336`).
   Pushing to a second branch is therefore nothing new.
2. The deploy rebuilds the site on every new `main` commit, with no path
   filter (`deploy/entrypoint.sh`, poll loop), so each log costs a rebuild.
3. A GitHub ruleset can exempt a role, a team or an app, never one person and
   never a path. So `main`'s ruleset gives the repository admin an "Always"
   bypass, which covers every agent session, only so that logs can land
   (`docs/research/github-branch-protection-vs-autonomous-log-commits.md`).
4. The session id comes from the environment variable
   `CLAUDE_CODE_REMOTE_SESSION_ID` in a cloud session and from the transcript
   on a laptop (`scripts/session/transcript-trace.ts:487-494`).
5. The gate's step list exists in three copies kept equal by a test. A cloud
   session cannot push `.github/workflows/` but can push `.github/actions/`.
   CI success reaches a waiting session only through a comment the action
   posts (ADR-0026, `docs/agents/github-integration.md`).
6. The order "review, gate, push, open the PR, subscribe" is prose. Its
   Friction Ledger entries: `prepush-gate-review-skipped` 21 occurrences
   (accepted), `edit-during-gate-run` 31, `push-chained-to-gate-run` 11,
   `pr-opened-without-subscribe` 4, `pr-asked-before-opening` 2.
7. The merge script never touches the session log. The Stop hook that asks for
   a second log after a merge had to prompt a session 4 times
   (`close-session-reminded-by-stop-hook`) and fired with no merge 13 times
   (`merge-close-hint-fires-without-merge`), because it matches a command's
   text, not a merge.
8. Agents typed the reviewed commit id wrongly 8 times
   (`verdict-comment-hand-typed`). A script now prints the line, and the agent
   still has to paste it.
9. The 163 current session logs hold 938 Frictions: 467 nit, 405 minor, 64
   moderate, 2 major. A subagent's script found that 11 of the 93 causes with
   a recorded fix had only nit occurrences (not re-run).
10. A subagent classified the 60 newest `audit-skills` observations by hand: 16
    rest on git, GitHub or log fields alone, 44 needed judgement (not
    re-checked).
11. Mean list-price cost per run over each Routine's newest 30 runs:
    `audit-skills` $12.66, `visitor-loop` $7.93, `audit-docs` $6.13,
    `frictions-to-fixes` $4.08, `digest` $1.79
    (`layers/journal/content/current/routines/*.yml`).
12. No GitHub API attaches an image to a PR or comment
    (`docs/agents/github-integration.md`).
13. A Routine's schedule lives outside git
    (`scripts/gate/validate-skill-cadence.ts`).

## 1. Design principles

1. **One definition of each thing, run the same way everywhere.** A laptop, a
   cloud session and CI run verification through one command. One copy needs
   no parity test.
2. **A cheap check first; prose for judgement.** A rule that a lint rule, a
   type, a test or a command's refusal can enforce gets that check when it is
   written. A guard on tool calls is the last resort, and a mechanism that
   costs more than the problem it prevents is removed.
3. **The machine records machine facts; the agent writes only judgement.**
   Session ids, commit ids, timings, tokens and PR state are never typed.
4. **What can be derived is derived when read, never stored.** A log's status,
   a cause's fix state and a sweep's silence follow from records that already
   exist.
5. **Three things stay apart: the site, the owner area and the records.** The
   site holds only the site. Writing a record never deploys anything.
6. **Every sweep is removable and assumes no cadence.** Sweeps meet only in
   the records. Deleting one leaves verification green and the others working,
   and each run starts from what the last run recorded, whenever that was.
7. **Everything is bounded from the start.** Each read has a cap and a total
   count, each run a work limit, each output a size limit.
8. **Few concepts, plain words, one home per fact.** The glossary fits on one
   screen. A standard tool comes before our own code, and an installed Skill
   does the job it was installed for.

## 2. Concepts

Terms are plain lowercase words, written the same in prose, commands and file
names.

| Term | Meaning |
|---|---|
| owner | The one person who steers the site and merges what agents may not. |
| site, platform, seed | The three kinds of file (section 3). |
| session | One Claude Code conversation working on the repo. |
| log | A session's record: the agent's judgement plus machine facts. |
| problem | Something that cost a session time or went wrong, graded nit to blocker. It lives in the log. |
| finding | What a sweep reports for follow-up: a problem, an idea or a learning, with evidence. |
| cause | The root of one or more problems and findings, with its fixes. |
| sweep | A Skill run on a schedule or on demand that looks after the site and how it is built. |
| records | Logs, findings, causes, run rows, digests and sweep notes: data, not site content. |
| owner area | The pages for the owner: the dashboard (sessions, causes, sweeps, cost), the digests and the guide. |
| verification | The fixed checks a change passes before it may merge; `verify` runs them. |
| verdict | The posted review result that names the reviewed commit. |
| protected path | A path whose changes the owner merges. |
| preset | The one setting that says what agents may merge. |
| ruling | A standing owner instruction every sweep run obeys. |

Why these words: each is an ordinary word whose everyday meaning is its
meaning here, and none names a Claude Code or GitHub feature. "Sweep" is used
because loop, routine and task each do.

Names still open, with the working pick first and alternatives after it:

- the Skill prefix: `NAME-`, until the platform has a name;
- seed: starter;
- ruling: owner rule, standing order;
- owner area: console, back office;
- the presets `review-all`, `standard`, `hands-off`: supervised, standard,
  autonomous; or low, medium, high.

Terrarium terms that are not needed: Tenant, Space, Collection, manifest,
Catalog, Aggregator, Trusted and Public, Friction and Friction Ledger (problem,
cause), Routine (sweep), Journal and Glass Box (owner area), Skill Inventory,
seedling, Prune Trial, gate (verification), Human-only (protected path),
Persona.

## 3. Repo shape

```
CLAUDE.md                     site; imports platform/guidance.md and both glossaries
GLOSSARY.md                   site; the site's own terms
site.yml                      site settings: preset, template commit, owner-area access,
                              extra protected paths, extra installed Skills
package.json                  mixed (section 10)
src/                          the site: pages, layouts, components, styles
  pages/api/                  server routes (protected)
content/                      the site's Markdown and YAML, one folder per kind
content.config.ts             a typed schema per kind of content
tests/                        the site's own tests and content rules
guide/                        guide pages; shown in the owner area, never by the site
docs/decisions/               decision records; about five shipped
docs/skill-notes/             repo docs that adapt installed Skills
docs/rulings.md               the owner's standing rulings (protected)
docs/human-steps/             changes only a person or a laptop session can apply
deploy/                       the deploy setup picked
platform/
  guidance.md                 the platform's always-loaded instructions
  glossary.md                 the terms in section 2
  paths.txt                   the list of platform paths
  protected-paths.yml         the protected lists (section 11)
  package-keys.json           the package.json keys sync owns
  commands/                   verify, check, log, ship, merge, preview, sync
  hooks/                      hook scripts and the hooks block for settings
  lib/                        helpers shared by commands and hooks
  schemas/                    log, finding, cause, run and site.yml schemas
  docs/                       how-tos for agents: git and PRs, issues, caveats, hooks, dispatch
  owner-app/                  the owner area (section 9)
  tests/                      tests of commands and hooks
.claude/skills/               NAME-* platform Skills and the installed Skills
.claude/rules/                a few hand-written path-scoped rules
.claude/settings.json         mixed (section 10)
skills-lock.json              pins every installed Skill
.github/workflows/verify.yml  checkout and one `uses:` line; applied by a person
.github/actions/verify/       setup, one `verify --ci` step, the wake comment
.github/dependabot.yml        grouped dependency updates
```

Kinds of file:

- **platform** (the template owns and updates it): `platform/`, the `NAME-*`
  Skills, the installed Skills and their lock, `.claude/rules/`,
  `.github/actions/verify/`, the workflow file.
- **seed** (the template provides it once, then the site owns it): `src/`,
  `content/`, `content.config.ts`, `tests/`, `guide/`, `docs/decisions/`,
  `docs/skill-notes/`, `deploy/`, `.github/dependabot.yml`.
- **site:** `CLAUDE.md`, `GLOSSARY.md`, `site.yml`, `docs/rulings.md`,
  `docs/human-steps/` and the records.
- **mixed:** `package.json` and `.claude/settings.json` only.

### 3.1 Where records live: two options

The owner has not chosen. Only `platform/lib/records` knows the place, so the
rest of this draft reads the same under either option.

```
logs/<year>/<month>/<day>-<session>.yml   one file per session
findings/<day>-<sweep>-<session>.yml      one file per sweep run
causes/<cause>.yml                        one file per cause
runs/<sweep>/<day>-<session>.yml          one row per sweep run: time, cost, coverage
prs/<number>.yml                          a PR's state, as last seen on GitHub
digests/<day>.md                          one page per finished day
memory/<sweep>.md                         a sweep's size-capped notes
```

| | A: a `records` branch, checked out at `.records/` | B: a `records/` folder on `main` |
|---|---|---|
| Deploy | A record never touches `main`, so it never rebuilds the site. | Every record is a `main` commit; the deploy must skip commits that touch only `records/`. |
| Protecting `main` | The ruleset needs no bypass: every `main` commit comes through a PR that passed verification. | The owner's credential needs an "Always" bypass to push records, and that bypass covers every agent session. Nothing on GitHub narrows it; only the commands that write records keep to their own files. |
| Sync | Nothing to filter; a record can never ride in a PR. | The allow-list must keep `records/` out. |
| History | `main`'s history is the site's history. | Record commits sit between work commits. |
| Setup | Every session needs a second checkout, made by the session-start hook **[untested]**. | One tree; a fresh clone has everything. |
| Proven | The push works the same way as today's log push; the second checkout is new. | This is what Terrarium does today. |
| Reading | Docs upkeep and the owner area read two trees. | One tree. |
| Guarding the store | Nothing reviews a push to `records`; a ruleset there can only block deletion and force pushes. | The same, plus the wide bypass on `main`. |

Under both, a public repo makes its records public. The owner chose one repo,
so owner-only records mean making the site's repo private. The writing agent leans to A if
experiment 1 passes.

Writers never collide: a session writes only files named for itself. Only
sweeps write `causes/` and `memory/`, and only `merge` and `NAME-watch` write
`prs/`. A push that loses a race rebases and retries.

## 4. Stack

**Proposal: Astro with its Node adapter, content collections and Markdoc.** The
owner has not decided the stack; this pick makes the rest concrete. The points
below were seen in throwaway test builds and not re-run for this draft, so
treat each as **[untested]**.

- A content file that breaks its schema fails the build and names the file and
  field, so content validation is the framework's own.
- A mistake in a Markdoc component block fails the build with file and line.
  MDX catches only some, and breaks on `{}` in prose.
- Content pages are prerendered and ship no JavaScript. Browser-side
  navigation is one opt-in, Astro's client router.
- Server routes and on-demand pages work.
- Astro's fast check misses a broken reference between content files, so
  `check` covers references itself.

Caveats:

- Whether the client router feels as fast as Terrarium's navigation is
  **[untested]**. If Nuxt clearly wins that test, choose Nuxt and keep content
  validation as our own script.
- Astro ships major versions often. The stack's decision record says who
  applies one and how sync carries it.
- Build memory in a container is **[untested]**.

The owner area is a second small Astro app in the same repo (section 9). How
two apps share one repo, one install and one container is **[untested]**.

Whatever deploy setup picks keeps four rules. A merge is a deploy. A failed
install or build never replaces the live site, and the next cycle retries. The
live commit and build time show in the footer and at `/version`. The deploy
credential never enters the repo's git config.

## 5. Commands

Each command is a package script that runs one file in `platform/commands/`.
An agent and a person type the same thing. Each fails closed and is tested
against the guarantees in its row.

| Command | What it guarantees |
|---|---|
| `verify` | Runs one step list: reinstall if dependencies are stale, lint, types, content, unit tests, build, browser smoke test, then the platform's own checks (commit trailers, pinned Skills, guide excerpts, the copies sync owns). It records HEAD and the tree first, aborts between steps if either changed, and checks once more at the end. It refuses a shallow checkout. No step is skipped by changed paths. With `--ci` it installs from the frozen lockfile and writes the failing step's name to the job summary and an error annotation. |
| `check` | The seconds-fast subset for iterating: content against its schema, YAML traps (an unquoted `#`, a folded line ending in a hyphen) and references between content files. It never replaces `verify`. |
| `log` | Lands this session's log in the records. The agent supplies only the judgement half: goal, outcome, problems, ideas, who asked. The session id comes from the environment or the transcript, never from the agent. A second run replaces the machine half and merges the authored half. It gives each problem an id. A failure prints one loud line and exits non-zero. A log in an unknown schema version is held, not dropped. The authored half is pushed when written, so it survives a reclaimed container. Times are UTC. |
| `ship` | For the current branch: runs `verify`, pushes exactly the verified commit, and opens the PR with this session's header. When the diff touches UI paths it runs `preview shot` and makes the screenshots reachable from the PR. It prints the one step only the agent can do: subscribe to the PR. |
| `merge` | `merge verdict <pr>` posts the verdict with the head commit id read from GitHub. `merge <pr>` waits for CI in a way that suits a background run, then merges pinned to the reviewed head, so a late push fails the merge. It reads the preset and the protected lists from `main`, follows renames, and refuses when a list is unreadable. It parses closing keywords as GitHub does and refuses one that names an issue the owner has not approved. It closes issues GitHub left open, reports "merged" only after GitHub confirms, writes the PR's row and refreshes the session's log. It never uses GitHub's auto-merge. An owner waiver is quoted in the merge commit and lifts only the protected-path refusal. |
| `preview` | `start`, `stop` and `shot`, for the site and the owner area. It owns its server by process id, its stop always succeeds, and each preview gets its own port. `shot` builds for production, waits for a real, hydrated page, and captures light and dark at desktop and phone size in one call. It can assert on the rendered DOM. |
| `sync` | `sync take` and `sync offer` (section 10). It runs its own checks, because a session with two repos attached loads no hooks **[untested]**. |

Why `ship` exists: the order before a push is prose in Terrarium, and its
slips are among the most recorded (evidence 6). One command that verifies and
pushes the same tree removes the chained push and the tree mismatch, and
leaves no moment to ask whether to open the PR. It does not check that a
review ran: the reviewed commit rarely equals the pushed head, and `merge`
already demands a verdict that names the head.

Why one `verify --ci` step: three copies of the step list drifted in Terrarium
until a test compared them (evidence 5). One definition cannot drift. The step
runs inside an action agents can push, so a setup change never waits for a
person. Whether a job summary names the failing step as clearly as separate
steps is **[untested]**.

**Shared helpers** live in `platform/lib/`: reading `site.yml`, the session id,
the records (their place, a rebase-and-retry push, and one bounded reader that
returns newest first with a cap and a total count), GitHub requests that throw
on a paging gap, and the provenance header.

**A new rule** gets its check in the same PR when a lint rule, a type, a test
or a `verify` step can enforce it, and then no prose. Only a judgement call
becomes a line in `platform/guidance.md`. A tool-call guard is added only
after a problem recurs despite a cheaper check.

**`platform/guidance.md`** starts with eleven lines and nothing else:

1. Verify before you state: check ids, counts, causes and subagent claims
   against their source this turn.
2. Question the premise; add nothing beyond the ask.
3. Ask before building what the owner will see, and show a sample first.
4. Review, then `ship`; subscribe to the PR it opens.
5. An empty task prompt means stop and ask.
6. Read a required doc whole.
7. Never chain a commit or push with a check.
8. Run long commands in the background and end the turn.
9. After a restart, check that background work is alive before reporting it.
10. Use plain words; coin a term only on its second use.
11. Settle a stored field's shape with the owner first.

## 6. Hooks

Five hooks. Each has a pure core and a test, and one page in `platform/docs/`
says how to add one and how it must fail.

1. **Session start.** Installs from the frozen lockfile, fetches full history,
   makes the records readable, prints what loaded. Fails open with a loud
   line; `verify` and `merge` fail closed later on what it left undone.
2. **Provenance guard, before a GitHub write.** Refuses an issue, PR, comment
   or review body without this session's header and prints the exact line to
   use. Fails closed. A commit hook adds the commit trailer, and `verify` fails
   when a branch commit lacks it.
3. **Workflow-file guard, before a commit, cloud only.** Refuses a commit that
   touches `.github/workflows/` and points to `docs/human-steps/`. Fails
   closed, because one such commit strands the whole push.
4. **Stop.** Lands the log when its authored half changed. Blocks the stop
   once when the session made a commit or opened a PR and wrote no log, and
   once when it opened a PR and did not subscribe. It never speaks mid-run.
   Fails open.
5. **Session end and resume.** A fallback that lands a log the Stop hook did
   not. Fails open.

A Stop block reads its trigger from a result (a PR number that came back, a
commit that exists), never from a command's text (evidence 7). No hook asks
for a second log after a merge: a log's status is derived, and `merge`
refreshes the log.

Deliberately not carried over:

- a guard that denies a first call until a doc is read;
- hints that point to a doc after an edit, and tracking of which rules loaded;
- generated summary rules for decision records;
- every other guard against a cloud or tool quirk (the workflow-file guard is
  the one that ships): each starts as a line in the caveats doc and becomes a
  guard only when it recurs;
- locks, slots, step-skipping and an edit guard around verification, whose
  own snapshot covers a changed tree.

## 7. Skills

Platform Skills carry the `NAME-` prefix, so they never clash with an installed
Skill.

| Skill | Purpose | Replaces in Terrarium |
|---|---|---|
| `NAME-setup` | Walks a new site through section 12 and hands over the human steps as a runnable checklist. | new |
| `NAME-close` | Judges that a session reached an honest stopping point, writes the judgement half and runs `log`. | `close-session`, `log-session` |
| `NAME-steer` | Works the backlog: triage every open issue read-only, ask the owner once, then build, review, `ship` and report one line per issue. Serial at first, parallel later. | `clear-backlog`, `auto-triage`, `dispatch-subagents` |
| `NAME-improve` | The one self-improvement sweep (section 8.3). | `frictions-to-fixes`, `harvest`, `prune-trial` |
| `NAME-watch` | Catches what sessions did not notice about themselves (section 8.2). | `audit-skills` |
| `NAME-docs` | Keeps docs, decision records and the guide true to the code (section 8.4). | `audit-docs`, `glassbox-update`, `glassbox-curate` |
| `NAME-visit` | Sends visitor agents through a preview and reports what they find (section 8.5). | `visitor-loop` |
| `NAME-digest` | Writes one page per finished day (section 8.6). | `digest` |
| `NAME-sync` | Runs `sync take` or `sync offer` and resolves conflicts. | new |
| `NAME-skills` | Updates the installed Skills, lists the ones that changed and re-reads every skill note. | by-hand updates |
| `NAME-next` | Hands the work to a fresh session. | by-hand session creation |

**Installed Skills shipped by default** (from `mattpocock/skills`):
`grilling`, `code-review`, `tdd`, `diagnosing-bugs`, `domain-modeling`,
`triage`, `to-spec`, `to-tickets`, `prototype`, `research`, `wizard`,
`writing-for-agents`, `retro`, `wayfinder`, `handoff` and
`setup-matt-pocock-skills`. **Optional:** `implement`, `grill-with-docs`.
Every installed Skill is pinned at install, and `verify` fails on drift.

**Platform Skills wrap installed Skills and never replace them:**

- A platform Skill calls an installed Skill by name for that Skill's job and
  adds only its own step. `NAME-steer` runs `triage` per issue and `code-review` per
  branch. `NAME-next` runs `handoff`, then starts the session. `NAME-setup`
  runs `setup-matt-pocock-skills` and hands over through `wizard`.
- Where the platform needs different behaviour, the difference is a file in
  `docs/skill-notes/` that the installed Skill reads. One ships filled in: only
  triage sets a ready label.
- An installed Skill is never edited. `NAME-skills` treats an upstream rename or
  deletion as its own listed step and says in its PR which notes it re-read.

**Dispatch rules** for any Skill that briefs other agents live in one file,
`platform/docs/dispatch.md`, which that Skill reads as its first step. No
guard enforces the read. The rules: every agent that touches git works in its
own checkout; a brief is self-contained; each final reply is kept verbatim; a
stopped agent is resumed, never started again; before finishing, every branch
is pushed or dropped.

**Work too big for one session** is planned with `wayfinder`: a map with
decision tickets, one ticket per session. `NAME-next` is the one command
between sessions. It writes the hand-over (the map, the ticket claimed, the
Skills to load, and pointers to issues and branches, not copies), then starts
the next session with it. A tool that creates a session with a prompt and a
branch exists in cloud sessions; using it this way is **[untested]**. On a
laptop the fallback is to print the prompt to paste. Guidance tells a session
to hand over before its context fills; a fixed threshold needs the session to
see its own context use **[untested]**.

## 8. Sweeps

Five sweeps ship. Each is a Skill plus one schedule the owner can change or
delete, and each can be run by hand.

### 8.1 What sweeps share

**A finding** is written by a command, which makes the id and reads the
commit:

```yaml
id: 2026-11-13-visit-0007     # made by the command
source: visit                 # watch | docs | visit
session: session_01...        # the run that wrote it
kind: problem                 # problem | idea | learning
severity: minor               # nit | minor | moderate | major | blocker; problems only
where: /blog/hello-world      # a route, a file path or a Skill name
what: The footer link to the feed returns 404.
evidence: preview at phone size; link target /feed.xml
commit: 3f2a9c1               # the commit the sweep looked at
verified: true                # checked against the source and the rendered page
match: null                   # the issue or earlier finding it repeats
proposal: null                # the smallest fix, optional
```

**Problems stay in the log.** A session's problems, ideas and learnings have
one home, its log. `NAME-improve` reads them and the sweeps' findings through
one reader, in one shape. Nothing stores a "taken" mark: an entry is taken
once a cause lists it, or once an `NAME-improve` run row lists it as dropped.

**Sessions report every problem, nits included.** About half of Terrarium's
recorded Frictions are nits, and some fixes came from nits alone (evidence 9).

**No cadence.** A sweep starts from its last run row: when it ran and what it
covered. Its work per run is bounded, so a run after a day and a run after a
month are both correct. A sweep is shown as possibly stopped when its last run
is older than twice the usual gap between its earlier runs.

**Cost is read after the run.** Any sweep's first step records cost and tokens
for finished runs that lack them, on the assumption that a finished run's cost
is easier to read than a running one's **[untested]**. A figure that cannot be
read is stored as "unreported", never guessed (Terrarium's
`get-session-cost-unreported` has 7 occurrences).

### 8.2 `NAME-watch`

- **Script checks, no agent:**
  - a PR or commit that names a session with no log;
  - a log's PR whose state on GitHub differs from its `prs/` row, which the
    check then rewrites;
  - a merge with no verdict naming its head;
  - a sweep that is possibly stopped;
  - a run row with no cost;
  - a stop that needed the hook's block.
- **Agent checks, at most five Skills a run** *(guess)*: only for Skills whose
  text or runs changed since the last run. Each grades a run against the Skill
  text in effect when that run started, and each finding is checked against
  its source before it is written. This is the larger part of the watcher's
  value (evidence 10).
- **Rules:** an inconclusive scan is reported as inconclusive, never as zero.
  A possible stop is an observation, not a failure. Output is findings only,
  at most twenty a run *(guess)*. It files no issues; `NAME-improve` decides
  what becomes one.

Two checks are left out on purpose. Installed-Skill drift fails `verify`, and
a sweep note over its size cap is refused by the command that writes it.

### 8.3 `NAME-improve`

1. **Collect** every problem, idea, learning and finding not yet taken.
2. **Dedupe once, for every source:** against open and closed issues, decision
   records, rulings, accepted causes and trials. A title match is a hint, not
   a match.
3. **File** each entry under a cause, new or existing, with a command that
   copies text; nothing is retyped.
4. **Route** each cause that has three occurrences or one `major` *(guess)*:
   - a cause that came back after a fix goes to the owner as an issue naming
     that fix, before any new fix;
   - an accepted cause is never proposed again;
   - a safe fix becomes one reviewed, verified PR that prefers a deletion;
   - anything touching an installed Skill, a decision record, a hook or
     settings becomes an issue.
5. **Ideas and learnings** become issues labelled for triage.
6. **Report** once: every number with its source, every dropped entry with its
   reason.

Bounds: five causes and three PRs a run *(guess)*. A cause's fix state is
derived from occurrences dated after its latest fix. The owner marks a cause
accepted by closing its issue with a fixed label. A cut may be noted on its
cause as a trial and judged by later occurrences; there is no separate trial
machinery. The sweep's own briefs are a `where` like any other, so its own
problems reach it.

### 8.4 `NAME-docs`

- **Scope:** `platform/guidance.md`, `docs/`, `platform/docs/`, Skill texts,
  decision records and the guide, against the code and the records.
- **Each run** checks the diffs merged since its last run, then one further
  area chosen from what earlier run rows say was actually read.
- **A finding is applied only after an independent checker** compares it with
  the primary source. For a rewrite, the checker first lists every rule,
  exception and reason in the original. A rewrite that loses one, or is not
  shorter or plainer, is rejected.
- **A decision record's decision never changes in this sweep.**
- **A conflict no source settles** becomes an issue the sweep files itself.
- **Steering:** every run reads `docs/rulings.md` whole, and only the owner
  changes it. The sweep's own open leads live in `memory/docs.md`, capped at
  800 words *(guess)* by the command that writes it.
- **The guide:** a page that cites code names the commit it was checked at,
  and `verify` fails when a cited excerpt no longer matches.
- **Bounds:** one further area and ten applied findings a run *(guess)*. A
  diff over 200 changed lines gets `code-review` even when mechanical. A
  scheduled run never asks the owner for a focus.

### 8.5 `NAME-visit`

- **Inputs:** the real route list from the build, not a link crawl; rulings,
  open issues, merged PRs and recent findings.
- **Scope** comes from the coverage in its run rows. Pages, viewport (desktop,
  phone), colour scheme (light, dark) and persona not yet covered come first.
- **Personas:** first-time reader, visitor with a task, keyboard-only visitor,
  returning visitor.
- **Each finding is verified** against the source and the rendered page before
  it is written. A repeat names its earlier finding or issue in `match`.
- **Bounds:** twelve pages and forty screenshots a run, and fifteen images for
  any one screenshot-reading agent *(guess)*.
- **It builds nothing.**

### 8.6 `NAME-digest`

- A script finds finished UTC days with activity and no digest, and gathers
  one day's material from logs, merged PRs and run rows.
- The Skill writes the prose: what changed in the project that day, for the
  owner.
- A separate checker compares every claim with the merged diffs. A word such
  as "weekly" needs a source.
- The page lands once in the records and is never rewritten. The owner area
  shows it with no further step. A run writes at most three missing days.

### 8.7 Schedules and cost

- **Default:** every sweep daily. Setup asks, and "off" is a valid answer.
- **Schedules live in Claude Code, not in the repo** (evidence 13).
- **A reference figure:** at Terrarium's mean cost per run (evidence 11), five
  daily sweeps come to about $33 a day at list price. A small site should
  cost less: the watcher checks at most five Skills, and the visitor sweep no
  longer builds.
- **No hard budget cap is known** for a scheduled cloud run **[untested]**, so
  each sweep is bounded by work, and its run row records an overrun.
- **Cost per subagent** needs OpenTelemetry export **[untested]**; until then
  a run row carries the session's total.
- Every cost is labelled a list-price estimate.

## 9. Observability: the owner area

The owner area is a small second app, `platform/owner-app/`, on its own port.
The site knows nothing of it. Its pages:

- **Sessions:** newest first, fifty a page with the total. Each shows goal,
  derived status, outcome, PRs, problem counts by severity, time, models, and
  the subagent share of tokens and run time.
- **Causes:** one row per cause over a time window (default seven days), with
  occurrences, fixes and the derived fix state.
- **Sweeps:** last runs, cost per run and per week, coverage, "possibly
  stopped", and the size of each sweep's notes.
- **Skills:** each Skill's use count and the watcher's open findings on it.
- **Headline tiles:** sessions, problems by severity, sweep spend, open ideas.
- **Digests:** one per day, newest first.
- **Ideas:** open idea findings and the issues they became.
- **Guide:** the pages in `guide/`.
- **Live:** the deployed commit and build time of the site and of this app.

Every view is a query over a records folder through the bounded reader, so a
new record shows with no page edit.

**A log's status is derived:** it joins the log's PR numbers with the `prs/`
rows. `merge` writes a row when it merges; `NAME-watch` writes one for a PR
the owner merged by hand. These rows are the one stored copy of an outside
fact, kept so the owner area needs no GitHub token.

**Reading records.** The app reads a checkout of the records that the deploy
refreshes on its cycle, so a new record shows within one cycle with no build.
On a host with no file system at request time, the fallback is a scheduled
rebuild of this app **[untested]**.

**Access.** `site.yml` holds one setting each for the guide and the dashboard
(digests included): owner-only, the default, or public. The app's middleware
checks an owner secret held in the host's environment. Because the app has its
own port, a host or proxy can also close the whole area. On a host that offers
one port, the app is mounted under one path prefix instead.

**The guide** starts with the template's pages on how the platform works and
grows with the site. Its pages are seed files, and `NAME-docs` keeps them true
to the code.

## 10. Mixed files and sync

`CLAUDE.md` is a site file that imports `platform/guidance.md` and both
glossaries, so sync never edits a file the site writes in.

| File | Approach |
|---|---|
| `package.json` | Sync owns the scripts and dev dependencies named in `platform/package-keys.json` and touches nothing else. `verify` fails when a platform script differs from that file. |
| `.claude/settings.json` | Sync owns the `hooks` key, copied from a file in `platform/hooks/`. Permissions and the rest are the site's. `verify` checks the copy. |
| `skills-lock.json` | Platform. A site that installs an extra Skill lists it in `site.yml`, and sync keeps that entry. |
| `platform/protected-paths.yml` | Platform. A site adds its own paths in `site.yml`. |
| `.github/workflows/verify.yml` | Platform, but never applied by a cloud session: sync writes the new file to `docs/human-steps/` with the command to apply it. |
| `guide/` | Seed. Sync offers new template pages as additions and never overwrites a page the site changed. |

A repo made from a template shares no history with it, so no merge works
between the two. Sync works by file.

**Taking updates (`sync take`):**

- reads the template commit last taken from `site.yml`;
- applies the template's changes to the paths in `platform/paths.txt` since
  that commit as a three-way patch;
- leaves conflicts for the `NAME-sync` Skill;
- writes the new commit to `site.yml` in the same PR, so a partial sync fails
  `verify`;
- opens one PR, which the owner merges because it touches protected paths.

**Offering changes (`sync offer`):**

- selects by allow-list: only paths in `platform/paths.txt`, compared with the
  template at the recorded commit;
- refuses if the selection holds anything from the records, `content/` or
  `guide/`;
- puts the change on a branch of a template checkout: the template itself for
  someone with push access, their fork for anyone else;
- the change then goes in as an ordinary pull request on the template, whose
  CI makes a fresh site from it and runs `verify`.

Only the trigger is manual: the owner asks for a take or an offer. The
template or the fork must be attached to the session.

## 11. Autonomy

One value in `site.yml`, read by `merge` from `main`, decides what agents may
merge. Every preset keeps the verdict, the pinned head and CI on that head.

| Preset | Sessions may merge | Sweeps may merge | The owner merges |
|---|---|---|---|
| `review-all` | Nothing. | Nothing. | Every PR. |
| `standard` (default) | Their own PR, unless it touches a path on either list or a UI path. | A PR inside their Skill's stated surface: a docs or guide fix from `NAME-docs`, a safe fix from `NAME-improve`. | The security list, the standard list and UI changes. |
| `hands-off` | Their own PR, UI changes included, unless it touches the security list. Also a dependency's minor or patch update. | Any PR inside their Skill's stated surface, unless it touches the security list. | The security list only. |

**The security list** (protected under every preset):

- the `merge` command, `platform/protected-paths.yml` and `site.yml`;
- hook scripts and `.claude/settings.json`;
- the workflow file and the CI action;
- `deploy/` and the owner area's access check;
- server routes under `src/pages/api/`;
- a new dependency or a major version update;
- `docs/rulings.md`, because it is the owner's standing word to every sweep.

**The standard list** (also protected under `standard`): decision records,
`.claude/rules/`, verification's step list, `content.config.ts` and the
framework's config, and `package.json`. Under `standard` an agent also leaves
to the owner a change whose behaviour no test or verification step can
observe; that rests on the agent recognising it.

**UI changes under `standard`.** Agents struggle with UI without steering, so
the owner stays in the loop twice. Guidance says to ask before building what
the owner will see. And `merge` refuses a PR that touches the site's layouts,
components or styles: `ship` has made its screenshots reachable from the PR,
and the owner merges after looking. A change to content alone merges itself.

These are two lists and one rule, not a risk tier per path: each preset still
merges on green by default and names its exceptions.

An owner's word in the session to merge a protected PR is quoted in the merge
commit and lifts only that refusal.

## 12. Identity and setup

**Identity:**

- **Shared account (default).** Agents act as the owner. The provenance mark
  tells an agent's post from the owner's, and "the owner merges these paths"
  lives in `merge`, because GitHub cannot tell the two apart.
- **Machine account (option).** A second account's token is given to
  sessions. If pushes then show that identity **[untested]**, GitHub can
  require the owner's review on protected paths, and the mark only has to
  name the session.
- **GitHub App.** Possible only if its token is minted outside the session.
  Not planned.

**Setup,** run by `NAME-setup` in a single-repo cloud session or on a laptop:

1. Print the human steps below as one runnable checklist, before anything
   else.
2. Ask the choices: preset, each sweep's schedule, access to the guide and
   the dashboard, public or private, deploy target.
3. Write `site.yml`.
4. Create the issue labels and read them back.
5. Install the Skills and pin them in one step; run
   `setup-matt-pocock-skills` to write `docs/skill-notes/`.
6. Set up the records.
7. Wait for the owner to confirm the ruleset on `main`, with verification as
   a required check, before the first agent PR.
8. Run `verify`, `ship` the hello-world site and merge it under the preset.
9. Create the sweep schedules.
10. Deploy the site and the owner area, and confirm the live commit is
    visible from outside the server.
11. Warn that the harness's own classifier can still refuse a merge the owner
    allowed.

Steps that need a person or a laptop session:

- applying `.github/workflows/verify.yml`;
- the ruleset and repo settings such as visibility;
- the deploy host, its secrets and the owner secret;
- the cloud environment's setup script and network access;
- a machine account, if wanted.

## 13. Experiments before building

1. **A `records` branch from a cloud session:** the second checkout at session
   start, and whether it survives a resumed container. Only option A needs it.
2. **Two apps in one repo:** the site and the owner area with one install, one
   `verify`, two ports and one container; build memory for both.
3. **The owner area reading records** that the deploy refreshes, with no
   build; and the fallback on a host with no file system at request time.
4. **`verify --ci` as one step:** does the job summary name the failing step
   clearly enough?
5. **`ship` from a cloud session:** opening the PR from a script, and making
   screenshots reachable from a PR, since no API attaches an image.
6. **Client-router navigation against Terrarium's,** on the same three pages,
   timed on a phone.
7. **Cost:** OpenTelemetry from a scheduled run, and whether a nested run
   with a budget flag gives a hard cap.
8. **A machine account's token in a cloud session:** do pushes and posts show
   that identity?
9. **Starting a session from a session,** in the cloud and on a laptop, and
   whether a session can see its own context use.
10. **Sync on a pilot site:** one change each way, a renamed platform file,
    and a session with two repos attached.

## 14. What is still unclear

Each question ends with where its answer probably lies: **[owner]** only the
owner can choose; **[repo]** an agent can settle it from Terrarium's records;
**[spike]** it needs an experiment.

### Shape

1. **Where records live** (section 3.1). **[owner]** **[spike]** (experiment 1)
2. **The stack.** **[owner]** **[spike]** (experiment 6)
3. **The platform's name** and the terms listed as open in section 2.
   **[owner]**
4. **Does a site change a platform Skill in place,** leaving sync to merge
   it, or override it with a Skill of its own? **[owner]**
5. **Is the template repo itself a site** that runs the platform, so agents
   can improve it with the same commands? **[owner]**
6. **Which deploy ships as the seed:** Terrarium's self-updating container,
   or a simpler host. **[owner]**
7. **How long records live.** Logs and findings only grow. **[owner]**

### Commands and hooks

8. **How the owner sees a UI PR's screenshots:** linked from the records, on
   an owner-area page per open PR, or both. **[owner]** **[spike]**
   (experiment 5)
9. **Which paths count as UI.** Layouts, components and styles are proposed;
   page templates are not decided. **[owner]**
10. **The exact protected lists.** The owner agreed to section 11 roughly.
    **[owner]**
11. **How much transcript parsing `log` needs** for timings, models, tokens,
    tools and subagents, and whether it stays right across a compacted or
    resumed session. **[repo]** `scripts/session/transcript-trace.ts`.
    **[spike]**
12. **Laptop sessions.** They have no PR subscription. Does `ship` wait, hand
    back to the owner, or schedule a check? **[owner]**
13. **Which closing-keyword cases `merge` must parse.** **[repo]** The tests
    beside Terrarium's merge script list the cases a real PR hit.
14. **Which of Terrarium's quirk guards ship on day one.** The draft ships
    only the workflow-file guard. **[repo]** Count occurrences per guard-related cause in the Friction
    Ledger.

### Sweeps

15. **Every number marked a guess** in section 8. **[owner]** **[repo]**
    Replay `NAME-improve`'s threshold over the Friction Ledger to see what it
    would have routed.
16. **Whether a session retro feeds `NAME-improve`,** and for which sessions.
    **[repo]** See what `retro` added beyond the logged Frictions where it
    ran.
17. **Who writes the tasks** for the visitor with a task: the owner at setup,
    or the sweep from the site's pages. **[owner]**
18. **Cost in dollars, in share of the usage window, or both.** **[owner]**

### Steering, sync and process

19. **How much of parallel steering ships first.** The draft ships
    `NAME-steer` serial. **[owner]**
20. **Which installed Skills earn a place by default.** **[repo]**
    `scripts/session/audit-skills.ts --skill <name>` reports each Skill's use.
21. **Who reviews an offered change on the template:** the owner by hand, or
    a session on the template. **[owner]**
22. **A three-way patch on a platform file the site changed heavily,** or one
    the template renamed. **[spike]** (experiment 10)
23. **How the template is built:** from an empty repo, or by cutting Terrarium
    down. And what Terrarium then becomes. **[owner]**
