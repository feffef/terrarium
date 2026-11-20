---
name: audit-skills
description: Check that our own Skills fire when they should and deliver what they promise, collect usage statistics for every Skill, and keep the Skill Inventory in line with that evidence.
disable-model-invocation: true
---

# Audit Skills

The goal is to know whether the Platform's own Skills are doing their job. It
aims at two gaps that frictions never reveal:

- **Silent failure**: a Skill runs, nothing complains, and it still does not
  deliver what its `SKILL.md` promises.
- **Missed invocation**: a model-invoked Skill (such as `close-session`) was
  needed but never fired.

Keeping the **Skill Inventory** (`layers/journal/content/current/skills/`) in
line with real usage is a by-product of the same evidence.

This Skill writes only Inventory `.yml` entries, Routine run costs and GitHub
issues (ADR-0015).

## 1. Gather the scorecard

```
mkdir -p <dir>
pnpm exec tsx scripts/session/audit-skills.ts --briefs <dir> > <dir>/scorecard.json
```

It prints JSON for the last 7 days of session logs (`--days N` widens or
narrows that) and writes one data file per `behaviourChecks` entry to `<dir>`.
Step 5 reads `scorecard.json` back.
The `Scorecard` type in `scripts/session/audit-skills.ts` documents every
field.

Then dispatch one Sonnet subagent to call `get_session` (claude-code-remote
MCP) on every `routineRuns` session its Routine file (step 5) doesn't list
yet, so the raw responses stay out of your context. It writes
`<dir>/usage.jsonl`, one JSON line per run: `session`, `input_tokens`,
`output_tokens`, `cache_read_tokens`, `cache_write_tokens` and `cost_usd` as
the API gives them.

Done when you hold the scorecard and the usage of each of those sessions.

## 2. Check behaviour — one subagent per Skill in `behaviourChecks`

Grade a run against the Skill as it was when the run started. The scorecard's
`changes` lists what landed in the Skill's folder or scripts during the window
(the CLI warns when it is non-empty). If it is empty, use the files on disk.
Otherwise the data file dates each change; for a run whose `startedAt` precedes
a change, use the earlier text (`git show <sha>^:<path>`): a fix the run never
saw is untested, not broken (#1479, #1515).

Dispatch one read-only Sonnet subagent (`model: sonnet`) per Skill, all in one
message. Each brief is [`brief.md`](brief.md) plus the path of the Skill's
file from step 1's `<dir>`.

Check each finding against the source it cites before you use it. One that
holds up in part but not enough to act on is **unverified**: it goes into the
Skill's `observations` (step 5), so a later run can build on it.

Check each subagent's idea for **feasibility** (can it be built with what
exists, and does the evidence justify it) and **simplicity** (it removes or
replaces more than it adds, and needs no new moving part). Drop one that fails
with a one-line reason; keep the rest, each tagged with its Skill, for step 5's ideas.

Done when every subagent has reported, each finding is verified, unverified
or dropped, and each idea is kept or dropped.

## 3. Check closure completeness

These mechanical signals cover `close-session`'s missed invocations. They are
the measure ADR-0009 uses to decide whether to widen its reminder hook.

- `orphanedSessions`: sessions that merged a PR or filed an issue, updated
  within the window (`orphanScan.since`), but never logged. File each one the
  day it appears: older ones are not rescanned.
  Read `orphanScan` first. `scanned: false` means nothing was looked at, so
  report the orphan check as inconclusive with its `reason`, not as zero
  orphans.
- `orphanSuppressionLog`: every orphan candidate a suppression acted on. `[]`
  is healthy. A `misfile-cleanup` whose `path` is not plausibly that
  session's own log is a finding.
- `humanPromptedClosures` and `manuallyRescuedClosures`: sessions that logged
  only after a human nudged them.

An entry carrying `resolvedBy` is already tracked there, so leave it alone.

Done when every signal is either a finding or cleared.

## 4. Escalate what matters

A verified finding becomes an issue only when the misbehaviour is
**significant** (it did real damage) or **repeated** (an earlier observation
already records the same thing). Every other finding is an observation
(step 5), which is how a later run sees it repeat. A closure finding belongs
to `close-session`'s observations.

First, check the Skill a finding is about (not the one you audit) against
`skills-lock.json`. An installed Skill's `SKILL.md` is not ours: its finding is an
observation for its Inventory entry (step 5), never an issue or comment.

For each other finding that clears that bar:

- Search open issues first: the session id for a closure finding,
  `audit-skills <skill>` for a Skill finding.
- **Match found**: comment with only the evidence the thread does not
  already cite. A concern that recurs across runs belongs on one thread. A comment
  that adds a significant fact the thread lacks also sets `needs-triage`.
- **No match**: file one `needs-triage` issue (`docs/agents/issue-tracker.md`'s
  "Filing an issue") naming the Skill (or session), whether it is a silent
  failure or a missed invocation, the session ids, the quoted evidence,
  promised against delivered, and your hypothesis. A closed issue on the same
  finding is no match: name it in the new issue.
- **Human-nudged closures** go on one standing thread per trend, never one
  issue per session.

