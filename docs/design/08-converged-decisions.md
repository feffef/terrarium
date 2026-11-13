# Converged decisions: single-site template

**Status:** a proposal agreed between two agent sessions on 2026-11-13; it
decides nothing.
One session wrote a design from the requirements alone and argued for the
simplest design throughout. The other has the Terrarium repo and supplied the
recorded problems. This list replaces neither draft; it says where they now
agree.

**How each decision was tested:** which requirement or recorded problem fails
if this part is deleted? A part with no answer was cut, or starts as one line
in the caveats document.

**Evidence.** Counts are from Terrarium's problem ledger and its 166 current
session logs. The ledger covers a 15-day window only (2026-10-30 to
2026-11-13), so every count is "in 15 days". They were counted by the other
session; "(sub)" marks a sub-agent's count it did not re-check.

**Revised the same evening.** After reading the first version the owner
objected to its owner-area decision and added a requirement: the platform
must leave the site free to choose its framework. The owner area, the stack,
the content checks and the deploy recipe changed as a result. The owner's
statements are quoted where they decide something.

**Tags.** `[untested]` rests on a fact nobody has tested (section 9).
`[owner]` is the owner's call (section 10). *(guess)* is a number with no
evidence. "Departs from X" marks a requirement not met as worded.

## Where this goes against what the owner settled or assumed

1. **Watcher without agent grading.** Of 20 old watcher notes checked, 16
   repeated what the session had reported itself (sub), and the old watcher
   was the most expensive job.
2. **The platform ships no content checks and no site framework.** The
   owner asked for "full freedom over which framework to use for the app", so
   the site meets a small contract (section 2a) and owns its content checks.
   The requirements' content and page guarantees become the seed's starting
   state, not platform rules.
3. **No enforced "every session logs".** The machinery that forced it
   produced 31 recorded problems in 15 days. `ship` refuses without a log;
   the sessions that never ship (19 of 166) rest on one guidance line.

## 1. Shape

| Decision | Why |
|---|---|
| One repo per site; three kinds of file (platform, seed, site); `package.json` is not mixed. | The platform tool and the owner app are workspace packages under `platform/`; the root keeps one script entry. JavaScript only, with one package manager and one lockfile for site, tool and owner app; anything else is outside the contract. `[untested]`, and it carries the design (experiment 4). |
| `.claude/settings.json` is the only mixed file. Sync owns the `hooks` key and a named list of `permissions.deny` entries; `verify` checks the file contains them. | A generated file would overwrite rules the tool or the site adds. |
| Records live on a `records` branch. No checkout of it. A writer builds a commit from the remote tip and pushes it by id; readers use the fetched ref. | Records on `main` rebuilt the site on every log: builds killed for memory 10 times (sub), about 755 of 2401 commits since 2026-11-01 were logs (sub). This push shape landed all 166 current logs. |
| Records are JSON, written only by commands. YAML only where a person edits (`site.yml`, `sweep.yaml`, content). | An unquoted `#` in authored YAML silently lost text. |
| Two apps. The owner area is its own small app, wholly under `platform/owner-app/`, reading records when a page is requested (section 6a). For the owner's sites it is deployed at its own address; not deploying it is an option at setup. | The owner's reasons: the worries are code, especially sync, and access; two apps allow not deploying the owner part. No platform file sits in the site's source tree. The record backs it: with one build and one check run, Terrarium's own Journal and guide failed unrelated work about 25 times (sub), and separate styles per layer did nothing against that. Terrarium never deployed anything separately and has no access-controlled page (sub), so both are `[untested]`. |
| The site is free to use any JavaScript framework. It tells the platform how to check, test, build and serve itself (section 2a). | The owner: "I'd really like if you can use the platform but have full freedom over which framework to use for the app". All six recorded upgrade breaks sat in the framework or the content library (sub); a platform that knows neither would not have broken. |
| The installed skill pack is platform (synced from the template); the notes that adapt it are site files. | One update per template, not per site. |
| The template commit last taken is in `site.yml`; the list of platform paths is a platform file. | A platform file must not hold site state. Departs from REPO-2 ("one file"). |
| Stack: the owner app uses "the simplest thing that works", meaning the least own code: a framework and libraries, not hand-written HTML and browser script (section 6a). The seed is a minimum hello world on the same stack; a site may replace the seed. | The owner: "I wouldn't mind two different, platform should use the simplest thing that works, user site is free to choose, but seed will be a minimum hello world using the same stack". Content collections, Markdoc or MDX and browser-side navigation are questions for a site that wants them, not for the template. |
| Deploy: two recipes in `deploy/` (managed host, self-updating container); setup deletes the unused one. | The owner said both work. The managed recipe is `[untested]` end to end, and its framework-specific parts belong to the site. |

