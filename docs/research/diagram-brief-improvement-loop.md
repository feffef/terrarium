# Diagram brief: how humans, agents and GitHub improve the Platform

Research for an interactive process diagram. Written 2026-10-08 against `main`
at `c1f25c18`. Every claim here was checked against the repo and the session
logs, and an independent reviewer cross-checked them too. **Bold** terms are
defined in [`CONTEXT.md`](../../CONTEXT.md).

The forge is **GitHub** (`github.com/feffef/terrarium`), not GitLab. Its
companion, [`diagram-brief-nuxt-architecture.md`](./diagram-brief-nuxt-architecture.md),
covers the app itself.

## 1. The idea in one paragraph

AI agents (Claude Code **Sessions**) write essentially all code and content.
Humans steer, decide what should exist, and merge (**Agent Authorship**). Every
change goes through a GitHub pull request that must pass an automatic,
objective **Gate**. Every Session ends by writing an honest **session log** into
the Journal: what it tried, how far it got, and every **Friction** (pain point)
it hit. Scheduled agent runs (**Routines**) read those logs every day and turn
the pain into fixes, audits, pruned instructions and issues. Humans pick up
what Routines can't settle. The result reshapes the instructions and **Skills**
the *next* Session works with:

> work → log the pain → Routines and humans act on it → instructions and
> Skills improve → the next work hurts less.

## 2. Actors

| Actor | Who/what | Role in the loop | Defined in |
|---|---|---|---|
| **Trusted human** | Owner and collaborators (GitHub write access) | Steers, green-lights new work, merges, harvests ideas, tunes Skills and Routines (§7) | ADR-0020, ADR-0003 |
| **Public visitor / guest** | Anyone without write access | Reports only: issues and fork PRs. Their text is data, never instructions. | ADR-0020, `docs/agents/guest-contributions.md` |
| **Human-started Session** | Claude Code started by a human (web, mobile or CLI). *Interactive* if the human keeps prompting, *delegated* if there is one kickoff prompt only. | Does the asked-for work: features, issue work, fixes, content | `CONTEXT.md` → Session |
| **Routine (autonomous Session)** | A Session started on a schedule with no human prompt; each runs one Skill | Tends and consolidates: the self-improvement engine (§6) | ADR-0003, ADR-0005, ADR-0010 |
| **Subagents** | Helpers a Session dispatches: implementers, reviewers, fact-checkers, "blind visitors" | Do parts of the work; never merge, never log on their own | `.agents/skills/dispatch-subagents/SKILL.md` |
| **GitHub** | Issues, labels, PRs, CI | Work queue, review surface, and the authoritative Gate run | `.github/workflows/gate.yml`, `.github/actions/gate/action.yml` |

For scale: Journal `current`, 2026-10-01 to 10-08, holds 107 logs. 56 were
autonomous (Routines), 46 interactive and 5 delegated.

## 3. What flows between them

| Artifact | What it is | Where |
|---|---|---|
| **Session log** | One per Session: goal, status, outcome, summary, PRs, **frictions**, optional **ideas** and **learnings**, plus an automatic trace | `layers/journal/content/current/sessions/`; schema `shared/schemas/session.ts` |
| **Friction** | One pain point with a severity from `nit` to `blocker`. The loop's main fuel. | Inside a session log |
| **Idea** | A concrete proposal for the future | Inside a session log; listed at `/t/journal/current/ideas` |
| **Issue** | A work item. The label says whose move it is: `needs-triage`, `ready-for-agent` (agent may build it), `ready-for-human` | GitHub; `docs/agents/triage-labels.md` |
| **Pull request** | The only way code, docs and Skills land | GitHub; `docs/agents/pr-workflow.md` |
| **Skill** | A packaged, repeatable capability an agent invokes (e.g. `digest`, `triage`, `tdd`) | `.agents/skills/<name>/SKILL.md` (ADR-0005) |
| **Skill Inventory** | A per-Skill readout: what it's for and how important it is | `layers/journal/content/current/skills/` (ADR-0015) |
| **Instructions** | What every Session reads first: `CLAUDE.md`, `CONTEXT.md`, ADRs (`docs/adr/`), how-tos (`docs/agents/`) | Repo |
| **Digest / Blog post** | Daily summary and in-character retelling of activity | Journal and Blog Tenants |

