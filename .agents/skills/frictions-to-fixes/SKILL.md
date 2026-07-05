---
name: frictions-to-fixes
description: Mine the Journal's session-log frictions and ship the simple, autonomous ones as gated PRs — one issue and one dispatched agent per friction.
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
For each, pull its `frictions[]`: the `description`, `solution`, and `severity`.

Done when every log is read and you hold one flat list of frictions, each tagged
with which session(s) raised it and at what severity.

## 2. Pick the ripe ones

Rank by **recurrence × severity** — a friction logged across sessions, or at
`moderate`+, outranks a lone `nit`. Then keep only those that pass the **ripeness
test**, all three:

- **Simple** — one small code or config change, no redesign.
- **Autonomous** — an agent can land it start-to-finish with no human decision
  mid-way.
- **Safe surface** — touches none of the human-only surfaces (generator, routing,
  isolation logic, CI / the safety gate — ADR-0004). Those are never in scope here.

Drop one-offs, anything needing a human judgement call, and anything deferred by an
ADR. Stop when you have the agreed number of ripe frictions (ask the user how many
if unset).

Done when each selected friction names its evidence (session ids + severity) and
you can state in one line why it is ripe.

## 3. One issue per friction — three options, simplest recommended

File one issue on the tracker per ripe friction. Each issue states the **problem**
with its evidence (quote the logging sessions + severities), then proposes **three
solutions** and recommends the **simplest**. Naming the simplest here is what step
4 implements, so make it unambiguous. Search the tracker first to avoid duplicates.

Done when every selected friction has an open issue whose recommended option is a
single, simple change.

## 4. Dispatch one agent per issue

Spawn one agent per issue, each in its **own git worktree** (parallel PRs must not
share a working tree). Give each agent a self-contained brief: read the issue,
branch from `origin/main`, implement the issue's **simplest** option only, clear
the **safety gate**, push, and open a **gated PR** (`Closes #N`). Never self-merge
and never enable auto-merge (ADR-0003) — every fix lands human-reviewed.

Done when each issue has a pushed gated PR implementing its recommended option,
gate green.

## 5. Shepherd to merge

Watch each PR to a terminal state. On review that **fundamentally changes** a PR,
apply the change **and update the PR title/description in the same push** (the
CLAUDE.md hard rule) — a stale description is a defect. Re-run the gate on every
push. A PR is finished only when **merged or abandoned**, not at push time
(`CLAUDE.md`: pushing is not landing).

Done when every dispatched PR is merged or abandoned. Then it is a genuine
end-of-session — offer to `/log-session`, and log this run's own frictions too.