## 2. Commands (six)

| Command | Rules it keeps | Recorded problem behind it |
|---|---|---|
| `verify` | One step list. First step is always the frozen install (a few seconds when up to date). Records head and tree at the start; aborts before the next step if either moved. Then the site's own `check`, `test` and `build` (section 2a), the platform's framework-free checks (trailers, pins, the copies sync owns, guide excerpts), and the platform's smoke test against that build. Writes the failing step to the job summary and an error annotation when run in automation; no separate automation mode. No lock, no edit guard, no skipping by path, with one exception of scope: the owner app's own check runs only when `platform/owner-app/` changes, because the two apps share nothing. `--fast` runs the site's `check` and never installs. | Pass vouched for another tree: 31. Stale install read as breakage: 10+ logs (sub). Reused build hid a regression: 1. Three copies of the step list needed a parity test. |
| `log` | The only writer of a session's record. The agent passes judgement as JSON on stdin or a file; the command adds machine facts and the session id and pushes at once. A second run replaces the machine half and merges the authored half. A failure is one line and a non-zero exit. Prints the severity scale when a problem has none. | Session id typed wrongly: 18. Refusal line lost in trimmed output: 14. Old lander exited 0 after failed pushes. |
| `ship` | Refuses when this session has no log. Pushes the branch and checks the remote ref equals the local commit; runs `verify` on that pushed commit; only if it passed, opens the change request naming that commit, with the session mark and closing lines written from an explicit list of issue numbers. A plain push is allowed at any time, because a push opens nothing. For UI paths it takes screenshots, commits them to `records` and links them. Prints "subscribe to this change request". | Push chained to a check: 11. The tool's own end-of-turn "commit and push" reminder: 67, so nothing may sit unpushed while `verify` runs. Push reported up to date while the remote was behind (sub). Change request opened without subscribing: 4. No API attaches an image. |
| `merge` | Ten rules: read preset and protected list from `main`, refuse if unreadable; refuse protected paths without a waiver; require a verdict naming the head (`merge verdict` reads the head and posts it); refuse on a merge conflict; wait for checks (zero runs = pending, one failure = red), fit for a background run; refuse a closing keyword anywhere outside the one block `ship` writes, and refuse if a listed issue is reserved for the owner; merge pinned to the head; report "merged" only from the host's reply; write the merge row, waiver quote included; refresh the log. File list comes from git with rename detection off, so both names of a rename are checked. | Verdict id typed wrongly: 8. Keyword closed a wrong issue: 2 in the ledger, two earlier incidents. "Merged" reported after a failed call. Auto-merge could not pin a commit. A conflicted change gets no check runs. |
| `preview` | Owns its server by process id; stop always succeeds; own port per preview. Works the same for the site and the owner app, through each one's `build`, `serve`, `ready` and `page-ready`; it knows neither framework. `shot` builds for production, waits for `page-ready`, captures light and dark at desktop and phone size, and can assert on the rendered DOM. | Kill by name pattern hit other work: 3 incidents. Shots of a loading or stale page: 6. |
| `sync` | `take`: three-way apply of the template's changes to platform paths; new template commit written in the same change. `offer`: allow-list selection, refuses anything else, an ordinary change request on the template or a fork; a patch file only when neither is attached. Runs its own checks. | No Terrarium evidence; newest part. `[untested]` |

Cut from `merge`, with reasons:

- **Retry for issues the host left open:** one incident. A watcher script
  check covers it. Departs from MRG-7.
- **Dependency version parsing:** every dependency change is the owner's
  merge. `[owner]`: the owner chose agent merges of minor and patch updates
  before, so this may return as a preset option.
- **Matching a verdict to a session through the transcript:** not needed once
  the command posts the verdict.
- **Stored change-request state (`prs/`):** a change with a merge row is
  merged; otherwise the reader asks the host once per page, and shows
  "unknown" if it cannot.

## 2a. The contract between platform and site

The platform knows no framework. `site.yml` holds what it needs to know, and
the owner app declares the same entries in the platform package.

| Entry | What it is |
|---|---|
| `check`, `test`, `build`, `serve` | Package script names. `check` is the seconds-fast one. `serve` starts the built site on the port it is given, so the platform never knows the output layout. |
| `ready` | A path that answers 200 only once the site can serve pages. Default `/version`, which the site must serve anyway with its commit and build time. |
| `page-ready` | Optional: an expression or attribute that says a page is ready to look at. Default: the load event plus network idle. |
| `routes` | A command or file that prints every route, for the smoke test and the visitor. |
| paths | Content, UI and server routes, for the protected list and the sweeps. |

