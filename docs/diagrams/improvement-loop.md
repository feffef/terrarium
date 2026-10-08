# Diagram brief: how people and AI agents improve Terrarium

Source material for an interactive process diagram aimed at outside
visitors. Written 2026-10-08 against `main`, checked against the repo and the
agents' session logs in three review rounds. Where a Journal explainer page
and a Skill file disagree, the Skill file (`.agents/skills/<name>/SKILL.md`)
wins.

**Term convention.** Every node is labelled with the project's own term,
exactly as the glossary [`CONTEXT.md`](../../CONTEXT.md) or the Skill folder
spells it, with a plain subtitle underneath. For example: **Friction** · *a
problem an agent hit*. In prose, glossary terms are **bold** on first use and
other bold text is emphasis. **Routine** is not in the glossary; its
definition is "Skill + trigger = an autonomous job"
(`docs/adr/0010-digests-derived-append-only-journal-pages.md`, line 12).

How to use this brief:
- §1 builds the mental model in plain words.
- §2 lists actors, artifacts and the seven Routines.
- §3 gives ready-made nodes, edges and captions for each zoom level.
- §4 says what to leave out and what to label honestly.
- The further-reading table points to the decisions behind each part.

## 1. The process in plain words

**The metaphor.** Picture a workshop where every worker keeps an honest
diary of what went wrong that day. Each night a crew reads the diaries and
fixes the tools and the rulebook, so the next day's work goes more smoothly.

**Agents write, humans steer.** Almost all code and content is written by AI
agents: Claude Code **Sessions** (**Agent Authorship**).
- **Trusted** humans (anyone with write access) decide what should exist,
  **green-light** new work, and merge the riskier changes.
- **Public** visitors (no write access) can report problems and read
  everything, but can't direct the agents. Their text is treated as data,
  never as instructions.
- Agents work under the owner's GitHub account, so every agent-written
  GitHub post opens with a 🤖 header linking to its Session (ADR-0017).

**Every change is a gated pull request.** An agent works on a branch, runs
the **Gate** (the automatic tests and checks) and opens a pull request.
- GitHub runs the Gate again. `main` requires a PR and a green `gate` check.
- If the Gate fails or a reviewer asks for changes, the agent fixes it and
  tries again.
- Once merged into `main`, the live site updates itself.

**Every Session keeps an honest log.** At **Session closure** a Session
writes a **session log**:
- its goal and how far it got;
- every **Friction** it hit, graded from `nit` to `blocker`;
- optionally, **ideas** and **learnings**.

The log is committed straight to `main` without a PR, because a log can't
break anything and waiting for review would tempt agents to skip it. The
**Journal** publishes the logs for everyone.

**Routines improve the project every day.**
- Seven Routines, scheduled agent Sessions with one job each, run on a
  timer.
- Most read the session logs; others check the docs against the code or
  visit the live site.
- Each fixes what its pre-approved scope allows, and files the rest as
  issues.

**People close the loop.** Trusted humans:
- check what the Routines produced;
- green-light issues;
- turn good ideas into work;
- merge whatever needs a human.

**The output.** Fixes land in the agents' instructions, their **Skills**,
their **guards** (rules enforced by code) and the site. The next Session
starts from those and should hit fewer Frictions.

> work → session log with Frictions → Routines and Trusted humans act →
> better instructions, Skills and guards → fewer Frictions next time

## 2. Who and what is involved

### Actors

| Label | Subtitle | Pointer |
|---|---|---|
| **Trusted** human | Write access: steers, green-lights, merges | `CONTEXT.md` → Trusted; `docs/adr/0020-requester-trust-tiers.md` |
| **Public** visitor | No write access: reads, reports, opens fork PRs | `CONTEXT.md` → Public |
| **Session** | One Claude Code working session | `CONTEXT.md` → Session |
| **Routine** | A Session started by a timer, one fixed job | ADR-0010, line 12 |
| **GitHub** | Issues, pull requests, the Gate in CI | `.github/workflows/gate.yml` |

- **Tooltip on Session:** the Session's *kind* depends on who prompted it.
  - **interactive:** a human kept prompting.
  - **delegated:** one kickoff prompt only.
  - **autonomous:** a Routine.
  - Week of 2026-10-01 to 10-08: 107 Sessions, of which 56 autonomous, 46
    interactive and 5 delegated.
- **Also on Session:** a Session may dispatch **subagents** for sub-tasks.
  Subagents never merge (`.agents/skills/dispatch-subagents/SKILL.md`).

### Artifacts

