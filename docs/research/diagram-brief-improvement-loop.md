# Diagram brief: how people and AI agents improve Terrarium

Research for an interactive process diagram aimed at **outside visitors**.
Written 2026-10-08 against `main`. Two rounds of independent review checked
it against the repo and the agents' session logs. Most terms in **bold** are
defined in [`CONTEXT.md`](../../CONTEXT.md).

How to use this brief:
- §1–§2: the process in plain words.
- §3: ready-made nodes and edges for each zoom level.
- §4: what to leave out and what to label honestly.
- Further reading: at the end.

## 1. The process in plain words

**AI agents do the writing; people steer.** Almost all code and content is
written by AI agents: Claude Code **Sessions**. People with write access
(maintainers, called **Trusted**) decide what should exist, approve new work,
and merge the riskier changes. Outside visitors (called **Public**) can only
report problems.

**Every change is a reviewed pull request.** An agent works on a branch,
runs the automatic checks (the **Gate**) and opens a pull request on GitHub.
The same checks run again on GitHub. If they fail, or a reviewer asks for
changes, the agent fixes the work and tries again. Only then is it merged
into `main`, and the live site updates itself from `main`.

**Every agent keeps an honest diary.** When a Session finishes, it writes a
**session log**: what it set out to do, how far it got, and every pain point
it hit (a **Friction**), from tiny annoyances to blockers. It can also note
ideas for the future. The log goes straight into `main`, the only change that
skips review. Logs can't break the site, and making them wait for review
would tempt agents to skip them or water them down. The logs are published
in the **Journal**, the project's public record of its own work.

**Scheduled agents improve the project every day.** Seven agent runs start
on a daily timer (**Routines**), each with one job. Most of them read the
session logs, while others check the docs against the code or visit the live
site. Each one fixes what it safely can, inside a scope that was approved in
advance, and files everything else as an issue for people.

**People close the loop.** Maintainers check what the scheduled runs
produced, approve issues for building, harvest good ideas from the logs, and
merge what only a person may merge.

**The result: the next agent has a better time.** Fixes land in the agents'
instructions, their **Skills** (reusable instruction packs) and the site.
The next Session reads those improved instructions and should hit fewer pain
points.

> work → log the pain → scheduled runs and people act on it → better
> instructions → the next work hurts less

## 2. Who and what is involved

### Actors

| Label | Who/what, in one line | Pointer |
|---|---|---|
| **Maintainer** | Has write access: steers, approves new work, merges | `CONTEXT.md` → Trusted; ADR-0020 |
| **Outside visitor** | No write access: can open issues and pull requests from a fork, but cannot direct agents | `CONTEXT.md` → Public |
| **Agent session** | A Claude Code session a person starts, from web, phone or terminal | `CONTEXT.md` → Session |
| **Scheduled agent** | The same kind of session, started by a daily timer with one fixed job | ADR-0010 (line 12); `layers/journal/content/current/pages/how-it-works.md` |
| **Helper agent** | Does a sub-task for a session (build, review, fact-check); never merges | `.agents/skills/dispatch-subagents/SKILL.md` |
| **GitHub** | Issues, pull requests, automatic checks | `.github/workflows/gate.yml` |

For scale, in one week (2026-10-01 to 10-08): 107 sessions, of which 56 were
scheduled and 51 were started by a person.

### Things that move around

| Label | One line | Pointer |
|---|---|---|
| **Session log** | One honest diary per session | `layers/journal/content/current/sessions/`; format `shared/schemas/session.ts` |
| **Pain point** (Friction) | One problem noted in a log, graded from `nit` to `blocker` | inside a session log |
| **Idea** | A concrete suggestion noted in a log | inside a session log; page `/t/journal/current/ideas` |
| **Issue** | A work item; its label says whose move it is | GitHub; `docs/agents/triage-labels.md` |
| **Pull request** | Every change except logs | GitHub; `docs/agents/pr-workflow.md` |
| **Automatic checks** (Gate) | The same tests and checks, run locally and on GitHub | `scripts/gate.ts`; ADR-0004 |
| **Main branch** | The source of truth | – |
| **Live site** | Rebuilds itself from `main` | `deploy/` |
| **Journal** | Public dashboard of logs, daily digests and Skills | `/t/journal/current` |
| **Agent instructions** | What every agent reads first: house rules, glossary, how-tos, recorded decisions | `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`, `docs/adr/` |
| **Skills** | Reusable instruction packs for agents | `.agents/skills/<name>/SKILL.md` |