- **First rule:** the platform's checks on the owner app and on records can
  never fail a site change, and the site's checks can never fail a platform
  change, except through these entries. This is what the 25 incidents ask
  for.
- **The platform's smoke test** asserts, for every listed route: it answers
  2xx, has a top heading, and loads with no console or page error; and
  `/version` is not empty. Everything else is the site's `test`.
- **Content checks are the site's.** The owner: each site maintains its own.
  In Terrarium they never were platform code: the schema and reference
  checks import the site's own schemas and code (sub). The two data-format
  traps ship as a small framework-free helper that the seed's `check` calls
  and a site may stop calling `[owner]`; schemas and reference checks are
  seed code, copied once.
- **Platform dependencies** are few and pinned in the platform package
  (browser driver, test runner, tool runner). Two of six recorded upgrade
  breaks stayed green on every check (sub).
- Without "page ready" a screenshot either guesses with a delay or knows the
  framework; shots of a loading or stale page were recorded 6 times.

**Automation.** The workflow file is one `uses:` line. Setup and the
`verify` call live in an action a cloud session can push; on green it posts a
comment naming the change's head, which wakes a waiting session. The workflow
file is one of the copies sync owns: `verify` fails while the base's workflow
differs from the expected copy, so a change that needs a new workflow stays
red until a person applies it. Other by-hand steps stay a checklist.

**Deploy rules for either recipe.** The pull credential reaches git only
through an askpass script reading the environment. `/version` returns the
live commit and build time, and the browser test asserts it is not empty.
Where a build stamp is shown on pages is the owner's UI choice; default the
home page only (a stamp on every page was one the owner had to correct). A
change under `deploy/` is a by-hand step. The container loop keeps one state
variable, the last commit that built and went live; a failed install or build
changes nothing and the next tick tries again. If the server process is dead,
the loop restarts it from the last good build. With only `build` and `serve`
to go by, the loop builds in a full second checkout and swaps whole
directories, then runs `serve` in the live one. That costs two checkouts with
installed packages on disk, or a shared package store. The owner app is
built and served the same way at its own address; access is checked in front
of it, by the proxy's or the host's own access feature, so the app carries no
access code `[untested]`.

**Preview caveats lines:** a screenshot cannot confirm a colour (read the
computed style); narrow fallback fonts in the test browser hide overflow.

All commands reach the host through one helper: `gh api` if present, else
HTTPS with a token variable, else one loud failure line `[untested]`. The
helper adds the session mark and throws on a paging gap.

## 3. Hooks (four)

| Hook | Kind | Fails |
|---|---|---|
| Session start: frozen install, full history (with a timeout on the fetch), fetch the `records` ref, set the git hooks path, print what loaded. | Tool lifecycle hook | open, loud |
| Provenance guard: refuses a host write through the direct write tools when the body lacks the session mark; prints the line. Nothing for the shell path. | The one tool-call guard | closed |
| Commit message: adds the session trailer. `verify` fails on a commit without it. | Git hook | open, loud |
| Pre-commit: refuses a workflow-file change in a cloud session; points to the by-hand steps. | Git hook | closed |

- A hook that cannot run prints its own name and a one-call bypass, and still
  refuses. A crashed fail-closed guard once blocked every shell call (2).
- Terrarium wires 33 hook commands; 13 can deny. Of its ten most frequent
  problems, three and a half are costs of its own hints and guards: a
  first-call read guard denied 66 times against 3 occurrences of its problem;
  hints fired 103 + 38 times, "85 of 86 changed nothing".
- **No stop hook and no session-end hook.** The machinery forcing a second
  log after a merge produced 31 recorded problems; the session-end hook
  landed 0 of 166 logs.
- **Removing a hook:** a denial is reported as a problem whose `where` is the
  hook. When a hook causes more problems than it prevents, the improvement
  sweep files an owner issue proposing removal.
- Excluded: first-call read guards, mid-run reminders, hints after edits,
  generated rules, rule-load tracking. Seven other quirk guards with no
  recorded occurrence start as caveats lines.

## 4. Guidance and rules

The always-loaded platform text is these twelve lines and nothing else:

1. Verify before you state: check ids, counts, causes and sub-agent claims
   against their source this turn.
2. Question the premise; add nothing beyond the ask.
3. Ask before building what the owner will see; show a sample first; settle
   a stored field's shape with the owner.
4. An empty task prompt means stop and ask.
5. Stay on the branch the session started on; from the default branch, cut
   a new one.
6. Push whenever you like; open a change request only with `ship`;
   subscribe to it and stay with it until it is merged or closed. A merge
   needs a review verdict on its head.
7. A session that opens no change request runs `log` once before it ends.
   Report every problem, however small.
