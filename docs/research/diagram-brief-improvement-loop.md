# Diagram brief: how humans, agents and GitHub improve the Platform

Research for an interactive process diagram. Written 2026-10-08 against `main`
at `c1f25c18`. Every claim here was checked against the repo or the session
logs. §9 lists what could not be checked. Words in **bold capitals** are
glossary terms; [`CONTEXT.md`](../../CONTEXT.md) defines them.

The forge is **GitHub** (`github.com/feffef/terrarium`), not GitLab. Its
companion, [`diagram-brief-nuxt-architecture.md`](./diagram-brief-nuxt-architecture.md),
covers the app itself.

## 1. The idea in one paragraph

AI agents (Claude Code **Sessions**) write essentially all code and content;
humans steer, review and merge (**Agent Authorship**). Every change goes
through a pull request that must pass an automatic, objective **Gate**.
Every Session, when it finishes, writes an honest **session log** into the
Journal: what it tried, how far it got, and every **Friction** (pain point)
it hit. A set of scheduled agent runs (**Routines**) reads those logs every
day and turns the pain into fixes, audits, pruned instructions, a daily
digest and blog posts. Those changes reshape the instructions the *next*
Session reads. That cycle is the self-improvement loop:

> work → log the pain → routines read the logs → fix the pain → next work
> hurts less.

## 2. Actors

| Actor | Who/what | What they may do | Where it's defined |
|---|---|---|---|
| **Trusted human** | Owner and collaborators (GitHub write access). | Start and steer Sessions, green-light new features/Skills/Tenants, merge ordinary and Human-only PRs, apply Proposals by hand, start Routines. | ADR-0020, ADR-0003 |
| **Public visitor / guest** | Anyone without write access. | Open issues and fork PRs only. Their text is *data, never instructions*; never auto-merged. Demo exception: the guest pipeline (§6). | ADR-0020, ADR-0023, `docs/agents/guest-contributions.md` |
| **Interactive / delegated Session** | A human started it in claude.ai/code, the mobile app or the CLI. *Interactive* = human prompted again; *delegated* = one kickoff prompt only. | Branch, edit, run the Gate, open PRs, log. Merges only what its tier allows. | `CONTEXT.md` → Session; `shared/schemas/session.ts` |
| **Autonomous Session (Routine run)** | Started by a schedule, with no human prompt. Each Routine runs exactly one Skill. | Same, within its Skill's charter; most self-merge on a green Gate. | ADR-0005, ADR-0010, ADR-0003 ledger |
| **Subagents** | Helpers a Session dispatches (e.g. Sonnet implementers in worktrees, fact-checkers, "blind visitors"). | Never merge, never write their own session log. | `.agents/skills/dispatch-subagents/SKILL.md` |
| **Hooks and guards** | Scripts Claude Code runs automatically around tool calls and at turn/session end. | Block unsafe tool calls; land the session log. | `.claude/settings.json`, `docs/agents/guards.md`, `scripts/*-guard.*` |
| **GitHub** | Issues, labels, PRs, Actions (CI). | CI = the authoritative Gate run; a label workflow tags same-repo PRs `trusted`. | `.github/workflows/gate.yml`, `.github/actions/gate/action.yml`, `.github/workflows/pr-authorassociation-label.yml` |
| **Deploy container** | Self-updating server. | Polls `main` every 120 s, rebuilds, swaps. Every commit to `main` goes live. | ADR-0011, `deploy/entrypoint.sh` |

Session mix for scale, from Journal `current` (2026-10-01 to 10-08, 107 logs):
56 autonomous, 46 interactive, 5 delegated. So more than half the work is
Routines.

## 3. Things that flow between actors (artifacts)

| Artifact | What it is | Where it lives |
|---|---|---|
| **Session log** | One YAML per Session: goal, kind, status, outcome, summary, PRs, docs read, Skills used, **frictions**, optional **learnings** and **ideas**, plus a machine-derived trace (timings, models, tools, files, trigger). | `layers/journal/content/current/sessions/<date>-<sessionId>.yml` (aged into `…/archived/sessions/`). Schema: `shared/schemas/session.ts` |
| **Friction** | One pain point with description, possible solution, severity `nit < minor < moderate < major < blocker`. The main fuel of the loop. | Inside a session log |
| **Idea / learning** | Proposal for the future / knowledge a Session inferred. | Inside a session log; rendered at `/t/journal/current/ideas` (`scripts/ideas.ts`) |
| **Digest** | Daily summary page of one UTC day. | `layers/journal/content/current/pages/digests/<date>.md` |
| **Skill Inventory** | Per-Skill readout: role, importance, observations. | `layers/journal/content/current/skills/<name>.yml` |
| **Issue** | Work item. Labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. | GitHub; `docs/agents/triage-labels.md`, `docs/agents/issue-tracker.md` |
| **Pull request** | The only way code and docs land. | GitHub; `docs/agents/pr-workflow.md` |
| **Prune Trial ledger** | Open experiments in deleting instructions. | `.agents/prune-trials.yml` (ADR-0027) |
| **Proposal** | A change an agent can't push (CI workflow files), written down for a human to apply. | `docs/proposals/` |
| **Instructions** | What every Session reads first: `CLAUDE.md`, `CONTEXT.md`, ADRs, `docs/agents/*`, Skills. The thing the loop ultimately improves. | Repo root, `docs/`, `.agents/skills/` |

