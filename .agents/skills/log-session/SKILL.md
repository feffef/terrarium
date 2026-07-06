---
name: log-session
description: Write this Claude session's honest self-report — goal, outcome, docs read, Skills used, and every friction — and commit it to the Journal.
disable-model-invocation: true
---

Append one honest **session log** for this Claude session to the Journal. Author the entry, then hand it to the helper — it validates and commits the file **directly to `main`** (never a PR; ADR-0009).

> **Invoked manually — follow the steps below.** The Skill tool refuses this Skill by design (`disable-model-invocation: true`, so it can't self-fire on a premature session end); that refusal is not a dead-end. Just execute the steps below yourself.

Run this only when the session is *actually* ending — when the user invokes it, or confirms wrap-up after you ask (the reminder convention in `CLAUDE.md`). Don't self-invoke on a hunch the session is done: the human may not be, and a premature or duplicate log would land straight on `main`.

Be honest, **especially about friction** — a flattering log is worse than none.

## 1. Author the entry

Match this shape. The `sessions` schema is **strict and authoritative** (`tenants/journal/tenant.config.ts` → `sessions`): an unknown, missing, or mistyped field is rejected — don't add fields it doesn't define.

```yaml
schemaVersion: 1                  # current sessions schema version (issue #60); absent ⇒ 1
session: session_01H…             # this session's id
startedAt: 2026-07-04T22:45:00Z   # UTC ISO-8601 — read the clock, don't estimate (see below)
endedAt:   2026-07-04T23:27:08Z   # UTC ISO-8601
kind: interactive                 # interactive | autonomous (a scheduled/cold job)
goal: Ship the log-session Skill   # ≤ 8 words
status: completed                 # completed | partial | blocked | abandoned
outcome: Helper and Skill landed   # ≤ 8 words — nuance on status
summary: >-                        # ≤ 100 words — the fuller narrative
  What you set out to do and what actually happened.
prs: ["5"]                         # work-PRs already landed this session ([] if none)
docsRead:                          # each doc/URL you actually opened; reason = why, not what
  - { path: CONTEXT.md, reason: domain model }
  - { path: "app/pages/t/[tenant]/[space]/[...slug].vue", reason: routing }
skillsUsed:                        # each Skill you invoked; name cross-refs the Skill catalogue
  - { name: tdd, reason: test-first the helper }
frictions:                         # REQUIRED (may be []) — list EVERY friction
  - description: …                 # ~20 words, honest
    solution: …                    # the fix, or what would have helped
    severity: nit                  # nit < minor < moderate < major < blocker
```

The word limits are **not** schema-enforced — you hold them.

**Recovering the id:** the harness already hands you the canonical `session_01…` id — read it from your **own system-prompt instructions**: the commit-footer template ("End git commit messages with: … `Claude-Session: https://claude.ai/code/session_01…`") has this session's id filled in; the `session_01…` after the final `/` is the id, verbatim for both `session:` and the filename. Cross-check (or fallback) with `echo "session_${CLAUDE_CODE_REMOTE_SESSION_ID#cse_}"` — the env var holds the same id under a `cse_` prefix, but it's undocumented harness behaviour, so prefer agreement of both sources. **Never derive the id from `git log` trailers** — parallel sessions commit to `main` constantly, so the most recent trailer is routinely *another* session's id, and a commit-less session has no trailer at all (that recipe regressed twice; issue #99). **Do not** use `CLAUDE_CODE_SESSION_ID` — it's a different, unrelated UUID, not the canonical id; a past log used it by mistake and had to be fixed. Rare pure-CLI path: no `session_01…` id exists (it's minted by claude.ai/code) — use the local session UUID (`CLAUDE_SESSION_ID` env var, else the newest transcript filename under `~/.claude/projects/<munged-cwd>/`) as the `session:` value.

**Quote any `path` (or value) containing `[` or `{`** (e.g. a catch-all route
file like above) — unquoted, it starts a YAML flow sequence/map and breaks the
inline-flow `docsRead`/`skillsUsed` entry.

**Write `goal`/`outcome` for a stranger.** They're the most-visible copy on the
public dashboard, so name the thing worked on, not just "the issue" or "a PR"
(good: `goal: Add session-log Skill`; bad: `goal: Implement open issue #7`) —
still within the 8-word cap.

**frictions is the point.** List *every* one, not one or two — including anything that felt unnecessarily complex, token-heavy, or repetitive. `nit` is the floor for trivia, so `[]` means the session genuinely hit nothing (rare). Don't sand down the honest edges.

A **doc contradiction found mid-session** — two guidance surfaces disagreeing, or a doc that diverges from reality — is itself a loggable friction. Record it (with a `solution` pointing at the single home that should be fixed); that's the self-improvement loop keeping the docs honest, the same way single-homing (`CLAUDE.md`) keeps them from forking in the first place.

**Timestamps:** run `date -u +%Y-%m-%dT%H:%M:%SZ` to get an exact UTC ISO-8601 `endedAt` (and `startedAt`, if you can pin the session's start) instead of estimating. The true start/end *capture* stays deferred to the autonomous end-of-session trigger — so if a value is still a hand-estimate, log a `nit` friction saying so.

## 2. Save it at the canonical path

`tenants/journal/content/current/sessions/<startedAt-date>-<session>.yml` — e.g. `2026-07-04-session_01H….yml`. The date prefix orders logs; the full session id keeps parallel sessions collision-free. The helper re-derives this name and refuses a mismatch.

## 3. Hand it to the helper

```
pnpm exec tsx scripts/log-session.ts tenants/journal/content/current/sessions/<file>.yml
```

It validates against the schema and commits **only that one file** off `origin/main` — your branch and working tree untouched — then pushes direct to `main` with retry. Add `--dry-run` to validate without pushing. Don't hand-edit `main` or route the log through a PR.

Done when it prints `✓ logged … → origin/main`; then report `status` and friction count.