8. Run long commands in the background and end the turn; after a restart,
   check that background work is alive before reporting it.
9. Read a required document whole.
10. Hand over before long work fills the context.
11. Leave to the owner a change whose behaviour no check can observe.
12. Use plain words; coin a term only on its second use.

Why some lines changed:

- **No stated order "review, verify, push".** It slipped 21 times, had seven
  prose fixes and was then accepted by the owner. The one enforced fact is a
  verdict naming the head at merge. Departs from WM-2.
- **Line 7:** 19 of 166 logs had no change request and 18 of those recorded
  a problem.
- **Known gap:** a log written before `ship` can miss later problems. `merge`
  prints one line inviting additions; nothing forces it.

Rules that live outside the always-loaded text:

- **The machine half of a log is computed inside the session,** by `log` and
  again by `merge`. A transcript exists only on the machine that ran the
  session, so no sweep can compute it later. A sub-agent never runs `log`;
  the session-id helper gives it its parent's id, which is right for the
  mark.
- **A platform skill or a brief that needs another skill names that skill's
  file to read whole.** Stated once, on the page about writing platform
  skills. At least seven pack skills can only be invoked by a person, and
  reviewers told to paraphrase a review skipped steps. In ordinary sessions
  the skill tool is used as normal.
- **No size cap is enforced by `verify`.** The command that writes a capped
  file enforces the cap. A word cap on one page failed unrelated sessions 8
  times in one day.
- **Review:** one fresh round, the builder fixes, nits never block, one
  reviewer per branch. The old loop hit its cap on cosmetic findings in five
  of six small branches.
- **Scheduled runs** cannot message or start a session; no sweep hands off
  to one.

## 5. Protected list and presets

One list, read from `main`:

- the `merge` command, the list itself and `site.yml`;
- hooks and tool settings; the file that pins installed skills; the agent
  definitions; each sweep's `sweep.yaml`;
- the workflow file and its action; the verification step list;
- deploy files; server routes; dependency entries;
- the owner's rulings; decision records.

Off the list until a problem is recorded: path-scoped rules, the content
schema, the framework config. Terrarium records 24 notes (sub) where a fix
was dropped because its file was protected, and no incident for these three.

| Preset | Sessions merge | Sweeps merge | Added to the list |
|---|---|---|---|
| `review-all` | nothing | nothing | none |
| `standard` (default) | changes outside the list | changes inside their `sweep.yaml` surface `[owner]` | the UI paths `site.yml` names |
| `hands-off` | changes outside the list | the same | none |

- **Sweeps under `standard`** `[owner]`. Default: they merge inside their
  surface. Otherwise daily sweeps hand the owner a change on many days, and
  both recorded harms from a sweep (the inverted decision record, a
  self-merged guard change) were on protected paths, which the list stops.
  The alternative is that sweeps only open changes.
- Only the label that reserves an issue for the owner has a mechanical
  meaning; the other four inbox labels are the owner's view.
- `merge` tells a sweep from a session by the `entrypoint` field in the
  transcript; the sweep is the first turn's slash command. Unreadable
  refuses. `[untested]` on a laptop.
- Direct merges are denied by one settings line `[untested]`. The same line
  denies the two host tools that create commits directly, because they skip
  the commit-message hook; agents commit with git. If the line is
  not honoured, the ruleset alone remains: a direct merge then needs a green
  check but no verdict and no protected-path test. That risk is accepted
  under a shared account and removed by a separate agent identity.
- "Behaviour no check can observe" is one guidance line and rests on the
  agent.

## 6. Skills (ten) and steering

`NAME-setup`, `NAME-steer`, `NAME-next`, `NAME-sync`, `NAME-skills`, and five
sweeps. No close skill.

- **Steering is serial first.** Every parallel-only problem (shared-checkout
  moves 5, false stranded-work flags 18, memory kills, fan-out cost) is
  deferred as caveats lines.
- **Read-only steps are read-only by tool list.** Two agent definitions in
  the repo: a "reader" with no host write tools and no shell (triage, the
  checkers), and a "visitor" with a browser tool. A triage agent once
  commented on ten issues and closed one (3). `[untested]`: whether a
  sub-agent honours a tool list from a repo file in a cloud session.
- **Briefs:** three fixed files (triage, build, review) with named slots.
  Each names its model: the cheaper one for triage and build, the default
  for review. That is the old system's end state; no saving was measured.
  Brief defects recurred 13 times through six fixes; no check is known.
- **Questions:** a numbered list with no stated total. No builder starts
  until every owner answer is in (the owner asked for this rule).
- **Cost line before the owner's final step** reports work (sub-agents,
  review rounds, minutes); money is added later by the cost step, never typed (agents wrote a cost
  from memory wrongly at least twice, sub).
