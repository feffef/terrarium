// The `session` collection kind's shared schema (ADR-0009 / ADR-0025). A session
// log is one append-only, honest self-report per Claude session — the Platform's
// primary self-documentation signal. It moved here from the Journal manifest when
// `session` became a first-class **collection kind** (ADR-0025): a session log is
// a Platform contract, not Tenant-private content, and now that the Commons
// Timeline reads sessions across the Catalog, the shape is a genuine cross-consumer
// contract that wants a single home. Journal's `sessions` collection references it
// via `kind: 'session'`; `scripts/log-session.ts` validates authored logs against
// it; the Timeline projects it. Behaviour is unchanged from the pre-move inline
// schema — same fields, same `.strict()`.
import { z } from 'zod'
// The string-not-`z.date()` rationale lives with the shared refinement.
import { utcTimestamp } from './timestamp'

/**
 * The frozen `sessions` schema (ADR-0009). `status`/`kind` are queryable spines;
 * `frictions` is a required list (may be []) forcing reflection. Strict → L1
 * validation. Length hints in comments are intent only — a friction log must
 * never fail the build over word count.
 */
export const sessionSchema = z
  .object({
    schemaVersion: z.literal(1).optional(), // absent ⇒ 1; evolution policy: ADR-0009
    session: z.string(), // Claude session id — stable identity
    startedAt: utcTimestamp, // UTC ISO-8601 — session start (ordering anchor)
    endedAt: utcTimestamp, //   UTC ISO-8601 — session end / log authored
    // Autonomy spectrum, judged by who prompted — canonical definitions:
    // CONTEXT.md → Session.
    kind: z.enum(['interactive', 'delegated', 'autonomous']),
    goal: z.string(), // ≤ 8 words — what the session set out to do
    // `in-review` is the honest state of a session that opened a gated PR but
    // hasn't seen it merged — the norm at closure (ADR-0003/0009), not
    // `completed`, which is reserved for work that actually landed (or needed no
    // PR). A later session flips it to `completed` on merge.
    status: z.enum(['completed', 'in-review', 'partial', 'blocked', 'abandoned']),
    outcome: z.string(), // ≤ 8 words — prose nuance on `status`
    summary: z.string(), // ≤ 100 words — the fuller narrative
    prs: z.array(z.string()).default([]), // 0..N already-landed work-PR refs
    // docsRead/skillsUsed are a *merged* field (ADR-0009 amendment): the agent's
    // curated entries plus transcript-observed reads the SessionEnd extractor
    // folds in. `reason` stays required; a derived entry the agent never
    // annotated gets a placeholder — `(read before editing)` for a docsRead path
    // also edited, `(no reason given)` otherwise.
    docsRead: z.array(z.object({ path: z.string(), reason: z.string() })).default([]),
    skillsUsed: z.array(z.object({ name: z.string(), reason: z.string() })).default([]),
    // Mechanical trace — derived from the session transcript by the SessionEnd
    // extractor (ADR-0009 amendment), never self-reported. All optional: absent ⇒
    // an older, authored-only log. Additive per the schema-evolution policy.
    durationSec: z.number().int().nonnegative().optional(),
    models: z.record(z.string(), z.number().int()).optional(), // model id → assistant-turn count
    toolCounts: z.record(z.string(), z.number().int()).optional(), // tool name → call count
    filesEdited: z.array(z.string()).optional(),
    subagents: z
      .array(
        z.object({
          type: z.string().optional(),
          task: z.string().optional(),
          model: z.string().optional(),
        }),
      )
      .optional(),
    gitBranch: z.string().optional(),
    entrypoint: z.string().optional(),
    cliVersion: z.string().optional(),
    // A human-legible identifier for what fired a Routine-triggered session —
    // derived by session-trace.ts's extractTrace ONLY when entrypoint is
    // 'remote_trigger' (issue #449 Gap 1); absent for every other session.
    trigger: z.string().optional(),
    // Marks a log authored by an EXTERNAL harness — a different agent / toolchain /
    // environment (first seen on fork PR #631's Hermes/Grok run, entrypoint
    // `external_hermes`). ABSENT ⇒ internal (our Claude Code harness); only an
    // external contributor's log ever sets it, so every existing internal log
    // stays valid under `.strict()`. Governs self-improvement mining (ADR-0009
    // amendment, 2026-07-22): `frictions-to-fixes` and `audit-skills` skip an
    // external session entirely — its frictions/skill-usage reflect a toolchain
    // our fixes don't touch — while the Sparks feed still surfaces its `ideas`
    // (a good idea is toolchain-agnostic) and drops only its `learnings`.
    external: z.boolean().optional(),
    // True ONLY on the synthetic placeholder session-end.ts's recoverDroppedScratch
    // lands when a scratch was authored then lost before it could land (issue #449
    // Gap 3). Gives consumers a structured way to exclude/label it. Absent on every
    // genuinely agent-authored log.
    droppedScratchRecovery: z.literal(true).optional(),
    // List EVERY friction — not just one or two. No `tag` yet: the taxonomy is
    // meant to emerge from clustering, once there is data.
    frictions: z.array(
      z.object({
        description: z.string(), // ~20 words — honest description
        solution: z.string(), // possible fix / what would have helped
        severity: z.enum(['nit', 'minor', 'moderate', 'major', 'blocker']),
      }),
    ),
    // Two OPTIONAL authored spark fields — see the `learnings`/`ideas` definitions
    // on the Session glossary entry (CONTEXT.md). `.optional()`, not
    // `.default([])`, so an empty log stays truly empty.
    learnings: z.array(z.string()).optional(),
    ideas: z.array(z.string()).optional(),
    // Field names a back-catalog sweep (issue #449 Gap 5) suspects were silently
    // truncated by the pre-#367 unquoted-`#` bug but couldn't repair with
    // confidence. Absent on every log the sweep didn't flag.
    historicallyTruncated: z.array(z.string()).optional(),
  })
  .strict()

/** True when a raw (parsed, not-yet-validated) session log was authored by an
 *  EXTERNAL harness — the `external: true` flag above. Single home for that check,
 *  shared by every self-improvement consumer that must exclude external sessions
 *  (`scripts/sparks.ts`, `scripts/audit-skills.ts`, `scripts/session-frictions.ts`;
 *  ADR-0009 amendment, 2026-07-22). Absent/false/non-object ⇒ internal. */
export function isExternalSession(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && (raw as Record<string, unknown>).external === true
}
