---
name: log-session
description: Write this Claude session's honest self-report — its goal, outcome, what it read, which Skills it used, and every friction it hit — and commit it to the Journal. Use when wrapping up or ending a session, when the user asks to log/record the session, or when a Stop hook requests a session log.
---

The repo's first **platform-operation** Skill (ADR-0005): it performs a Platform change — appending one **session log** to the `journal` Tenant. Read ADR-0009 once if you haven't; the short version is below.

A session log is one honest self-report per Claude Session. Its point is the `frictions` list: recurring pain becomes visible so the future `consolidate`/`codify` jobs can mine it. A flattering log is worse than none — **be honest, especially about friction.**

The entry is **inert content** — strict-schema `data` that generates nothing, routes nothing, touches no code — so it is committed **directly to `main`** by `scripts/log-session.ts`, never through a PR (ADR-0009). That script is the enforcement point; your job is to author a truthful entry and hand it over.

## Steps

### 1. Fill the mechanical fields from the transcript and git

These are observed, not judged:

- `session` — this session's id.
- `startedAt` / `endedAt` — UTC ISO-8601. You can only *estimate* these by hand; log a `nit` friction saying so (the PR3 Stop hook is what will capture them exactly).
- `kind` — `interactive` (a human drove it) or `autonomous` (a scheduled/cold job).
- `prs` — refs of work-PRs this session already landed (`[]` if none; the log is per-session, not per-PR).
- `docsRead` — `{ path, reason }` for each doc/URL you actually opened. Reason = *why*, not what.
- `skillsUsed` — `{ name, reason }` for each Skill you invoked; `name` cross-refs the Skill catalogue.

### 2. Author the reflective fields honestly

The schema does **not** enforce the word limits — you do. Keep to them so the fields stay scannable and the mining job stays cheap:

- `goal` — ≤ 8 words: what the session set out to do.
- `status` — `completed` | `partial` | `blocked` | `abandoned`. This is the queryable spine; pick the true one.
- `outcome` — ≤ 8 words: prose nuance on `status`.
- `summary` — ≤ 100 words: the fuller narrative.
- `frictions` — a list of `{ description (~20 words), solution, severity }`. **Required, and the reason this Skill exists.** List *every* friction, not one or two — including anything that felt unnecessarily complex, token-heavy, or repetitive. `severity` is `nit < minor < moderate < major < blocker`; `nit` is the floor for trivia, so an empty list means the session genuinely hit nothing — rare. Do not sand down the honest edges.

There is deliberately **no `tag` field** — don't invent one; the taxonomy emerges later from clustering.

### 3. Write the entry to its canonical path

Write the YAML to `tenants/journal/content/current/sessions/<startedAt-date>-<session>.yml` (e.g. `2026-07-04-session_01H….yml`). The date prefix orders logs chronologically; the full session id keeps parallel sessions collision-free. The helper re-derives and checks this name, so get it right or it will refuse.

### 4. Hand it to the helper — it validates and lands it

```
pnpm exec tsx scripts/log-session.ts tenants/journal/content/current/sessions/<file>.yml
```

The helper is the single enforcement point of the ADR-0009 boundary. It:

- validates the entry against the frozen `sessions` schema (the L1 check, before push);
- commits **only** that one file — never your session's other, possibly uncommitted, working-copy changes — building the commit off `origin/main` so your branch and working tree are untouched;
- pushes direct to `main` with `fetch → rebase → push` retry.

Pass `--dry-run` first if you want to validate without pushing. **Do not** hand-edit `main` or route the log through a PR — the direct-to-`main` path is the whole point, and the script is what keeps it bounded.

Completion criterion: the helper prints `✓ logged … → origin/main`. Then report the entry's `status` and friction count, and stop.