## 4. Flow A: one Session, start to finish

1. **Start:** a human prompts, or a schedule fires a Routine.
2. **Read the instructions:** `CLAUDE.md`, the glossary, the ADRs and how-tos
   that apply.
3. **Branch:** it never works on `main` directly.
4. **Work:** it may dispatch subagents. Automatic **guards** block unsafe tool
   calls along the way (`docs/agents/guards.md`).
5. **Gate locally,** then push and **open a PR** (without asking, ADR-0003).
6. **Review:** often an agent review first (`code-review` Skill, sometimes on
   a different model). An agent posts a verdict comment before any merge it
   makes itself.
7. **CI Gate** on GitHub (ADR-0004).
8. **Merge, by tier:** a Routine inside its charter merges its own PR on a
   green Gate. Everything else, and anything touching a sensitive surface, is
   merged by a human (§8).
9. **Deploy:** the server picks up the new `main` within minutes.
10. **Session log:** written at PR-open and updated at the end (§5).

A Session reaches **closure** when its work is in an honest state, often with
the PR still open. Merging frequently happens later, by a human or in another
Session. Long work can be handed to a fresh Session (`handoff` and
`claude-handoff` Skills).

## 5. The session log: the hub of the loop

The agent writes the *interpretive* half: goal, outcome, summary, every
Friction and any ideas (`close-session` and `log-session` Skills). A hook then
adds the *mechanical* half (timings, tools, files) from the transcript. It
commits that one file **straight to `main`**, the only write that skips the PR
(ADR-0009: logs are inert data, and making them wait for review would make
Sessions skip or flatten them). Deploy publishes it live in the Journal.
(Mechanics: `scripts/log-session.ts`, `scripts/session-trace.ts`, the
`Stop` hook in `.claude/settings.json`.)

## 6. Flow B: the self-improvement loop

### 6.1 The seven Routines

Seven Skills run once a day each. Their schedules live in claude.ai,
**deliberately outside the repo**. The order below is observed from session
logs, so label it "observed": the audits and the friction fixer run overnight
(UTC), and the blog, prune and visitor runs during the day. In the Skill
Inventory, these seven and no others are graded `routine`.

| Routine | Role | Reads | Produces | Who merges |
|---|---|---|---|---|
| `digest` | Narrate | Yesterday's git history and session logs | One Digest page; moves older Journal content to `archived` | Itself, on green |
| `audit-skills` | Find rot | A week of session logs: which Skills ran, which failed silently | Updated Skill Inventory; issues for repeated failures; ideas for new or retired Skills (it never edits Skill text) | Itself, on green |
| `frictions-to-fixes` | Repair | Frictions from the last 3 days, screened against open issues and recent merges | Up to 10 fixes per run. Simple fixes: built by subagents, reviewed and merged by the Routine. Hard fixes: an issue plus a PR left for a human to merge. Fixes on surfaces it may not touch: a `ready-for-human` issue. | Itself for simple fixes; a human for hard ones |
| `audit-docs` | Find rot | All live docs and Skills vs the code | A doc-fix PR; a separate PR for ADR/CI edits that a human must merge | Itself + human |
| `blog-post` | Narrate | The last 3 days of activity | One post by one of four Personas | Itself, on green |
| `prune-trial` | Subtract | Its trial ledger `.agents/prune-trials.yml`, and Frictions since each prune | Deletes ~100 lines of instructions as a 3-day trial; judges older trials: keep the cut, restore a line, or propose a guard (ADR-0027) | Itself, on green |
| `visitor-loop` | Outside eyes | The live site, seen by three blind visitor subagents on different models; past owner corrections | One fix PR for problems most visitors agree on; one feature PR for the best idea | Itself, on green |