- **`NAME-next`** is about three lines: follow the pack's hand-over skill,
  start a session if a tool for it is present, else print the prompt.
  Owner-started sessions only. No recorded hand-over problem exists, so no
  command and no context threshold.

## 6a. The owner app, the seed, setup, identity, glossary

**The owner app.** The owner's requirement, in their words: "The journal is
can contain any code that turns the raw data into brows able content. Reading
digests first, session summaries to get an overview and only drill down as
required with accordion ui and tool tips. Friction ledger becomes readable
and drill down able, graphs for cost development over time".

1. **Landing page:** digests first, then recent session summaries. Number
   tiles `[owner]`: until decided, a compact row below the two, each naming
   the window it covers and linking to its detail page.
2. **Drill-down by accordion and tooltips.** Digests and session cards open
   in place, one at a time, with the open item's anchor in the URL so a link
   lands on it. A card's detail is fetched when it opens; the page never
   ships every log up front (Terrarium's passed 10 MB uncapped).
3. **Detail pages:** the problem ledger (causes as readable rows that open to
   their occurrences and fixes; most severe and most frequent; a "last N
   days" filter), and cost (charts of cost development over time per sweep,
   with the weekly table beneath). A chart shows unreported runs as gaps and
   never fills them in. Then ideas and learnings, skills, and the guide.
4. **Session card:** summary, problems with severity, sub-agent token share,
   skills used, and a link to the agent session. The whole app is behind the
   access check, so the link always shows.
5. **Derived views** (grouping, trends) are computed when a page is read;
   nothing derived is written back to the records `[owner]`. A skill is
   "used" when its file was read or its slash command expanded; status is
   derived (a merge row, else one host query per page, else "unknown"); "ran,
   nothing to do" is a normal sweep row.
6. **Works on a phone and in dark mode** by the system setting; tables
   readable on a phone; text pages as a centred column of about 82
   characters, never a narrow card. The owner app's own browser test asserts
   both at phone size and in dark mode.
7. **Not built unless asked:** explainer pages, feeds, a "worst problems"
   panel, a tile for change-request counts, tiles on the archive, graded
   importance.

Points 1 to 3 follow the owner's sentence. Points 4, 6 and 7 are drawn from
what the record shows the owner asked for, corrected or removed in
Terrarium's Journal (sub); the record holds no statement of what the owner
likes.

Two limits hold whatever the stack: reads stay bounded, and the owner app's
code and checks can never fail a site change.

**The owner app's stack.** The owner settled the test: "Simplest to do the
job with minimal own [code], not vanilla js and plain html", and earlier: "we
can use any client framework we want for the owner area if we separate the
app. The site itself is free to opt out or in whatever it's requirement is".
So "simplest" means the least code the platform writes and maintains itself,
not the fewest dependencies.

- **Decided:** a framework does routing, rendering and escaping, and a
  library is used wherever it saves own code (charts, for one). The platform
  does not hand-write a server, templates or DOM code.
- **Working pick** `[untested]`: a server-rendered framework that renders on
  request and adds client code only where a component asks for it; Astro with
  its Node adapter is the candidate, on the evidence of one unkept test
  build. A client framework inside it is allowed where it saves code.
- **Considered and dropped:** a plain server with hand-written templates and
  browser script. Both sessions had leaned to it for having nothing to
  upgrade; the owner ruled it out. It would have meant own code for routing,
  static files, the error page, the accordion and the charts, and escaping
  that holds only where the author remembers.
- **For scale:** Terrarium's Journal is about 3,800 lines of pages and
  helpers with no chart library and no UI kit; its accordion, expand
  animation, copy-link control and charts are hand-written (about 430 lines
  together). Those are the pieces a library should replace.
- **What the choice costs:** every site starts with one framework's
  upgrades, and upgrades are where Terrarium's framework coupling cost most
  (six recorded breaks, sub). The contract keeps that cost inside the owner
  app and the seed.

**The seed** is a minimum hello world on the owner app's stack: one page, one
server route, one page rendered on demand, `/version`, a `check` that calls
the data-format helper, and one browser test. Typed content, components in
content and design tokens are a documented path, not seed files `[owner]`.

**Setup and identity** stand as in the insider draft's section 12, with
these changes: no records checkout, but the `records` branch is created at
setup; the deny line is installed; one protected list; setup asks whether
the owner app is deployed and which framework the site uses.

**Glossary** stands as in the insider draft's section 2.

## 7. Sweeps (five)

Shared by all five:

- A sweep is a skill folder with a `sweep.yaml` (safe surface, work caps,
  and for the visitor its tasks) plus one schedule. Deleting both removes it.
- **The first step is a script that asks "anything new since my last run
  row?" and exits with a run row if not.** This makes a daily default
  affordable and keeps "no skill assumes a cadence" true.
- **Cost.** A run never reports its own cost (that failed 7 times). One
  sweep, the digest by default, has a step that reads the session tool's
  figure for finished runs that lack one and stores it as given, with the
  four token counts beside it. No price table: a table came out 1.0 to 1.6
  times above the tool's figure (sub). The figure is labelled "session cost,
  sub-agent share unknown". A cost that cannot be read is stored as
  "unreported"; if the digest is removed or its schedule lacks the session
  tool, every cost shows as unreported. Setup checks the tool is present
  when it creates that schedule `[untested]`. The step is an agent step,
  because the session tool is a tool call: a sub-agent with that one tool
  reads a capped number of runs per pass and the writer command stores the
  rows. It covers every run row lacking a cost, so a missed week catches up
  by itself. Filling cost for owner-started sessions is the obvious next
  use and is off at first. Runs are bounded by work.
- "Possibly stopped" is derived from the gaps between earlier run rows.
- Sweeps write findings (JSON, made by a command) and nothing else shared.
  A session's problems stay in its log; the improvement sweep reads both
  through one reader. "Taken" is derived: a cause lists the entry, or an
  improvement run row lists it as dropped.
- A sweep that cannot open its change request pushes the branch and says so
  in its run row.

| Sweep | Smallest form | Evidence |
|---|---|---|
| Watcher | Script checks only: a stopped sweep; a session with a change request and no log; a merge without a verdict; an issue a merged change named that is still open; a run row without cost; a sweep branch with no change request. No agent grading, no notes per skill, no change request. `[owner]` | The old watcher cost $12.66 a run (sub), the most of any job. Of 20 of its notes checked against the session's own log, 16 repeated a problem the session had already reported (sub). Departs from WAT-3 and from what the owner settled, so it goes to the owner with that figure. |
| Improvement | Collect, dedupe once (issues listed in bounded pages and filtered locally; no search calls), file under causes, route by threshold *(guess: three occurrences or one major)*. A second prose fix for the same cause is not allowed; it files an issue. "The owner said no" is a state of a cause, set by closing its issue with a label, and is never proposed again. A fix prefers a deletion and removes as much as it adds. No trial state is kept. The hook-removal rule (section 3). Most runs end in a short report and no change. | Of causes whose latest fix falls inside the 15-day window, 29 recurred and 41 did not, and 24 of the 41 were fixed in the last three days (sub). In the one band old enough to judge, fixes with a script or refusal held 3 of 6, prose-only 3 of 12 (sub). The old ledger could not remember an owner's "no". |
| Docs upkeep | Check docs touched by what merged since the last run against the code; report contradictions between docs; one further area per run. Every finding passes a separate checker before it is applied. A change to a decision record states what the record allows, forbids and excepts, before and after. Rewrites for brevity are off unless a ruling turns them on. `[owner]` | The checker rejected about 59% of draft findings (sub, hand-tallied). Rewrites were most of the volume and the source of the one recorded harm: an inverted decision that passed three checkers. |
| Visitor | Reports only. Reads rulings and open issues first. Records coverage (pages, viewport, colour scheme, persona) in its run row and picks the least-covered next. Three personas at first *(guess)*. Its first-step script exits when no UI or content path changed since the last run. | The old run built fixes: 38 changes in its 20 newest runs, 3 of them confirmed removed (sub); over the job's life the owner reverted or reworked run-built UI at least 5 times. 15 of 20 runs dropped candidates because of a ruling (sub). Departs from VIS-6 (four personas). |
| Digest | A script finds missing days and computes every number; the agent writes at most 250 words; a separate checker compares each sentence with the merged changes; the writer lands it once. Its script reads merge rows and the host, never commit subjects. No change request, no code review. | The fact check caught wrong claims in 12 of 13 digest drafts. The checker is the one part that cannot be cut. The owner reads the digests and asked for 100 to 250 words. |

Reference cost at list price per run (sub): watcher $12.66, visitor $7.93,
docs $6.13, improvement $4.08, digest $1.79. The forms above should cost
less; by how much is unknown.

## 8. Known unsolved

No cheap check is known for these; each is one guidance line.

- Facts stated from memory (36) and sub-agent claims relayed unchecked (24).
- UI built before the owner decided (6, three prose fixes failed) and design
  settled without asking (7). The UI rule under `standard` only gives the
  owner a veto after the work.
- The owner's answer misread (16).
- Problems after `ship` missing from the log.
- Brief defects (13).
- A dependency update that changes output without failing a check: two of
  six recorded upgrade breaks (a diagram library that redrew every diagram,
  a browser driver that silently ran another browser) (sub).

## 8a. Caveats lines from the record

Each is one line in the caveats document; none has a check.

- After a merge, push plainly; never amend or force a pushed commit (6 of
  the 8 recorded classifier denials).
- Commands and briefs use absolute paths; a bare `cd` moved the session's
  working directory 12 times.
- One state-changing git command per call (a chained step failed unseen 7
  times).
- Read another branch's file with `git show`, not a checkout (5).
- Pass a commit message from a file, never inline.
- Check that a revision resolves before reading history from it (2).
- No rule depends on verified commit signatures; a cloud session's signing
  key can be empty.
- If a site adds a page cache, it varies on every request input and has a
  size bound. The seed loads no data in the browser and caches no pages, so
  it meets WEB-4 by avoiding both; a site that adds either owns the
  recovery.
- Check dark mode on the built site, not the dev server.
- A browser test waits for the state it needs, never for time.
- A site's reference check is best kept generic (an id in one file must
  exist in another), not one per kind of content.
