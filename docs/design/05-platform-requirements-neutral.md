# Requirements: an agent-run platform for single-site content websites

**Status:** requirements only. This document states what the platform must do
and guarantee. It deliberately says nothing about how: no technologies, no file
layout, no command names. A designer takes these requirements and the
technologies they are given, and produces a technical design.

**Wording.** *Must* is a requirement. *Should* is strongly wanted but may be
traded against cost with a stated reason. *May* is allowed, not needed. Each
requirement has an id (for example **WM-4**) so a design can answer it one by
one. Rationale lines ("Seen:") describe failures that were observed in earlier
practice, in general terms, so the designer can weigh trade-offs. Ids are
stable labels, not a count: a gap means the requirement was merged into another.

## 1. Goal

Build a **template** from which a person (the *owner*) creates **content
websites**, each in its own repository, and then runs each website mostly by
steering AI coding agents instead of writing code.

The template has two halves that must stay apart:

- the **site**: a small, ordinary content website (pages, content files, a
  design), starting as a "hello world";
- the **platform**: the working model around the site: the agent instructions,
  reusable skills, hooks, commands, checks, records, scheduled maintenance jobs
  and dashboard that let agents build and improve the site safely.

This document specifies **the platform**, plus what the platform must guarantee
about the site it carries (section 13). It does not specify the site's design.

### 1.1 What success looks like

1. A new owner creates a site from the template. One guided agent session sets
   everything up and leaves a working hello-world site, deployed, with the
   whole working model in place.
2. From then on the owner steers at product-owner level: chatting, filing
   issues, reading summaries, looking at screenshots, approving the few
   changes that matter. They rarely read diffs.
3. Every change is reviewed, tested, documented and traceable, without the
   owner doing the checking.
4. The platform notices its own recurring problems and removes their causes
   instead of accumulating more rules.
5. The whole platform is **small and easy to understand**: few concepts, few
   custom terms, clear extension points, a standard tool wherever one exists
   instead of custom code. Each part is present because of a stated reason.
   The platform earns every mechanism it contains.
6. Improvements made to the platform inside one site can flow back to the
   template and on to other sites; a site's private data never does.

### 1.2 Principle behind the whole document

Agents are good at following instructions and bad at following *all* of them,
*every time*. Most requirements below exist because a plain written instruction
was skipped, half-followed, or forgotten after a long session, and a mechanical
check was needed. Equally, some mechanical guards became a top source of
problems themselves. The platform must treat both facts as normal and must be
built to detect and correct either failure (section 5).

## 2. Users and use cases

**Owner.** The one person who owns the site(s). Chats with an agent, files and
reads issues, merges what agents may not merge, decides direction. Works from a
web interface and from a laptop; both must work. Usually one owner per site.
No outside contributors to a site.

**Sessions and sweeps** (defined in section 3) do the work: sessions are
started by the owner, by another session, or by a schedule; sweeps look after
the site and the platform without a human present.

**Stranger** (section 3). The owner's own sites come first; the template should
be usable by a stranger.

### 2.1 Use cases the platform must support

- **UC-1 Set up a site** from the template, in one guided session, including
  the steps only a human or a laptop session can do (section 7).
- **UC-2 Ask for a change** ("add an about page"): an agent clarifies, builds,
  tests, shows screenshots, gets review, and lands it under the owner's chosen
  autonomy level.
- **UC-3 Work the backlog:** the owner asks the agent to clear open issues;
  the agent triages all of them, asks the owner every open question in one
  round, then builds what was approved, possibly several in parallel in
  isolated branches (section 8.6).
- **UC-4 Plan work too big for one session:** a map of the destination grows
  into decision and task tickets; each is done in its own session, handed over
  cleanly (section 8.5).
- **UC-5 Review what happened while away:** see sessions, outcomes, problems,
  costs, what scheduled jobs did, and a daily summary (section 12).
- **UC-6 Let the platform improve itself:** recurring problems are found,
  grouped by root cause, and fixed or put to the owner (section 11).
- **UC-7 Keep docs true:** instructions, decision records and a guide stay
  consistent with the code (section 11.4).
- **UC-8 Take template updates** into a site, and **offer platform
  improvements** from a site back to the template (section 6.3).
- **UC-9 Operate safely:** the owner can leave agents alone for days and trust
  that unreviewed, unverified or unauthorised changes do not land.

## 3. Vocabulary

The platform ships a **short glossary** of plain words. A term enters the
glossary only when an agent must act on it (GUIDE-1 has the naming rule).
Plain lowercase words are preferred over project jargon and over words that
already name a feature of the agent tooling or the source host. These are the
words used in this document:

| Term | Meaning |
|---|---|
| owner | The person who steers the site and merges what agents may not. |
| site | One repository made from the template: one website and its content. |
| platform | The files the template owns and keeps updating: instructions, skills, hooks, commands, checks. |
| seed | Files the template provides once, which the site then owns (for example the hello-world page). |
| session | One agent conversation working on the site. |
| record | A machine-readable fact the platform keeps about its own operation (session logs, findings, causes, run rows, merge rows, digests). |
| session log | The record a session leaves: the agent's judgement plus machine facts. |
| problem | Anything that cost a session time or went wrong, graded by what it cost. |
| finding | One item handed from a session or sweep to the improvement process: a problem, an idea or a learning, with evidence. |
| cause | The root cause of one or more problems, with its fixes and a state derived from later occurrences. |
| sweep | A skill run on a schedule or on demand that looks after the site or the platform. Five ship: the watcher, the improvement sweep, docs upkeep, the visitor and the digest. |
| improvement sweep | The one sweep that turns every finding into fixes or issues (11.3). |
| builder | The agent that implements a change. |
| head | The latest version of a change request's branch; reviews and merges name it exactly. |
| safe surface | Files outside the protected paths that a sweep's own skill allows it to change. |
| memory file | A size-capped file where a sweep keeps its own open leads and decisions (DOC-7). |
| taken mark | The mark on a finding saying which improvement run consumed it. |
| run row | One record per sweep run: time, cost, coverage. |
| merge row | One record per merge made by the merge step (MRG-11). |
| verification | The fixed set of checks a change must pass before it may merge. |
| verdict | The posted outcome of a code review, naming the exact reviewed version. |
| protected path | A file or area whose changes only the owner may merge. |
| autonomy preset | The one setting, chosen at setup, saying what agents may merge on their own. |
| ruling | A standing owner instruction that every sweep obeys and only the owner changes. |
| dashboard | The owner's view of sessions, causes, sweeps, costs and summaries. |
| guide | Pages explaining how this site and its platform work. |
| stranger | Someone who creates their own site from the template and is not a contributor to the owner's sites. |
| change request | A proposed change to the site on its source host, reviewed and then merged (a pull request or merge request). |
| map | A plan for work bigger than one session: the destination and the tickets that lead to it. |
| ticket | One decision, research, prototype or task item on a map, done in its own session. |
| hand-over | The note one session writes so the next session can continue. |
| drop zone | A place for changes only a human or a laptop session can apply (VER-9). |
| waiver | The owner's in-session permission to merge a change the protected-path rule would refuse. |
| watcher | The sweep that catches what sessions did not notice about themselves (11.2). |
| visitor | The sweep that browses the site as a user would and reports what it finds (11.5). |
| persona | The kind of user a visitor run plays: first-time, task-directed, keyboard-only or returning. |
| digest | The owner's summary of one finished day (11.6). |
| learning | A finding that records something worth knowing, not something that went wrong. |
| trial | A cut to an instruction that stays in place and is judged by later problems (IMP-11). |
| preview | A locally built copy of the site that agents look at and screenshot (8.7). |