| Label | Subtitle | Pointer |
|---|---|---|
| **Session log** | One per Session: goal, status, Frictions, ideas, learnings | `layers/journal/content/current/sessions/`; `shared/schemas/session.ts` |
| **Friction** | A problem a Session hit, `nit` … `blocker` | `CONTEXT.md` → Friction |
| **Idea** | A concrete proposal noted in a log | `CONTEXT.md` → Idea; `/t/journal/current/ideas` |
| **Issue** | Work item; its label says whose move it is | `docs/agents/triage-labels.md` |
| **Pull request** | Every change except session logs | `docs/agents/pr-workflow.md` |
| **Gate** | Tests and checks, locally and in GitHub CI | `CONTEXT.md` → Gate; `scripts/gate.ts` |
| **`main`** | The source of truth; the live site follows it | `deploy/` |
| **Journal** | Public dashboard of logs, Digests, Skill Inventory | `/t/journal/current`; `layers/journal/` |
| **Instructions** | What every Session reads first | `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`, `docs/adr/` |
| **Skill** | A reusable instruction pack for one kind of task | `.agents/skills/<name>/SKILL.md` |
| **Skill Inventory** | Each Skill's role and **Importance** grade | `layers/journal/content/current/skills/` |
| **Guard** | A rule enforced by code: it blocks an unsafe agent action | `docs/agents/guards.md`; `.claude/settings.json` |
| **Proposal** | A change only a human can apply (CI workflow or repo setting) | `docs/proposals/README.md` |

### The seven Routines

Their timers live in claude.ai, not in the repo. Session logs show each one
running roughly once a day: the audits and `frictions-to-fixes` overnight
(UTC), `blog-post`, `prune-trial` and `visitor-loop` during the day. Label
each node with the Skill name.

| Label | Subtitle | Role | Merge | Pointer |
|---|---|---|---|---|
| **`frictions-to-fixes`** | Turns recent Frictions into fixes | Repair (the core of the loop) | See below | `.agents/skills/frictions-to-fixes/SKILL.md` |
| **`audit-docs`** | Checks docs and Skills against the code | Find rot | Self; Human-only edits go to a human | `.agents/skills/audit-docs/SKILL.md` |
| **`audit-skills`** | Grades Skills in the Skill Inventory; never edits a Skill | Find rot | Self | `.agents/skills/audit-skills/SKILL.md` |
| **`prune-trial`** | Cuts instructions for 3 days and lets Frictions judge the cut | Subtract | Self | `.agents/skills/prune-trial/SKILL.md`; `.agents/prune-trials.yml` |
| **`visitor-loop`** | Blind visitor subagents test the live site | Outside eyes | Self | `.agents/skills/visitor-loop/SKILL.md` |
| **`digest`** | Writes the daily **Digest** | Narrate | Self | `.agents/skills/digest/SKILL.md` |
| **`blog-post`** | A **Persona** retells recent activity | Narrate | Self | `.agents/skills/blog-post/SKILL.md` |

"Self" means the Routine merges its own PR on a green Gate, within the scope
its row grants in the ledger at the top of
`docs/adr/0003-agent-operating-model-and-governance.md`.

