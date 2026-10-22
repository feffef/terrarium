// The `session` collection kind's shared schema (ADR-0009 / ADR-0025). A session
// log is one append-only, honest self-report per Claude session — the Platform's
// primary self-documentation signal. It moved here from the Journal manifest when
// `session` became a first-class **collection kind** (ADR-0025): a session log is
// a Platform contract, not Tenant-private content, and now that the Commons
// Timeline reads sessions across the Catalog, the shape is a genuine cross-consumer
// contract that wants a single home. Journal's `sessions` collection references it
// via `kind: 'session'`; `scripts/session/log-session.ts` validates authored logs against
// it; the Timeline projects it. Behaviour is unchanged from the pre-move inline
// schema — same fields, same `.strict()`.
import { z } from 'zod'
// The string-not-`z.date()` rationale lives with the shared refinement.
import { utcTimestamp } from './timestamp'

// A subagent's percent of the session's tokens, main session plus every
// subagent, each weighted by its price relative to fresh input whatever the
// model: a rough cost indicator, not a bill. The main session has the rest.
// Weights: scripts/session/transcript-trace.ts (`weightOf`).
const tokenShare = z.number().min(0).max(100)

export const usefulVerdict = z.enum(['yes', 'partly', 'no'])
export const ruleVerdict = z.object({ path: z.string(), reason: z.string(), useful: usefulVerdict })
export const relevantAdr = z.object({ adr: z.number().int().positive(), reason: z.string() })
export type UsefulVerdict = z.infer<typeof usefulVerdict>
export type RuleVerdict = z.infer<typeof ruleVerdict>
export type RelevantAdr = z.infer<typeof relevantAdr>

/**
 * The grow-only `sessions` schema (ADR-0009). `status`/`kind` are queryable spines;
 * `frictions` is a required list (may be []) forcing reflection. Strict → L1
 * validation. Length hints in comments are intent only — a friction log must
 * never fail the build over word count.
 */