## 4. The agent tooling the platform builds on

The platform is built on an AI coding-agent tool. The designer will be told
which. These are the generic concepts the requirements assume, so each can be
mapped one-to-one onto the tool's own features:

| Concept | What it is |
|---|---|
| **Always-loaded instructions** | A project instructions file read at the start of every session. Can import other files. Costs context on every session, so it must stay short. |
| **Path-scoped rules** | Instruction files that load only when the session touches matching files. |
| **Skill** | A named, on-demand instruction package (a description plus steps and files) that a session loads when its description matches the task, or that the owner calls by name (a slash command). |
| **Skill pack** | A third-party, installable collection of skills (for engineering practice: review, test-first, grilling the owner with questions, triage, research, prototyping, hand-over, mapping work). |
| **Hook** | A script the tool runs at a lifecycle event: session start, before or after a tool call (can block the call), when the agent tries to stop (can block the stop), at session end. Receives a payload (including the session id). |
| **Sub-agent** | A helper agent a session dispatches with a written brief; it returns a result. |
| **Scheduled run** | An unattended session started on a timetable, with its own prompt and no human present. |
| **Session start from another session** | A session creating or messaging another session. |
| **Permissions and settings** | A settings file that allows or denies tools and wires hooks. |
| **Event subscription** | A way for a session to be woken by activity on a change request (comments, failures). |
| **Isolated checkout** | A separate working copy of the repository for one agent (a worktree), so parallel agents do not share branches. |
| **Session transcript** | The recorded conversation of a session, which the platform reads for machine facts (timings, models, tokens, tools, sub-agents). |
| **Background task and one-shot wake-up** | Work that continues beyond one call, and a way to schedule a later message to a session. |
| **Permission modes and classifier** | The tool's rules and automatic checks that allow, ask about or refuse an action (ENV-12). |
| **Environment setup** | The remote environment's setup script and network allowlist, configured outside the repository (ENV-11). |
| **Telemetry export** | Cost and token metrics exported from sessions, configured outside the repository (ENV-7). |

Hooks, skills and settings must be plain files in the site's repository so
that they work in every execution environment, because installed plugins or
external marketplaces may not load in remote sessions (see 4.1).

### 4.1 Environment constraints the design must respect

These limits were observed in real execution environments. The platform must
work *within* them, and must not rely on a feature that hits one.

