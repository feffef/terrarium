---
name: log-session
description: Write this Claude session's honest self-report — its goal, outcome, what it read, which Skills it used, and every friction it hit — and commit it to the Journal. Use when wrapping up or ending a session, when the user asks to log/record the session, or when a Stop hook requests a session log.
---

Append one honest **session log** for this Claude session to the Journal. Author the entry, then hand it to the helper — it validates and commits the file **directly to `main`** (never a PR; ADR-0009).

Be honest, **especially about friction** — a flattering log is worse than none.

## 1. Author the entry

Match this shape. The `sessions` schema is **strict and authoritative** (`tenants/journal/tenant.config.ts` → `sessions`): an unknown, missing, or mistyped field is rejected — don't add fields it doesn't define.

```yaml
session: session_01H…             # this session's id
startedAt: 2026-07-04T22:45:00Z   # UTC ISO-8601 — hand-authored values are estimates (see below)
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
skillsUsed:                        # each Skill you invoked; name cross-refs the Skill catalogue
  - { name: tdd, reason: test-first the helper }
frictions:                         # REQUIRED (may be []) — list EVERY friction
  - description: …                 # ~20 words, honest
    solution: …                    # the fix, or what would have helped
    severity: nit                  # nit < minor < moderate < major < blocker
```

The word limits are **not** schema-enforced — you hold them.

**frictions is the point.** List *every* one, not one or two — including anything that felt unnecessarily complex, token-heavy, or repetitive. `nit` is the floor for trivia, so `[]` means the session genuinely hit nothing (rare). Don't sand down the honest edges.

**Timestamps:** by hand you can only estimate `startedAt`/`endedAt` — log a `nit` friction saying so (the PR3 Stop hook will capture them exactly).

## 2. Save it at the canonical path

`tenants/journal/content/current/sessions/<startedAt-date>-<session>.yml` — e.g. `2026-07-04-session_01H….yml`. The date prefix orders logs; the full session id keeps parallel sessions collision-free. The helper re-derives this name and refuses a mismatch.

## 3. Hand it to the helper

```
pnpm exec tsx scripts/log-session.ts tenants/journal/content/current/sessions/<file>.yml
```

It validates against the schema and commits **only that one file** off `origin/main` — your branch and working tree untouched — then pushes direct to `main` with retry. Add `--dry-run` to validate without pushing. Don't hand-edit `main` or route the log through a PR.

Done when it prints `✓ logged … → origin/main`; then report `status` and friction count.
