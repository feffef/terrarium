---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship the simple, autonomous ones as gated PRs — screening out already-fixed ones and flagging regressions.
disable-model-invocation: true
---

# Frictions to Fixes

The manual precursor to the deferred `consolidate`/`codify` jobs (ADR-0009): read
the **frictions** every session honestly logged, pick the ones a small change can
retire, and dispatch a fix for each. **Harvest the ripe ones** — a friction is
_ripe_ when it recurs or stings **and** a simple, autonomous change fixes it
without touching a human-only surface. Leave the unripe ones on the vine.

Run it when asked, or after a batch of sessions has piled up unaddressed friction.

## 1. Read every session log

Read **all** of `tenants/journal/content/current/sessions/*.yml` — not a sample.
For each, pull its `frictions[]` (`description`, `solution`, `severity`) and keep
its `startedAt` — you need the date to catch regressions in step 2.

Done when every log is read and you hold one flat list of frictions, each tagged
with its session(s), severity, and date.

## 2. Screen against fixes already shipped

Never re-fix what is already fixed. For each friction, check the tracker for a
**closed issue or merged PR** that already addressed it, then branch:

- **Never fixed** — carries on to step 3.
- **Fixed, and not logged since the fix merged** — drop it. Done is done; spending
  a PR here is duplicate work.
- **Reappeared _after_ its fix merged** (a friction logged in a session that
  started later than the fixing PR landed) — this is a **regression**: the fix that
  was supposed to be in place did not hold. Do **not** route it through the ordinary
  simplest-fix dispatch — a change that already failed once needs human eyes, not a
  second run of the same idea. Instead file a distinct issue that flags the earlier
  fix as ineffective (link the prior issue/PR and quote both the original and the
  recurring friction), and **alert the user**.

Done when every friction is labelled never-fixed, drop, or regression — and every
regression has its own alerting issue filed.

## 3. Pick the ripe ones

From the never-fixed frictions, rank by **recurrence × severity** — one logged
across sessions, or at `moderate`+, outranks a lone `nit`. Keep only those passing
the **ripeness test**, all three:

- **Simple** — one small code or config change, no redesign.
- **Autonomous** — an agent can land it start-to-finish with no human decision
  mid-way.
- **Safe surface** — touches none of the human-only surfaces (generator, routing,
  isolation logic, CI / the safety gate — ADR-0004). Those are never in scope here.

Drop one-offs, anything needing a human judgement call, and anything an ADR defers.
Stop at the agreed number of ripe frictions; if the count is unset and no user is
reachable (autonomous run), default to all that pass the ripeness test, capped at
~5.

Done when each selected friction names its evidence and you can state in one line
why it is ripe.

## 4. One issue per friction — three options, simplest recommended

File one issue on the tracker per ripe friction: the **problem** with its evidence
(quote the logging sessions + severities), **three solutions**, and the **simplest**
recommended. Naming the simplest here is what step 5 implements, so make it
unambiguous. Search the tracker first to avoid duplicates.

Done when every selected friction has an open issue whose recommended option is a
single, simple change.

## 5. Dispatch agents — batch the doc fixes

Split the issues by fix type and dispatch each agent in its **own git worktree**
(parallel PRs must not share a working tree):

- **Doc-only fixes** (Markdown / prose — CLAUDE.md, a SKILL, a catalogue entry):
  hand them **all to one agent as a single grouped PR** that `Closes` every one of
  their issues. Many one-line doc PRs are pure review overhead; one batched PR is
  cheaper to review and still traces back to each issue.
- **Code or config fixes**: one PR each — they carry distinct review and CI surface
  and shouldn't ride on each other.

Every agent's brief is self-contained: read the issue(s), branch from `origin/main`,
implement the **simplest** option only, clear the **safety gate**, push, open a
**gated PR**. Never self-merge or enable auto-merge (ADR-0003) — every fix lands
human-reviewed.

Done when every issue is covered by a pushed gated PR (doc issues by the one grouped
PR, each code/config issue by its own), gate green.

## 6. Shepherd to merge

Watch each PR to a terminal state. On review that **fundamentally changes** a PR,
apply the change **and update the PR title/description in the same push** (the
CLAUDE.md hard rule) — a stale description is a defect. Re-run the gate on every
push. A PR is finished only when **merged or abandoned**, not at push time
(`CLAUDE.md`: pushing is not landing).

Done when every dispatched PR is merged or abandoned. Then it is a genuine
end-of-session — offer to `/log-session`, and log this run's own frictions too.