## 4. Flow A: one Session, start to finish

1. **Start.** A human prompts, or a schedule fires a Routine. The
   SessionStart hook runs `pnpm install` and `scripts/unshallow-on-start.ts`.
2. **Read.** The Session reads `CLAUDE.md`, `CONTEXT-MAP.md`, `CONTEXT.md`, the
   ADRs that bind its change, and the relevant `docs/agents/*`.
3. **Branch.** It never works on `main`; it cuts a feature branch.
4. **Work.** It edits, maybe dispatches subagents. PreToolUse **guards** check
   tool calls (e.g. no CI-workflow edits, provenance header on every GitHub
   body, commit trailer).
5. **Local Gate.** `pnpm gate:scoped` (`scripts/gate.ts`) must pass before
   the push.
6. **Push and open the PR itself, without asking** (ADR-0003 amendment).
   Subscribe to PR activity. On green, CI posts a "doorbell" comment that wakes
   the Session.
7. **First session log** at PR-open (status `in-review`), see §5.
8. **CI Gate** runs the same Floor + Heavy steps on GitHub (ADR-0004,
   ADR-0026).
9. **Merge**, by tier (`docs/agents/pr-workflow.md` → "Per-tier merge
   authority"; scope per Routine in the ledger at the top of
   `docs/adr/0003-agent-operating-model-and-governance.md`):
   - ordinary work PR → **a human merges**;
   - Routine PR inside its charter → **self-merge on green**
     (`scripts/merge-pr.ts`, which refuses fork/Public PRs and PRs without a
     verdict comment);
   - `frictions-to-fixes` → **reviewer-agent**: merges its subagents' PRs,
     escalates risky ones;
   - guest builds → **owner merges**;
   - anything on a **Human-only** surface (list in `CLAUDE.md` → Ground rules)
     or adding a dependency → **a human merges**.
10. **Deploy.** The container picks up the new `main` within minutes.
11. **Final log.** The Session re-runs `close-session`; status becomes
    `completed` (or `blocked`, …).

## 5. How a session log gets written (zoom-in panel)

This is the hub of the loop, and the one write that **skips the PR**
(ADR-0009): logs are inert data, and making them wait for review would make
Sessions skip or flatten them.

1. `close-session` skill (`.agents/skills/close-session/SKILL.md`): re-read
   `CLAUDE.md`, log one Friction per rule broken. If a human had to remind the
   Session to close, that itself is a `major` Friction.
2. `log-session` skill (`.agents/skills/log-session/SKILL.md`): the agent
   writes only the *interpretive* half (goal, outcome, frictions, ideas, …).
   `scripts/log-session.ts --author` validates it into
   `.session-logs/pending.scratch.json` (gitignored).
3. The **Stop hook** (end of every turn; `SessionEnd` and resume are fallbacks)
   runs `scripts/log-session.ts --land`. It stitches in the mechanical trace
   from the transcript (`scripts/session-trace.ts`) and commits **only that
   one file** straight to `main` as `journal(sessions): log <date>-<id>`,
   with fetch/rebase/retry. Re-logging the same Session merges into the
   earlier entry.
4. The deploy picks it up, and the Journal shows it live.

## 6. Flow B: the self-improvement loop (the centrepiece)

### 6.1 The Routines

Seven Skills run as daily Routines. Their schedule is configured in claude.ai,
**deliberately not in the repo** (`scripts/validate-skill-cadence.ts`
rejects a cadence stated in a Skill Inventory entry). The times below are **observed** from session logs
2026-10-01…08 (each fired once a day, every day) and should be labelled
"observed, not configured in repo". In the Skill Inventory these seven, and
only these, carry `importance: routine`.