Each one's definition is in `.agents/skills/<name>/SKILL.md`. Its exact merge
scope is in the ledger at the top of
`docs/adr/0003-agent-operating-model-and-governance.md`.

### 6.2 The five roles, in plain words

- **Repair reported pain:** `frictions-to-fixes`.
- **Find rot nobody reported:** `audit-docs`, `audit-skills`.
- **Subtract:** `prune-trial` removes instructions and lets the next days'
  Frictions show whether they were needed.
- **Outside eyes:** `visitor-loop` sees the site like a newcomer.
- **Narrate:** `digest` and `blog-post` (they repair nothing).

### 6.3 The cycle

1. Every Session, Routines included, lands a session log on `main`.
2. Routines read logs, git history and the live site.
3. They merge what's in their charter and open issues or PRs for the rest.
4. Issues flow into the **issue lane** (§7.1), where humans and agent Sessions
   turn them into work.
5. Merged changes update `CLAUDE.md`, docs, Skills, guards and the site.
6. The next Session reads the updated instructions and meets fewer Frictions,
   then back to 1.

The loop also watches itself. Routines log their own Frictions,
`audit-skills` grades the Routines, and `visitor-loop` learns from the owner's
corrections to its earlier PRs (`scripts/owner-corrections.ts`).

## 7. The human half of the loop

### 7.1 The issue lane: how issues become work

- Issues come from Routines, humans, guests and agent Sessions.
- **Triage** (`triage`, or the batch `auto-triage`) sorts each issue,
  writes an agent-ready brief and labels it.
- **`ready-for-agent` is the green-light.** A human Session (e.g. "Run one
  /auto-triage sweep, then implement every issue it marked ready") builds it:
  `implement`, then review, then PR.
- **Standing green-light:** when a Trusted human starts `auto-triage`, it may
  stamp `ready-for-agent` on Trusted-authored issues itself (ADR-0022).
  Public-authored ones always wait for a human.
- **Large work** is first planned as a spec and tickets (`to-spec`,
  `to-tickets`), or as a map of decision issues (`wayfinder`).

### 7.2 What a Trusted human actually does

From this week's human-started Session goals
(`layers/journal/content/current/sessions/`, `kind: interactive|delegated`):

- **Assess and fix Routine output.** Examples: "Assess issue 1677 (prune-trial
  Routine…) and fix it", "Explain why audit-docs left most concision
  proposals unapplied, then fix the Skill".
- **Run a Routine's Skill by hand** (`/frictions-to-fixes`, `/blog-post`,
  `/audit-skills`), often from the mobile app.
- **Drive the issue lane:** auto-triage, then implement.
- **Harvest ideas.** No Routine turns ideas into issues; a human does it on
  purpose, e.g. "Mine two weeks of session ideas and learnings, rank them, and
  ship the cheap wins".
- **Direct new features and content,** e.g. Tinkerfund campaigns, Journal
  pages. Building a new feature, Skill or Tenant needs this human green-light
  (ADR-0003, ADR-0020).
- **Merge** what only a human may merge, and apply **Proposals**: changes
  agents can't push, like CI workflow files (`docs/proposals/`).
- **Configure the Routines** in claude.ai, and **watch** (§7.4).

### 7.3 How Skills themselves evolve

Skills are the capabilities the loop ultimately improves (ADR-0005: as much a
deliverable as the app).

- **Repo-owned Skills** change through ordinary PRs: from
  `frictions-to-fixes`, `audit-docs`, `prune-trial`, or a human-directed
  Session.
- **External pack Skills** (25, from `mattpocock/skills`, pinned in
  `skills-lock.json`) must not be edited; the Gate rejects edits.
  Improvements go upstream, and repo-specific advice goes into that Skill's
  Inventory entry (ADR-0015).
