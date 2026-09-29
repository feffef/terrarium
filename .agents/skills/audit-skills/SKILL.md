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
(ADR-0015).

## 1. Gather the scorecard

```
pnpm exec tsx scripts/audit-skills.ts
```

It prints JSON for the last 7 days of session logs (`--days N` widens or
narrows that). The `Scorecard` type in `scripts/audit-skills.ts` documents
every field.

Done when you hold the scorecard.

## 2. Check behaviour — one subagent per Skill in `behaviourChecks`

Dispatch one read-only Sonnet subagent (`model: sonnet`) per Skill, all in
parallel. Each brief names the Skill's `SKILL.md`, the log files of the
sessions in its `usedIn` (newest 10), and its `observations`. For a
`modelInvoked` Skill, the brief also lists every `window[]` session that did
not use it, with its log `file`, `goal` and `skillsUsed`. The brief asks for
this:

> Work out from the `SKILL.md` what a run must deliver: its outcome and each
> step's completion criterion. For each session, check against primary sources
> whether it delivered. Start from the log's outcome, summary, `prs` and files
> edited, then confirm on GitHub or in git that the PR, commit, issue or file
> is really there and says what the Skill promised. Then check it still
> stands: search the last two weeks of `git log origin/main` for the Skill's
> name, in commit messages (`-i --grep=<name>`) and in changed content
> (`-i -G<name>`). A later revert or rewrite of what a run delivered is a
> silent failure, and the reverting commit and its session log say why. A
> promise the runs keep breaking, a step that silently never happens, or an
> outcome the log claims but that never landed is a **silent failure** too,
> whether or not anyone logged a friction. Prior observations tell you what
> is already known, including unverified findings this run's sessions may
> confirm.
>
> If you were given sessions that did not use the Skill, decide for each one
> whether its work matches the case the Skill's `description` says it covers.
> Judge from the goal first, then open the log. Each match is a **missed
> invocation**. You are done when every listed session is ruled in or out.
>
> Report every finding labelled silent failure or missed invocation, with its
> session ids, quoted evidence, what the Skill promised against what happened,
> and your best guess at why. If there are none, say how many sessions you
> checked.

A subagent's report is hearsay until you have verified it (CLAUDE.md). Check
each finding against the source it cites before you use it, and check one
claim from every clean report too: "nothing found" is a claim like any other.
A finding that holds up in part but not enough to act on is **unverified**: it
goes into the Skill's `observations` (step 5), so a later run can build on it.

Done when every subagent has reported, each finding is verified, unverified,
or dropped, and each clean report has had one claim checked.

## 3. Check closure completeness

These mechanical signals cover `close-session`'s missed invocations:

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

## 4. Escalate what matters

A verified finding becomes an issue only when the misbehaviour is
**significant** (it did real damage) or **repeated** (an earlier observation
already records the same thing). Every other finding is an observation
(step 5), which is how a later run sees it repeat. A closure finding belongs
to `close-session`'s observations.

For each finding that clears that bar:

- Search open issues first: the session id for a closure finding,
  `audit-skills <skill>` for a Skill finding.
- **Match found**: comment with only the evidence the thread does not
  already cite. A concern that recurs across runs belongs on one thread.
- **No match**: file one `needs-triage` issue naming the Skill (or session),
  whether it is a silent failure or a missed invocation, the session ids, the
  quoted evidence, promised against delivered, and your hypothesis.
- **Human-nudged closures** go on one standing thread per trend, never one
  issue per session.

Pack Skills get no issues. Their `SKILL.md` is not ours (ADR-0015), so their
only lever is the Inventory entry.

Done when every finding is either an issue (filed or commented on) or headed
for step 5 as an observation.

## 5. Tune the Inventory

Grade each Skill by the definitions in `CONTEXT.md` (`### Importance`), after
reading its `observations`: earlier runs' evidence counts alongside this
window's.

- **Grade on felt absence, not counts.** Read each Skill's `mentionedIn`
  logs for where it **caught** something or where **skipping it cost**
  something; `humanInvokedIn` is a human reaching for it. These are the
  evidence, pack Skills included.
- **A grade change needs ≥2 windowed sessions as evidence**, in either
  direction, and those session ids are cited.
- **A Skill that runs another takes the credit** (`grill-with-docs` runs
  `grilling`); grade the inner Skill on its standalone uses.
- **A missed invocation of an own Skill is a trigger problem**: step 4's
  issue, not a demotion. For a pack Skill, whose trigger we cannot fix, the
  grade is the lever.
- **`role`** stays ≤ ~50 words and free of PR, issue or session ids. Re-read it
  every run, grade changed or not, and rewrite any claim the evidence
  contradicts.
- **`observations`** hold 40 days of history. Append
  `{ date: <today, UTC>, note: <citations> }` for every grade or role change,
  verified or unverified finding (say which), or idea, but only when it cites
  a session no remaining entry already cites. Remove every entry dated more
  than 40 days before today; git keeps the history. Leave the other entries as
  they are. If none remain, the field is `[]`.
- **Coverage gaps**: create an entry for a Skill that is used but not
  inventoried (`category` is `general-engineering` for a pack Skill,
  `platform-operation` for our own). Propose removing an entry whose Skill is
  gone from disk, unless it is a built-in CLI Skill, which you flag instead.
- **Ideas**: when the evidence suggests a new Skill, a split or a
  retirement, record it as this run's session-log `ideas` entry and never act
  on it (ADR-0003).

Done when every entry's grade and `role` match the evidence.

## 6. Land the Inventory PR

If step 5 changed nothing, there is no PR. Otherwise follow
`docs/agents/pr-workflow.md`'s "Closing a self-merged chartered run". The
diff touches only `layers/journal/content/current/skills/*.yml`, every grade
change cites its ≥2 sessions, and every removed observation is past 40 days.
Anything else in the diff means you leave the PR open for a human.

Log the session per CLAUDE.md's "Logging your session", with the step 3
results (`orphanScan` included) in its summary.
