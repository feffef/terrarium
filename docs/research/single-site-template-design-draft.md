# A simpler single-site template: design draft

**Status: proposal by the writing agent; decides nothing.** It drafts one design
that meets
[`single-site-template-requirements.md`](./single-site-template-requirements.md)
(cited as **REQ §n**). Read the requirements first: this draft argues for a
shape, and the requirements say what any shape must guarantee. Where the
breakdown is cited, it is
[`single-site-template-breakdown.md`](./single-site-template-breakdown.md)
(**BD §n**). Written on 2026-11-13.

Every choice below is a proposal. A choice that rests on an untested fact is
marked **(spike)**, and section 13 lists those spikes.

## 1. Design principles

1. **A mechanism for every rule that has failed once as prose.** Prose is for
   judgement; scripts and refusals are for rules (REQ "The finding behind most
   of this").
2. **Few concepts, each with one home.** The template's glossary should fit on
   one screen. A term earns an entry only when it names something an agent
   must act on.
3. **The platform is a folder, not a pattern.** Everything that flows between
   the template and its sites lives under a few paths listed in one file. Sync
   then becomes mostly copying files (REQ §5.2).
4. **Logs are data, not content.** Session logs are read at request time and
   never rebuilt into the site, so landing a log never triggers a deploy.
5. **Mechanical first, agent second.** A check that a script can do never
   costs an agent. Agents only judge.
6. **Every loop reports in the same shape and through the same intake.** One
   finding format, one dedupe, one place the owner looks.

## 2. Concepts (the template's whole glossary)

| Term | Meaning |
|---|---|
| **Owner** | The one person who steers the site and merges what agents may not. Replaces Terrarium's "Trusted user". |
| **Session** | One Claude Code conversation that does work on the repo. |
| **Session log** | The record a session leaves: goal, outcome, Frictions, ideas, plus machine facts. |
| **Friction** | Anything that cost the session time or went wrong, graded nit to blocker. |
| **Finding** | Anything a loop reports for follow-up: a bug, a stale doc, a skipped step. It uses one shape for every loop. |
| **Cause** | A root cause that groups Frictions and Findings. It carries fixes and a status: open, fixing, accepted. |
| **Loop** | A Skill that runs on a schedule or on demand: watch, improve, docs, visit, digest. Replaces Terrarium's "Routine", which named only the scheduled run. |
| **Gate** | The one command that decides whether a change may merge. |
| **Verdict** | The posted review result naming the reviewed commit. |
| **Protected path** | A path whose changes the owner merges. |
| **Autonomy preset** | One of three settings that decide what agents may merge. |
| **Owner rules** | A short file of the owner's standing decisions that every loop obeys. |
| **Platform / seed / site** | The three kinds of file (section 3). |

Terrarium terms that go:
- Tenant, Space, Collection kind, Catalog and Aggregator, which existed only
  for multi-tenancy.
- Skill Inventory, replaced by Skill state on the watch page.
- Prune Trial, kept only as a principle.
- Seedling, an idea issue that is simply labelled.
- Floor, Heavy and Inert, the gate's scope classes.

## 3. Repo shape

```
platform/                     everything that flows back to the template
  manifest.yml                the platform path list + template commit last taken
  CLAUDE.platform.md          platform instructions, imported by CLAUDE.md
  GLOSSARY.platform.md        the concepts above
  bin/                        the few commands (section 5), run with tsx
  hooks/                      hook scripts; settings.json only points here
  checks/                     gate checks and content-rule helpers
  docs/                       how-tos for agents (git, PRs, issues, caveats)
  adr/                        platform decisions (about 6)
.claude/
  skills/                     platform Skills (prefixed `p-`) and installed pack
  rules/                      a handful of path-scoped rules, platform-owned
  settings.json               thin hook entries -> platform/hooks/*  (mixed, see 10)
.github/
  workflows/gate.yml          thin shell; human/laptop only (REQ §1.3)
  actions/gate/               the steps, agent-pushable
CLAUDE.md                     seed: site notes + `@platform/CLAUDE.platform.md`
GLOSSARY.md                   seed: site terms, links to the platform glossary
docs/adr/                     site decisions
docs/guide/                   the site guide (seeded with platform chapters)
.journal/                     site data: logs, causes, loop memory, run costs
src/ or app/                  the site itself (stack-dependent)
```

- **Platform:** everything under `platform/`, `.claude/skills/p-*`,
  `.claude/rules/` and `.github/actions/gate/`, plus the guide's platform
  chapters.
- **Seed:** `CLAUDE.md`, `GLOSSARY.md`, the guide's site chapters, the
  hello-world site and `docs/adr/`.
- **Site:** `.journal/`, content and the site's code.

Mixed files are handled in section 10.

## 4. Stack

**Proposal: Astro,** with its client router as the browser-side navigation
opt-in. Reasons, from the stack study (REQ §2.1, §1.2):
- The build validates content against its schema and names the file and field.
- Markdoc component errors fail with file and line.
- Owner-only routes stay on the server by default.
- No JavaScript ships on a plain content page.
- Agents made fewer wrong first guesses (2 against 5).
- The client router is opt-in per layout, and `transition:persist` keeps an
  island's state, such as a cart.

Two caveats:
- **(spike)** Whether Astro's router feels as snappy as Nuxt's SPA navigation.
  The owner names snappiness as the reason for the opt-in. Build the same
  three pages in both and time them on a phone (REQ §8 item 20). If Nuxt wins
  clearly, choose Nuxt and keep the content-validation check of REQ §1.2 as
  our own script.
- Astro's fast check misses broken cross-file references, and MDX breaks on
  `{}` in prose. So use Markdoc, not MDX, and keep a reference check in the
  gate.

## 5. The commands

Five commands under `platform/bin/`, each the single home of its rule. Each
fails closed. Each is tested by a spec of the guarantees in its REQ row, not by
its current Terrarium shape.

| Command | Does | Meets |
|---|---|---|
| `gate` | install if stale → lint → typecheck → content check → unit → build → browser smoke. Snapshots HEAD and tree first, aborts between steps if they change, names the failing step. No scoping. | REQ §1.1, §1.2 |
| `land` | Writes or updates this session's log: stitches the authored half with machine facts (timings, models, tokens, subagents from the transcript; files and PRs from git), validates, commits only that file to the log store, retries. Idempotent; reads the session id from the environment; loud on failure. | REQ §2.2 |
| `ship` | For the current branch: checks review ran, runs `gate`, pushes, opens the PR with the provenance header, subscribes. | REQ §3.1, §3.3 |
| `merge` | Waits for green, requires a verdict naming the head, pins the head, reads protected paths and the autonomy preset from the shared branch, parses closing keywords, merges, closes issues GitHub missed, never reports a failed merge as merged. Prints the verdict line it needs (`merge --verdict-line`). | REQ §3.4 |
| `look` | Preview and screenshots: builds production, starts by process group on a free port, waits for readiness and hydration, shoots desktop and phone in light and dark, always stops cleanly. | REQ §3.5 |

Shared helpers (GitHub REST with paging that throws on gaps, full-history
check, provenance header) sit in `platform/bin/lib/`. Nothing else is a script
until a recurring Friction asks for one.

## 6. Hooks

Five hooks. A guard fails closed; a reminder fails open. Each has a pure core
and a dry-run test.

1. **Session start:** install, fetch full history, print what loaded.
2. **Provenance guard:** blocks a GitHub body without the session header on
   every write path. A commit-message hook adds and corrects the trailer.
3. **Workflow-push guard (cloud only):** blocks a commit that touches
   `.github/workflows/`.
4. **Stop reminders:**
   - once per opened PR that isn't subscribed;
   - once per merge after which `land` hasn't run;
   - once if a log was refused.
5. **Land on stop:** runs `land` when the authored half changed.

Not carried over:
- read-first denies;
- rule hints;
- rule-use ledgers;
- edit-during-gate guards (the gate's own snapshot covers them);
- the subagent-note hook.

## 7. Skills

Platform Skills, all prefixed `p-`:

| Skill | Purpose | Replaces in Terrarium |
|---|---|---|
| `p-setup` | First-run setup and the human/laptop checklist (via `wizard`) | new |
| `p-close` | Write the judgement half of the log; call `land` | close-session, log-session |
| `p-steer` | Triage the open issues, ask once, build in parallel, review, ship, report one line per issue (later version: parallel; v1: serial) | clear-backlog, auto-triage, dispatch-subagents |
| `p-improve` | The one self-improvement loop | frictions-to-fixes, harvest, prune-trial |
| `p-watch` | The watcher | audit-skills |
| `p-docs` | Docs upkeep and the guide | audit-docs, glassbox-update, glassbox-curate |
| `p-visit` | The visitor loop, report only | visitor-loop |
| `p-digest` | Daily owner digest | digest |
| `p-sync` | Take template updates, offer platform changes back | new |

The installed pack ships:
- `code-review`, `grilling`, `tdd`, `domain-modeling`, `triage`,
  `prototype`, `research`, `wizard`, `writing-for-agents`, `retro`, and the
  pack's setup Skill;
- optional: `to-spec`, `wayfinder`, `implement`, `diagnosing-bugs`.

All are pinned at install (REQ §1.4).

**Brief contract for every loop that dispatches agents.** These are the
dispatch rules of REQ §3.6. They live in one reference file that each loop's
Skill reads as its first step. There is no guard that denies the first call
(REQ §3.1).

## 8. Loops

### 8.1 One finding shape and one intake

Every loop (watch, docs, visit, improve's own review, and a session's retro)
writes findings in one shape:

```yaml
- id: <loop>-<date>-<n>
  loop: visit            # watch | docs | visit | session | retro
  run: <session id>
  kind: bug | stale-doc | skipped-step | idea | friction
  severity: nit | minor | moderate | major | blocker
  where: <url path or file:line>
  what: <what is wrong now, quoting it>
  evidence: <command, measurement, screenshot, or source line>
  verified: yes | no
  commit: <commit it was seen at>
  proposal: <smallest fix, optional>
```

Findings go to `.journal/findings/<date>.yml`. Session Frictions stay in the
log, and `p-improve` reads both.

### 8.2 `p-improve`

1. **Collect** findings and Frictions since its last run, from the run record.
2. **Dedupe** against open and closed issues, the cause store, owner rules,
   accepted causes and recent findings. Attach repeats to their earlier item.
3. **Group** into causes. A cause that came back after a fix goes to the owner
   as an issue naming that fix (REQ R0.2).
4. **Act**, within a cap per run:
   - fix on a safe surface by deleting or adding a mechanism;
   - file an issue for anything that needs design or a protected path;
   - label idea issues for the owner.
5. **Report** once per run, every number sourced.

Rules:
- It never edits installed Skills, ADRs, hooks or settings.
- It may propose a cut and record it as a trial in the cause's notes, judged by
  later Friction share. There is no trial ledger.

### 8.3 `p-watch`

**Daily and mechanical,** no agent:
- orphan logs (PRs and commits that name a session with no log);
- logs left "in review" after their PR merged;
- loops with no run in two cadences;
- the review verdict missing before a merge;
- issue and PR states that comments claim;
- installed-Skill drift;
- run cost recorded;
- the size of each memory file.

**Weekly, with an agent:** for each Skill whose text or runs changed, did its
runs deliver what the Skill promises? Grade against the Skill text in effect at
each run. Output is findings.

### 8.4 `p-docs`

**Daily:** a freshness pass over the last two days of merged diffs, then a
rotating coverage pass picked from the last run's record. Every finding passes
an independent checker before it is applied. A rewrite of a decision record
goes to the owner.

**Steering:**
- `.journal/owner-rules.md` holds the owner rules, a short list only the owner
  edits.
- `.journal/memory/docs.md` holds the agent's open leads, capped by a test at
  800 words.

**The guide:**
- `docs/guide/` starts with platform chapters from the template. Site chapters
  are added as the site grows.
- Pages that cite code pin a commit, and the gate checks the pins.

### 8.5 `p-visit`

Three lenses:
- a first-time visitor;
- a returning visitor with a task;
- a UI and accessibility tester covering keyboard, phone and dark mode.

**Coverage** (pages, viewport, scheme, lens) is recorded in
`.journal/memory/visit-coverage.yml`. The next scope is the least-covered
area, not the date.

**Each run** gets:
- the real route list;
- the owner rules;
- open issues and recent findings, to avoid repeats.

**Output** is findings only; it builds nothing. Budget: 15 pages and 12
screenshots per lens.

### 8.6 `p-digest`

The digest is one page per closed UTC day with activity, for the owner. Counts
come from a script. Every claim is checked by a fresh agent against the merged
diffs. A word like "weekly" needs a source. The page is written once and never
edited. It lands by a PR that gets a review.

### 8.7 Cadence and cost

**Default cadence:**
- `p-watch`: daily, plus weekly.
- `p-docs`: daily.
- `p-digest`: daily.
- `p-improve`: weekly and on demand.
- `p-visit`: twice a week.

The owner changes these at setup.

**Cost recording:**
- **Default:** `p-watch` reads each finished run's total from the platform and
  appends it to `.journal/runs/<loop>.yml`. This works after a run ends: 8 of 8
  in #2987.
- **Option:** OpenTelemetry from the cloud environment, configured outside the
  repo, to attribute cost to subagents and models **(spike)**.

**Budget:** each loop bounds its own work (items, agents, pages) rather than
reading its spend mid-run. A hard cap via a nested `claude -p --max-budget-usd`
is a **(spike)** (REQ §4.6).

## 9. Observability

One owner-only route, `/journal`, rendered on demand and reading `.journal/` at
request time. Its parts:

- **Sessions:** newest 100 with a total count. Each card shows goal, status,
  outcome, PRs, Frictions by severity, duration, models, and subagent share of
  tokens.
- **Causes:** the Ledger, with a 7-day window and fix state derived from later
  occurrences.
- **Loops:** each loop's last runs, its cost per run and per week (labelled
  estimate), whether it is possibly stopped, its open memory size, and Skill
  state.
- **Digests:** newest first.
- **Ideas:** open idea issues and unfiled ideas from logs.
- **Live:** the deployed commit and build time. These also appear in the
  footer of `/journal`.

**Access** goes through a server middleware check of one owner secret, set at
setup. A demo site can turn the check off.

**Why request time:** a log landing then never needs a deploy. The running
server reads `.journal/` from a checkout it updates on a timer
**(spike: how the host gets new logs without a rebuild)**. If the host can't,
the Journal reads the log files through the GitHub API with a short cache.

## 10. Mixed files and sync

| File | Approach |
|---|---|
| `CLAUDE.md` | Seed. It imports `@platform/CLAUDE.platform.md`, so the platform text syncs as a file. |
| Glossary | Two files: `GLOSSARY.md` (site) links to `platform/GLOSSARY.platform.md`. |
| `.claude/settings.json` | Mixed; it cannot be split for cloud sessions. Keep platform entries as one-line calls to `platform/hooks/*`, so they rarely change. Sync merges keys: the platform owns `hooks`, the site owns the rest. |
| `package.json` | Mixed. Platform scripts are one-line aliases (`"gate": "tsx platform/bin/gate.ts"`). Sync merges the `scripts` keys it lists and adds platform devDependencies. A lockfile change follows. |

**`p-sync take`:**
- fetches the template;
- for every manifest path, does a 3-way merge with the recorded commit as base
  (an unchanged site file is simply overwritten);
- merges the two JSON files by key;
- updates the recorded commit;
- opens a site PR that must pass `gate`.

**`p-sync offer`:**
- diffs manifest paths against the recorded commit;
- opens a template PR with only those files.

It needs the template attached with push access, so it works for the owner's
own sites only. It runs in a single-repo or laptop session. It never touches
`.github/workflows/`.

## 11. Autonomy presets

| Preset | Agents may merge | Loops may self-merge | Protected paths |
|---|---|---|---|
| **Supervised** | nothing; the owner merges every PR | no | everything |
| **Standard** (default) | their own PRs after verdict and green gate | docs, digest and improve PRs on safe surfaces | gate, `merge`, hooks, settings, the preset itself, workflows, `.journal/owner-rules.md` |
| **Autonomous** | as Standard, plus dependency minors and patches | all loops | the same short list |

The preset is one line in `platform/manifest.yml` that `merge` reads from the
shared branch. Changing it is itself a protected-path change.

## 12. Identity and setup

**Identity (proposal):**
- Start on the owner's account with the provenance guard, because that works
  today.
- Offer a machine user as a setup option, since the GitHub App's token can't be
  minted through the cloud proxy. It needs a fine-grained token in the cloud
  environment **(spike: do pushes and API writes show the new identity through
  the proxy?)**.
- With a separate identity, a CODEOWNERS file and code-owner review on
  protected paths make GitHub enforce the owner's merges. `merge` keeps its
  other checks.

**`p-setup` order:**
1. Pick the stack template and the autonomy preset.
2. Create the issue labels and verify them.
3. Install and pin the Skill pack.
4. Write the adapter docs, including the triage-label override.
5. Seed the owner rules (empty) and the guide.

Then the `wizard` checklist for the human or laptop steps:
- the workflow shell;
- the branch ruleset;
- the owner secret for `/journal`;
- the deploy host;
- the cloud environment's setup script;
- the optional agent identity and telemetry.

`p-setup` then verifies each step it can see.

## 13. Spikes before building

1. **Snappiness:** Astro's client router against Nuxt's, on a phone (section 4).
2. **Request-time logs:** how the host serves new `.journal/` files without a
   rebuild (section 9).
3. **Cost:** OpenTelemetry from a scheduled cloud run (does the last interval
   flush, does a run id come through?), and a nested
   `claude -p --max-budget-usd` inside a run (section 8.7).
4. **Identity:** a machine-user token in the cloud environment, checking that a
   push and an API write show the new actor (section 12).
5. **Sync:** one throwaway site taken from the template, then `take` and
   `offer` across one platform change in each direction (BD §7 item 3).

## 14. What is still unclear about the implementation

Each item names where the answer probably lies:

- **Repo:** settled from Terrarium's code or records, with what to look for.
- **Owner:** needs owner steering.
- **Spike:** needs an experiment.

### Structure

1. **Can Skills and rules live under `platform/` and be linked into
   `.claude/`?** Claude Code reads `.claude/skills/` and `.claude/rules/`.
   Terrarium already links `.claude/skills/` to `.agents/skills/`, so links
   work for Skills in cloud sessions. Whether path-scoped rules load through a
   link, and whether a sync tool copies links faithfully, is unverified.
   **Repo:** check how `.claude/skills` links resolve in cloud session logs.
   **Spike** for rules.
2. **Is a `p-` prefix enough to keep platform and site Skills apart?** A site
   may want to change a platform Skill. Does it edit it in place (then sync
   merges) or override it with a site Skill of another name? **Owner.**
3. **One manifest or two?** The manifest holds both the path list and the
   recorded template commit. Sync writes the second every time, which may
   conflict when two syncs overlap. **Owner** on simplicity; **Repo:** none.
4. **Where `.journal/` lives** if the repo is public but the Journal is
   owner-only. Files in a public repo are public whatever the site's access
   check does. A private data branch, a private second repo, or accepting
   public logs? **Owner.**

### Commands and hooks

5. **How much of the transcript to parse.** `land` keeps timings, models,
   tokens and subagents. Terrarium's parser grew to about 1,000 lines over 100
   commits, mostly for rule and doc-read accounting, which is now dropped. The
   surviving part's size is estimated, not measured. **Repo:** in
   `scripts/session/transcript-trace.ts`, count the lines that serve only the
   kept fields.
6. **Compaction and resumed sessions.** No handling was found in Terrarium's
   parser for a compacted or resumed transcript. Do timings and tool counts
   stay right across one? **Spike:** a long session forced to compact, then
   resumed.
7. **Whether `ship` should run the gate or trust CI.** Running the gate before
   every push costs minutes. CI runs it anyway. Terrarium's rule exists so
   that a red PR is never opened, and so that an agent can't move on before
   its result. **Owner:** is a red PR acceptable if the agent waits for CI?
8. **Whether a Stop reminder is enough for re-logging after a merge.** In
   Terrarium 18 sessions still forgot it despite a hook. An alternative is
   for `merge` itself to call `land` with status completed. **Repo:** check
   why the existing stop hook didn't prevent those 18; the friction texts
   name the cause.
9. **The provenance guard's write paths.** Cloud sessions write through MCP,
   REST and git. Laptop sessions may use `gh` with GraphQL, which the guard
   must also see. **Repo:** `scripts/hooks/github-provenance-guard.ts` lists
   the paths it covers today.
10. **Wake-on-green outside the cloud.** A laptop session has no PR
    subscription. Does `ship` wait in the foreground, hand back to the owner,
    or schedule a check? **Owner.**

### Loops

11. **The cap per run for `p-improve`.** Terrarium used at most 10 picks and 3
    issues per run. Is that right for a site with far fewer sessions?
    **Repo:** the share of Terrarium runs that hit the cap
    (`routines/frictions-to-fixes.yml` and run summaries). **Owner** for the
    site's number.
12. **Which watch checks need an agent at all.** The proposal moves all but
    one class to scripts. **Repo:** for each audit-skills finding class in its
    state record, ask whether the evidence was mechanical (git, GitHub, log
    fields) or needed judgement.
13. **The memory cap for docs upkeep.** 800 words is a guess, a third of
    Terrarium's 2,500 for a much larger guide. **Owner.**
14. **What the visit loop's personas and tasks are for a site with no
    shop.** Task-directed visitors need a task. Who writes the tasks: the
    owner at setup, or the loop from the site's pages? **Owner.**
15. **How findings stay small.** One file per day under `.journal/findings/`
    grows without end. Does `p-improve` delete findings it has processed, move
    them into causes, or archive them? **Owner** on retention; **Repo:**
    the Ledger's 14-day horizon is the existing answer for Frictions.
16. **Whether the session retro is a loop input.** The installed `retro`
    Skill writes a session's own retrospective. Should every session run it,
    only long ones, or none (Frictions already cover it)? **Repo:** the 26
    sessions that used `retro` show what it added beyond their Frictions.

### Observability

17. **How the owner secret works with the cloud preview.** Agents verify the
    Journal page with screenshots of a local build. The check must be off or
    known locally. **Owner** on the mechanism.
18. **What the Journal shows on a laptop-only site.** If there is no deploy
    yet, is the Journal a local page, or a script printing a summary?
    **Owner.**
19. **Per-subagent cost without telemetry.** The default records a run's total
    only. Subagent share of tokens comes from the transcript, which counts
    tokens at list-price weights, not dollars. Is that share enough attribution
    for the owner? **Owner.**

### Sync and identity

20. **A 3-way merge on a renamed platform file.** If the template renames a
    file the site changed, a path-keyed merge sees a delete and an add.
    **Repo:** none; **Spike** in the pilot.
21. **Who reviews a site's offered change on the template?** The template has
    no sessions of its own. Does the owner review it by hand, or does an agent
    session on the template run `code-review` and the template's gate?
    **Owner.**
22. **Several sites offering conflicting changes.** The first merged wins,
    and the second must rebase. Is that enough, or should `offer` refuse while
    another offer is open? **Owner.**
23. **Dependency updates through sync.** Platform devDependencies may move
    with the template, while the site's own stack deps don't. A lockfile
    conflict follows every sync that changes them. **Spike** in the pilot.
24. **Whether the template itself runs the platform.** The template repo needs
    its own gate and perhaps its own logs to be improved by agents. Is it a
    site with an empty seed, or a plain repo? **Owner.**
25. **The machine-user token's lifetime and rotation.** A fine-grained token
    expires, and someone must rotate it in the cloud environment and on the
    laptop. **Owner** on whether the identity option is worth that.

### Process

26. **How to build the template.** Start from an empty repo and copy
    requirements in, or cut Terrarium down? The owner's "start empty" points
    to the first. Terrarium's specs are the cheapest source of the guarantees
    each command must keep (REQ cites them). **Owner.**
27. **What to do with Terrarium itself.** Does it become a site of the new
    template, stay as is, or freeze? This decides whether `p-sync` must ever
    handle Terrarium's history. **Owner.**