- No site-wide check for broken links or missing images ships (no recorded
  incident); a site may add one as a test. No accessibility checker ships;
  the seed's browser test selects by role.
- "Keep the clicked row in place while it opens" is the accordion behaviour
  that needs its own browser test; Terrarium's flaky tests came from clicks
  landing while something was still opening.
- Container recipe: dependency build scripts stay off; a merge is code
  execution on the server, because the container builds what was merged.
- Diagrams and inlined graphics are not in the first version.
- More than two full checks at once in one container died of memory.
- The container's git is older than automation's, so a git-based test can
  pass locally and fail there.
- State made only in the session (a scheduled job, a background sub-agent,
  a scratch file) can vanish across a resume.
- Repository settings such as rulesets cannot be written from a cloud
  session; they are by-hand steps.
- A records writer and `ship` compare the remote ref with the local commit
  after a push and fail loudly if they differ.

## 9. Experiments before building

1. **Records:** create the `records` branch at setup from a cloud session;
   read it through the fetched ref. (Pushing to an existing second branch is
   proven.) Also: a cloud session is pinned to one branch by the tool, so
   how serial steering pushes one branch per change request from one
   session.
2. **Deny line:** is a `permissions.deny` entry honoured in a single-repo
   cloud session?
3. **Host helper:** a script opens a change request, posts a verdict and
   merges from a cloud session and from a scheduled run, where the host
   tools were once found unauthenticated.
