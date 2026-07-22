# 9. Session logs commit directly to `main` (a bounded gate exception)

Date: 2026-07-04
Status: Accepted

> **Amended by [ADR-0018](0018-tenant-layers-under-layers-directory.md) (2026-07-07).**
> Tenant layers moved from `tenants/` to Nuxt's conventional `layers/` directory;
> `tenants/…` paths below (e.g. the session dir, now
> `layers/journal/content/current/sessions/`) reflect the pre-rename layout.

> **Amended by [ADR-0025](0025-cross-tenant-catalog-and-collection-kinds.md) (2026-07-22).**
> The `sessions` schema moved verbatim from the Journal manifest to
> `shared/schemas/session.ts` and became the shared **`session` collection kind**,
> so the Commons Timeline can read session logs across the Catalog. Behaviour is
> unchanged: the Journal references it by `kind`, and `scripts/log-session.ts`
> validates against the same object. Where this ADR says the schema lives in the
> Journal manifest, read `shared/schemas/session.ts`.

> **Amended (2026-07-05):** added the **Schema evolution policy** section below
> (issue #60). It is the single home for how an append-only strict `data`
> collection may change its schema — `sessions` here, blog `pingbacks`
> (ADR-0012) being the second instance that generalizes it.
>
> **Amended (2026-07-06):** added **Automatic logging via a `SessionEnd` hook**
> below — supersedes the *deferred end-of-session trigger* left open in the
> Decision, records the measured Claude-Code-on-the-web freeze behaviour, and
> fixes the derive-vs-author split and the commit rule. Decision accepted;
> implementation is a follow-up gated PR.
>
> **Amended (2026-07-06, PR #148):** the follow-up implementation landed with a
> correction to the section below — added **Landing mechanism as shipped** at
> the end. `SessionEnd` turned out to be an unreliable *sole* committer (it
> fires fire-and-forget and a network-freezing suspend makes its push throw
> silently), so the shipped mechanism lands primarily on the live `Stop` hook
> instead, with `SessionEnd` kept only as a fallback for whatever `Stop` misses.
>
> **Amended (2026-07-07, issue #215):** added **Closure invoked via a
> `close-session` front door** below. The closure *trigger* moves off
> `log-session`'s description onto a dedicated model-facing `close-session` Skill;
> `log-session` becomes a capability it calls. The general *no-scratch
> reminder/block* `Stop` hook (issue #215 option A / issue #176 option 2) is
> **again declined** — in favour of this measurable authoring affordance. **The
> existing `Stop` *committer* is untouched.**

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

## Automatic logging via a `SessionEnd` hook

> **Amended (2026-07-06, this session).** Supersedes the *deferred end-of-session
> trigger* left open in the Decision above. **Decision accepted; implementation is
> a follow-up gated PR** — see "Not yet built" at the end.

**Why revisit.** Two frictions with the reminder-convention model: (1) a session
must be *explicitly* wrapped up and logged, which is manual and easily skipped;
(2) the self-reported fields (`docsRead`, `skillsUsed`, `startedAt`, `prs`) proved
unreliable against ground truth — yet the session's **transcript jsonl** already
records, deterministically, every tool call, file read, subagent, model, and
exact timestamp.

**What the web harness actually does (measured, CLI 2.1.201).** A passive probe
hook found that on Claude Code on the web a **freeze/resume fires `SessionEnd`
with `reason: "other"`** — *not* the documented `reason: "resume"` (that value is
the CLI `--resume`/`--continue` path). Resume then fires `SessionStart
source: "resume"` with **no approval prompt**. Consequence: **`reason` cannot
distinguish a mid-session freeze from a true end** — both are `other`. Also:
`SessionEnd` is fire-and-forget (cannot block, cannot prompt the model), and
`SessionStart`/`SessionEnd` firings are not written to the transcript.

**Decision.**

1. **Two kinds of content, two authors.**
   - *Mechanical (derived, never self-reported):* timings, `models` (per-turn
     counts — captures mid-session switches), tool counts, `filesRead`,
     `filesEdited`, `skillsUsed`, `subagents` `{type, task, model}`, PR signals,
     git branch / entrypoint / CLI version. Extracted from the transcript by a
     committed extractor (`scripts/session-trace.ts`).
   - *Authored (irreducible):* `goal`, `outcome`, `summary`, `frictions`, and any
     per-item `reason`. The **live agent** writes these *during* the session —
     `SessionEnd` cannot prompt, so authoring cannot happen at teardown.
   - *Stitch:* `docsRead`/`skillsUsed` **union** the agent's curated entries with
     the transcript-observed reads, keyed by path/name. The entry shape is
     unchanged (no `source` field): a read the agent never annotated is folded in
     with a `(unknown)` placeholder `reason`, which doubles as the lightweight
     marker of a mechanically-observed read.

2. **The scratch file is the wrap-up signal, and closure is the model's call.**
   The agent writes its authored part via a helper (wrapped by the `log-session`
   Skill) to a **scratch file outside git** (the harness scratchpad); the
   `SessionEnd` hook **commits only if that scratch exists**. The agent choosing to
   write it *is* its in-the-loop assertion of **closure** — a more reliable "done"
   than any `reason` value, and the model **self-judges** it rather than asking the
   human (this replaces the Decision's reminder-convention).

   **Closure means *active work complete and in a coherent, honest state* — not
   merged.** An ephemeral container rarely hosts a live agent at the later merge
   moment, so the Decision's "a session ends when its work has merged" stance
   *cannot be honoured automatically*; the automatic log fires at work-completion
   and honestly records in-review PRs (`prs`, `status`/`outcome`). This is a
   deliberate reframing of a session log from *post-landing* to *post-work* ground
   truth, forced by the ephemeral-container reality.

   Because invoking `log-session` now only *writes the scratch* — it no longer
   commits — the Skill flips from **`disable-model-invocation: true`** (set
   precisely to stop a premature self-fire from landing on `main`) to
   **model-invocable**, with its `description` rewritten as a closure *trigger*. A
   premature self-fire is now cheap (a scratch write, not a `main` commit) and
   **self-heals**: if work continues the agent re-invokes `log-session`, and the
   next `SessionEnd` overwrites the log with the superset. A freeze mid-work (no
   scratch yet) → the hook does nothing.

3. **Idempotent overwrite, diff-guarded.** The log is the single file
   `<date>-<sessionId>.yml`. On a resumed-then-ended-again session the hook
   **re-derives and overwrites** it; the transcript only grows, so a later extract
   is a **superset** of an earlier one. A **diff-guard** skips the commit when the
   re-derived log is byte-identical to what is on `main` — so a freeze/resume with
   no new work never touches `main`. Push reuses this ADR's `fetch → rebase →
   push`-with-retry; the filename is globally unique per session, so parallel
   sessions never collide. This overwrite is a **same-session finalization**, not a
   rewrite of another session's entry — cross-session history stays append-only.

**Consequences.**

- Coverage now depends on the agent **authoring a summary** (a low bar, still
  nudged by the reminder convention) rather than on catching a clean end event.
  No summary → no log: the same gap as today, no worse, and never a
  partial/dishonest one.
- The self-reported mechanical fields disappear; the previously admitted-guess
  `startedAt` becomes exact.
- **Human-gated install, prompt-free thereafter (ADR-0004).** The hook +
  extractor ship **once** via a gated PR and are inherited by every session.
  *Installing* hook config is the only step that prompts (correctly — a hook is
  code that runs automatically), so autonomous runs, which only *inherit* the
  committed hook, execute it unprompted. Verified this session: the committed
  `pnpm install` `SessionStart` hook and the resume both ran with no prompt; only
  the agent *writing* new hook config prompted.
- **Residual edge.** A session frozen and reclaimed **without ever resuming** keeps
  its last committed state; if that predates the scratch file, the session is
  unlogged — graceful degradation over a partial log.
- **`docsRead`/`skillsUsed` stay a *single* merged field — no parallel
  `filesRead`.** Transcript-observed reads are folded *into* the agent's curated
  list by the stitch (above), not stored in a separate "files read" home — that
  would fragment one fact across two homes and force every consumer to re-union
  them. The entry shape is unchanged: a folded-in read carries a `(unknown)`
  placeholder `reason` (no `source` field). The stitch skips obvious non-content
  paths (scratchpad, `node_modules`, `.nuxt`, …) before folding the rest in, so the
  mechanical half doesn't drown the curated one.
- **Schema impact — additive only, no version bump (per the policy above).** The
  `sessions` schema is `.strict()`, so derived fields must be *declared* to be
  stored — but all go in as **optional** keys (`models`, `subagents`, `toolCounts`,
  `filesEdited`, `durationSec`, `gitBranch`, …), which the policy allows anytime;
  old logs omit them and stay valid. `docsRead`/`skillsUsed` are **unchanged** — a
  folded-in read just fills the required `reason` with a `(unknown)` placeholder, so
  their `{path|name, reason}` shape is untouched. Nothing narrows, renames, or adds
  a required field, so **no `schemaVersion: 2` / `z.union` is needed.**

**Not yet built (follow-up gated PR).** `scripts/session-trace.ts` (port of the
validated proof-of-concept); the `SessionEnd` handler; the scratch-writing helper;
the **`log-session` Skill update** (flip to model-invocable — drop
`disable-model-invocation: true`; rewrite `description` as a closure trigger;
author-to-scratch, no commit); the **`CLAUDE.md`** wrap-up guidance (self-judge
closure → invoke `log-session`; drop the ask-the-human step); the committed
`.claude/settings.json` hook entry; and the `sessions` schema change. Recorded here
as **decided**, to land gated.

## Landing mechanism as shipped (PR #148)

> **Amended (2026-07-06, PR #148).** The follow-up PR above shipped, but not as
> pure `SessionEnd`-lands-at-teardown: a network-freezing suspend was found to
> make `SessionEnd`'s push throw into a dead network, silently orphaning the
> log. The same `scripts/session-end.ts` script is wired to **three** hook
> events instead of one, in priority order:

- **`Stop` (primary).** Fires at the end of the turn in which the agent invoked
  `log-session` and wrote the scratch — the session is healthy and the network
  is live, so the log lands promptly, well before any teardown.
- **`SessionEnd` (fallback — catches what `Stop` missed).** Fires at teardown,
  including a web freeze (`reason: "other"`). Best-effort only now, not the sole
  chance — on a network-freezing suspend it can still fail silently, but `Stop`
  has usually already landed the log.
- **`SessionStart` matcher `resume` (deepest fallback).** A resumed session
  always has a live network, so this catches anything neither `Stop` nor
  `SessionEnd` managed to land.

A sentinel (`.session-logs/last-landed.json`) keyed on the authored scratch's
hash makes re-running the script on every `Stop` cheap: it only fetches/pushes
when the scratch has changed since the last landing, so a session with many
turns after closure doesn't re-push on each one. Net effect: **"lands on `main`
at teardown via the `SessionEnd` hook" is no longer an accurate description of
the common case** — the common case is landing live, mid-session, on `Stop`;
`SessionEnd` only covers the sessions `Stop` missed.

## Closure invoked via a `close-session` front door

> **Amended (2026-07-07, issue #215).** Refines *how the model is triggered to
> author*, not how the log lands. **Nothing about the committer changes.**

**The problem.** The mechanism above made logging *self-judged and
model-invocable*: the agent should invoke `log-session` the moment its work is
coherent. Interactive sessions still forget — they finish substantive work
(commits, an opened PR) and never author the scratch, so the committer (which
fires **only if** a scratch exists) commits nothing and the session leaves no
honest log. Issue #215 recorded this recurring 2/20 in one window; the fix a
prior run reached for — a general `Stop` hook that reminds/blocks when work
happened but no scratch exists (issue #176's declined "option 2") — is
**untested runtime behaviour the safety gate cannot vouch for (ADR-0004)** and
reverses a prior deliberate decision, so it was escalated rather than built.

**Two `Stop`-hook roles, do not conflate them.** The word "`Stop` hook" covers
two different things here:

- **The committer (`scripts/session-end.ts`) — unchanged, load-bearing.** Fires
  every `Stop`; does real work *only* when a scratch exists; derives the trace,
  stitches, and lands the log to `main`. This is the "Landing mechanism as
  shipped" above and it is **not touched**.
- **A hypothetical *reminder/block* hook — the thing #215/#176 proposed and this
  amendment *again declines*.** It would fire when a session *acted but authored
  no scratch*, to nudge or force the model into authoring one.

**Decision.**

1. **A model-facing `close-session` Skill is the single front door for Session
   closure.** Its `description` is the closure *trigger* — a deliberately loose,
   early "am I wrapping up?" signal, looser than "work complete and coherent" so
   it trips while the agent can still act. Invoking it runs the closing sequence:
   coherent state → gated-PR discipline (ADR-0003, in CLAUDE.md) → the session
   log, which it authors **by calling `log-session`**. The existing committer then
   lands that scratch, exactly as before.

2. **`log-session` demotes from trigger to capability.** Its `description` stops
   advertising a closure trigger (that now single-homes in `close-session`) and
   becomes capability-shaped — *create **or update** the log* — so the model sees
   **one** closure trigger, not two competing ones. It stays directly invocable to
   *amend* an already-authored log.

3. **The reminder/block hook stays declined — but now measurably so.** We bet a
   better-shaped *affordance* (a discrete, named, freshly-surfaced Skill) fixes
   more forgetting than buried prose (issue #215's rejected "option B") without
   the ADR-0004 cost of ungateable runtime code. Crucially this is **not
   prose-only**: `close-session`'s **invocation rate is an observable metric**.
   That metric is the success criterion — if forgetting persists despite the
   affordance, the heavier automatic net returns to the table with data behind it,
   rather than being built on a hunch.

**Consequences.**

- **De-escalation.** The fix ships as an ordinary Skill (ADR-0005) + doc/glossary
  edits — first-class, repo-committed, clears the normal gate. It touches **no**
  runtime hook code, so it is *not* the human-only, ungateable change #215 was
  escalated as.
- **No mechanical guarantee — by design.** If the model never senses closure,
  nothing fires, same as before this change; the affordance improves the odds, it
  does not force. The invocation metric is what makes that acceptable: we measure
  before spending the ADR-0004 budget on a hard net.
- **Coverage still depends on authoring a scratch**, and the committer, sentinel,
  diff-guard, and three-event landing are all unchanged. This amendment is purely
  about *what triggers the authoring*.

## Bounded exception: the pre-#367 truncation sweep (2026-07-16, issue #449 Gap 5)

> **Amended.** The Schema evolution policy above states plainly: *"Their
> history is **append-only ground truth**: entries are never rewritten and
> never migrated"* and *"rewriting history is forbidden by this ADR."* This
> amendment carves out one narrow, bounded, one-time exception — it does not
> reopen a general "logs are mutable" door.

**The problem.** PR #367 (2026-07-12) found that an authored `outcome`
containing an unquoted ` #` (e.g. `outcome: PR #354 merged`) silently
truncates at YAML-parse time — everything from the `#` onward is read as a
comment and dropped. The guard added there stops it at author time going
forward, but the back-catalog was never swept: issue #449 Gap 5 asked for
exactly that sweep, with an explicit acceptance criterion that a repaired log
validate against the frozen schema.

**Decision.** `scripts/sweep-truncated-sessions.ts` may correct the `outcome`
field of an already-landed log — and *only* that field, for *only* this one
bug signature — via two mechanisms, both bounded and auditable:

- **Exact recovery.** When the full originally-intended text is still
  physically present in the committed file (the parser's `.comment` on the
  still-unquoted node recovers it byte-for-byte, the same mechanism
  `findTruncatedScalars` already uses at author time) — this only re-quotes
  text already sitting in the file, changing no fact.
- **Corroborated reconstruction.** When the landed value is already a bare
  fragment with nothing left to recover (the truncation happened upstream, at
  author time, before the file was ever committed) — reconstructed only when
  unambiguous (a lone `PR` against exactly one `prs` entry). Anything more
  ambiguous is flagged via the new optional `historicallyTruncated` field
  (Schema evolution policy above: an additive optional field, no
  `schemaVersion` bump), never guessed.

Every write re-validates the full entry against the frozen `sessions` schema
before landing; a repair that would produce an invalid entry aborts loudly
instead of silently corrupting the file. Nothing else in an entry — `goal`,
`summary`, `frictions`, timestamps, or any other field — is ever touched by
this sweep, and no other field's truncation is repaired by it, even where the
same bug signature was incidentally spotted elsewhere (Gap 5 scoped this to
`outcome`, the one field PR #367 already established as affected; a broader
sweep is a distinct follow-up, not silently folded in here).

**Consequences.**

- This is a **one-time, scoped correction of a mechanical bug's fallout**, not
  a precedent for editing session-log content generally — a future agent
  reaching for `sweep-truncated-sessions.ts`'s pattern to "fix" an entry's
  prose for any other reason is exactly the door this amendment does *not*
  open.
- The corrected text supersedes the bug-mangled value as the log's current
  ground truth; the mangled value remains visible in the file's prior git
  history (`git log -p`) for anyone who needs the literal bytes that were
  actually on `main` before this sweep.
- `historicallyTruncated` marks a log the sweep could only flag, not repair —
  a durable, machine-readable record that its `outcome` is known-incomplete
  and the true original text may be unrecoverable.

## External sessions: marked, and excluded from self-improvement mining (2026-07-22)

> **Amended.** Adds one optional field (`external`) to the schema and defines
> which consumers must ignore an external session. The direct-to-`main` boundary,
> the derived/authored split, and every other field are unchanged.

**Context.** The Platform now accepts session logs authored by an **external**
session — a completely different harness / agent / environment, not our Claude
Code toolchain. The first real one arrived on fork PR #631: a contributor's own
agent running on Grok via a "Hermes" harness (`entrypoint: external_hermes`).
Such a log is a genuine, honest self-report and belongs in the record — the
Timeline and dashboard should show it. But its **frictions** and **skill-usage**
describe a toolchain our fixes cannot touch: a Hermes/Grok friction does not
generalize to our Claude-Code development, and mining it would send the
self-improvement loop chasing non-generalizing signal. Its **ideas**, by
contrast, are toolchain-agnostic — a good idea is worth surfacing wherever it
came from.

**Decision.** Add an optional `external: z.boolean().optional()` to the frozen
`sessions` schema (`shared/schemas/session.ts`). **Absent ⇒ internal** (our
harness); only an external contributor's log ever sets it, so every existing
internal log stays valid under `.strict()`, and our own sessions leave it absent.
A single-homed `isExternalSession(raw)` predicate lives beside the schema. The
consumers split three ways:

- **Excluded entirely** — `frictions-to-fixes` (via `scripts/session-frictions.ts`)
  and `audit-skills` (via `scripts/audit-skills.ts`) drop an external session
  before it enters the corpus: no friction mining, no skill-usage tally, no
  regression/closure signal from it.
- **Ideas kept, learnings dropped** — the Sparks data layer (`scripts/sparks.ts`,
  `readSparkMaterial`) still gathers an external session's `ideas` but omits its
  `learnings`.
- **Unchanged** — internal (non-external) behaviour is byte-for-byte identical;
  external sessions remain visible in the Timeline/dashboard record.

**Consequences.**

- Additive and optional, so no `schemaVersion` bump per the evolution policy
  above; older logs and every internal log validate unchanged.
- The exclusion is enforced in the scripts' read layer, not left to the Skill
  prose — an external log cannot leak into the mining corpus even if a future
  survey forgets the rule.
- `external` is self-declared by the external harness (unlike the derived
  mechanical trace); we take the contributor's log at its word here, exactly as
  we do for its authored `goal`/`summary`/`frictions`.

**Delivery — the one session log that travels a PR.** This ADR's Decision commits
a session log **directly to `main`, never through a PR** — but that path is
*ours*: it runs on the `Stop`/`SessionEnd` committer and pushes to `main`, neither
of which an external contributor's environment has. So an external session log is
delivered the only way it can be: **committed as an ordinary file inside the
contributor's feature PR** (`layers/journal/content/current/sessions/<date>-session_<id>.yml`),
landing on `main` when that gated PR merges. This is the **single sanctioned
exception** to the "never through a PR" boundary above — narrow (one additive,
schema-valid log file: the same inert content type the boundary already trusts)
and self-limiting (it rides a human-reviewed, human-merged PR, an even higher bar
than the direct-to-`main` path it stands in for). The direct-to-`main` rule is
unchanged for every internal session. The external-contributor house rules are
indexed in `docs/agents/guest-contributions.md`.

## `session` reclassified as derived, not authored (2026-07-16)

> **Amended.** The "Automatic logging via a `SessionEnd` hook" section above
> already draws the line: *"Mechanical (derived, never self-reported)... Authored
> (irreducible): `goal`, `outcome`, `summary`, `frictions`."* `session` was never
> explicitly named on either side of that split — an oversight this closes, not a
> new principle.

**The gap.** `stitch()` took `session` straight from the agent-typed
`AuthoredScratch`, even though the mechanical trace already computes the same
identity from the transcript. This is exactly the self-reported-field failure
mode the `SessionEnd` hook section's whole split exists to avoid — and it landed
a real incident: a session whose transcript carried a raw-UUID internal id (a
plain local CLI session's own id, not the `session_01…` form a CCR/cloud session
publishes in its claude.ai URL and GitHub PR footers) had its own log filed under
the wrong identity, since nothing checked the typed value against ground truth.

**The fix.** `session` now resolves from ground truth: `CLAUDE_CODE_REMOTE_SESSION_ID`
(env, normalized `cse_…` → `session_…`) when present — the id that actually
appears in claude.ai URLs and PR footers for a CCR session — else the
transcript's own `sessionId`, which genuinely is canonical for a plain local CLI
session (no CCR wrapper exists there to disagree with it). The authored value is
now a last-resort fallback only, used solely when neither source resolves at all.
Schema-wise this changes nothing (`session: z.string()` is unchanged); it is a
same-field trust-model correction, not a new field or a breaking change.

## Folded-in `docsRead` reason split in two (2026-07-07)

> **Amended.** The Decision and Consequences above describe a single
> `(unknown)` placeholder `reason` for every folded-in read. That's now split
> into two derived placeholders, `docsRead`-only (`skillsUsed` still gets one
> plain placeholder — there's no analogous "edited" signal for a Skill):

- **`(read before editing)`** — the path also appears in `filesEdited`. The
  Edit tool (and Write on a file that already existed) refuses to run unless
  the path was `Read` first in the same session, so this read wasn't
  unexplained — it was a harness-enforced precondition of the edit that
  happened to go uncited. Worded as "before", not "required for": the trace is
  derived from `tool_use` calls, not results, so a `Read` attempted against a
  path that didn't exist yet still lands in `filesRead` even though it errored
  and read nothing.
- **`(no reason given)`** — every other folded-in read, and any folded-in
  skill. Renamed from the original `(unknown)` for the same reason: a plain
  read genuinely carries no derivable signal for *why*, whereas an edited
  path's read does.

Shape is unchanged (still `{path|name, reason}`, no `source` field) — this is
a same-field wording refinement, not a schema change, so it needs no
`schemaVersion` bump per the policy above. Older logs already committed with
the literal `(unknown)` string stay valid history; only newly-derived entries
use the split wording.
