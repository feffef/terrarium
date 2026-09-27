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

This Skill writes only Inventory `.yml` entries and GitHub issues. Changing a
Skill's text is a judgement call, so a finding becomes an issue for a human
(ADR-0015). **Simplify first** (CLAUDE.md) governs every edit.

## 1. Get on a working branch

Follow CLAUDE.md's branch rule.

## 2. Gather the scorecard

```
pnpm exec tsx scripts/audit-skills.ts
```

It prints JSON for the last 7 days of session logs (`--days N` widens or
narrows that). The `Scorecard` type in `scripts/audit-skills.ts` documents
every field. You will use:

- `skills[]`: usage statistics for every Skill, own and pack (`useCount`,
  `usedIn`, `allTimeUses`, `lastUsed`), plus `modelInvoked`, its Inventory
  grade and `role`, and the `observations` earlier runs left. Read those
  observations before judging.
- `behaviourChecks`: the own Skills used often enough to check in step 3.
- `window[]`: every windowed session with its log `file`, `kind`, `goal` and
  `skillsUsed`.
- The closure signals for step 4.

Done when you hold the scorecard.

## 3. Check behaviour — one subagent per Skill in `behaviourChecks`

Dispatch one read-only subagent per Skill, all in parallel. Each brief names
the Skill's `SKILL.md`, the log files of the sessions in its `usedIn` (newest
10), its `observations`, and asks for this:

> Work out from the `SKILL.md` what a run must deliver: its outcome and each
> step's completion criterion. For each session, check against primary sources
> whether it delivered. Start from the log's outcome, summary, `prs` and files
> edited, then confirm on GitHub or in git that the PR, commit, issue or file
> is really there and says what the Skill promised. A promise the runs keep
> breaking, a step that silently never happens, or an outcome the log claims
> but that never landed is a finding, whether or not anyone logged a friction.
> Prior observations tell you what is already known.
>
> If the Skill is model-invoked, also scan `window[]` for sessions that did
> not use it but whose work matches the case its `description` says it covers.
> Judge from the goal first, then open the log. Each such session is a finding.
>
> Report every finding with its session ids, quoted evidence, what the Skill
> promised against what happened, and your best guess at why. If there are
> none, say how many sessions you checked.

A subagent's report is hearsay until you have verified it (CLAUDE.md). Check
each finding against the source it cites before you use it.

Done when every subagent has reported and each finding is either verified or
dropped.

## 4. Check closure completeness

These mechanical signals cover `close-session`'s missed-invocation gap:

- `orphanedSessions`: sessions that shipped a merged PR but never logged.
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

## 5. File or comment on issues

Handle each verified finding from step 3 and each finding from step 4 this way:

- Search open issues first: the session id for a closure finding,
  `audit-skills <skill>` for a Skill finding.
- **Match found**: comment with only the evidence the thread does not
  already cite. A concern that recurs across runs belongs on one thread.
- **No match**: file one `needs-triage` issue naming the Skill (or session),
  the session ids, the quoted evidence, promised against delivered, and your
  hypothesis.
- **Human-nudged closures** go on one standing thread per trend, never one
  issue per session.

Pack Skills get no issues. Their `SKILL.md` is not ours (ADR-0015), so their
only lever is the Inventory entry.

Done when every finding has an issue filed or commented on.

## 6. Tune the Inventory

`importance` is conditional essentialness, never raw frequency. The grades
are defined in `CONTEXT.md` (`### Importance`), so read them there.

- **Rarity alone never lowers a grade.** A Skill unused because its kind of
  work did not occur keeps its grade.
- **`routine`** is observable: the grade holds while scheduled, unattended
  sessions run the Skill.
- **A grade change needs ≥2 windowed sessions as evidence**, in either
  direction, and those session ids are cited.
- **A missed invocation of an own Skill is a trigger problem**: step 5's
  issue, not a demotion. For a pack Skill, whose trigger we cannot fix, the
  grade is the lever.
- **`role`** stays ≤ ~50 words and free of PR, issue or session ids. Refresh
  it when usage contradicts it.
- **`observations`**: append `{ date: <today, UTC>, note: <citations> }` for
  every grade or role change, verified finding, or idea. Never edit or drop an
  earlier entry. A Skill with nothing new gets no entry.
- **Coverage gaps**: create an entry for a Skill that is used but not
  inventoried (`category` is `general-engineering` for a pack Skill,
  `platform-operation` for our own). Propose removing an entry whose Skill is
  gone from disk, unless it is a built-in CLI Skill, which you flag instead.
- **Ideas**: when the evidence suggests a new Skill, a split or a
  retirement, record it as this run's session-log `ideas` entry and never act
  on it (ADR-0003).

Done when every entry's grade and `role` match the evidence.

## 7. Land the Inventory PR

If step 6 changed nothing, there is no PR. Otherwise follow
`docs/agents/pr-workflow.md`'s "Closing a self-merged chartered run". The
diff touches only `layers/journal/content/current/skills/*.yml`, and every
grade change cites its ≥2 sessions. Anything else in the diff means you
leave the PR open for a human.

Log the session per CLAUDE.md's "Logging your session", with this run's
usage statistics and the step 4 results (`orphanScan` included) in its
summary.