export const sessionSchema = z
  .object({
    // Absent ⇒ 1. A breaking change adds a v2 object with z.literal(2) and makes
    // this z.union([v1, v2]); never .default(1), which would blur absent ⇒ v1.
    // Readers tolerate older or unknown versions. Policy: ADR-0009.
    schemaVersion: z.literal(1).optional(),
    session: z.string(), // Claude session id — stable identity
    startedAt: utcTimestamp, // UTC ISO-8601 — session start (ordering anchor)
    endedAt: utcTimestamp, //   UTC ISO-8601 — session end / log authored
    // Autonomy spectrum, judged by who prompted — canonical definitions:
    // the log-session Skill.
    kind: z.enum(['interactive', 'delegated', 'autonomous']),
    goal: z.string(), // short plain headline — what the session worked on
    // `in-review`: the session opened a gated PR that hasn't merged, the norm at
    // closure. `completed` is for work that landed or needed no PR; the session
    // re-logs as `completed` when its PR merges (close-session Skill).
    status: z.enum(['completed', 'in-review', 'partial', 'blocked', 'abandoned']),
    outcome: z.string(), // one-liner — prose nuance on `status`
    summary: z.string(), // the fuller narrative; sizing guidance: log-session Skill
    prs: z.array(z.string()).default([]), // 0..N already-landed work-PR refs
    // docsRead/skillsUsed merge the agent's entries with derived ones, folded in
    // with a placeholder `reason` (ADR-0009). `useful` is authored only, so absent
    // on derived reads and older logs.
    docsRead: z
      .array(z.object({ path: z.string(), reason: z.string(), useful: usefulVerdict.optional() }))
      .default([]),
    skillsUsed: z.array(z.object({ name: z.string(), reason: z.string() })).default([]),
    // Mechanical trace — derived from the transcript by scripts/session/transcript-trace.ts
    // when the landing script runs (ADR-0009), never self-reported. All optional: absent ⇒
    // an older, authored-only log. Additive per the schema-evolution policy.
    durationSec: z.number().int().nonnegative().optional(),
    models: z.record(z.string(), z.number().int()).optional(), // model id → assistant-turn count
    toolCounts: z.record(z.string(), z.number().int()).optional(), // tool name → call count
    filesEdited: z.array(z.string()).optional(),
    // Path-scoped `.claude/rules/` files that loaded on a file touch, so an audit
    // can see which ADR summaries fired and whether a full read followed.
    rulesLoaded: z.array(z.string()).optional(),
    // Rules with no `paths`, which load at session start.
    rulesGlobal: z.array(z.string()).optional(),
    // The subset of the rule lists whose ADR was read after the rule loaded.
    rulesFollowedUp: z.array(z.string()).optional(),
    // Rules only a subagent or workflow agent loaded, and the `docsRead`
    // instruction docs only one read. Their verdicts sit in `ruleVerdicts` and
    // `docsRead` like any other, merged by the main session (#1941).
    rulesLoadedBySubagents: z.array(z.string()).optional(),
    docsReadBySubagents: z.array(z.string()).optional(),
    ruleVerdicts: z.array(ruleVerdict).optional(),
    // DEPRECATED — no longer written; shell reads fold into `docsRead`. The key
    // stays so older logs validate (ADR-0009).
    docsReadViaShell: z.array(z.string()).optional(),
    subagents: z
      .array(
        z.object({
          type: z.string().optional(),
          task: z.string().optional(),
          model: z.string().optional(),
          durationSec: z.number().int().nonnegative().optional(),
          toolCalls: z.number().int().nonnegative().optional(),
          modelCalls: z.number().int().nonnegative().optional(),
          tokenShare: tokenShare.optional(),
        }),
      )
      .optional(),
    gitBranch: z.string().optional(),
    entrypoint: z.string().optional(),
    cliVersion: z.string().optional(),
    // A human-legible identifier for what fired a Routine-triggered session —
    // derived by transcript-trace.ts's extractTrace ONLY when entrypoint is
    // 'remote_trigger' (issue #449 Gap 1); absent for every other session.
    trigger: z.string().optional(),
    // Marks a log authored by an EXTERNAL harness — a different agent / toolchain /
    // environment (first seen on fork PR #631's Hermes/Grok run, entrypoint
    // `external_hermes`). ABSENT ⇒ internal (our Claude Code harness); only an
    // external contributor's log ever sets it, so every existing internal log
    // stays valid under `.strict()`. Mining skips it (ADR-0009):
    // `frictions-to-fixes` and `audit-skills` skip an
    // external session entirely — its frictions/skill-usage reflect a toolchain
    // our fixes don't touch — while the ideas data layer still surfaces its `ideas`
    // (a good idea is toolchain-agnostic) and drops only its `learnings`.
    external: z.boolean().optional(),
    // True ONLY on the synthetic placeholder the landing script's recoverDroppedScratch
    // lands when a scratch was authored then lost before it could land (issue #449
    // Gap 3). Gives consumers a structured way to exclude/label it. Absent on every
    // genuinely agent-authored log.
    droppedScratchRecovery: z.literal(true).optional(),
    // Which hook registration performed this landing (`Stop`, `SessionEnd`,
    // `SessionStart`): the evidence for retiring the two fallbacks (ADR-0009,
    // When to revisit). Absent on a hand-landed or pre-#865 log.
    landedBy: z.string().optional(),
    // List EVERY friction — not just one or two. No `tag`: the Friction Ledger
    // groups frictions by cause instead (GLOSSARY.md).
    frictions: z.array(
      z.object({
        description: z.string(), // ~20 words — honest description
        solution: z.string(), // possible fix / what would have helped
        severity: z.enum(['nit', 'minor', 'moderate', 'major', 'blocker']),
      }),
    ),
    // Two OPTIONAL authored notes — see the Session and Idea glossary entries
    // (GLOSSARY.md). `.optional()`, not `.default([])`, so an empty log stays
    // truly empty.
    learnings: z.array(z.string()).optional(),
    ideas: z.array(z.string()).optional(),
    // The ADRs the agent judged relevant to its work, each with a one-line
    // reason (#2386). Authored, optional.
    relevantAdrs: z.array(relevantAdr).optional(),
    // Field names a back-catalog sweep (issue #449 Gap 5) suspects were silently
    // truncated by the pre-#367 unquoted-`#` bug but couldn't repair with
    // confidence. Absent on every log the sweep didn't flag.
    historicallyTruncated: z.array(z.string()).optional(),
  })
  .strict()

/** True when a raw (parsed, not-yet-validated) session log was authored by an
 *  EXTERNAL harness — the `external: true` flag above. Single home for that check,
 *  shared by every self-improvement consumer that must exclude external sessions
 *  (visitor-loop's `ideas.ts`, `scripts/session/audit-skills.ts`, `scripts/session/extract-frictions.ts`;
 *  ADR-0009). Absent/false/non-object ⇒ internal. */
export function isExternalSession(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && (raw as Record<string, unknown>).external === true
}