**Tooltips:**
- **`frictions-to-fixes`:**
  - picks up to 10 Frictions per run, at most 2 of them hard;
  - subagents write the fixes, and the Routine reviews them and merges the
    simple ones (it reviews, it doesn't author);
  - a hard fix gets an issue plus a PR, which usually goes to a Trusted
    human;
  - a fix it may not touch becomes a `ready-for-human` issue.
- **`prune-trial`:** a trial ends in one of three ways: keep the cut, restore
  a line, or propose a guard.
- **`visitor-loop`:** three visitors on different AI models. It fixes what at
  least two of them flag and builds one feature idea.
- **`digest`:** fills in every finished day still missing a Digest, and
  moves old content to the `archived` Space.

### What Trusted humans actually do

From this week's interactive and delegated Sessions:
- **Check Routine output and fix it** when a Routine misfires or a rule it
  follows is wrong.
- **Run a Routine's Skill by hand** and own the Routines' timers.
- **Work the issue lane** (Tab C): triage, green-light, have agents build.
- **Turn ideas into work.** No Routine does this: a human mines the logs'
  ideas and ships the good ones.
- **Ask for new features, Skills, Tenants and content.** Net-new work needs
  their green-light (ADR-0003).
- **Merge** the changes on Human-only surfaces and **apply Proposals**.

## 3. Diagram items

### Zoom 0: the loop

- **Layout:** a cycle in the middle, with lanes around it:
  - Trusted (with a thin Public sub-lane);
  - Sessions (Routines coloured by role, `frictions-to-fixes` largest;
    `digest` and `blog-post` in a side lane);
  - GitHub;
  - `main` → live site → Journal.
- **Caption:** "Every Friction feeds the next fix."

**Nodes**

| ID | Label | Subtitle | Lane |
|---|---|---|---|
| trusted | **Trusted** | Steers, green-lights, merges | Humans |
| public | **Public** | Reads, reports | Humans |
| session | **Session** | Started by a human | Sessions |
| timer | **Timer** | Fires Routines daily | Sessions |
| routines | **Routines** | Seven daily jobs (Zoom 1, tab B) | Sessions |
| pr | **Pull request** | Every change except logs | GitHub |
| gate | **Gate** | Must be green | GitHub |
| issue | **Issue** | Work waiting for a green-light | GitHub |
| main | **`main`** | Source of truth | Repo |
| site | **Live site** | Rebuilds from `main` | Repo |
| log | **Session log** | Frictions, ideas, learnings | Repo |
| journal | **Journal** | Public record (with Blog: the retelling) | Repo |
| rules | **Instructions · Skills · guards** | What every Session starts from | Repo |

**Edges**

| From → To | Label | Style | Note |
|---|---|---|---|
| trusted → session | prompts | solid | |
| timer → routines | starts | solid | |
| session, routines → pr | opens | solid | |
| pr → gate | must pass | solid | |
| gate → session, routines | red → fix | solid | return arrow |
| pr → main | merge | solid | colour: self-merged (Routine) vs merged by Trusted |
| main → site | updates itself | solid | |
| session, routines → log | writes at closure | solid | |
| log → main | direct, no PR | accent | badge: "logs can't break the site" |
| log → routines | Frictions feed | solid | |
| routines → issue | files what it can't fix | solid | |
| public → issue | reports | solid | |
| issue → session | green-lit (`ready-for-agent`) | solid | |
| log → issue | ideas, turned into work by Trusted | dashed | done by people, not automatic |
| main → rules | improves | solid | |
| rules → session, routines | read first | bold | the closing arrow: "fewer Frictions next time" |
| main → journal | publishes | solid | |
| trusted, public → journal | watch | solid | anyone can watch (**Observability**) |

### Zoom 1, tab A: one Session

- **Layout:** numbered steps.
- **Caption:** "Pushing is not landing."

1. Started by a Trusted human, or by a timer (Routine).
2. Reads the instructions.
3. Works on its own branch, maybe with subagents; guards block unsafe
   actions.
4. Runs the Gate.
5. Opens a pull request.
6. Optional agent review (`code-review` Skill).
7. The Gate runs again in GitHub CI.
8. Merged: by itself if it is a Routine inside its scope, otherwise by a
   Trusted human.
9. The live site updates.
10. Writes its session log; the log is updated if the work continues.

### Zoom 1, tab B: the seven Routines

- **Layout:** a 24-hour ring, or a night/day row.
- **Caption:** "Routines tend; humans decide what should exist."
- **Nodes:** the table in §2, coloured by role: repair, find rot, subtract,
  outside eyes, narrate.
- **Edges:** for each Routine, *reads → produces → merge*.

### Zoom 1, tab C: the issue lane

- **Layout:** numbered steps.
- **Caption:** "`ready-for-agent` is the green-light."

1. Anyone files an **Issue**: Routines, Trusted, Public, Sessions.
2. **`triage`** sorts it and writes an agent-ready brief.
3. A Trusted human green-lights it with `ready-for-agent`.
   - A Trusted human can also start **`auto-triage`**, which then green-lights
     Trusted-authored issues itself (ADR-0022).
   - Public issues always need a person; the guest demo is the one
     exception (footnote).
4. A Session builds it (**`implement`**).
5. The PR passes the Gate and is merged.

Tooltip: big work is first split into specs and tickets (`to-spec`,
`to-tickets`, `wayfinder`).

### Zoom 1, tab D: how Skills and rules evolve

- **Layout:** three boxes and a ladder.
- **Caption:** "Prose first, code when prose fails."

- **Own Skills:** changed by ordinary PRs from `frictions-to-fixes`,
  `audit-docs`, `prune-trial` or a Trusted request.
- **Pack Skills:** 25 of the 42 Skills come from Matt Pocock's pack. They
  include the whole issue lane (`triage`, `implement`, `to-spec`,
  `to-tickets`, `wayfinder`). They are frozen and pinned
  (`skills-lock.json`); improvements go upstream, and local notes go into the
  Skill Inventory.
- **Skill Inventory:** `audit-skills` grades every Skill's **Importance**
  but never edits a Skill. A new or retired Skill needs a Trusted
  green-light.
- **Ladder:** written rule → keeps failing (Frictions) → becomes a guard
  (`docs/agents/guards.md`). Prune Trials push the other way: they cut rules
  and keep only those whose absence causes Frictions.

### Zoom 2 panels (click to open)

- **Session log:**
  - goal, kind, status, outcome, Frictions, ideas, learnings;
  - timings and tool use, added automatically
    (`.agents/skills/log-session/SKILL.md`).
- **Who may merge:**
  - Routines merge their own green PRs, within their ledger scope (ADR-0003);
  - everything else is merged by a Trusted human;
  - **Human-only** surfaces always need a human: Tenant isolation code,
    schemas, CI, new dependencies, untested behaviour changes and ADRs (a
    Prune Trial may reword an ADR without changing its decision). Full list:
    `CLAUDE.md` → Ground rules.
- **Prune Trial:** cut → 3 days on `main` → Frictions → keep, restore a
  line, or propose a guard (`docs/adr/0027-prune-trials.md`).

### Legend (shared with the architecture diagram)

- **solid:** a normal step;
- **bold:** the step that closes the loop;
- **accent:** the direct log commit, the only path that skips a PR;
- **dashed:** done by people on purpose, not automatic;
- **merge colour:** self-merged by a Routine vs merged by a Trusted human.

For cross-linking: `main` and `site` here are `repo` and `server` in the
architecture diagram (`docs/diagrams/nuxt-architecture.md`).

## 4. Leave out, and label honestly

**Leave out:**
- Script, hook and guard names, and Gate step names, *because* they are
  mechanisms below this altitude.
- Exact Routine times, issue and PR numbers, *because* they change daily.
- Content Skills of single Tenants (e.g. `atlas-specimen`), *because* they
  don't drive the loop.
- Handoffs between Sessions and `/loop` sessions, *because* they are rare.
- The Midden and Commons, *because* the architecture diagram shows them.

**Label honestly:**
- **Ideas reach work only through people.** No Routine promotes ideas to
  issues (`scripts/ideas.ts`: "promotion itself is out of scope"). Draw the
  `log → issue` edge dashed.
- **GitHub enforces less than the merge rules say.** The `protect-main`
  ruleset requires a PR and a green `gate` check and blocks force-pushes.
  But the owner's account bypasses it, and every agent acts as the owner:
  that bypass is how session logs reach `main` directly. "Who may merge
  what" is kept by agent instructions and human review, "a guardrail, not a
  wall"
  (`docs/research/github-branch-protection-vs-autonomous-log-commits.md` →
  Current state). Add this as a tooltip on the Gate node.
- **Routine timers aren't in the repo,** so their order is observed. Add
  this as a caption on tab B.
- **Dependabot** opens dependency PRs weekly (`.github/dependabot.yml`).
  Merging them automatically is still a Proposal
  (`docs/proposals/1633-dependabot-automerge.md`), though ADR-0003's ledger
  already lists it. Footnote only.
- **Guest demo** (ADR-0023): while the owner runs it, a guest's own
  confirmation can green-light their issue, and the owner still merges.
  Footnote only.

## Further reading

| Topic | Where |
|---|---|
| Glossary | `CONTEXT.md`, `layers/journal/CONTEXT.md` |
| How agents and humans share the work; the merge ledger | `docs/adr/0003-agent-operating-model-and-governance.md` |
| The Gate | `docs/adr/0004-objective-safety-gate.md`, `docs/adr/0026-gate-workflow-thin-shell.md` |
| Skills | `docs/adr/0005-skill-model.md`, `docs/adr/0015-audit-skills-and-conditional-importance.md` |
| Session logs go straight to `main` | `docs/adr/0009-session-logs-commit-directly-to-main.md` |
| Routines and Digests | `docs/adr/0010-digests-derived-append-only-journal-pages.md` |
| Provenance (🤖 header) | `docs/adr/0017-provenance-footer-on-agent-authored-content.md` |
| Trusted vs Public | `docs/adr/0020-requester-trust-tiers.md`, `docs/agents/guest-contributions.md` |
| `auto-triage` | `docs/adr/0022-autonomous-triage-sweep.md` |
| Guest demo | `docs/adr/0023-guest-driven-demo-pipeline.md` |
| Prune Trials | `docs/adr/0027-prune-trials.md` |
| What `main` enforces | `docs/research/github-branch-protection-vs-autonomous-log-commits.md` → Current state |
| How the project grew | `layers/journal/content/current/pages/history.md` |
