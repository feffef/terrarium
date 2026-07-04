# 9. Session logs commit directly to `main` (a bounded gate exception)

Date: 2026-07-04
Status: Accepted

## Context

The Journal Tenant introduces **session logs** (ADR-0008, issue #2): one honest
self-report per Claude Session — its goal, outcome, what it read, which Skills it
used, and every Friction it hit. These logs are the primary signal the
`consolidate`/`codify` jobs mine for recurring pain, so their value depends on
being written for *every* session and being honest.

That collides with ADR-0003: *every change lands as a gated PR on a feature
branch — no self-merge.* Routing each session log through its own PR is heavy
ceremony, and it breaks on the realistic cases:

- a session that opens **no PR** (planning, research, a grilling session),
- a session spanning **multiple PRs** (which one carries the log?),
- a session whose work-PR is **abandoned or rejected** — yet the frictions it hit
  still happened and are exactly what `consolidate` needs to see.

A session log describes work that has *already* landed by session end; the log is
meta, appended afterwards. It is ground truth about what happened, not a
projection of repo state — so its fate should not be coupled to the work's PR.

## Decision

A session's own **session-log** Journal entry is committed **directly to `main`**
by a helper script — never through a PR. This is a deliberate, bounded exception
to ADR-0003's no-self-merge rule. The boundary:

- **Scope:** exactly one additive file under
  `tenants/journal/content/current/sessions/`, named `<date>-<sessionId>.yml`
  (date-prefixed for chronological `stem` order; full session id guarantees
  collision-free filenames across parallel sessions). *Nothing else* may travel
  this path — all other changes remain gated PRs. This is not a general
  "sessions push to `main`" loophole.
- **The helper script is the single enforcement point.** It commits *only* that
  one log file — never the session's other, possibly uncommitted, working-copy
  changes — and refuses to run if anything else would be included or if
  validation fails.
- **Validate before push:** (1) the entry parses against the frozen `sessions`
  schema; (2) adding it produces no generated-file drift (a `data` Document
  regenerates nothing). Push is `fetch → rebase → push` with retry; parallel
  sessions never collide because filenames are globally unique.
- **Always lands, wherever the work went:** the log is pushed whether the session
  ran on a feature branch, on a working copy that was never committed, or
  produced no PR at all. Already-landed work is referenced by the entry's `prs`.

The mechanism ships incrementally: first the `sessions` schema + a hand-authored
entry (in a *normal* gated PR, because introducing the collection regenerates
config); then a `log-session` platform-operation Skill wrapping the helper
script; then a `Stop` hook that makes "every session" actually hold.

## Consequences

- **Safe because the content type is inert.** The gate exists to stop broken
  builds and unsafe code. A session log is strict-schema-validated `data` that
  generates nothing, routes nothing, touches no code, and is isolated by its
  collection key — none of the risks the gate guards against. If it validates, it
  cannot break the build.
- **Honesty depends on low authoring friction.** PR ceremony per session would
  suppress logging or flatten it into dishonest summaries; direct-to-`main`
  removes that cost, which is the point.
- `main` receives commits that are not individually pre-merge reviewed. Accepted:
  they cannot break the build and are honest ground truth; a reader consumes them
  after the fact for signal, not as a gatekeeper.
- The helper script is itself gated code — changing it is a normal PR — so the
  exception's boundary is protected by the very gate it steps around.
- **Aging is deferred.** Session logs accumulate in `current` unbounded; a future
  `consolidate`/aging job owns any `current → archived` migration (an ordinary
  gated move). At expected volume this is a non-issue.