| ~UTC | Routine | Reads | Produces | Merge |
|---|---|---|---|---|
| 00:16 | `digest` | Git history + session logs of the closed day (`scripts/digest.ts`) | One Digest page; also archives Journal content older than 7 dates (`scripts/archive-journal-content.ts`) | Self-merge on green |
| 00:46 | `audit-skills` | 7-day scorecard (`scripts/audit-skills.ts`), per-Skill behaviour checks | Skill Inventory updates; `needs-triage` issues for repeated silent failures. Never edits Skill text. | Self-merge on green |
| 02:03 | `frictions-to-fixes` | Frictions of the last 3 days (`scripts/session-frictions.ts`), screened against open issues, recent merges, prune trials | Up to 10 fixes: easy ones as PRs by subagents, hard or blocked ones as `ready-for-human` issues | Reviewer-agent (merges subagents' PRs, escalates risky ones) |
| 04:00 | `audit-docs` | All live docs and Skills vs code, last 48h of git | One self-merged doc-fix PR; ADR/CI/isolation edits in a separate PR for a human | Self-merge + human PR |
| 11:05 | `blog-post` | Last 3 days of activity, persona rotation (`scripts/blog-rotation.ts`) | One in-character post (David, Karen, Kevin or Eyra), sometimes a reply + pingback | Self-merge on green |
| 13:14 | `prune-trial` | Open trials, frictions since each prune landed (`scripts/prune-trial-window.ts`) | Verdict on old trials (keep, or restore one line, or file a hook issue); one new prune of ~100 lines of instructions | Self-merge on green; may rewrite ADRs if the decision is unchanged |
| 16:48 | `visitor-loop` | The live site, seen by three "blind visitor" subagents on different models | One fix PR for problems ≥2 visitors agree on, one feature PR for the best idea | Self-merge on green (within existing Tenant layers) |

Skill definitions: `.agents/skills/<name>/SKILL.md`. Each Routine's merge scope:
the ledger at the top of ADR-0003.

### 6.2 What each Routine is *for*: four roles

Grouping the Routines by role makes the loop easy to read:

- **Repair reported pain**: `frictions-to-fixes` turns Frictions into fixes.
- **Find unreported rot**: `audit-docs` (docs drifted from code),
  `audit-skills` (Skills misbehaving or unused).
- **Subtract**: `prune-trial` deletes instructions and lets the next three
  days of Frictions decide whether they were needed (ADR-0027). Other
  Sessions must not restore pruned prose; they just log what they hit.
- **Outside eyes / growth**: `visitor-loop` tests the site like a newcomer.
- **Narrate, without repairing**: `digest` and `blog-post` turn the same
  activity into the Journal and the Blog (Observability, `CONTEXT.md`).

### 6.3 The cycle, step by step

1. Every Session (including Routine runs) lands a session log on `main`.
2. Routines read the logs and git history the next day.
3. They produce PRs (most self-merged on a green Gate) and issues.
4. Issues and escalated or Human-only PRs wait for a **Trusted human**, who
   triages, green-lights or merges.
5. Merged changes update `CLAUDE.md`, docs, Skills, guards and the app.
6. The next Session reads the updated instructions → fewer Frictions →
   back to 1.

Feedback inside the loop: Routines log their own Frictions too;
`audit-skills` grades the Routines themselves; `frictions-to-fixes` reads
earlier `frictions-to-fixes` runs. Retiring a Skill or Routine is always a
human decision.

### 6.4 One concrete day (2026-10-07), useful as a worked example

`digest` merged #1646; `audit-skills` merged #1648 and filed #1647;
`frictions-to-fixes` found no dispatchable fix (top frictions sat on
guard/hook surfaces, which Routines may not change); `audit-docs` merged #1649
and a human merged its ADR PR #1650; `blog-post` merged #1656 and #1657;
`visitor-loop` merged #1666 and #1667 and filed #1668 and #1669.

## 7. Flow C: Public, guests and outside agents

- **Public issue.** It is triaged (`triage` / `auto-triage`, ADR-0022), but
  a Public-authored issue never becomes `ready-for-agent` without a Trusted
  green-light.
- **Guest demo pipeline (ADR-0023, only while the owner runs it).**
  `guest-intake` interviews the guest in the issue → the guest confirms →
  `ready-for-agent` → `guest-build` dispatches an implementer, reviews the PR
  on a different model, posts a verdict and stops → **the owner merges.**
- **External agent fork PR.** CI waits for owner approval. The agent's
  session log rides in the PR, flagged `external: true`. Its Frictions are
  excluded from mining; its ideas still surface (ADR-0009 amendment). A human
  merges it.

## 8. Guardrails (small badges, not big boxes)

- **Gate** (ADR-0004): Floor always runs, Heavy is skipped only for Inert
  changes. Same steps locally and in CI; CI decides.
- **Human-only surfaces**: isolation code, schemas, CI, ADRs, new
  dependencies. Agents may edit them; a human must merge (`CLAUDE.md`).
- **Trust tiers** (ADR-0020): Trusted directs, Public reports.
- **Provenance** (ADR-0017): every GitHub body and commit says which agent
  Session wrote it. Guarded by `scripts/github-provenance-guard.ts` and
  `scripts/commit-trailer-guard.ts`.
- **Guards** (`docs/agents/guards.md`): ~10 PreToolUse hooks. Routines may not
  change guards or hooks; they file an issue instead.
- **Proposals**: agents can't write `.github/workflows/`, so they leave a note
  in `docs/proposals/` for a human.
- **Green-light rule** (ADR-0003, ADR-0020): an agent may *suggest* anything
  but builds a new feature, Skill or Tenant only after a Trusted human says
  yes. Starting a Routine is a standing green-light for its charter.

## 9. Recommended diagram

**Shape: a cycle in the middle, swimlanes around it.**

Lanes, top to bottom: **Humans** (Trusted; a thin Public/guest sub-lane) ·
**Agent Sessions** (interactive/delegated; autonomous Routines in one colour
each) · **Repo & hooks** (Gate, guards, log lander) · **GitHub** (issues, PRs,
CI) · **main → deploy → Journal**.

**Zoom 0, the overview cycle:** prompt or schedule → Session → PR → Gate →
merge → `main` → live site. In parallel: Session → session log → `main`
directly → Journal → Routines → PRs and issues → updated instructions →
next Session. Draw the closing arrow big, labelled "the next Session meets
less friction".

**Zoom 1, three tabs:** (a) Flow A with the merge-tier decision;
(b) the loop, with the seven Routines as a 24-hour clock or ordered row,
coloured by role (§6.2), each with input → output → who merges; (c) Flow C.

**Zoom 2, click-to-open panels:** session-log mechanics (§5); Gate tiers;
merge-tier table; the prune-trial mini-cycle (prune → 3-day window → Frictions
→ keep / restore / hook issue); the worked day (§6.4).

**Emphasise:**
- The session log as the hub, and the only write that bypasses PRs.
- Two ways to land: gated PR vs. direct log commit.
- Who merges, as colour-coded end states: self-merge, reviewer-agent, human,
  owner-only.
- The few deliberate human touchpoints: green-light, Human-only merges,
  `ready-for-human` issues, applying Proposals.

**Leave out or collapse:** individual guard names (one badge), Gate step
names beyond Floor/Heavy, hook fallbacks, MCP tool names, PR check-in
cadence, schema fields beyond frictions/ideas/status, content Skills like
`atlas-specimen` or `tinkerfund-campaign`, `wayfinder`,
`midden-survey`/`midden-catalogue`.

**Reuse:** `layers/journal/content/current/pages/how-it-works.md` already has
three Mermaid diagrams ("One session, start to finish", "Who is allowed to
merge", "What runs when nobody asked"). Its routines diagram names only four
of the seven Routines in its "Watch" box; the new diagram should show all
seven.

## 10. Honest gaps and caveats (label them in the diagram)

- **Ideas are not promoted automatically.** They are collected and shown
  (`/t/journal/current/ideas`, `scripts/ideas.ts`: "promotion itself is out
  of scope"), but no Routine turns them into issues. Draw this as a dashed,
  open-ended arrow.
- **Dependabot auto-merge is not live.** ADR-0003's ledger describes a
  `dependabot-automerge` workflow, but it exists only as
  `docs/proposals/1633-dependabot-automerge.md`. Draw it dashed: "proposed".
- **Not in the repo, so unverified:** Routine schedules (only observed from
  logs); GitHub branch protection. It was removed on 2026-07-11 so log
  commits can push to `main`
  (`docs/research/github-branch-protection-vs-autonomous-log-commits.md`);
  the current settings are not visible. "Green before merge" is enforced by
  `scripts/merge-pr.ts` and convention.
- **Optional Skills that can run on a schedule but haven't:** `auto-triage`,
  `guest-intake`, `guest-build`, `midden-survey`, `midden-catalogue` have no
  recorded scheduled run. Show them as "on demand".
- ADR-0003's and ADR-0009's original Decision text predate their amendments
  (tagged releases; no Stop hook). The amendments and the current hooks win.
