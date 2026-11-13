# Requirements a single-site template must keep

A companion to
[`single-site-template-breakdown.md`](./single-site-template-breakdown.md)
(cited below as **BD §n**). It is read together with that breakdown and does not
repeat it. It covers only the places where the breakdown was shallow, or called
something simple that cost many iterations to get right. Written on 2026-11-13
from the repo at `acd07c56a`. **Status: reference; decides nothing.** It states
requirements only; a proposed design is kept apart in
[`single-site-template-design-draft.md`](./single-site-template-design-draft.md).

Each requirement says what a replacement must guarantee. It never says how
Terrarium does it today, which is often more complicated than needed. The
evidence column names the incident that made the requirement necessary.

Requirements use the design draft's plain lowercase terms:

| Term here | Terrarium's name |
|---|---|
| **problem** | Friction |
| **sweep** (a scheduled or on-demand Skill) | Routine or loop |
| **dashboard** | Journal |
| **verification** (run by the `verify` command) | gate |

Evidence keeps Terrarium's own names, because it points at Terrarium's records.
The draft's section 2 says why.

## Owner decisions taken while this was written

These revise the breakdown's starting point (BD "What the owner settled first"):

- **Parallel steering stays.** Several issues are worked at once in isolated
  branches, steered by one round of owner questions. It may come after a first
  version, but the design must allow it. This reverses BD §3 "one session at a
  time".
- **Observability is a must-have.** That covers a dashboard of
  sessions, problems, Skill and sweep state and cost, plus a daily digest. It is
  owner-only by default, and a demo site may make it public. This reverses
  BD §2 "Journal: Drop from the core" and BD §4 "digest: Drop".
- **A watcher must catch what sessions don't notice about themselves.** This
  reverses BD §4 "audit-skills: Drop".
- **Docs upkeep runs autonomously and the owner can steer it.** Checking docs
  against the code is core, because Terrarium's audit-docs kept finding what
  review missed. A productive site gets a
  guide that explains the platform, seeded from the template and grown with the
  site. This reverses BD §4 "audit-docs: Later" and BD §2 "Glass Box: Drop".
