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

## Owner decisions taken while this was written

These revise the breakdown's starting point (BD "What the owner settled first"):

- **Parallel steering stays.** Several issues are worked at once in isolated
  branches, steered by one round of owner questions. It may come after a first
  version, but the design must allow it. This reverses BD §3 "one session at a
  time".
- **Observability is a must-have.** That covers a Journal-style view of
  sessions, Frictions, Skill and Routine state and cost, plus a Digest. It is
  owner-only by default, and a demo site may make it public. This reverses
  BD §2 "Journal: Drop from the core" and BD §4 "digest: Drop".
- **A watcher must catch what sessions don't notice about themselves.** This
  reverses BD §4 "audit-skills: Drop".
- **Docs upkeep runs autonomously and the owner can steer it.** Audit-docs is
  core, because it keeps finding what review missed. A productive site gets a
  guide that explains the platform, seeded from the template and grown with the
  site. This reverses BD §4 "audit-docs: Later" and BD §2 "Glass Box: Drop".
- **The visitor loop stays, improved:** good signal and coverage, and it reports
  findings rather than building fixes. The owner found its autonomous fixes
  uncontrolled and often reverted them (#2369).
- **One self-improvement loop** takes every finding source and turns it into
  issues or fixes. Today several separate loops do this.
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
- **Second round (seven agents):** docs upkeep, the visitor loop, the
  self-improvement loops, the watcher and observability, the merge chain under
  cloud limits, parallel steering in practice, setup and template sync.
- **One docs-research agent:** cost capture for scheduled runs.
- **Re-checked by the writing agent:** the Routine cost totals
  (`layers/journal/content/current/routines/*.yml`), the 133 Ledger entries and
  the 119 audit-docs runs. Every other count is a subagent's, from its cited
  command or file, and was not re-run.

## The finding behind most of this

Prose fixes fail; mechanisms and refusals hold. Across 220 recorded fixes to
Friction causes:

| Kind of fix | Held |
|---|---|
| Script or guard | 65% |
| Skill step | 60% |
| CLAUDE.md line | 50% |

- A first fix held about two times in three.
- A second or later fix on the same cause usually failed: 13 of 24 and 15 of
  31 causes kept recurring.
- Causes that no fix retires end as *accepted*. 12 did, including the
  103-occurrence late reading of docs.

The history shows the same pattern one topic at a time:

- **Provenance:** four prose passes failed before a block held (#387, #605,
  #628, #723, #788).
- **Unshallowing:** four prose rounds before a hook held (#413 to #772).
- **Merge-before-review:** prose failed until the merge refused (#1113 to
  #1276).
- **Closure:** a dozen rounds before a refusal and a stop hook (#1801 to
  #2956).

Requirements for the template:

- **R0.1** The template must expect each recurring failure to come back after a
  prose fix, and must have a place to put a mechanism instead.
- **R0.2** The self-improvement loop must send a cause that regressed after its
  fix to the owner. It must not add more prose.
- **R0.3** "Accepted cost" must be a legitimate end state that is never
  re-proposed.

## 1. Build time

Read with BD §1. The breakdown's gate row is right; what it misses is what the
gate must guarantee.

### 1.1 The gate

| Requirement | Evidence | Revises |
|---|---|---|
| A pass must vouch for the exact tree that is pushed. If the tree or HEAD changes during a run, the run aborts or warns. This holds for a full gate too, not only a scoped one. | `edit-during-gate-run`, 31 occurrences in 14 days, about 10 minutes lost per slip (#3046) | BD §1 "gate:scoped … Drop" |
| One definition of the gate, run the same way locally and in CI. CI installs from the frozen lockfile and names the failing step. | ADR-0026: a check landed in the package script while CI waited. A single opaque CI step hid which check failed. | BD §1 "one workflow … no parity test" |
| Any decision drawn from git history fails closed on a shallow or unknown base. A session starts with full history. | #849: a shallow merge-base hid changed files; four prose rounds (#413 to #772) | BD §3 hooks "Keep the install" |
| Stale dependencies are detected and reinstalled before the gate trusts a failure. | Stale installs read exactly like real breaks (#445, #923) | none |
| Review runs before the gate; nothing is edited while the gate runs. | `prepush-gate-review-skipped`, 21 occurrences | none |

### 1.2 Content validation

Validation is needed whatever the stack. The stack only decides how much of it
comes built in.

| Requirement | Evidence |
|---|---|
| Every content file is checked against its schema before merge. A build that passes invalid content is not a check. | #133: the build published an out-of-enum value |
| Silent truncation in YAML (an unquoted `#`) and silently degraded component blocks are caught. | #367, #446 |
| A folded line ending in a hyphen is caught, because it turns one word into two. | Commit `bec068280` |
| References between content files are checked. | #446 |
| A fast local check (seconds) exists beside the full gate. | Owner, #133 |

### 1.3 CI under cloud limits

| Requirement | Evidence |
|---|---|
| A cloud session must never put a workflow-file change in a push, because the whole push is rejected and every commit in it is stranded. | #897, #1955; sessions `01FnZ4zF…` (major), `011xN2Zi…` |
| The workflow file stays minimal and stable, so changing the gate never means editing it. Its logic lives where a cloud session may push. | ADR-0026. The composite action waited 8 weeks for a human to apply the shell. |
| A drop zone exists for changes only a human or laptop session can apply, with a rule that both halves land in one sitting. | `docs/proposals/README.md`; PR 90 could never go green |
| A green CI run must wake the session that waits on it. Success is not delivered natively; only comments and failures are. | #278. A Routine stalled for about 2 hours before this existed (session `01DN8mXo…`). |

### 1.4 Installed Skills

| Requirement | Evidence |
|---|---|
| Every installed Skill is pinned at install time, and the gate fails on drift. Not only once a Skill is first used. | PR #304 patched an installed Skill unnoticed. A Skill with no record went unchecked (ADR-0015). |
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
- They can be shown on a Journal-style page.
- Writing one is quick and painless.

Under those three, these must hold:

| Requirement | Evidence |
|---|---|
| Every substantive session lands a log without the owner asking. | 4 `HUMAN-PROMPTED-CLOSURE` cases in a month; owner-filed #2956 |
| The agent writes only the judgement half: goal, outcome, Frictions, ideas, who asked. Machine facts come from the machine. | Agents misreport facts the transcript records exactly (ADR-0009) |
| The session id is never typed by the agent. | `session-id-hand-typed`, 18 occurrences |
| Landing is idempotent. A second landing never clobbers the authored half. | #688 |
| A log is updated at merge, so no view shows "in review" for merged work. | 11 sessions authored `completed` before re-closing. The stale `in-review` view, #2884. |
| A failed landing is loud, never hidden by filtered output. | An agent told the owner a refused log had landed |
| A log written by a branch whose schema is newer than the shared one is still valid or held, never lost. | #3073 |
| A log's text survives the container being reclaimed. | #449 |
| Timestamps are UTC, and a day is cut by the session's end. | #1478 |
| Each Friction carries a severity graded by what it cost, and the agent reports every one, however small. | session-logs lesson; severity scale |

### 2.3 What the owner must see

Owner-requested views, from session logs:

| View | Evidence |
|---|---|
| Session feed: goal, status, outcome, kind, PRs, Friction counts, time, models | `SessionCard` |
| Friction Ledger: one entry per cause, a time window (default 7 days), fix state derived from later occurrences | `01RDtAc5…`, `011W3gVN…`, `013zxzeSai…` |
| Routine cost per run and per week, labelled as a list-price estimate | `01TwTc2v…`, `013zxzeQ93…` |
| Subagent share of tokens and run time on each session | `012rLVzS…`, `013zxzeSB…` |
| KPI tiles: sessions by kind, Frictions by severity, Routine spend, suggestions, Skills | `013zxzeR2k…` (ten acceptance criteria) |
| Skill state: role, graded importance, use count | ADR-0015 |
| A daily Digest | `013zxzeNC…`, `013zxzeQ697…` |
| Ideas and learnings | `harvest` input |

Requirements:

| Requirement | Evidence |
|---|---|
| Views derive from the logs; logs are never regenerated from repo state. | ADR-0008 |
| Every read is bounded: newest first, a cap, and a total count. A view that grows with history is a defect. | The landing passed 10 MB uncapped. `skills.vue` still reads every session. |
| Fix state, "stale in review" and Routine silence are derived, never stored. | `ledger.ts`, `dashboard.ts` |
| A cost that could not be read is shown as "unreported", never guessed. | `get-session-cost-unreported`, 7 occurrences |
| A Routine with no run in two cadences shows as possibly stopped. | visitor-loop: no scheduled run since 2026-11-03, noticed 10 days later |
| The Digest is fact-checked against the merged diffs, and a cadence word ("weekly") needs a source. | The checker caught wrong claims in every first draft; invented "weekly" in the 2026-11-08 Digest |
| The Digest is landed once and never rewritten. | ADR-0010 |
| A new log or run row shows with no page edit. | ADR-0008 |

## 3. Interactive sessions

Read with BD §3.

### 3.1 Guidance that must survive the cut

The breakdown shrinks CLAUDE.md to "a fraction" without naming what stays. Each
of these lines answers a recurring Friction:

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
| Merge only after the gate is green and a review verdict names this exact head. | #1113 to #1276; #1840 merged unreviewed 3 minutes after opening |
| The verdict's commit id is machine-produced, never typed. | #2833: 16 wrong before the fix, 5 after |
| The merge is pinned to the reviewed head, so a late push fails the merge instead of landing unreviewed. | merge-pr body; #1761 |
| No platform auto-merge: it cannot pin the head, and the owner's own pushes don't disarm it. | #385, #667, #1761 |
| Protected paths are read from the shared branch, so a PR can't shrink its own list. The check counts both sides of a rename and fails closed. | Protected-paths lesson; rename fix `6794317d5` |
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
| One fresh review round (standards and spec) per non-simple branch. Nits never block. A simple diff gets one reviewer or a self-read. | Real catches came in round 1 and sometimes round 2; round 3 found only nits; the two reviewers duplicated each other on small diffs |
| Fixes go back to the builder. Re-check only what was touched, with a hard stop. | After #3119 every re-check was clean |
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
| Parallel heavy gates are capped by memory. | Exit 137 above two (#1800) |

Still open in Terrarium: the agent still forgets to log again after a merge (18
sessions), and stranded worktrees at close were fixed only on 2026-11-13. A
template must treat both as unsolved, not copy them as working.

## 4. Routines and loops

Read with BD §4. Re-checked cost of the newest 30 runs per Routine, about one
month:

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
- a Routine that stopped.

| Requirement | Evidence |
|---|---|
| It runs on a schedule, independent of any session noticing. | The sessions' own Frictions never showed these classes |
| It grades a run against the Skill text in effect when the run started. | #1479, #1515 |
| It checks every issue or PR state it writes against GitHub. | #1627, #1720 |
| It verifies each subagent finding against its source. | An invented quote; unresolvable commit ids |
| It files an issue only when a finding is significant or repeated. It comments on an open thread, and knows what to do when that thread is closed. | `audit-skills-repeat-after-closed-issue` |
| An inconclusive scan reports as inconclusive, not as zero. | Orphan scan blocked by a 403 (#1514) |
| A possible Routine stop is an observation, not a failure, but it is surfaced. | visitor-loop 2026-11-13 |
| Its output is bounded. | A 56 to 478 KB scorecard |
| It shows its own cost. Agent checks run only for Skills whose text or runs changed; mechanical checks need no agent. | About two thirds of its tokens go to per-Skill agents |

### 4.2 One self-improvement loop

Inputs: Frictions, ideas and learnings, watcher findings, audit-docs findings,
visitor findings, and a single-session retro.

| Requirement | Evidence |
|---|---|
| One store keyed by root cause, with fixes and status. "Worked" is derived from later occurrences, never recorded by hand. | 93 of 133 Ledger entries carry fixes |
| One dedupe step for every input: open and closed issues, settled decisions, accepted causes, open trials. A title match is only a hint. | The open-issue check is repeated in four loops; "settled decisions" live in three places |
| The input window starts from the last run, with a margin and a per-entry "taken" mark. | Missed runs lost no logs |
| It fixes only on a safe surface, through a reviewed and gated PR, and prefers a deletion. | ADR-0027; prose fixes fail (section 0) |
| It never edits installed Skills, ADRs, guards or settings itself; those become issues. | frictions-to-fixes §7 |
| A regression goes to the owner, naming the earlier fix. | R0.2 |
| Its work per run is capped, and large inputs stay out of its context. | harvest read 62k tokens and checked only 17 clusters |
| Text is copied by script, never retyped. | `ledger-yaml-hand-edit-errors`: 7 fixes |
| One report per run, every number sourced or marked unverified, and every dropped item with its reason. | #3143 rules |
| Its own briefs are a Friction source to watch. | Five of the seven 7-fix Ledger entries are its own briefs |
| A cut instruction may stand as a trial judged later. Silence is a weak signal. | No trial verdict ever restored text; one rate-based issue (#2784) |
| Model and Routine can both invoke it. | #1018 |

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
| The owner steers through a hard-rules file that only the owner edits and every run reads whole. Agent-made decisions live separately and can be overruled with evidence. | `owner-decisions.md`; split in `4f233ce8d` |
| The agent's memory of open leads has a hard size cap enforced by a test. "Leave it shorter" alone did not hold. | Grew about 2.7× in 4 days before the cap |
| Pages that cite code are pinned to a commit, and a test fails on a stale pin or excerpt. | `glassbox-pages.spec.ts` |
| Large mechanical diffs still get review, by an explicit threshold. | #2472, #2748 |
| Autonomous runs don't ask the owner for a focus. | 4 of 4 early runs asked |
| The guide explains the platform and grows with the site (owner). | Owner |

### 4.4 Visitor loop

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
| Findings hand off to the self-improvement loop with a fixed set of fields: url, lens, evidence, preview commit, verified, match. Ideas go to the idea input. | Owner |
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
| Every scheduled run records its cost and tokens, attributed to subagents, from a source the run does not have to query itself. | `get_session` unavailable in scheduled runs (#2987) |
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
| Site data (logs, Frictions, observations, content) never flows back. Back-flow selects by an allow-list, not a deny-list. | Owner |

### 5.3 Sync

| Requirement | Evidence |
|---|---|
| Sync records the template commit last taken. A repo made from a template has no shared history, so no PR or merge works between the two. | GitHub template docs |
| Taking updates opens a PR on the site that passes the site's gate. A partial sync fails the gate. | Owner |
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
| Journal (BD §2) | Drop from core | Core | 2.3 |
| Glass Box (BD §2) | Drop | A site guide, seeded and grown | 4.3 |
| Session-start hooks (BD §3) | Keep the install | Install and full history | 1.1 |
| Provenance guard (BD §3) | Simplify to one instruction | Keep a mechanism | 3.3 |
| Session-log scripts (BD §3) | One small script | Small, with the guarantees | 2.2 |
| Transcript-derived log half (BD §3) | Drop | Keep timings, models, tokens, tools, subagents; drop rule and doc reads | 2.2 |
| `merge-pr.ts` (BD §3) | Simplify | Simplify, keeping section 3.4 | 3.4 |
| `clear-backlog` (BD §3) | One serial command | Parallel, later version | 3.6 |
| Subagent dispatch, worktrees (BD §3) | Drop at first | Needed with parallel steering | 3.6 |
| Preview and screenshot (BD §3) | Simplify | Kept from BD, with section 3.5 | 3.5 |
| Installed Skill list (BD §3) | 11 named | Add `retro` and the pack's setup Skill; `wayfinder`, `implement`, `grill-with-docs` optional | 1.4 |
| frictions-to-fixes, harvest, prune-trial (BD §4) | One retro / Drop / Drop | One self-improvement loop | 4.2 |
| audit-skills (BD §4) | Drop | Watcher, core | 4.1 |
| audit-docs (BD §4) | Later | Core | 4.3 |
| visitor-loop (BD §4) | Later, optional | Keep, report only | 4.4 |
| digest (BD §4) | Drop | Core | 2.3 |
| glassbox-update and curate (BD §4) | Drop | Their job moves to docs upkeep | 4.3 |
| "Logs on their own branch" (BD §3, §7) | Owner's choice | Replaced by the requirement in 2.2 | 2.2 |

## 7. Open items

1. **Stack** (BD §6). The browser-side navigation opt-in (2.1) and the content
   validation guarantees (1.2) are new inputs to that decision.
2. **Cost capture and budget for scheduled runs** (4.6): needs a test of
   OpenTelemetry from a cloud Routine.
3. **Agent identity** (3.3): a GitHub App or a second account; needs a probe of
   what the cloud proxy allows.
4. **The three autonomy presets**: their exact definitions.
5. **What the watcher checks mechanically and what it checks with an agent**
   (4.1).
6. **A pilot site** (BD §7 item 3). Sync is still the newest and least-tested
   part.