### The seven scheduled runs (Routines)

Their timers live in claude.ai, not in the repo. The order below is
**observed** from the logs: checks and fixes overnight (UTC), then the blog,
pruning and visitor runs during the day.

| Label | Job in plain words | Role | Who merges | Pointer |
|---|---|---|---|---|
| **Write daily digest** | Summarises each finished day from history and logs | Narrate | Itself | `.agents/skills/digest/` |
| **Grade the Skills** | Checks a week of logs for Skills that failed or went unused; updates their grades; files issues for repeated failures; never edits a Skill | Find problems | Itself | `.agents/skills/audit-skills/` |
| **Fix reported pain** | Picks up to 10 recent pain points (at most 2 hard ones). Easy fixes are built by helpers and merged by this run; hard fixes go to a maintainer; fixes it may not touch become issues | Repair | Itself (easy), maintainer (hard) | `.agents/skills/frictions-to-fixes/` |
| **Fact-check the docs** | Compares docs and Skills with the code and fixes drift | Find problems | Itself; a maintainer for recorded decisions and CI | `.agents/skills/audit-docs/` |
| **Write a blog post** | One fictional author retells recent activity, sometimes with a reply from another | Narrate | Itself | `.agents/skills/blog-post/` |
| **Trial-cut old rules** | Deletes a chunk of instructions for 3 days; the next pain points show whether they were needed | Subtract | Itself | `.agents/skills/prune-trial/`; `.agents/prune-trials.yml` |
| **Fresh-eyes site visit** | Three helper agents on different AI models visit the site as newcomers. It fixes what at least two of them flag and builds the single best feature idea | Outside eyes | Itself | `.agents/skills/visitor-loop/` |

Exact scope of what each run may merge: the table at the top of
`docs/adr/0003-agent-operating-model-and-governance.md`.

### What maintainers actually do

Drawn from this week's sessions started by a person:
- **Check a scheduled run's output and fix it**, e.g. when a run misfires or
  a rule it follows is wrong.
- **Run a scheduled job by hand**, often from the phone.
- **Work the issue list:** sort issues, then have an agent build the
  approved ones.
- **Harvest ideas** from the logs and ship the cheap wins. No scheduled run
  does this.
- **Ask for new features and content.** Building a new feature, Skill or site
  needs their approval.
- **Merge** what only a person may merge, and apply **change notes** agents
  can't push themselves (e.g. CI settings, `docs/proposals/`).
- **Watch** the project through git history, the Journal and the Blog.
- **Set up** the scheduled runs' timers.

## 3. Diagram items

### Zoom 0: the loop

Layout: a cycle in the middle, with lanes around it.

**Lanes**
- Maintainers, with a thin lane for outside visitors.
- Agents: sessions started by a person, plus scheduled runs coloured by role.
- GitHub.
- `main` → live site → Journal.

**Edges**

| From → To | Label | Note |
|---|---|---|
| Maintainer → Agent session | asks for work | |
| Timer → Scheduled agent | starts daily | |
| Agent → Pull request | opens | |
| Pull request → Automatic checks | must pass | |
| Automatic checks → Agent | fail → fix | return arrow |
| Pull request → Main branch | merge | colour by who merges: itself, maintainer |
| Main branch → Live site | updates itself | |
| Agent → Session log | writes at the end | |
| Session log → Main branch | straight in, no review | badge: "logs can't break the site" |
| Session log → Scheduled agent | pain points feed | |
| Scheduled agent → Issue | files what it can't fix | |
| Issue → Agent session | once approved | |
| Main branch → Instructions & Skills | improves | |
| Instructions & Skills → Agent | read first | big closing arrow: "fewer pain points next time" |
| Maintainer → Journal | watches | |
| Session log ⇢ Issue | idea harvest | dashed: done by people |

### Zoom 1 tabs

**Tab A: one session, start to finish**
1. Started by a person or a timer.
2. Reads the instructions.
3. Works on its own branch, maybe with helper agents. Built-in guards block
   unsafe actions.