| Id | Constraint |
|---|---|
| ENV-1 | Remote (cloud) sessions can push only to repositories attached to the session. A session with several repositories attached may not load the project's hooks, permissions or environment settings, so multi-repository work must carry its own checks. |
| ENV-2 | A push from a remote session that contains a change to automation workflow definitions (the continuous-integration files) is rejected as a whole, stranding every commit in it. Such changes must be handed to a human or a laptop session. |
| ENV-3 | A successful continuous-integration run does not wake a waiting session; only failures and comments do. Waiting for green needs an explicit mechanism. |
| ENV-4 | Remote sessions may start with a shallow history. Any decision drawn from history is wrong on a shallow checkout. |
| ENV-5 | A remote session's container can be reclaimed at any time; unpushed work and uncommitted files are lost. |
| ENV-6 | Long foreground commands are killed after a fixed limit (about ten minutes). Long work must run in the background. A session that is restarted loses its background work. |
| ENV-7 | No hook payload carries cost or token data. No hard budget cap is available for a scheduled run. Telemetry export exists but is configured outside the repository, and may drop the last interval of a short run. A run reading its own cost is unreliable; a finished run's cost can be read by another session. |
| ENV-8 | Agents typically act under the owner's own account on the source host. The host cannot tell the owner from the agent, and an author cannot approve their own change. Rules such as "a person must merge this" cannot be left to the host's review features alone unless agents get a separate identity. A separate identity (a second account or an app) is acceptable but not yet set up; minting an app's token from inside a session may be blocked. |
| ENV-9 | The host's own auto-merge cannot pin the reviewed version and is not disarmed by later pushes. |
| ENV-10 | The deployed site and the server's logs are not reachable from remote sessions; the live state is learned only by what the site itself exposes. |
| ENV-11 | Some operations (creating labels, changing branch protection or repository settings, installing the workflow definition, setting secrets, editing the environment's setup script) are not available to a remote session and need a human or a laptop. |
| ENV-12 | The agent tool's own permission classifier may still refuse an action the owner authorised (for example a merge). |
| ENV-13 | Parallel full verification runs are limited by memory; too many at once fail with out-of-memory kills. |
| ENV-14 | A session's own id is available to hooks; the agent must not transcribe it (see ID-2). |

## 5. How mechanisms are chosen (applies to every section)

- **PRIN-1** A rule that a cheap check can enforce (a lint rule, a type, a test,
  a verification step, a command that refuses) gets that check at the moment the
  rule is written, not after it fails. Only judgement calls become prose.
  *Seen:* fixes held noticeably better as scripts or refusals than as
  instruction lines, but not perfectly; repeat fixes on the same cause usually
  failed. A prose fix may be tried more than once; a second failure of the same
  prose fix is a reason to look for a cheaper check.
- **PRIN-2** A mechanism must cost less than the problem it prevents. A guard,
  hint or reminder that becomes a top source of problems is itself a cause to
  fix or remove. A new guard names what it replaces.
  *Seen:* a guard that denied a first call until a document was read, a
  reminder that nagged mid-run, and hints pointing to documents after every
  edit were each among the top recurring problems; almost every hint led to no
  change.
- **PRIN-3** A cause that regressed after its fix goes to the owner, naming that
  fix, before another fix is tried.
- **PRIN-4** "Accepted cost" is a legitimate end state for a cause and is never
  proposed again.
- **PRIN-5** Guards fail **closed** (an unreadable condition refuses). Reminders
  and convenience hooks fail **open** with a loud message. Every hook has a
  documented failure mode and a test; how to add a hook is described on one
  page. This is an extension point.
- **PRIN-6** One definition of each thing, run the same way everywhere. A check
  must not exist twice (for example once locally and once in automation) in a way that
  needs a parity test.
- **PRIN-7** The machine records machine facts (ids, commit ids, timings, tokens,
  states); the agent writes only judgement. Text is copied by command, never
  retyped.
- **PRIN-8** Anything derivable is derived at read time, not stored (a record's
  status, a cause's fix state, a sweep's silence).
- **PRIN-9** Everything is bounded: reads have a cap and a total count, runs have
  a work limit, outputs a size limit. A view or run that grows with history is
  a defect. Whether limits apply from day one or when volume appears is open
  (section 15).
- **PRIN-10** Every document an agent reads follows one writing standard: each
  fact has one home (when a fact changes, every other statement of it and every
  consumer is updated in the same change), rules are stated as what to do, each step ends in a
  checkable criterion, each skill description starts with a leading word and one
  trigger per case, plain words are used, and a document is kept short. When a
  problem comes from one of the platform's own instructions, cut or simplify
  that instruction before adding another.
- **PRIN-11** Every sweep is **removable**: deleting a sweep's skill and its
  schedule leaves verification passing and the other sweeps working. Sweeps
  talk to each other only through one record format.

## 6. Organisation of the repository

### 6.1 Three kinds of file

- **REPO-1** Every file has exactly one kind. Three kinds (platform, seed, site)
  is an acceptable split and other splits are open, but whatever the split, no
  file is ambiguous:
  - **platform**: owned by the template, updated from it, may be changed in a
    site and offered back;
  - **seed**: given once by the template, then owned by the site;
  - **site**: the site's own content, code, settings and records.
  Files that mix kinds must be split, or the sync must know their sections
  (for example a package manifest or the tool's settings file, which hold both
  platform and site entries; a project instructions file that can import
  platform text instead).
- **REPO-2** The list of platform paths exists in **one file**, together with
  the template version last taken.
- **REPO-3** Site data (records, problems, learnings, content, secrets) never
  flows back to the template. Back-flow selects by an allow-list of platform
  paths, never a deny-list, and refuses if the selection contains anything
  outside it.
- **REPO-4** Platform skills have names that never clash with skills of the
  installed pack or with platform terms (a mechanical check enforces it).
- **REPO-5** A site may add its own protected paths, its own installed skills,
  and its own content rules, without those being overwritten by sync.

### 6.2 What ships in the template

A hello-world site; the platform; a short project instructions file and a short
glossary; about a handful of decision records (operating model, verification
and merging, session records, platform/site separation, stack); a small set of
how-to documents for agents (source control and change requests, issues and
labels, environment caveats, how hooks are added); a seed guide; one smoke test
that loads every page and fails on a console error; a dependency-update
configuration; a deploy mechanism picked at setup; a design-token file. No
Skill, record or sweep exists without a reason from this document.

### 6.3 Sync between template and site

A repository made from a template shares no history with it, so ordinary
merging between them does not work.

- **SYNC-1** The site records the template version last taken.
- **SYNC-2** **Taking updates:** compute the template's changes to platform
  paths since the recorded version, apply them (three-way where the site
  changed a file), resolve conflicts, record the new version in the same
  change, and open a change request on the site that passes the site's own
  verification. A partial sync fails verification. Because it touches protected
  paths, the owner merges it.
- **SYNC-3** **Offering changes:** when a session changed a platform file, open a
  change request on the template containing only that platform change. The template's
  own automation builds a fresh site from it and runs the site's verification.
  Each site also verifies what it takes, so a bad change is caught twice.
- **SYNC-4** Only the *trigger* is manual: the owner asks for a take or an
  offer. Everything else is done by platform skills.
- **SYNC-5** Sync works in a session with one repository and on a laptop.
  Where the template cannot be attached (a stranger's site), offering degrades
  to a patch file; whether strangers' offers are supported at all is open.
- **SYNC-6** Changes to automation workflow definitions never travel through a
  remote session in either direction (ENV-2); they are written to a place for
  human steps with the instruction to apply them.
- **SYNC-7** Sync does its own checks, because multi-repository sessions load no
  hooks (ENV-1).
- **SYNC-8** Platform dependencies may move with the template while the site's
  own stack dependencies do not; a lockfile change follows such a sync.
- **SYNC-9** Renamed platform files, several sites offering conflicting changes,
  and the template itself being maintained by the same working model are open
  (section 15).

## 7. Setup

- **SET-1** Setup is **one guided session** run in a single-repository remote
  session or on a laptop.
- **SET-2** Setup first names, up front, every step only a human or a laptop
  session can do, and hands them over as a runnable checklist: installing the
  automation workflow definition, branch protection or rulesets, repository
  settings (visibility), the deploy host, its secrets and any owner-access
  secret, the agent environment's setup script and network access, and an
  optional separate agent identity or telemetry.
- **SET-3** Setup asks the owner for: the autonomy preset, each sweep's cadence
  ("off" is valid), dashboard access, public or private repository, deploy
  target.
- **SET-4** Setup records all choices as values a command reads (the preset in
  particular is one value).
- **SET-5** Setup creates the issue labels used by triage and reads them back to
  verify (labels cannot be created by a remote session).
- **SET-6** Setup installs the skill pack **and pins every installed skill in the
  same step**; it runs the pack's own setup skill to write the repository
  documents that adapt pack skills to this platform, including the rule that
  only triage sets the "ready" label.
- **SET-7** Setup creates the place for records, the owner rulings file (empty)
  and the platform chapters of the guide.
- **SET-8** Branch protection with verification as a required check is in place
  **before the first agent change**. Setup waits for the owner to confirm it.
- **SET-9** Setup runs verification, opens and merges the first change (the
  hello-world site) under the chosen preset, creates the sweep schedules,
  deploys, and confirms the live version is visible from outside the server.
- **SET-10** Setup warns that the agent tool's permission classifier may still
  refuse an action the owner authorised (ENV-12).
- **SET-11** Every step setup can see is verified by setup.

## 8. The working model: sessions

### 8.1 Always-loaded guidance

The always-loaded instructions are **short** (a fraction of a screen of
platform text plus a short site part) and import the platform's instructions
and both glossaries, so the platform text syncs as a file and sync never edits a
file the site writes into.

**GUIDE-1** The guidance must contain these standing behaviours, each of which
answers a recurring failure. They are judgement calls; where a check could
enforce one, PRIN-1 applies.

| Behaviour | Failure it prevents |
|---|---|
| **Verify before you state.** Ids, counts, causes and any sub-agent's claim are checked against the source this turn before being stated. | Facts stated from memory or relayed unchecked; counts not tallied. |
| **Question the premise.** Give each part of a plan a reason from the current goal; drop parts without one; add nothing beyond the ask. Run a new ordering or selection rule on two concrete cases before showing it. | Over-building; changes the owner reverts. |
| **Ask before building** anything the owner will see; settle in the first round what each displayed value follows; show a sample first. A stored field's shape is settled with the owner first. | Rework after the owner sees the result. |
| **Open the change request yourself** once the change is reviewed and verified, even if the tool's default says not to; subscribe to its activity and keep working until merged, closed or taken over. | Reviewed work left unmerged. |
| **An empty task prompt means stop and ask.** Never guess the task from a branch name or history. | Wrong work started. |
| **Read a required document whole.** Keep such "read X before Y" lines few; expect them to be read late. | Rules missed because a document was skimmed. |
| **Never chain a commit or push with a check** in one command. | A failing step silently skipped. |
| **Run long commands in the background and end the turn;** after a restart, confirm background work is alive before reporting it. | Foreground work killed; false status reports. |
| **Use plain words;** coin a term only on its second use. | Jargon-heavy documents the owner rejects. |
| **Stay on the branch the session started on;** if that is the default branch, cut a new one. | Work on the wrong branch. |
| **Every agent write to an outside system names the session that made it** (see 8.8). | Unattributable posts. |

**GUIDE-2** The platform deliberately **excludes** four mechanisms. The first
three became top sources of problems (PRIN-2): a guard that denies a first tool
call until a document is read; a reminder that interrupts mid-run; hints that
point to a document after each edit. The fourth is machinery with no use here:
generated summary rules mirroring every decision record, together with tracking
of which rules loaded.

**GUIDE-3** A handful of **path-scoped rules**, written by hand, only where a
rule concerns certain files (for example protected paths).

**GUIDE-4** Decision records exist for the few decisions that shape the
platform; they change in place, carry no status, and a rewrite must never
change the decision (see 11.4).

### 8.2 Session lifecycle (start)

- **LIFE-1** At session start: install dependencies (VER-10),
  fetch full history if the checkout is shallow, make records available to the
  session, remember the session id for commands, print what loaded.
- **LIFE-2** The start hook fails **open** with a loud line; verification and
  merging fail closed later on whatever it left undone.
- **LIFE-3** Stale dependencies are detected and reinstalled before a failing
  check is trusted, because stale installs look exactly like real breakage.

### 8.3 Working a change

- **WM-1** Work happens on a feature branch; every change lands through a
  reviewed change request. Branches are pushed early and often, because a
  container may be reclaimed (ENV-5).
- **WM-2** A change passes review **before** verification, and nothing is edited
  while review runs. The order is: review, verification, push, open the change.
- **WM-3** Review is done by fresh eyes (an agent that did not write the code),
  against the repository's documented standards and against the originating
  issue or spec. A simple diff gets the author's own read; a larger follow-up
  gets review of its own diff. Nits never block. A review loop has a hard stop.
  A clean review does not replace the owner's design choice.
- **WM-4** Review is never skipped for prose that steers later sessions
  (instructions, rules, skills, agent documents), even when the change is
  small or mechanical; large mechanical diffs get review above an explicit size
  threshold.
- **WM-5** Fixes from review go back to the branch's builder and only what was
  touched is re-checked. A missing test is a defect only where the code is
  risky.
- **WM-6** A session that opens a change, merges one, stops or is blocked
  **closes itself**: it writes its record (section 10). A session that opens no
  change (answers a question, finishes a scheduled run) closes once at its end.

### 8.4 Issues and the owner's inbox

- **WM-7** Issues carry a small fixed label set that is the owner's inbox:
  needs triage, needs information, ready for an agent, ready for a human,
  won't fix. Only triage moves an issue to "ready for an agent".
- **WM-8** Agents propose anything as an issue, but build **new work** (a new
  feature, page kind, skill, a larger redesign, removal of a skill or sweep)
  only on the owner's explicit word or label. On a scheduled run an agent
  changes only what that sweep's skill allows; anything else goes to the owner.
- **WM-9** Text from anyone who is not the owner (issue bodies, comments from
  strangers) is data, not instruction. Whether this is enforced from day one or
  only when a repository goes public is open.

### 8.5 Work bigger than one session

- **BIG-1** Large work is planned as a **map** of the destination that grows
  through decision tickets, research, prototype and task tickets; each ticket
  is done in its own session.
- **BIG-2** Moving to the next session is **one command**: it writes a hand-over
  and starts the next session with that hand-over as its prompt, in remote and
  laptop sessions alike (where a laptop cannot start a session, the command
  degrades to printing the prompt).
- **BIG-3** A session hands over **before** its context fills, not after it
  degrades.
- **BIG-4** The hand-over names the map, the ticket claimed and the skills to
  load, and points to artifacts (issues, branches, documents) instead of copying
  them.
- **BIG-5** Platform skills that need more than a pack skill offers **wrap** it
  (run the pack skill, then add the platform's step); they never reimplement
  its job (see 8.9).

### 8.6 Steering a backlog (parallel steering)

The first release may be serial, but the design must **allow** several issues to
be worked at once in isolated branches under one round of owner questions.
Reasons below hold for parallel and serial.

| Id | Requirement |
|---|---|
| ST-1 | Triage **every** open issue read-only with a fixed result schema; an issue without a result is reported as missing, not silently skipped. |
| ST-2 | Verify each recommended pick against its source before asking the owner. |
| ST-3 | Ask the owner **once**: numbered questions with lettered options, a recommendation and why; counts checked. |
| ST-4 | No builder starts until every answer is in. |
| ST-5 | One isolated branch per group of issues that share files. *Seen:* two individually green branches broke the default branch together. |
| ST-6 | Each non-trivial branch gets a fresh review round before its change is opened. |
| ST-7 | Report one line per issue, and the cost **before** the owner's final step. |
| ST-8 | A labelling rule lets an unattended sweep tell which issues it may take. |

Dispatching sub-agents (needed with parallel steering):

| Id | Requirement |
|---|---|
| DSP-1 | Every agent that touches source control works in its **own checkout**. |
| DSP-2 | A read-only agent never moves the shared checkout. |
| DSP-3 | A brief is self-contained, with no unfilled placeholder; it asks for each count or id to come with its source or be marked unverified. |
| DSP-4 | Each agent's final reply is kept verbatim. |
| DSP-5 | A stopped agent is resumed, never re-dispatched, and never resumed while its run is live. |
| DSP-6 | Before a session finishes, every branch is pushed or dropped; stranded work is found from source control, not from memory. |
| DSP-7 | Parallel full verification runs are capped by memory (ENV-13). |
| DSP-8 | A screenshot-reading agent has a hard cap on images. |
| DSP-9 | Each agent writes the files it creates into its own named scratch area; shared scratch space is not shared by accident. |
| DSP-10 | Model choice per role (cheaper for builders, stronger for reviewers) is possible; whether it is a platform requirement or a per-site setting is open. |

*Still unsolved in earlier practice, so not to be assumed solved:* sessions
forgetting to log again after a merge, and stranded work at session close.

### 8.7 Verifying UI changes

The owner judges visible changes by screenshots, so this must be reliable:

- **UI-1** One tool starts a preview, takes screenshots and stops the preview.
  It owns its server **by process**, never by name pattern; its stop always
  succeeds; killing by pattern corrupted unrelated work.
- **UI-2** Concurrent previews never collide on a port.
- **UI-3** A capture waits for a real page and for it to become interactive; a
  development server's loading page is not the page.
- **UI-4** A trusted screenshot comes from a **production build** at the
  requested pixel size.
- **UI-5** Light and dark, desktop and phone are one invocation.
- **UI-6** Rendering is checked by assertions on the rendered DOM; a text search
  of server output proves nothing and a filtered test run is not proof.
- **UI-7** The deployed site is unreachable from remote sessions, so a local
  production build is what is reviewed (ENV-10).

### 8.8 Identity and provenance

- **ID-1** Every agent write to the source host, source control or any outside
  system names the session that made it, on **every** write path (tool API,
  raw HTTP, command-line, commits): issues, change requests, comments, reviews,
  commit trailers.
- **ID-2** The agent never transcribes its own session id (ENV-14); a mechanism
  supplies it (and prints the exact line to paste when refusing).
- **ID-3** A write without provenance is **refused**, not repaired afterwards on
  a public post.
- **ID-4** Cloud sessions commit without the attribution trailer by default; it
  is added mechanically and checked by verification.
- **ID-5** An agent's post is told from a human's by the provenance mark,
  never by the account name (while agents share the owner's account).
- **ID-6** The design must work with a **shared account** (default: agents act
  as the owner) and gain simplicity under a **separate agent identity**, where
  the host can then enforce "the owner must approve changes to protected
  paths". The identity option is a setup choice; whether it is worth its
  upkeep (token expiry and rotation) is open.

### 8.9 Working with an installed skill pack

The platform extends an installed third-party skill pack; it does not compete
with it.

- **PACK-1** Every installed skill is **pinned at install** (for example by a
  hash in a lock file), and verification **fails on drift**: not only once a
  skill is first used. An unrecorded skill is an error.
- **PACK-2** A platform skill calls a pack skill **by name** for the pack's job
  (questioning the owner, review, tickets, research, prototypes, hand-overs).
  *Seen:* reviewers who were told to follow a review in their own words skipped
  or half-followed its steps.
- **PACK-3** Where the platform needs behaviour different from the pack's, the
  difference lives in a **repository document** that the pack skill reads,
  written by the pack's setup skill and owned by the site. **Installed skills
  are never edited.**
- **PACK-4** A pack update lists the changed skills, re-reads every repository
  document and rule that adapts them, and says so in its change description.
  *Seen:* an update was reported as touching fewer skills than it did, and the
  owner had to ask whether local adaptations were overridden.
- **PACK-5** Renames and deletions upstream are handled as their own listed
  steps.
- **PACK-6** The pack the platform ships by default covers: questioning the
  owner, code review, test-first, bug diagnosis, domain modelling and
  glossary/decision records, issue triage, turning discussions into specs and
  tickets, prototyping, research, step-by-step wizards for human-only work, a
  writing standard for agent documents, a retrospective, mapping big work,
  hand-over, and the pack's own setup. Which of these is truly used is to be
  measured; unused ones are not shipped.

## 9. Verification, merging and autonomy

### 9.1 Verification

One verification, one definition, run the same by a laptop, a remote session and
the automation service.

| Id | Requirement |
|---|---|
| VER-1 | Steps, in order: dependency freshness, lint (including the repository's mechanical rules as lint rules for code, prose and data), type check, content validation, unit tests, build, browser smoke test, plus the platform's own checks (commit attribution trailers, pinned skills, copies that sync owns, guide excerpts). |
| VER-2 | A pass vouches for the **exact tree that is pushed**: verification records the source-control head and tree at the start and aborts (or warns) if either changed by the end. This holds for a full run, not only a partial one. |
| VER-3 | Any decision drawn from source-control history **fails closed** on a shallow or unknown base. |
| VER-4 | In automation, the run summary **names the failing step**; a single opaque step that hides which check failed is not acceptable. |
| VER-5 | A **fast** local subset (seconds) exists for iterating: content against schema, data-format traps (see 13.1), references between content files, skill-name clashes. It never replaces full verification. |
| VER-6 | The whole run stays short enough to run in full every time (no skipping by changed path at first). A fail-closed skip may be added if it ever hurts, but never a skip of review (WM-4). |
| VER-7 | On green, the automation posts a signal that **wakes** a session waiting for it (ENV-3). |
| VER-8 | The automation workflow definition is **minimal and stable**; its logic lives where a remote session may push, so changing verification never means editing the workflow (ENV-2). |
| VER-9 | A **drop zone** exists for changes only a human or laptop session can apply (workflow definitions etc.), with a rule that both halves of a change land in one sitting. |
| VER-10 | Dependency updates are grouped and automated; new dependencies and new major versions need the owner (AUT-5). Dependencies install from a frozen lockfile everywhere (sessions and automation) and the package manager is pinned. |

### 9.2 Merging

Each requirement below came from agent-only failures, not from outside
contributors.

| Id | Requirement |
|---|---|
| MRG-1 | A change merges only after verification passes **and** a review verdict names this exact head. |
| MRG-2 | The verdict's version id is machine-produced, never typed. |
| MRG-3 | The merge is **pinned** to the reviewed head, so a late push fails the merge instead of landing unreviewed. |
| MRG-4 | No host auto-merge (ENV-9). |
| MRG-5 | Protected paths are read from the **default branch**, so a change cannot shrink its own protected list; renames are followed so a rename cannot move a file out of protection; an unreadable list **refuses** the merge. |
| MRG-6 | Closing keywords in the change description are parsed the way the host does (any tense, colon, quotes, negation). A merge never closes an issue the owner reserved. |
| MRG-7 | Issues the host left open after the merge are closed, with a retry. |
| MRG-8 | An owner waiver given in session is quoted in the merge record and lifts **only** the protected-path refusal. |
| MRG-9 | A merge that failed (for example a service error) is never reported as merged; "merged" is reported only after the host confirms. |
| MRG-10 | Long waiting for green runs in the background (ENV-6). |
| MRG-11 | Each merge writes a record row (who, what, preset, waiver, verdict). |

### 9.3 Autonomy and protected paths

- **AUT-1** One value, chosen at setup, decides what agents may merge. At least
  **three presets** exist. Exact definitions are open (section 15). Candidate axes: who merges
  agent changes; whether scheduled runs may self-merge; whether the
  improvement sweep may change its own skills; how large the protected list is.
- **AUT-2** The presets vary by **who acts and what kind of change**, not by a
  hierarchy of path risk tiers. Every preset still requires a verdict and the
  pinned head, and still refuses protected paths.
- **AUT-3** The preset is protected: changing it is itself a protected-path
  change, and merging reads it from the default branch.
- **AUT-4** Few protected paths exist at first. Candidates: the verification
  definition, the merge rule, hook wiring and permissions, the autonomy value
  and protected lists themselves, the workflow definition, decision records,
  the owner's rulings, the place for server routes. The owner confirms the
  list.
- **AUT-5** By default the owner merges a change that adds a dependency or a
  server route. Which other kinds of change also need the owner (new major
  versions, low-risk dependency updates, behaviour no check can observe) is open,
  as is whether such changes get a security review.

## 10. Session records

The owner's requirement: records are **easy for agents to read at any time,
showable on a dashboard, and quick and painless to write**.

| Id | Requirement |
|---|---|
| REC-1 | Every substantive session lands a record **without the owner asking**. |
| REC-2 | The agent writes **only the judgement half**: goal, outcome, problems, ideas, who asked. Machine facts (timings, models, tokens, tools used, sub-agents, files changed, change requests, source-control state) come from the machine. The platform keeps only the machine facts it uses; tracking which instructions or documents a session read is not one of them. The session id comes from the machine too (ID-2). |
| REC-4 | Landing is **idempotent**: a second landing replaces the machine half and merges the authored half; it never clobbers the authored half. |
| REC-5 | A record's **status follows its change requests**, so no view shows "in review" for merged work. Status is derived (PRIN-8). |
| REC-6 | A failed landing is **loud**, never hidden by filtered output. An agent must never tell the owner a refused record had landed. |
| REC-7 | A record written while the format is changing is accepted or **held**, never lost. New fields are optional; format changes add a new version beside the old. |
| REC-8 | A record's authored text **survives the container being reclaimed** (it is pushed when written). |
| REC-9 | Timestamps are UTC; a day is cut by the session's **end**. |
| REC-10 | Each problem carries a **severity** graded by what it cost (from nit to blocker), and the agent reports **every** one, however small. Whether nits become findings or stay in the record only is open. |
| REC-11 | Records are **data, not site content**: writing one must not need the site to be rebuilt or redeployed, and must not need to pass the site's content schemas. Where records live (own branch, own store, same repository) is open, but this constraint must hold. |
| REC-12 | Records written by commands from several sessions never collide: each file name is unique to its session; only sweeps write shared things (causes, run rows, taken marks). A push that loses a race rebases and retries. |
| REC-13 | Records are never regenerated from repository state; views derive from them. |
| REC-14 | Retention and archiving are defined (open). |
| REC-15 | Records stay private from the template (REPO-3), and the owner decides whether they are public or private where the repository is public (open). |
| REC-16 | An "orphan" (a change request or commit naming a session with no record) is detectable (see 11.2). |
| REC-17 | **Reminders** are rare: at most one per event (a change request opened without being subscribed to, a merge after which no record was refreshed, a refused record), never mid-run. |

## 11. Sweeps (scheduled upkeep)

Five sweeps ship by default. Each is a skill plus a schedule entry, can also be
run by hand, and can be removed (PRIN-11). **Setup chooses their cadences;
"off" is valid.** Costs of earlier equivalents were meaningful (a run each costs
dollars; a daily watcher was the most expensive of all), so cadence and bounds
are deliberate, not default-to-daily.

### 11.1 One finding shape and one intake

Every sweep and every session hands work on in **one record shape**, written by
a command, never typed by an agent:

- id (made by the command), source (session, watcher, docs, visitor, retro),
  kind (problem, idea, learning), where (route, file or skill), what (quoting
  it), evidence (command, measurement, screenshot or source line), commit seen,
  verified (yes/no), severity (problems only), session, cause (set later),
  taken-by (the run that consumed it), optional match (earlier item it repeats)
  and optional proposal.
- A session's problems are findings too, so the improvement sweep has **one
  input**.

### 11.2 Watcher: catches what sessions don't notice about themselves

Classes of thing it caught: steps a skill skipped while reporting success;
missed invocations; reverted or regressed changes; verification bypassed by accident;
orphaned records; humans nudging a closure; a scheduled sweep that stopped.

| Id | Requirement |
|---|---|
| WAT-1 | Runs on a schedule, independent of any session noticing. |
| WAT-2 | **Mechanical checks need no agent:** a merged change whose session left no record; a record listing a change the host says is closed; a sweep with no run in two cadences; a missing review verdict before a merge; issue and change states that comments claim; skill drift; run cost recorded; size of each memory file. |
| WAT-3 | **Agent checks** only for skills whose text or runs changed since the last run, capped per run; each grades a run against the **skill text in effect when that run started**. |
| WAT-4 | Every issue or change state it writes is checked against the host. |
| WAT-5 | Every sub-agent finding is verified against its source. |
| WAT-6 | It files an issue only when a finding is significant or repeated; on an open thread it comments, and it knows what to do when that thread is closed. |
| WAT-7 | An inconclusive scan is reported as **inconclusive**, never zero. |
| WAT-8 | A possible sweep stop is an observation, not a failure, but is surfaced. |
| WAT-9 | Its output is bounded; it shows its own cost. |
| WAT-10 | Which checks truly need an agent is open. |

### 11.3 Self-improvement: one sweep, every source

Inputs: problems, ideas and learnings, watcher findings, docs findings, visitor
findings, a single-session retrospective. It can be started by a session or by a
schedule.

| Id | Requirement |
|---|---|
| IMP-1 | One store **keyed by root cause**, with fixes and status. "Worked" is derived from later occurrences, never hand-recorded. |
| IMP-2 | **One dedupe step** for every input: open and closed issues, settled decisions, rulings, accepted causes, open trials. A title match is only a hint. |
| IMP-3 | The input window starts at the previous run, with a margin and a per-item "taken" mark, so missed runs lose nothing. |
| IMP-4 | It fixes only on a **safe surface**, through a reviewed and verified change; it **prefers a deletion**; a fix removes as much as it adds (PRIN-1, PRIN-10). |
| IMP-5 | It **never edits installed skills, decision records, guards or settings**; those become issues. |
| IMP-6 | Regressed and accepted causes follow PRIN-3 and PRIN-4. |
| IMP-7 | Its work per run is **capped** (items, issues, fixes); large inputs stay out of its context. |
| IMP-9 | One **report** per run: every number sourced or marked unverified; every dropped item with its reason. |
| IMP-10 | Its own briefs are a problem source it watches. |
| IMP-11 | A cut instruction may stand as a **trial** judged later by the share of sessions reporting the problem; silence is a weak signal. Whether trials exist as a step or only as a principle ("cut before you add") is open. |
| IMP-12 | Thresholds that route a cause to the owner or to a fix (occurrence count, severity) are defined; the exact numbers are open. |
| IMP-13 | Who may declare a cause **accepted** is defined; the owner is the default. |
| IMP-14 | Ideas and learnings become issues labelled for triage. |
| IMP-15 | Retention of processed findings is bounded (open). |

### 11.4 Docs upkeep and the guide

*Seen:* an earlier docs sweep landed a fix in almost every run, and its
independent checker rejected a large share of the draft findings; a rewrite once
inverted a decision record's decision and was caught only by the owner's merge
review.

| Id | Requirement |
|---|---|
| DOC-1 | The sweep runs autonomously and the owner steers it. It checks docs against the **code and the records**, because review alone missed what it found. |
| DOC-2 | A finding is applied only after an **independent check** against the primary source. |
| DOC-3 | For a rewrite, the checker first **lists every rule, exception and reason** in the original; a rewrite that loses one, or is not shorter or plainer, is rejected. |
| DOC-4 | A rewrite of a decision record **must not change the decision**; changes to decisions are protected and the owner merges them. |
| DOC-5 | A conflict that no source settles becomes an **issue the sweep files itself**, never merely named in a report. |
| DOC-6 | **Coverage rotates by the previous run's record** (what was actually read), not the calendar. |
| DOC-7 | The owner steers through **standing rulings** that every run reads whole and only the owner edits. The sweep's own decisions live apart, can be overruled with evidence, and are kept in a **size-capped memory file** whose cap is enforced by a test (a request to "leave it shorter" did not hold). |
| DOC-8 | A page that cites code **names the version it was checked at**, and **verification fails when a cited excerpt no longer matches**. |
| DOC-9 | Large mechanical diffs still get review (WM-4). |
| DOC-10 | Scheduled runs **never ask the owner for a focus**. |
| DOC-11 | **The guide:** a set of pages that explains how this site and its platform work. It starts with platform chapters seeded from the template and grows site chapters as the site grows. The intended reader (the owner, agents, or an adopter) and depth are open. |
| DOC-12 | The cap on the memory file is a number to choose (open). |

### 11.5 Visitor sweep

*Seen:* an earlier visitor sweep built its own fixes, some of which were later
reverted; findings about the footer, feeds and "start here" recurred on nearly
every run; dark mode was never covered; two same-day runs duplicated each other.

| Id | Requirement |
|---|---|
| VIS-1 | It **builds nothing**. It reports findings only. |
| VIS-2 | A finding is **verified** against source and the rendered page before it is reported; text-extraction artefacts are not findings. |
| VIS-3 | Owner rulings, open issues, merged changes and recent findings are checked first; a repeat attaches to its earlier item. |
| VIS-4 | **Coverage** (pages, viewport, colour scheme, persona) is recorded; the next run's scope comes from the least-covered area, not the date. |
| VIS-5 | Visitors get the **real route list**, including pages a link crawl cannot reach. |
| VIS-6 | Personas cover: first-time visitor, task-directed visitor, keyboard-only visitor, returning visitor. Who writes the tasks is open. |
| VIS-7 | Each run has a **page and screenshot budget** and records its cost. |
| VIS-8 | Output is in the finding shape (11.1), carrying where, what, evidence, the version seen and whether it was verified. |
| VIS-9 | Accessibility and dark-mode coverage is included. |

### 11.6 Daily summary (digest)

| Id | Requirement |
|---|---|
| DIG-1 | One summary per closed day with activity, for the owner. Whether a daily page is the right form for a reader of one is open. |
| DIG-2 | **Counts come from a script.** The prose is checked claim by claim by a fresh agent against the merged changes. A cadence word ("weekly") needs a source. |
| DIG-3 | A summary is **written once and never rewritten**. |
| DIG-4 | A day's material is gathered by a script that finds finished days with activity and no summary; a run writes only a bounded number of missing days. |
| DIG-5 | It gets a review before landing (skipping review for it recurred as a failure) — or an equivalent checker if it is data rather than content (open). |

### 11.7 Cadence, bounds and cost

- **COST-1** Every scheduled run records its **cost and tokens**, attributed to
  sub-agents where possible, **from a source the run does not have to query
  itself** (ENV-7).
- **COST-2** A cost that could not be read is shown as **"unreported"**, never
  guessed.
- **COST-3** Every scheduled run has a **per-run bound**. Because no hard
  budget cap exists (ENV-7), each sweep bounds its **work** (items, agents,
  pages) and records an overrun.
- **COST-4** Every cost figure is labelled a **list-price estimate**. For a
  subscription, the real limit is a usage window; the view shows that pressure
  if a run can read it. Whether the owner sees dollars, usage-window share or
  both is open.
- **COST-5** Cost recording works by each sweep's **first step** recording costs
  for finished runs that lack them.
- **COST-7** Default cadences are proposals the owner changes at setup; weekly
  sweeps on a quiet site may find nothing, daily ones cost real money.

## 12. Observability: the dashboard

Observability is a **must-have**. It is **owner-only by default**; a demo site
may make it public. Every read is bounded (PRIN-9). Views derive from records;
a new record shows with **no page edit** because every view is a query over the
records.

| View | Contents |
|---|---|
| Sessions | Newest first, a page at a time with the total: goal, derived status, outcome, kind, change requests, problem counts by severity, duration, models, sub-agent share of tokens and run time. |
| Causes | One row per cause over a time window (default seven days): occurrences, fixes, fix state **derived** from later occurrences. |
| Sweeps | Last run, cost per run and per week (labelled estimate), coverage, a "possibly stopped" flag (WAT-2), memory size. |
| Skills | Per skill: role, use count, graded importance, open findings against it (whether importance is graded is open). |
| Headline tiles | Sessions by kind, problems by severity, sweep spend, open ideas, skills. |
| Digests | One per day, newest first. |
| Ideas and learnings | Open idea findings and the issues they became. |
| Live | The deployed version and build time. |

- **OBS-3** Access control is a choice: a login, a shared secret, a network
  restriction, or none because the repository is private. It must be settled
  with the owner, including what "owner-only" means when the repository's own
  files are public. Agents must be able to verify the dashboard locally (the
  check must be off or known locally).
- **OBS-4** What the dashboard shows on a site that is not deployed yet (a
  laptop-only site) is open (a local page or a printed summary).
- **OBS-5** Which views the owner actually reads is unknown; views earn their
  place.

## 13. Guarantees about the site the platform carries

### 13.1 Content

Content is kept as plain-text files (prose and structured data) in the
repository. A stack is not decided here; these must hold on whichever stack is
chosen, built in or checked by the platform's own step.

| Id | Requirement |
|---|---|
| CON-1 | Every content file is **checked against a typed schema** before merge. A build that passes invalid content is not a check (an out-of-range value was once published). |
| CON-2 | **Silent truncation** in the structured-data format (for example an unquoted comment character) and **silently degraded component blocks** inside prose are caught. |
| CON-3 | A folded line ending in a hyphen is caught, because it turns one word into two. |
| CON-4 | **References between content files** are checked. |
| CON-5 | Components inside prose are allowed, with a short rule for when a component beats a metadata field. A mistake inside a component fails the build with file and line. |
| CON-6 | A site adds its own content rules as ordinary unit tests; the template may ship a few common ones (broken internal links, missing images) — open. |
| CON-7 | A fast content check (seconds) exists (VER-5). |
| CON-8 | Diagrams are not a first-version requirement; a site that wants diagrams commits rendered files. Whether an owner's site needs any is open. |
| CON-9 | A safety filter for vector graphics held in content is needed only when a site inlines graphics from content. |

### 13.2 Pages and runtime

| Id | Requirement |
|---|---|
| WEB-1 | Content pages may be **prerendered**; anything that needs the server renders on demand. |
| WEB-2 | **Browser-side navigation** (fast in-app transitions without full page reloads) must be **available as an opt-in**; the owner values how fast navigation feels. The bar and how to measure it ("as fast as the previous system, timed on a phone") is open. |
| WEB-3 | **Server-side routes** (APIs) must be possible, with **a named place** for them, and a rule that adding one is the owner's merge (AUT-5). |
| WEB-4 | Any data the browser loads has a **recovery path**, or is avoided. Any page cache has a **size bound**. |
| WEB-5 | An **owner-only area** is possible behind access control; owner-only content must not be reachable by a content API or build artefact that bypasses the control. |
| WEB-6 | Design tokens as standard CSS custom properties, dark mode, reduced motion; **no wrapper classes or name prefixes**. Accessibility practice (roles, keyboard, tested through roles in browser tests). Whether an automated accessibility check is required is open. |
| WEB-7 | Content pages ship as little client code as possible. |

### 13.3 Deploy

The owner is open to other models; the model that worked was a self-updating
container that builds beside the live site and swaps only on a good build.
Whatever the design picks must keep these:

| Id | Requirement |
|---|---|
| DEP-1 | **A merge is a deploy.** A site may hold deploys back separately only if that is chosen at setup (open). |
| DEP-2 | A **failed install or build never replaces the live site**, and the next cycle retries rather than staying stale. |
| DEP-3 | The **live version and build time** are visible from outside the server (footer and a version endpoint), because neither the owner nor a remote session can read server logs. A site once stayed hours stale until a screenshot showed it. |
| DEP-4 | A build's **memory need** is known and provided for. |
| DEP-5 | A deploy credential **never lands in the repository's source-control config**. |

### 13.4 Seed site

A hello-world site with one page, a typed content schema, one component in
content, one API route in its named place, one on-demand page, design tokens, a
smoke test, the verification, and a deploy; plus an owner-only path if the owner
area belongs in the first version (open, section 15). The seed is the minimal
example of every extension point.

## 14. Non-goals

- Machinery for several independent sites inside one app; one repository holds one site.
- Outside contributors and a trust-tier pipeline for them.
- A public self-documenting experiment (a showcase of the platform itself).
- Generated developer documentation (a later, second-priority feature; the
  guide's pinned-citation mechanism is meant to be reusable for it).
- Locks, slots and path-based skipping around verification at first.
- A guard for every environment quirk at first: each begins as a line in the
  environment-caveats document and becomes a guard only if it recurs (PRIN-1,
  PRIN-2).
- Reproducing any particular earlier tool or file layout.

## 15. Open design questions

Each item names the constraint every answer must meet. The designer should
choose, justify the choice, and mark any choice resting on an untested fact as
an experiment to run before building.

### Owner choices (to be asked, not guessed)

1. **Stack** (site framework and content tools). Constraints: CON-1 to CON-5,
   WEB-1 to WEB-5. Does the stack check content itself or does a script?
2. **Where records live.** Constraints: REC-11, REC-12, REC-15; a record write
   never deploys or fails on a site schema; the dashboard can read them without
   a rebuild; no bypass on protected branches; the cost is that records are not
   in the main tree.
3. **Records in a public repository** (REC-15). Owner-only records vs public
   repository.
4. **Autonomy presets: exact definitions** (AUT-1 to AUT-5) and the first
   protected paths.
5. **Dashboard access control** (OBS-3) and what the dashboard is on a site not
   yet deployed.
6. **Deploy model** (DEP-*), including whether a merge is always a deploy.
7. **Whether a red change request is acceptable** if the agent waits for automation,
   instead of running the full verification before every push.
8. **Waiting for green outside the remote environment:** a laptop session has
   no event subscription. Does it wait in the foreground, hand back to the
   owner, or schedule a check?
9. **Parallel steering in the first release** — serial, or isolated-branch
   parallel from the start (ST-*, DSP-*).
10. **Which skills ship by default** (PACK-6), by measured use.
11. **Default cadences, thresholds and caps** (section 11).
12. **Whether the digest is a record or a page**, its form for one reader, and
    whether it needs review or a checker (DIG-*).
13. **Contributions from strangers' sites back to the template** (SYNC-5), and
    who reviews an offered change on the template; whether the template itself
    runs the platform; whether several sites' offers conflict.
14. **What a "site" is:** whether one repository may hold a site with distinct
    parts (a blog and a shop), or a second part is a second repository.
15. **Who the guide is for** (DOC-11) and its depth.
16. **Volume** (PRIN-9): whether bounded reads, output caps and parallelism limits apply
    from the start or when volume demands.
17. **Dependency updates:** rule for minors and patches; whether an update sweep
    exists from day one; whether a security review of server routes exists.
18. **Agent identity** (ID-6): shared account, separate account, or app; token
    lifetime and rotation.
19. **Whether nit-level problems become findings** (REC-10), and whether the session
    retrospective is an input to the improvement sweep.
20. **Whether cost views show money, usage-window share or both** (COST-4).
21. **Model choice per role** (DSP-10).
22. **Laptop parity:** which requirements must hold identically on a laptop and
    which may degrade.
23. **Whether review covers owner-written commits**, and whether a waiver is per
    commit or a standing rule for kinds of change.
24. **How the platform's own mechanisms are decided to be worth keeping:**
    whether prune-style trials survive as a step or only as a principle (IMP-11).
25. **Owner area:** whether an owner-only area is in the first version or comes
    later (WEB-5, OBS-3).
26. **Content-writing skills:** whether a site wants any (for example
    fact-checked posts, in-character writing, curated catalogues); a
    claim-by-claim fact check is the transferable part.

### Experiments the designer must plan before relying on them

- Whether a remote session may push a second branch beside its working branch,
  and whether a checkout of it survives a resumed container.
- Whether the session id is present in the hook payload for remote, laptop and
  scheduled runs, and whether a sub-agent sees its parent's.
- Telemetry from a scheduled run: per-sub-agent cost, whether the last interval
  is flushed, whether a run can read its subscription's usage window.
- A separate agent account's token inside a remote session: whether pushes and
  posts show that identity.
- Browser-side navigation speed on a phone against the bar chosen for WEB-2.
- Container build memory; the dashboard reading records without a site rebuild.
- Starting a session from a session in the remote and laptop settings, with a
  hand-over as its prompt; how a session sees its own context use.
- Sync across two repositories in one session, which loads no hooks.
- Whether skills and path-scoped rules can live in one platform folder and be
  linked into the tool's expected folders, and whether sync copies links
  faithfully.
- How much of the session transcript must be parsed for the machine half of the
  record, and whether compacted or resumed sessions keep timings and tool counts
  right.
- How two-way sync will be exercised end to end, since it is the newest and
  least-tested part. The owner plans no pilot site; the authors of the earlier
  analysis recommended one throwaway site, and the designer should say whether
  and how to test sync without it.

## 16. What the designer should produce

A technical design that answers each requirement id (or states why it departs),
selects technologies and file layout, defines the commands, hooks, skills,
schemas, records, sweeps and dashboard, states the extension points, lists
experiments for every untested assumption, and keeps the platform as small as
this document's goal demands. Each mechanism in it names the requirement that
justifies it.