4. **One install for three packages. This one carries the design.** A root
   install serves the site, the platform tool and the owner app; the
   platform's binaries are where hooks call them, in a fresh worktree too;
   build memory for two apps. Terrarium never built two apps or used a
   workspace, and the earlier test build was one site.
5. **Stack.** For the template: the owner app on the working pick, built far
   enough to show a digest list, one session card opening in place and one
   cost chart, counting the lines the platform had to write itself; a record
   holding markup comes out as text. For a site
   that wants content features, and not for the template: a fixed list of
   content mistakes (unknown tag, missing or wrongly typed attribute,
   unclosed block, braces and an HTML comment in prose, out-of-range value,
   extra key, broken reference, a file that cannot be parsed, a violated
   refinement rule) under Markdoc and MDX, output kept; with a browser-side
   router on, does in-page state survive a navigation, do view transitions
   run, and what happens when the fetch for the next page fails (an old tab
   after a deploy).
6. **Verification in automation:** does one step's summary and annotation
   name the failing check clearly; does the green comment wake a session?
7. **Cost and transcript:** first, which scheduled runs have the session
   tool at all; whether its cost figure includes sub-agents (run one large
   sub-agent and compare); the `entrypoint` field on a laptop scheduled run;
   whether a compacted or resumed session keeps one transcript file with
   right timings and tool counts; the end day. A nested headless run must
   unset the two session variables or it writes into its parent's
   transcript.
8. **Owner app:** reading records at request time on a container and on a
   managed host; the access check in front of the app; the deploy loop
   swapping whole checkouts for two apps.
9. **Sync:** the test in the template's automation (a site from an older
   template tag, one platform file edited, take and offer); a site that
   replaced the seed with another framework still takes an update cleanly;
   fetching the template without attaching it.
10. **Agent definitions:** does a sub-agent honour a tool list from a repo
    file in a cloud session?
11. **Screenshots:** does a link to an image on the `records` branch render
    for the owner on a private repo?
12. **Identity:** a separate account's token in a cloud session.
13. **Starting a session from a session** with a hand-over as its prompt.

**Least evidence.** After sync, the owner app and the seed's server pieces
have the least behind them: Terrarium has no server route, no
access-controlled page, no second app and no separate deploy.

## 10. For the owner