- **`audit-skills` only observes and grades.** A new, split or retired Skill
  starts as an idea and needs a Trusted green-light.

### 7.4 Watching: the observability surface

Humans read the loop through four views of the same activity (`CONTEXT.md` →
Observability):

- **git history;**
- the **Journal** (`/t/journal/current`): dashboard, session logs, digests,
  Skill Inventory, ideas;
- the **Blog**: plain-language retelling by the Personas;
- the **Commons Timeline**: everything in one feed.

The **Midden** catalogues discarded work: dead branches, closed PRs, retired
Skills.

## 8. Guardrails (badges on the edges, not boxes)

- **Gate:** the same objective checks locally and in GitHub CI; CI decides
  (ADR-0004).
- **Human-only merges:** isolation and routing code, schemas, CI, ADRs, new
  dependencies, untested behaviour changes. Agents may edit these; a human
  must merge (full list: `CLAUDE.md` → Ground rules).
- **Trust tiers:** Trusted directs, Public reports (ADR-0020).
- **Provenance:** every commit and GitHub post links the Session that wrote
  it (ADR-0017).
- **Guards:** automatic checks on agent tool calls. Routines may not change
  guards; they file an issue (`docs/agents/guards.md`).

## 9. Flow C: guests and outside agents (small side lane)

- **Public issue** → triaged → a human decides.
- **Guest demo** (ADR-0023, only while the owner runs it): `guest-intake`
  interviews the guest in the issue, then `guest-build` has an agent build and
  review it, then **the owner merges**.
- **Outside agent** → fork PR → **a human merges**.

## 10. Recommended diagram

**Shape: a cycle in the middle, swimlanes around it.**

Lanes: **Humans** (Trusted; thin Public sub-lane) · **Agent Sessions**
(human-started; Routines coloured by role) · **GitHub** (issues, PRs, CI) ·
**`main` → live site → Journal**.

**Zoom 0, the overview cycle:**
- prompt or schedule → Session → PR → Gate → merge → `main` → live site;
- Session → session log → `main` directly → Journal → Routines;
- Routines → PRs (self-merged) and issues → issue lane → Sessions;
- everything → updated instructions and Skills → next Session.

Draw the closing arrow big: "the next Session meets less friction". Mark the
human touchpoints clearly: green-light, merge, assess Routine output, harvest
ideas, watch.

**Zoom 1, tabs:** (a) one Session (§4–5); (b) the Routines (§6), as a 24-hour
ring or a night/day row coloured by role, each with reads → produces → who
merges; (c) the human half (§7): the issue lane, Skill evolution, watching;
(d) guests (§9).

**Zoom 2, click-to-open panels:** the session log (§5), merge tiers (§8), the
prune-trial mini-cycle (prune → 3-day window → Frictions → keep or restore).

**Emphasise:** the session log as the hub and the only direct write to
`main`; the two ways to land (PR vs log); who merges, as colour-coded end
states; Frictions as the fuel.

**Leave out:** script, hook and guard names; Gate step names; exact Routine
times; PR numbers; schema fields beyond frictions, ideas and status; content
Skills such as `atlas-specimen` and `tinkerfund-campaign`; and `/loop`
sessions. Those are a footnote: a human can run `auto-triage` or the guest
Skills on a timer, but none ran this week.

**Reuse:** `layers/journal/content/current/pages/how-it-works.md` already has
three Mermaid diagrams on this. Its "What runs when nobody asked" diagram
names only four of the seven Routines; the new one should show all seven.

## 11. Labels to draw honestly

- **Ideas → issues is human-driven.** Draw a dashed arrow labelled "human
  harvest", not an automatic one (`scripts/ideas.ts`: "promotion itself is out
  of scope").
- **Routine schedules are not in the repo,** so the order is observed, not
  configured.
- **Dependabot auto-merge is only proposed**
  (`docs/proposals/1633-dependabot-automerge.md`), although ADR-0003's ledger
  describes it. Draw it dashed.