Before posting an issue or comment, run
`pnpm exec tsx .agents/skills/audit-skills/scripts/check-states.ts --text <body file>`:
every issue or PR state it writes must match GitHub now; reword a flag that
misreads ordinary prose (#1627, #1720).

Done when every finding is either an issue (filed or commented on) or headed
for step 5 as an observation.

## 5. Tune the Inventory

Grade each Skill's importance by the definitions below, after reading its
`observations`: earlier runs' evidence counts alongside this window's.

- **essential**: essential and broad; its absence would be felt across many
  kinds of session (e.g. `log-session`, `domain-modeling`).
- **routine**: it *is* a scheduled Routine's job, driving whole unattended
  sessions (e.g. `digest`, `audit-docs`). Assign it on the observed fact that
  scheduled sessions run it; a Skill invoked by hand is not `routine`.
- **specialist**: essential within one kind of work, even a rare one (e.g.
  `atlas-specimen`).
- **supporting**: useful, but work proceeds without it.
- **peripheral**: marginal or superseded; little pull even where it applied.

- **A Routine can stop.** Its timer can be paused or removed with no commit,
  and we cannot read it. A Routine file with earlier runs and none in the
  window is a possible stop, not a failure: file no issue, add an unverified
  observation, reword a `role` that says it is scheduled, and regrade by this
  list. If nothing uses the Skill any more, record a retirement idea (below).
  The reverse holds: a hand-run Skill that scheduled sessions now run becomes
  `routine`.
- **Grade on felt absence, not counts.** Read each Skill's `mentionedIn`
  logs for where it **caught** something or where **skipping it cost**
  something; `humanInvokedIn` is a human reaching for it. These are the
  evidence, installed Skills included.
- **A grade change needs ≥2 windowed sessions as evidence**, in either
  direction, and those session ids are cited.
- **A Skill that runs another takes the credit** (`grill-with-docs` runs
  `grilling`); grade the inner Skill on its standalone uses.
- **A missed invocation of an own Skill is a trigger problem**: step 4's
  issue, not a demotion. For an installed Skill, whose trigger we cannot fix, the
  grade is the lever.
- **`gist` and `role`** describe the Skill as it works today. Take each
  subagent's role/gist verdict and rewrite what it calls stale; a Skill with
  `changes` but no behaviour check gets no verdict, so leave its gist and role
  unless the runs show otherwise. Also rewrite them when the runs show a regular
  behaviour the text doesn't state, or contradict a claim in it. `role` stays
  ≤ ~50 words and free of PR, issue or session ids; the scorecard prints it.
- **`watchFor`** is the owner's checklist for a Skill; never edit it. When
  the subagent graded its items, start that Skill's observation note with one
  verdict per item (held, failed or couldn't tell). A failed item escalates
  under step 4's usual bar; one an earlier note already records as failed is
  repeated. Suggest retiring an item, as the Skill's idea, when
  it held in every run it was graded on across the window.
- **`observations`** hold a 40-day window of history. Append
  `{ date: <today, UTC>, note }` for a grade or role change, a finding
  (verified or unverified, say which) or an idea, or a clean check (name the
  run ids covered).
  Write the note fresh, 300–500 words, so a reader who has not seen the runs
  can follow it: what the audited runs did against what the `SKILL.md`
  promises, which runs and sources the audit read and what it verified or
  couldn't tell, the key evidence quoted with its ids (PRs, issues, sessions,
  commits), and the reasoning behind the verdict, grade or idea. Then run
  `pnpm exec tsx .agents/skills/audit-skills/scripts/prune-observations.ts`,
  which removes entries past that window (git keeps the history) and prints
  what it removed.
- **`auditSummary`** `{ date: <today, UTC>, text }` is the line the Skills page
  shows for each Skill: two plain sentences (about 40 words, no ids or jargon)
  giving the overall picture from all its `observations` and this window's runs,
  not only the latest: how well it does what its `role` says, and where it falls
  short. Weigh repeated, verified findings above single or unverified ones. Use
  words a site reader knows, and no counts unless one is the evidence. Replace it for every Skill with runs in
  the window; leave it for one with none, so its `date` ages and the page dims it.
- **Routine runs**: run
  `pnpm exec tsx scripts/session/prune-routine-runs.ts --append <dir>/usage.jsonl --scorecard <dir>/scorecard.json`.
  It appends each step 1 run to its Routine's file, prunes old rows and
  reports what it appended, skipped and dropped.
- **Coverage gaps**: create an entry for a Skill that is used but not
  inventoried (`category` is `general-engineering` for an installed Skill,
  `platform-operation` for our own). Propose removing an entry whose Skill is
  gone from disk, unless it is a built-in CLI Skill, which you flag instead.
- **Ideas**: record each idea that passed step 2's filter, and any new Skill,
  split or retirement the evidence suggests, as this run's session-log `ideas`
  entry, concrete enough to file as an issue, and never act on it.

Done when every entry's grade and `role` match the evidence. Step 6 checks the
issue and PR states your notes write.

## 6. Land the Inventory PR

If step 5 changed nothing, there is no PR. Otherwise run
`pnpm exec tsx .agents/skills/audit-skills/scripts/check-states.ts` (no `--text`:
it checks the diff) and fix what it flags, as in step 4. Then follow
`docs/agents/pr-workflow.md`'s "Closing a scheduled run's PR". The diff touches
only `layers/journal/content/current/skills/*.yml` and `routines/*.yml`; every
grade change cites its ≥2 sessions. Anything else in the diff means you leave
the PR open for a human.

Invoke `close-session`, with the step 3
results (`orphanScan` included) in the log's summary.