1. **Watcher without agent grading**, given 16 of 20 notes repeated what the
   session had reported itself.
2. **Which framework for the owner app and the seed.** The test is settled
   (least own code, not hand-written HTML and script); the working pick is
   Astro with its Node adapter, untested.
3. **Docs sweep: rewrites for brevity off by default.**
4. **May agents merge minor and patch dependency updates?** Default: no.
5. **Under `standard`, may a sweep merge inside its own surface?** Default
   here: yes. The alternative: sweeps only open changes.
6. **Records on a branch of the site's repo.** In a public repo they are
   public.
7. **Deploy default,** and whether the access check in front of the owner
   app is the proxy's or the host's.
8. **The departures in section 11.**
9. **Every number marked a guess.**
10. **The platform's name** (the `NAME-` prefix), and the preset names.
11. **Does the template repo run the platform itself, and who reviews an
    offered change?**
12. **How long records are kept.**
13. **Agent identity:** shared account, or a separate one.
14. **What browser-side navigation is for** (WEB-2). The requirements say
    speed; Terrarium's decision record says in-page state such as a cart and
    view transitions should survive navigation. Experiment 5 now tests the
    second first.
15. **Where the build stamp shows:** `/version` always; on pages, the home
    page only by default (DEP-3 says the footer).
16. **Laptop sessions waiting for green:** poll in the background, or hand
    back to the owner.
17. **Number tiles on the owner app's landing page:** keep them or not, and
    where. Default: a compact row below digests and sessions.
18. **May the owner app compute views of its own** (grouping, trends) from
    the records? Default: yes, when a page is read, nothing written back.
19. **How minimal is the seed?** Default: one page, one server route, one
    page rendered on demand, `/version`, a `check` and one browser test.
    The requirements ask for an example of every extension point (REQ 13.4).
20. **The two data-format checks:** a platform helper the seed's `check`
    calls, so fixes reach other sites (default), or seed code copied once.

## 11. Departures from the requirements as worded

| Requirement | Departure | Reason |
|---|---|---|
| WM-2 (review, then verification, then push) | No order is stated; a verdict on the head at merge is the one enforced fact. | 21 slips, seven prose fixes, then accepted by the owner. |
| MRG-7 (close issues the host left open, with a retry) | A watcher script check reports them. | One incident. |
| REPO-2 (path list and template version in one file) | The version is in `site.yml`. | A platform file must not hold site state. |
| WAT-3 (agent checks in the watcher) | None at first. | 16 of 20 notes were not news. |
| VIS-6 (four personas) | Three at first. | A guess; cost. |
| REC-1 (every substantive session lands a record without being asked) | Forced only for sessions that `ship`; others rest on one guidance line and a watcher check. | The forcing machinery caused 31 problems. |
| REC-17 (reminders) | None. | Same. |
| BIG-2 (one command to hand over) | A three-line skill, no command. | No recorded hand-over problem. |
| BIG-3 (hand over before context fills) | One guidance line; no threshold. | A session cannot read its own context use. |
| ID-1, ID-3 (every write path refused without a mark) | Only the direct write tools are guarded; platform commands add the mark themselves; a raw shell write is not guarded. | The shell half of the old guard was 424 lines with no recorded catch. |
| DEP-3 (version in the footer) | `/version` always; a visible stamp on the home page only by default. | The owner corrected a stamp on every page. |
| COST-5 (each sweep's first step records costs) | One sweep, the digest, has the cost step. | The session tool is not reliably present in scheduled runs. |
| CON-1 to CON-4, VER-5 (the platform checks content) | The site's `check` does; the seed's meets them; the platform ships only a helper for the two data-format traps. | The owner: each site maintains its own content checks. |
| WEB-2, WEB-7 (opt-in browser-side navigation; little client code) | The seed's starting state, not platform rules; a site chooses. | The owner: the site is free to opt in or out as it requires. |
| REQ 13.4 (the seed shows every extension point) | A minimum hello world; the rest is a documented path. | The owner's "minimum hello world". |
| VER-6 (no skipping by changed path) | The owner app's own check runs only when its folder changes. | The two apps share nothing; it is scope, not skipping. |
| PRIN-5 (guards fail closed) | The commit-message hook fails open; `verify` checks trailers afterwards. | A fail-closed trailer hook that cannot run stops every commit. |
| VER-4 (summary names the failing step) | Conditional: met only if experiment 6 passes. | One step is otherwise what VER-4 rules out. |
| IMP-11 (trials) | No trial state; "prefer a deletion" is a rule of the improvement sweep. | No mechanism without a recorded need. |
| ST-*, DSP-* (parallel steering) | Serial first; the design allows parallel later. | Every parallel-only problem disappears. |
