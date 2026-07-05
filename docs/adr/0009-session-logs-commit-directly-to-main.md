# 9. Session logs commit directly to `main` (a bounded gate exception)

Date: 2026-07-04
Status: Accepted

> **Amended (2026-07-05):** added the **Schema evolution policy** section below
> (issue #60). It is the single home for how an append-only strict `data`
> collection may change its schema — `sessions` here, blog `pingbacks`
> (ADR-0012) being the second instance that generalizes it.

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
script.

A third increment — a `Stop` hook to make logging fire automatically on *every*
session — was explored and **dropped** (2026-07-05). A `Stop` hook fires once
per turn, when the agent finishes responding, **not** at session end; in an
interactive session it cannot tell a genuine wrap-up from a mid-session pause,
so a block-until-logged hook would force a log the first time the agent yields.
(It *could* be scoped to remote/autonomous runs via `CLAUDE_CODE_REMOTE`, but an
autonomous session driven by webhooks/triggers is not reliably one-shot either.)
Interactive logging is therefore a **reminder convention** — at wrap-up the agent
asks the user, then logs on confirmation (see `CLAUDE.md`) — and a *deterministic*
end-of-session trigger for autonomous sessions is deferred until those sessions
exist and can be built with one.

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

## Schema evolution policy

> **Amended (2026-07-05, issue #60).** This is the single home for how an
> **append-only, strict `data` collection** may change its schema over time.
> `sessions` is the primary instance; the Blog's `pingbacks` (ADR-0012) is the
> second — a second append-only strict collection facing the same question is
> what generalizes this from a `sessions`-only note into a policy, so it lives
> here once and ADR-0012 points back to it.

**Why a policy is needed.** These collections are `.strict()` and validated at
the L1 gate, where **one** invalid file fails the *whole* build. Their history is
**append-only ground truth** (ADR-0009): entries are never rewritten and never
migrated. Together that means the schema may only ever change in
**history-preserving** ways — a change that would invalidate any existing file is
not an option, because there is no migration pass that could fix the file, and
rewriting history is forbidden by this ADR.

The rules:

- **Adding an OPTIONAL field — allowed anytime.** A `.strict()` schema still
  accepts old files that omit the new field; no migration, no version bump.
- **Adding a REQUIRED field, renaming a field, or narrowing a field's type — NOT
  allowed in place.** It would invalidate every historical file at once. (The
  `tag` taxonomy CONTEXT.md plans for `sessions` is the canonical example of a
  change that looks small but is breaking.) Instead **bump the version:**
  - define a new object schema carrying `schemaVersion: z.literal(2)` (plus the
    new required/renamed/narrowed shape);
  - keep the current shape as v1, with `schemaVersion: z.literal(1).optional()`;
  - make the collection schema `z.union([v1, v2])`.

  Old files — which carry no `schemaVersion` — match v1 (absent ⇒ v1) and stay
  valid **forever**; new files opt into v2 by writing `schemaVersion: 2`. History
  is **never** migrated.
- **`schemaVersion` is `z.literal(1).optional()`, NOT `z.default(1)`.** With one
  version live there is *zero* migration to do now: `.optional()` lets every
  pre-versioning file validate untouched, which is the whole point of laying the
  spine down early. A Nuxt Content `default` would **not** retroactively rewrite
  the stored rows on disk, and it would muddy the `absent ⇒ v1` discriminator the
  future `z.union` relies on. New entries SHOULD still write `schemaVersion: 1`
  explicitly (the `log-session` Skill's template does) so a file is
  self-describing on disk.
- **Consumers read old/unknown versions leniently.** `scripts/digest.ts`, the
  dashboard, and the future `consolidate`/`codify` jobs must tolerate an
  older-or-unknown `schemaVersion` rather than assume the latest shape — they
  already do, via defensive `String(raw.x ?? '')`-style reads.

**How pingbacks (ADR-0012) fit.** Blog `pingbacks` need **no** `schemaVersion`
field yet: every pingback on disk today is retroactively distinguishable as v1 by
the *absence* of the key, exactly as v1 session logs are. A field is added only
when pingbacks take their first breaking change — at which point the same
`z.literal(2)` + `z.union([v1, v2])` recipe above applies, with v1 keyed on the
absent `schemaVersion`.