4. Runs the checks.
5. Opens a pull request.
6. An agent reviews it, often on a different AI model.
7. Checks run again on GitHub.
8. Merged by itself, if inside its approved scope, or by a maintainer.
9. The site updates.
10. Writes its session log.

Long work can be handed to a fresh session. Merging often happens later than
the session itself.

**Tab B: the seven scheduled runs.** A 24-hour ring, or a night/day row.
Each run shows *reads → produces → who merges*, from the table above.
Colour by role: repair, find problems, subtract, outside eyes, narrate.

**Tab C: from issue to change**
1. Anyone files an issue.
2. An agent sorts it and writes a brief (`triage`).
3. A maintainer approves it (label `ready-for-agent`). When a maintainer
   starts a batch sort (`auto-triage`), it may approve maintainers' own
   issues itself. Outside visitors' issues always need a person, except in
   the guest demo (Tab E).
4. An agent session builds it (`implement`).
5. Review, then a maintainer merges.

Big work is first broken into a plan and tickets (`to-spec`, `to-tickets`,
`wayfinder`).

**Tab D: how Skills improve**
- **Own Skills:** changed by ordinary pull requests, from the pain-fixing
  run, the doc fact-check, rule trials or a maintainer's request.
- **Borrowed Skills:** an outside pack, frozen in place. Improvements go
  upstream; local notes go into the Skill list.
- **Skill grades:** the grading run observes and grades but never edits. A
  new or retired Skill starts as an idea and needs a maintainer's approval.

**Tab E: outside contributions (small)**
- **Outside visitor's issue:** sorted, then a maintainer decides.
- **Guest demo:** an agent interviews the guest in the issue; once the guest
  confirms, another agent builds it, and the owner merges (`guest-intake`,
  `guest-build`).
- **Outside agent's pull request:** a maintainer merges.

### Zoom 2 panels (click to open)

- **Session log contents:** goal, status, outcome, pain points, ideas; plus
  timings and tools, added automatically (`.agents/skills/log-session/`).
- **Who may merge what:**
  - scheduled runs: their own scope, when checks pass;
  - everything else: a maintainer;
  - always a maintainer: code that keeps sites apart, data formats, CI, new
    dependencies, untested behaviour changes, and recorded decisions (one
    exception: a rule trial may reword a decision without changing it).
  - Full list: `CLAUDE.md` → Ground rules.
- **Rule-trial cycle:** cut → 3 days → pain points → keep the cut, restore a
  line, or propose an automatic guard.

### Legend

- **Colour by who merges:** itself, maintainer.
- **Colour by run role:** repair, find problems, subtract, outside eyes,
  narrate.
- **Dashed:** done by people on purpose, or not live yet.

## 4. What to leave out, and what to label honestly

**Leave out:**
- script, hook and guard names;
- names of the check steps;
- exact run times;
- issue and pull-request numbers;
- log fields beyond pain points, ideas and status;
- the content-making Skills of single sites;
- sessions that loop on a timer by hand (none ran this week);
- provenance markers on commits and posts;
- the Midden site.

**Label honestly:**
- **Ideas become work only through people.** Draw it dashed: "harvested by
  maintainers" (`scripts/ideas.ts`: "promotion itself is out of scope").
- **Run timers are not in the repo,** so the order shown is observed.
- **Automatic merging of dependency updates is planned, not live**
  (`docs/proposals/1633-dependabot-automerge.md`). Show it only in a
  footnote, if at all.

## Further reading

| Topic | Where |
|---|---|
| How agents and people share the work | ADR-0003 |
| The automatic checks | ADR-0004, `scripts/gate.ts`, `.github/actions/gate/action.yml` |
| Skills as part of the product | ADR-0005, ADR-0015 |
| Session logs go straight to `main` | ADR-0009, `scripts/log-session.ts` |
| Scheduled runs and digests | ADR-0010 |
| Maintainers vs outside visitors | ADR-0020, `docs/agents/guest-contributions.md` |
| Batch issue sorting | ADR-0022 |
| Guest demo | ADR-0023 |
| Rule trials | ADR-0027 |
| Session closure and logging | `.agents/skills/close-session/`, `.agents/skills/log-session/` |
| Built-in guards | `docs/agents/guards.md` |