- **The visitor sweep stays, improved:** good signal and coverage, and it reports
  findings rather than building fixes. The owner found its autonomous fixes
  uncontrolled and often reverted them (#2369).
- **One self-improvement sweep** takes every finding source and turns it into
  issues or fixes. Today several separate Terrarium loops do this.
- **Browser-side navigation must be available as an opt-in.** The owner values
  how fast in-app navigation feels (ADR-0028, #1444). This revises BD §2
  "Prerender content pages".
- **Agent identity:** a separate GitHub App or account is acceptable. Sharing
  the owner's account was easy to set up but awkward.
- **Three autonomy presets are picked at setup.** Few protected paths exist at
  first.
- **Cost observation and attribution are key.** A budget cap per scheduled run
  is an open research item (section 4.6).

## Sources

- **First round (six agents):**
  - the repo's own Skills and their recorded state;
  - the installed Skill pack;
  - the last month of session logs (576 sessions) and the Friction Ledger;
  - script bodies, specs and commit history;
  - issue and PR history on ten topics;
  - the full ADRs, `docs/agents/` and the Glass Box practice pages.
- **Second round (seven agents):** docs upkeep, the visitor sweep, the
  self-improvement loops, the watcher and observability, the merge chain under
  cloud limits, parallel steering in practice, setup and template sync.
- **One docs-research agent:** cost capture for scheduled runs.
- **Re-checked by the writing agent:** the Routine cost totals
  (`layers/journal/content/current/routines/*.yml`), the 133 Ledger entries and
  the 119 audit-docs runs. Every other count is a subagent's, from its cited
  command or file, and was not re-run.

## The finding behind most of this

Cheap mechanisms hold better than prose, but not by much, and a mechanism can
cost more than it saves. Across 220 recorded fixes to recurring problems (Terrarium's Friction causes):

| Kind of fix | Held |
|---|---|
| Script or guard | 65% |
| Skill step | 60% |
| CLAUDE.md line | 50% |

- A first fix held about two times in three.
- A second or later fix on the same cause usually failed: 13 of 24 and 15 of
  31 causes kept recurring.
- Causes that no fix retires end as *accepted*. 12 of the causes with fixes
  did (14 Ledger entries are accepted in all), including the
  103-occurrence late reading of docs.

The history shows the same pattern one topic at a time:

- **Provenance:** four prose passes failed before a block held (#387, #605,
  #628, #723, #788).
- **Unshallowing:** four prose rounds before a hook held (#413 to #772).
- **Merge-before-review:** prose failed until the merge refused (#1113 to
  #1276).
- **Closure:** a dozen rounds before a refusal and a stop hook (#1801 to
  #2956).

Mechanisms failed too. Three of Terrarium's top recurring problems came from
its own guards and hints:

- a guard that denied a first call until a doc was read (66 in 14 days);
- a stop hook that nagged mid-run (67);
- hints that pointed to ADRs after edits (38, with 85 of 86 late reads changing
  nothing).

Terrarium also rarely used the cheapest mechanism, a lint rule. The installed
`retro` Skill makes that the default: a mechanical violation (a fixed pattern,
a banned call, a file-location rule) gets a deterministic check in the repo's
linter, a pre-commit hook or CI, and the coding-standards doc keeps only
judgement calls.

Requirements for the template:

- **R0.1** A rule that a cheap check can enforce (a lint rule, a type, a test,
  a CI step) gets that check when the rule is written, not after it fails.
  Judgement stays in prose, and a prose fix may be tried more than once.
- **R0.2** A mechanism must cost less than the problem it prevents. A guard
  or hint that becomes a top source of problems is itself a cause to fix or
  remove.
- **R0.3** The self-improvement sweep must send a cause that regressed after its
  fix to the owner, naming that fix, before it tries another one.
- **R0.4** "Accepted cost" must be a legitimate end state that is never
  re-proposed.

## 1. Build time

Read with BD §1. The breakdown's gate row is right; what it misses is what
verification, the check that decides whether a change may merge, must
guarantee.

### 1.1 Verification

| Requirement | Evidence | Revises |
|---|---|---|
| A pass must vouch for the exact tree that is pushed. If the tree or HEAD changes during a run, the run aborts or warns. This holds for a full run too, not only a scoped one. | `edit-during-gate-run`, 31 occurrences in 14 days, about 10 minutes lost per slip (#3046) | BD §1 "gate:scoped … Drop" |
| One definition of verification, run the same way locally and in CI. CI installs from the frozen lockfile and names the failing step. | ADR-0026: a check landed in the package script while CI waited. A single opaque CI step hid which check failed. | BD §1 "one workflow … no parity test" |
| Any decision drawn from git history fails closed on a shallow or unknown base. A session starts with full history. | #849: a shallow merge-base hid changed files; four prose rounds (#413 to #772) | BD §3 hooks "Keep the install" |
| Stale dependencies are detected and reinstalled before verification trusts a failure. | Stale installs read exactly like real breaks (#445, #923) | none |
| Review runs before verification; nothing is edited while it runs. | `prepush-gate-review-skipped`, 21 occurrences | none |

### 1.2 Content validation

Validation is needed whatever the stack. The stack only decides how much of it
comes built in.

| Requirement | Evidence |
|---|---|
| Every content file is checked against its schema before merge. A build that passes invalid content is not a check. | #133: the build published an out-of-enum value |
| Silent truncation in YAML (an unquoted `#`) and silently degraded component blocks are caught. | #367, #446 |
| A folded line ending in a hyphen is caught, because it turns one word into two. | Commit `bec068280` |
| References between content files are checked. | #446 |
| A fast local check (seconds) exists beside the full verification. | Owner, #133 |

### 1.3 CI under cloud limits

| Requirement | Evidence |
|---|---|
| A cloud session must never put a workflow-file change in a push, because the whole push is rejected and every commit in it is stranded. | #897, #1955; sessions `01FnZ4zF…` (major), `011xN2Zi…` |
| The workflow file stays minimal and stable, so changing verification never means editing it. Its logic lives where a cloud session may push. | ADR-0026. The composite action waited 8 weeks for a human to apply the shell. |
| A drop zone exists for changes only a human or laptop session can apply, with a rule that both halves land in one sitting. | `docs/proposals/README.md`; PR 90 could never go green |
| A green CI run must wake the session that waits on it. Success is not delivered natively; only comments and failures are. | #278. A Routine stalled for about 2 hours before this existed (session `01DN8mXo…`). |

### 1.4 Installed Skills

| Requirement | Evidence |
|---|---|
| Every installed Skill is pinned at install time, and verification fails on drift. Not only once a Skill is first used. | PR #304 patched an installed Skill unnoticed. A Skill with no record went unchecked (ADR-0015). |
| A pack update lists the changed Skills, re-reads every repo doc and rule that adapts them, and says so in its PR. | 2026-11-12: the owner had to ask whether the update overrode local docs. 2026-10-14: 9 affected Skills were reported as 1. |
| Renames upstream and Skills deleted upstream are handled explicitly. | `CONTEXT.md` became `GLOSSARY.md`, about 90 files; `resolving-merge-conflicts` was deleted |

### 1.5 Deploy

Read with BD §1 "Self-updating container". The owner is open to other models,
but the current one worked well.

| Requirement | Evidence |
|---|---|
| A failed build or install never replaces the live site, and the next attempt retries rather than staying stale. | #1701 (a failed install was never retried) |
| The live commit and build time are visible from outside the server. Neither the owner nor a cloud session can read server logs. | #3029: OOM left the site about 3 hours stale, noticed from a screenshot. Fixed by #3075. |
| A build's memory need is known and provided for. | About 2.1 GB peak (#3029, #3035) |
| A deploy credential never lands in the repo's git config. | `deploy/` README |

## 2. Runtime and observability

Read with BD §2.

### 2.1 Pages

| Requirement | Evidence |
|---|---|
| Browser-side navigation is available as an opt-in. Without it, content pages may be prerendered. | Owner; ADR-0028, #1444 |
| Any data the browser loads has a recovery path, or is avoided. | #236, ADR-0019 |
| Any page cache has a size bound. | #1446 |

### 2.2 Logs

The owner's requirement:

- Logs are easy for agents to read at any time.
- They can be shown on a dashboard page.
- Writing one is quick and painless.

Under those three, these must hold:

| Requirement | Evidence |
|---|---|
| Every substantive session lands a log without the owner asking. | 4 `HUMAN-PROMPTED-CLOSURE` cases in a month; owner-filed #2956 |
| The agent writes only the judgement half: goal, outcome, problems, ideas, who asked. Machine facts come from the machine. | Agents misreport facts the transcript records exactly (ADR-0009) |
| The session id is never typed by the agent. | `session-id-hand-typed`, 18 occurrences |
| Landing is idempotent. A second landing never clobbers the authored half. | #688 |
| A log's status follows its PRs, so no view shows "in review" for merged work. | 11 sessions authored `completed` before re-closing. The stale `in-review` view, #2884. |
| A failed landing is loud, never hidden by filtered output. | An agent told the owner a refused log had landed |
| A log written while the log format is changing is still accepted or held, never lost. | #3073 |
| A log's text survives the container being reclaimed. | #449 |
| Timestamps are UTC, and a day is cut by the session's end. | #1478 |
| Each problem carries a severity graded by what it cost, and the agent reports every one, however small. | session-logs lesson; severity scale |

### 2.3 What the owner must see

Owner-requested views, from session logs:

| View | Evidence |
|---|---|
| Session feed: goal, status, outcome, kind, PRs, problem counts, time, models | `SessionCard` |
| Causes: one entry per cause, a time window (default 7 days), fix state derived from later occurrences | `01RDtAc5…`, `011W3gVN…`, `013zxzeSai…` |
| Sweep cost per run and per week, labelled as a list-price estimate | `01TwTc2v…`, `013zxzeQ93…` |
| Subagent share of tokens and run time on each session | `012rLVzS…`, `013zxzeSB…` |
| Headline tiles: sessions by kind, problems by severity, sweep spend, suggestions, Skills | `013zxzeR2k…` (ten acceptance criteria) |
| Skill state: role, graded importance, use count | ADR-0015 |
| A daily digest | `013zxzeNC…`, `013zxzeQ697…` |
| Ideas and learnings | `harvest` input |

Requirements:

| Requirement | Evidence |
|---|---|
| Views derive from the logs; logs are never regenerated from repo state. | ADR-0008 |
| Every read is bounded: newest first, a cap, and a total count. A view that grows with history is a defect. | The Journal landing passed 10 MB uncapped; one view still reads every session. |
| Fix state, "stale in review" and sweep silence are derived, never stored. | `ledger.ts`, `dashboard.ts` |
| A cost that could not be read is shown as "unreported", never guessed. | `get-session-cost-unreported`, 7 occurrences |
| A sweep with no run in two cadences shows as possibly stopped. | visitor-loop: no scheduled run since 2026-11-03, noticed 10 days later |
| The digest is fact-checked against the merged diffs, and a cadence word ("weekly") needs a source. | The checker caught wrong claims in every first draft; invented "weekly" in the 2026-11-08 Digest |
| The digest is landed once and never rewritten. | ADR-0010 |
| A new log or run row shows with no page edit. | ADR-0008 |

## 3. Interactive sessions

Read with BD §3.

### 3.1 Guidance that must survive the cut

The breakdown shrinks CLAUDE.md to "a fraction" without naming what stays. Each
of these lines answers a recurring problem:

| Line | Evidence |
|---|---|
| Verify before you state: ids, counts, causes and subagent claims are checked against their source this turn | `mechanism-claim-from-recall` 36, `relayed-subagent-claims` 24, `counts-not-tallied` 19 (accepted after the line landed) |
| Question the premise; add nothing beyond the ask | `premise-not-questioned`; owner reverts in `nxrvF9`, `CkH3TE` |
| Ask before building what the owner will see; settle each displayed value in the first round; show a sample first | #2853, #3098; the owner judges by screenshots |
| Open the PR yourself once reviewed and gated, even if the harness says not to; subscribe to it | 3 major Frictions; the owner pushed back on 2026-11-13 |
| An empty task prompt means stop and ask | CLAUDE.md |
| Read a required doc whole | #2448, #2644 |
| Never chain a commit or push with a check | `push-chained-to-gate-run` 11, `chained-git-step-fails-silently` 7 |
| Run long commands in the background and end the turn | `foreground-gate`, `double-background` 26 |
| After a restart, check that background work is alive before reporting it | 4 sessions told the owner work was running; about an hour lost (`awqrWBJD`) |
| Use plain words; coin a term only on its second use | Owner rejected jargon-heavy ADRs over three rounds (`jvw2N9`) |
| Settle a stored field's shape with the owner first | `.claude/rules/data-shapes.md` |

Two guidance mechanisms must not come back:

| Do not | Evidence |
|---|---|
| A guard that denies a first call until a doc is read | `dispatch-read-guard-deny` 66 in 14 days. The owner declined a read-first deny (#1819). |
| Hints that point to a doc after an edit | `adr-read-after-edit`: 85 of 86 late reads changed nothing |

The ADR-0029 trap: a "read X before Y" line in CLAUDE.md is the pattern that was
skipped. Keep such lines few, and expect them to be read late (accepted cost,
#2066).

### 3.2 Rejected alternatives the breakdown re-tries

| Breakdown proposal | Rejected in | Why it failed |
|---|---|---|
| Provenance as one instruction, no guard (BD §3 hooks) | ADR-0017 | Prose was missed again and again. Agents copy the nearest id-shaped string (#723). |
| One CI step running the package script (BD §1) | ADR-0026 | Loses the failing step's name. Local install habits are wrong in CI. |
| The standard Mermaid CLI (BD §1) | ADR-0024 | An extra dependency or service, where the repo already had a browser |
| Read-first lines kept in CLAUDE.md, with the hints dropped (BD §3) | ADR-0029 | That is the pattern that was skipped |
| Ask the owner about every issue in one round (BD §3 `clear-backlog`) | ADR-0022 | Fine only while the backlog is small; a sweep needs a labelling rule |
| A "docs-only" gate skip (BD §1) | ADR-0004 | Prose that steers later sessions (CLAUDE.md, rules, Skills, agent docs) still needs review |

### 3.3 Provenance and identity

| Requirement | Evidence |
|---|---|
| Every agent write names its session: issue, PR, comment, review and commit, on every write path (MCP, REST, git). | #1900: `gh api` writes were unchecked |
| The agent never transcribes its session id. | #723 |
| Missing provenance is refused, not repaired after the fact on a public post. | ADR-0017 |
| Cloud sessions commit without the attribution trailer; it must be added mechanically and checked. | #318: 6 of 20 sessions |
| Telling an agent's post from a human's uses the mark, never the login. | ADR-0017 |
| If agents get their own identity (owner option), branch protection and self-approval rules can tell agents from the owner. Until then, "a person merges these paths" cannot be left to GitHub. | #301, #853, #1689 |

### 3.4 Merging

The breakdown keeps four things and drops the rest (BD §3 `merge-pr.ts`). Each
of these came from agent-only failures, not from outside contributors:

| Requirement | Evidence |
|---|---|
| Merge only after verification passes and a review verdict names this exact head. | #1113 to #1276; #1840 merged unreviewed 3 minutes after opening |
| The verdict's commit id is machine-produced, never typed. | #2833: 16 wrong before the fix, 5 after |
| The merge is pinned to the reviewed head, so a late push fails the merge instead of landing unreviewed. | merge-pr body; #1761 |
| No platform auto-merge: it cannot pin the head, and the owner's own pushes don't disarm it. | #385, #667, #1761 |
| A PR cannot shrink its own protected-path list, a rename cannot move a file out of it unseen, and an unreadable list refuses the merge. | Protected-paths lesson: the list is read from `main`; rename fix `6794317d5` |
| Closing keywords are parsed the way GitHub does: any tense, colon, quotes, negation. A merge never closes an issue the owner reserved. | #983, #2104, #2691 |
| Issues GitHub left open after the merge are closed, with a retry. | #983, #1181 |
| An owner waiver is quoted in the merge record and covers only the protected-path refusal. | #3022 |
| A merge that failed (e.g. GitHub 503) is never reported as merged. | 5 sessions |
| Long merge polling runs in the background. | 600 s foreground limit |
| The setup warns that the harness's auto-mode classifier can still refuse a merge the owner authorised. | Two sessions |

### 3.5 UI verification

The breakdown keeps "one script" (BD §3). The iterations went into these
guarantees:

| Requirement | Evidence |
|---|---|
| The preview tool owns server start and stop by process, never by name pattern. Its stop always succeeds. | `pkill` teardown corrupted work three times (#102, #183, #240) |
| Concurrent previews don't collide. | Port collisions between agents |
| A capture waits for a real page and for hydration; a dev-server loading page is not the page. | #364, #3235, #3254 |
| A trusted screenshot comes from a production build at the requested pixel size. | #575, #584 |
| Light and dark, desktop and phone are one command. | Owner judges by screenshots |
| Rendering is checked in the DOM. A grep of server HTML proves nothing; a filtered test run is not proof. | #56, #907 |
| The deployed site is unreachable from cloud sessions, so a local production build is reviewed. | `verifying-ui-changes.md` |
| A screenshot-reading agent has a hard cap on images. | One agent read 76 shots in about 50 minutes and 1,200 calls, and left the session unopenable |

### 3.6 Parallel steering (later version)

Evidence: 16 recent runs merged 62 PRs with no revert. A typical run costs $10
to $34 and takes 1 to 3 hours. Minimal first version:

| Requirement | Evidence |
|---|---|
| Triage every open issue read-only, with a fixed result. An issue with no result is reported as missing. | #1857: the explore phase was skipped and the owner had to ask |
| Verify each recommended pick against its source before asking. | First-pass picks wrong on 3 of 4 (`Svn…`) |
| Ask the owner once: numbered questions, lettered options, a pick and why, count checked. | `CkH3TE`, `NjAbK…` |
| No builder starts until every answer is in. | Owner asked for this rule (PR #3207) |
| One isolated branch per group of issues that share files. | #603: two green branches broke `main` together |
| Each non-simple branch is reviewed by fresh eyes before its PR; nits never block, and a simple diff gets a lighter review. | Terrarium ran one fresh standards-and-spec round. Real catches came in round 1 and sometimes round 2; round 3 found only nits; the two reviewers duplicated each other on small diffs |
| A review finding is fixed by the branch's builder and re-checked, and the review loop has a hard stop. | Fixes went back to the builder, re-checking only what was touched. | After #3119 every re-check was clean |
| A missing test is a defect only where the code is risky. | `R3mLZ…` ran rounds 2 and 3 on low-risk gaps |
| A clean review does not replace the owner's design choice. | #3253 passed review and was rejected on design |
| Report one line per issue. Report cost before the owner's final step, not after. | `TEBhU…`: 4.4M tokens on 6 small branches |

Dispatch requirements, each paid for by lost work:

| Requirement | Evidence |
|---|---|
| Every agent that touches git works in its own checkout. | #1585 |
| A read-only agent never moves the shared checkout. | #2874 |
| A brief is self-contained, with no unfilled placeholder. | #3227 |
| Each agent's final reply is kept verbatim. | #2196 |
| A stopped agent is resumed, never re-dispatched. | dispatch-subagents |
| No resume while its run is still live. | Two writers in one worktree, `SiYFQ…` |
| Before finishing, every branch is pushed or dropped. The sweep finds stranded work from git, not from memory. | #427, #3043, #3229 |
| Parallel full verification runs are capped by memory. | Exit 137 above two (#1800) |

Still open in Terrarium: the agent still forgets to log again after a merge (18
sessions), and stranded worktrees at close were fixed only on 2026-11-13. A
template must treat both as unsolved, not copy them as working.

### 3.7 Planning work bigger than one session

The owner reports that the installed `wayfinder` Skill worked well:
- start from a map of the destination;
- grow it with grilling, research, prototype and task tickets;
- let the agent steer through them one ticket per session.

What was awkward was creating each next session by hand. It was used in 24
interactive sessions (audit-skills count).

| Requirement | Evidence |
|---|---|
| Work too big for one session is planned as a map with decision tickets, the way `wayfinder` does it. | Owner |
| Moving to the next session is one command. It writes the hand-over, starts the next session with it, and works in cloud and laptop sessions. | Owner: manual session creation was the awkward part |
| A session hands over before its context fills, not after it degrades. | Owner |
| The hand-over names the map, the ticket claimed and the Skills to load, and points to artifacts (issues, branches, docs) instead of copying them. | The pack's `handoff` Skill rules |

### 3.8 Working with the installed Skill pack

The platform extends the installed pack (Matt Pocock's Skills) rather than
competing with it.

| Requirement | Evidence |
|---|---|
| A platform Skill calls a pack Skill by name for the pack's job (grilling, review, tickets, research, prototypes, hand-overs). It never reimplements that job. | Workflow reviewers skipped or half-followed `code-review`'s own steps (#3148) |
| Platform terms and Skill names don't clash with the pack's. | Owner; pack names checked |
| Where the platform needs different behaviour, the change lives in a repo doc the pack Skill reads, written by the pack's setup Skill and kept as the site's own. Installed Skills are never edited. | ADR-0015; the triage-label override |
| A pack update is checked against those repo docs. | 1.4 |
| A platform Skill that needs more than a pack Skill offers wraps it: run the pack Skill, then add the platform's step (e.g. hand-over, then start the session). | Owner |

## 4. Sweeps

Read with BD §4. Re-checked cost of the newest 30 runs of each Terrarium
Routine, about one month:

| Routine | Runs | Total | Mean |
|---|---|---|---|
| audit-skills | 30 | $379.72 | $12.66 |
| visitor-loop | 30 | $238.04 | $7.93 |
| audit-docs | 30 | $183.84 | $6.13 |
| blog-post | 30 | $130.38 | $4.35 |
| frictions-to-fixes | 30 | $122.37 | $4.08 |
| glassbox-update | 28 | $58.01 | $2.07 |
| prune-trial | 30 | $57.90 | $1.93 |
| digest | 30 | $53.58 | $1.79 |
| glassbox-curate | 5 | $22.16 | $4.43 |
| dependabot-sweep | 1 | $0.44 | $0.44 |

These are list-price estimates, not subscription cost.

### 4.1 The watcher

What it caught that sessions did not notice:

- steps a Skill skipped while reporting success (#1626, #1647, #1857);
- missed invocations (#2023);
- reverted or regressed changes (#1675, #1676, #2105);
- gates bypassed by accident (#2104, #1913);
- orphaned logs (#736, #1063);
- human-nudged closures;
- a scheduled sweep that stopped.

| Requirement | Evidence |
|---|---|
| It runs on a schedule, independent of any session noticing. | The sessions' own Frictions never showed these classes |
| It grades a run against the Skill text in effect when the run started. | #1479, #1515 |
| It checks every issue or PR state it writes against GitHub. | #1627, #1720 |
| It verifies each subagent finding against its source. | An invented quote; unresolvable commit ids |
| It files an issue only when a finding is significant or repeated. It comments on an open thread, and knows what to do when that thread is closed. | `audit-skills-repeat-after-closed-issue` |
| An inconclusive scan reports as inconclusive, not as zero. | Orphan scan blocked by a 403 (#1514) |
| A possible sweep stop is an observation, not a failure, but it is surfaced. | visitor-loop 2026-11-13 |
| Its output is bounded. | A 56 to 478 KB scorecard |
| It shows its own cost. Agent checks run only for Skills whose text or runs changed; mechanical checks need no agent. | About two thirds of its tokens go to per-Skill agents |

### 4.2 One self-improvement sweep

Inputs: problems, ideas and learnings, watcher findings, audit-docs findings,
visitor findings, and a single-session retro.

| Requirement | Evidence |
|---|---|
| One store keyed by root cause, with fixes and status. "Worked" is derived from later occurrences, never recorded by hand. | 93 of 133 Ledger entries carry fixes |
| One dedupe step for every input: open and closed issues, settled decisions, accepted causes, open trials. A title match is only a hint. | The open-issue check is repeated in four loops; "settled decisions" live in three places |
| The input window starts from the last run, with a margin and a per-entry "taken" mark. | Missed runs lost no logs |
| It fixes only on a safe surface, through a reviewed and gated PR, and prefers a deletion. | ADR-0027; R0.1, R0.2 |
| It never edits installed Skills, ADRs, guards or settings itself; those become issues. | frictions-to-fixes §7 |
| A regression goes to the owner, naming the earlier fix. | R0.3 |
| Its work per run is capped, and large inputs stay out of its context. | harvest read 62k tokens and checked only 17 clusters |
| Text is copied by script, never retyped. | `ledger-yaml-hand-edit-errors`: 7 fixes |
| One report per run, every number sourced or marked unverified, and every dropped item with its reason. | #3143 rules |
| Its own briefs are a problem source to watch. | Five of the seven 7-fix Ledger entries are its own briefs |
| A cut instruction may stand as a trial judged later. Silence is a weak signal. | No trial verdict ever restored text; one rate-based issue (#2784) |
| A session and a schedule can both invoke it. | #1018 |

### 4.3 Docs upkeep

Evidence: audit-docs landed a fix in 117 of 119 runs. Its independent checker
dropped up to 12 of 20 draft findings. Three checkers plus review once passed a
rewrite that inverted an ADR's decision; only the owner's merge review caught
it (#1913).

| Requirement | Evidence |
|---|---|
| A finding is applied only after an independent check against the primary source. | Inline checks recurred (#1647) |
| A checker lists every rule, exception and "why" of the original before judging a rewrite. A rewrite that loses one, or isn't shorter or plainer, is wrong. | #1913 |
| A rewrite of a decision record must not change the decision; humans merge decision changes. | #1913, PR #1932 |
| A conflict no source settles becomes an issue; naming it without filing it is a failure. | #2395, #2553 |
| Coverage rotates by the last run's record, not the calendar, and logs what was actually read. | #1914, #2726 |
| The owner steers through standing rules only the owner changes, which every run obeys. Agent-made decisions live separately and can be overruled with evidence. | Terrarium's `owner-decisions.md`, read whole by every run; split in `4f233ce8d` |
| The agent's memory of open leads has a hard size limit that cannot be skipped. "Leave it shorter" alone did not hold. | Grew about 2.7× in 4 days until a test enforced a cap |
| A page that cites code never silently drifts from it: a stale citation fails verification. | Terrarium pins pages to a commit and checks them in `glassbox-pages.spec.ts` |
| Large mechanical diffs still get review, by an explicit threshold. | #2472, #2748 |
| Autonomous runs don't ask the owner for a focus. | 4 of 4 early runs asked |
| The guide explains the platform and grows with the site (owner). | Owner |

### 4.4 Visitor sweep

Evidence:

- The old design averaged $7.93 and 44 minutes a run, built its own fixes, and
  some were later removed (#2369).
- The new design takes 6 to 16 minutes and only reports.
- Footer, RSS and "start here" findings recurred on nearly every run.
- Dark mode was never covered.
- Two same-day runs duplicated each other.

| Requirement | Evidence |
|---|---|
| A finding is verified against source and the rendered page before it is reported. Text-dump artefacts are not findings. | SVG label text and an `aria-hidden` misread |
| Owner rulings, open issues, merged PRs and recent findings are checked before reporting. A repeat is attached to its earlier item. | Repeats on nearly every run; four missed prior fixes |
| Coverage is recorded: pages, viewports, colour scheme, persona. The next run's scope comes from that record, not the date. | Same-day duplicate; no coverage state |
| Visitors get the real route list, including pages a link crawl can't reach. | Journal digests behind expanders |
| Personas include task-directed, keyboard-only and returning visitors. | Gap |
| Each run has a page and screenshot budget and records its cost. | New runs' cost unrecorded |
| Findings hand off to the self-improvement sweep in the one shape every sweep uses, carrying where, what, evidence, the commit seen and whether it was verified. Ideas go to the idea input. | Owner; visitor runs carried url, lens, evidence, preview commit, verified, match |
| It builds nothing. | Owner; #2369 |

### 4.5 Digest

Covered in 2.3. It also needs a code review before landing, because it adds a
file. Review was skipped repeatedly (#2472).

### 4.6 Cost capture (open research)

Docs research (code.claude.com, read 2026-11-13; see
`costs.md`, `monitoring-usage.md`, `hooks.md`, `headless.md`, `routines.md`):

- **No hook payload carries cost or tokens.** Only a completed foreground
  subagent's result does.
- **No budget cap is documented for a platform-launched cloud run.** Hard caps
  exist only in a process you launch yourself (`claude -p --max-budget-usd`,
  the SDK's `maxBudgetUsd`).
- **OpenTelemetry export is documented for cloud sessions.** It reports cost
  and tokens per model and per subagent. It is configured outside the repo.
  Whether the last interval flushes before a short run ends is unverified.
- **Every in-client cost is a list-price estimate.** For a subscription the real
  limits are the usage windows.

Requirements:

| Requirement | Evidence |
|---|---|
| Every scheduled run records its cost and tokens, attributed to subagents, from a source the run does not have to query itself. | A run reading its own cost failed in 6 of 6 scheduled glassbox-curate runs, cause unverified. Reading a finished run's cost from another session worked 8 of 8 (#2987). Neither splits cost by subagent. |
| Every scheduled run has a per-run bound. Until a hard cap exists, bound work (items per run, agents, pages) and record overruns. | Curate's $25 cap was unenforceable |
| Cost views label the figure an estimate and show usage-window pressure for a subscription. | costs.md |

## 5. New needs

Read with BD §5. These requirements were missing or shallow there.

### 5.1 Setup

| Requirement | Evidence |
|---|---|
| Setup names up front each step only a human or a laptop session can do, and hands it over as a runnable checklist. These are the workflow file, rulesets, repo settings, deploy host, secrets and the cloud environment's setup script. | Proxy 403 on rulesets (session `01CF4k9j…`); workflow scope; deploy setup had 7 Frictions |
| It creates the issue labels and verifies them. | No create-label tool in cloud |
| It installs the Skill pack and pins it in one step. | Layout mismatch; wrong pins twice |
| It writes the repo docs that adapt installed Skills, including the rule that only triage sets a ready label. Two installed Skills say otherwise. | `triage-labels.md` |
| It records the autonomy preset as one value the merge step reads. | Owner: three presets |
| Branch protection is in place before the first agent PR. | `main` unprotected 2026-07-11 to 10-08 |
| Setup runs in a single-repo cloud session or a laptop session, because multi-repo sessions load no hooks, permissions or env. | Claude Code settings docs |

### 5.2 Platform, seed and site

| Requirement | Evidence |
|---|---|
| Every file has exactly one kind: platform, seed or site. Files that mix kinds are split, or the sync knows their sections. | Mixed: CLAUDE.md, settings, package scripts, glossary, pins next to site data |
| The list of platform paths is one file. | BD §5 |
| Site data (logs, problems, observations, content) never flows back. Back-flow selects by an allow-list, not a deny-list. | Owner |

### 5.3 Sync

| Requirement | Evidence |
|---|---|
| Sync records the template commit last taken. A repo made from a template has no shared history, so no PR or merge works between the two. | GitHub template docs |
| Taking updates opens a PR on the site that passes the site's verification. A partial sync fails verification. | Owner |
| Offering changes opens a PR on the template with only platform files. | Owner |
| Sync does its own checks, because a session with two repos attached runs without the repo's hooks. | Claude Code docs |
| Workflow-file changes in either direction go to a laptop or a human. | Section 1.3 |

### 5.4 Autonomy presets

Requirement: one value, chosen at setup, decides what agents may merge.

- The minimum is three presets.
- Each preset still refuses protected paths and requires the review verdict.
- Few protected paths exist at first.
- The preset is not a set of path risk tiers by another name (ADR-0004 rejected
  tiers).

## 6. Revised verdicts

Only rows that change. "Kept from BD" means the breakdown's verdict stands but
its "In the template" text needs the requirements in the named section.

| BD row | BD verdict | Revised | Section |
|---|---|---|---|
| `gate:scoped` (BD §1) | Drop | Drop the skipping; keep the run integrity | 1.1 |
| CI workflow (BD §1) | Simplify, no parity test | Kept from BD, with a named failing step, frozen install, wake-on-green and the workflow-push limit | 1.3 |
| Content validation (BD §1) | Replace or keep | Required on any stack | 1.2 |
| Mermaid (BD §1) | Later, via the Mermaid CLI | Later; the CLI is a rejected alternative | 3.2 |
| Self-updating container (BD §1) | Adapt | Kept from BD, plus retry and live-commit visibility | 1.5 |
| Render per request / prerender (BD §2) | Replace | Prerender, with browser-side navigation as an opt-in | 2.1 |
| Journal (BD §2) | Drop from core | Core, as the dashboard | 2.3 |
| Glass Box (BD §2) | Drop | A site guide, seeded and grown | 4.3 |
| Session-start hooks (BD §3) | Keep the install | Install and full history | 1.1 |
| Provenance guard (BD §3) | Simplify to one instruction | Keep a mechanism | 3.3 |
| Session-log scripts (BD §3) | One small script | Small, with the guarantees | 2.2 |
| Transcript-derived log half (BD §3) | Drop | Keep timings, models, tokens, tools, subagents; drop rule and doc reads | 2.2 |
| `merge-pr.ts` (BD §3) | Simplify | Simplify, keeping section 3.4 | 3.4 |
| `clear-backlog` (BD §3) | One serial command | Parallel, later version | 3.6 |
| Subagent dispatch, worktrees (BD §3) | Drop at first | Needed with parallel steering | 3.6 |
| Preview and screenshot (BD §3) | Simplify | Kept from BD, with section 3.5 | 3.5 |
| Installed Skill list (BD §3) | 11 named | Add `retro`, `wayfinder` and the pack's setup Skill; `implement`, `grill-with-docs` optional | 3.7, 3.8 |
| frictions-to-fixes, harvest, prune-trial (BD §4) | One retro / Drop / Drop | One self-improvement sweep | 4.2 |
| audit-skills (BD §4) | Drop | Watcher, core | 4.1 |
| audit-docs (BD §4) | Later | Core | 4.3 |
| visitor-loop (BD §4) | Later, optional | Keep, report only | 4.4 |
| digest (BD §4) | Drop | Core | 2.3 |
| glassbox-update and curate (BD §4) | Drop | Their job moves to docs upkeep | 4.3 |
| Where logs live (BD §3, §7) | Owner's choice | Replaced by the requirement in 2.2 | 2.2 |

## 7. Open items

1. **Stack** (BD §6). The browser-side navigation opt-in (2.1) and the content
   validation guarantees (1.2) are new inputs to that decision.
2. **Cost capture and budget for scheduled runs** (4.6): needs a test of
   OpenTelemetry from a scheduled cloud run.
3. **Agent identity** (3.3): a GitHub App or a second account. Research found
   two limits:
   - The cloud proxy blocks the endpoint that mints an App's token, so an App
     needs its token minted outside the session.
   - A machine user's token set as `GH_TOKEN` passes into the container. Whether
     pushes then show that identity is untested.

   GitHub's terms allow one free machine account per person (agent research,
   2026-11-13).
4. **The three autonomy presets**: their exact definitions.
5. **What the watcher checks mechanically and what it checks with an agent**
   (4.1).
6. **A pilot site** (BD §7 item 3). Sync is still the newest and least-tested
   part.

## 8. What is still unclear about the requirements

Ambiguities the writing agent could not settle. Each item says where an answer
probably lies:

- **Repo:** an agent can settle it from what is already recorded, and the item
  says what to look for.
- **Owner:** it is a choice only the owner can make.
- **Spike:** it needs a small experiment.

### Scope and audience

1. **What counts as one site.** Can one repo hold a site with distinct parts (a
   blog and a shop), or is a second part a second repo? This decides whether
   any of Terrarium's multi-part machinery returns in a smaller form.
   **Owner.**
2. **Who the stranger is.** "Usable by a stranger" (BD) and "no outside
   contributors" fit together only if a stranger runs their own site from the
   template and never contributes to the owner's. Is a stranger's improvement
   ever meant to reach the template (BD §7 item 5)? If not, back-flow (5.3) is
   for the owner's sites only. **Owner.**
3. **Public repos and strangers' issues.** A public site repo receives issues
   and comments from anyone, even with no contributors. Does the template need
   the "text from non-writers is data" rule (ADR-0020) from day one, or only
   when a site goes public? **Owner.**
4. **Who reads the guide.** The owner wants a Glass Box-like guide for a
   productive site. Is it written for the owner, for agents, or for a stranger
   adopting the template? Each reader needs a different depth and
   vocabulary. **Owner.**
5. **Expected volume.** Terrarium logged 576 sessions in a month. Several
   requirements exist because of that volume: bounded reads, output caps, a
   window anchored to the last run, capped parallel verification runs. A single site may
   see a tenth of it. Should those requirements hold from the start, or arrive
   when volume demands? **Owner.** Volume per site can then be measured from
   the first pilot's logs.

### Observability

6. **Which dashboard views the owner actually reads.** The logs show which views
   the owner asked for and changed (2.3), but nothing shows how often each is
   read. A view asked for once may not be worth carrying. **Owner.** No usage
   analytics exist in the repo.
7. **What "owner-only" must keep out.** Is it a login, a shared secret, a
   network restriction, or no access control because the repo is private
   anyway? And does "owner-only" also cover the logs in the repo itself, if the
   repo is public? **Owner.**
8. **A digest for a reader of one.** Terrarium's Digest was written for a public
   reader who "knows software but not this project". For an owner-only site,
   is a daily page still the right form, or would a summary the owner asks for
   be enough? The owner called the digest a must-have; its cadence and
   audience are not settled. **Owner.**
9. **Whether nit-level problems pay off.** 1,560 of 2,887 Terrarium Frictions in
   the month were nits (54%). The requirement says to report every problem, but
   the cost of writing and processing nits is real. **Repo:** check whether any
   Ledger cause that got a fix that held was first seen through nit-level
   occurrences. Look at the occurrence severities of the 41 entries that went
   quiet after their latest fix.
10. **What counts as "the session didn't notice".** The watcher's classes
    (4.1) come from a multi-Skill Platform. For a site with fewer Skills,
    which classes still occur is a guess. **Repo:** count the watcher's
    findings by class and by Skill in `layers/journal/content/current/skills/audit-skills.yml`,
    and see which Skills a template would keep.
11. **Cost as a measure.** Every in-client figure is a list-price estimate. On
    a subscription, usage windows are the real limit. Should the owner's cost
    views show dollars, share of the usage window, or both? **Owner.**

### Working model

12. **What the first version of parallel steering includes.** The owner wants
    it "at least in a later version". The 3.6 table splits it into a minimal
    version and later parts, but whether the template's first release ships
    any of it is open. **Owner.**
13. **What the three autonomy presets allow.** Only "three, picked at setup"
    is settled. Candidate axes: who merges agent PRs, whether scheduled runs
    may self-merge, whether the self-improvement sweep may fix its own Skills,
    and whether the protected-path list is empty, small or large. **Owner.**
    ADR-0004's human-merge cases are a starting list (`.claude/rules/adr-0004-human-merge.md`).
14. **The first protected paths.** "Very few at first", but which? Likely the
    verification definition, the merge rule, hook wiring and the autonomy value
    itself. **Repo:** the 21 globs in `.claude/rules/adr-0004-human-merge.md`
    minus the multi-Tenant ones give a candidate list. **Owner:** to confirm.
15. **Who may declare a cause "accepted".** Accepted is a terminal state
    (R0.4), but the requirement does not say who decides it. **Repo:** read
    the PRs that set `status: accepted` on the 14 accepted Ledger entries and
    see whether each cites an owner decision.
16. **Whether prune trials survive in any form.** No trial verdict ever
    restored text, and silence is a weak signal (4.2). Keep "cut before you
    add" as a principle only, or keep trials as a step? **Owner**, informed by
    a repo check: did any trial's cut text get re-added later by an ordinary
    PR? Search `git log -S` on cut phrases.
17. **Does review cover owner-written commits?** The owner waived review for
    a docs-only commit in this research's own predecessor session. Is the
    waiver per commit, or a standing rule for some kinds of change? **Owner.**
18. **Laptop parity.** A laptop session has no PR-activity subscription, a
    different identity path and full hook support. Which requirements must
    hold identically on a laptop, and which may degrade (e.g. the owner
    watches CI)? **Owner.** **Repo:** local sessions' logs (raw UUID ids)
    show what broke there.
19. **Model choice.** Clear-backlog builders run on a cheaper model while
    reviewers keep the default (#3110). Is model choice per role a template
    requirement, or a per-site setting? **Owner.**

### Content and runtime

20. **What "snappy" means.** The owner wants browser-side navigation for its
    feel. No benchmark exists, and Astro's router swaps fetched HTML where a
    single-page app fetches less. Is "as fast as Terrarium today" the bar?
    **Spike:** the same three-page site in both stacks, timed on a phone.
21. **Which content rules a site needs.** Terrarium's cross-reference checks
    were per Tenant. A site's own rules are unknown until it has content. Is
    "a site adds its rules as unit tests" (BD §1) enough, or should the
    template ship a few common ones (broken internal links, missing images)?
    **Owner.**
22. **Diagrams.** Mermaid is "Later", and ADR-0024 rejected the standard CLI.
    Does an owner's site need diagrams at all? **Owner.**
23. **Accessibility.** The breakdown notes that no automated accessibility
    check exists. Is one a requirement for the template, or a later item?
    **Owner.**
24. **In-character content Skills.** Blog Personas, fact-checked posts and
    curated catalogues were Tenant features. Does a productive site want any
    of them (e.g. a fact-checked blog post Skill)? **Owner.** **Repo:**
    blog-post's fact-check rules are the transferable part.

### Data, deploy and security

25. **How long logs live.** Logs only grow, and Terrarium splits them into
    current and archived. Is there a retention limit, or does the archive
    keep everything? **Owner.** **Repo:** the archive size and the read caps
    show what history costs.
26. **Dependency updates.** Terrarium lets agents merge minor and patch bumps
    and leaves majors to a person (ADR-0004). Does a site keep that rule, and
    does it want an update sweep from day one? **Owner.**
27. **Secrets and security review.** Deploy credentials and API keys exist,
    but no requirement covers a security review of changes. Is that wanted,
    perhaps for server routes, which the owner merges (BD §2)? **Owner.**
28. **What "merge is deploy" means without a container.** The requirement
    (1.5) is host-neutral, but some hosts build from a push and some from a
    tag. Is a merge always a deploy, or may a site hold deploys back separately?
    **Owner.**

### Evidence quality

29. **How solid the fix-durability figures are.** They count any later
    occurrence as a failure, nits included, at day granularity, and recent
    fixes have had little time to be tested. **Repo:** re-run the analysis
    excluding nits and fixes younger than 7 days.
30. **Counts this document did not re-run.** Only the Routine costs, the
    Ledger size and the audit-docs run count were re-checked. **Repo:** any
    count used in a later decision should be re-run from its cited command.
