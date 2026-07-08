// Manifest for the Journal Tenant — the Platform's self-documentation (CONTEXT.md).
// Declarative intent only — the generator expands this into keyed collections.
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

// A UTC ISO-8601 timestamp, kept as a *string* on purpose — NOT `z.date()`.
// Nuxt Content maps a `z.date()` field to a SQL `DATE` column and persists only
// the `YYYY-MM-DD` part, silently dropping the time-of-day. That truncation is
// what collapsed every session in the dashboard to `00:00 UTC` with 1- or
// 1440-minute durations and unstable same-day ordering. A plain string is stored
// verbatim (VARCHAR), so the full instant round-trips through the content DB.
// The refine enforces the UTC the field name and comment promise — a canonical
// `…Z` instant, not a bare date and not a local/offset time. A zone-less value
// like `2026-07-04T22:45` would be re-parsed in the *viewer's* zone (the dashboard
// renders client-side), reintroducing the very drift this fix removes; and unlike
// `.datetime()` — which routes to a `DATETIME` column that re-renders in local time
// and drops the `Z` — a plain string leaves the raw UTC value untouched.
const utcTimestamp = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && !Number.isNaN(Date.parse(v)),
    'must be a UTC ISO-8601 timestamp ending in Z, e.g. 2026-07-05T08:57:53Z',
  )

export default defineTenant({
  name: 'journal',
  // Two Spaces so the isolation invariant (ADR-0004 L3) is actually exercised:
  // same collections, physically separate content per Space.
  spaces: ['current', 'archived'],
  collections: {
    // Rendered documentation pages — 1:1 file → route within the Space.
    pages: {
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        // `page` type already supplies path/title/description/body/seo.
        badge: z.string().optional(),
        // A Digest's one-line day-headline (ADR-0010): the source the `digest`
        // Skill bakes into the index's "recent digests" preview. Optional and
        // non-strict, so ordinary pages (index/about) simply omit it.
        summary: z.string().optional(),
      }),
    },
    // The Platform's Skill Inventory — structured data, not routed. Strict → L1.
    // Its purpose is NOT to restate each Skill's own description, but to record
    // its *role and importance to this project*. Skills are installed wholesale
    // from an external pack (skills-lock.json), so this is where they get
    // Terrarium-specific context; CLAUDE.md points agents here. The planned
    // `sync`/`codify` jobs would maintain it once they exist.
    skills: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          name: z.string(),
          category: z.enum(['platform-operation', 'general-engineering']),
          importance: z.enum(['essential', 'specialist', 'supporting', 'peripheral']),
          // ≤ ~50 words — a tight paragraph on the Skill's role + importance to
          // this project, NOT a copy of its own description; deeper detail lives
          // in the Skill's own docs. ~80 is the outer limit; beyond that, trim.
          role: z.string(),
        })
        .strict(),
    },
    // Session logs — one append-only, honest self-report per Claude session
    // (ADR-0009). Primary signal the `consolidate`/`codify` jobs mine for
    // recurring friction, so the shape favours what aggregates: `status`/`kind`
    // are queryable spines; `frictions` is a required list (may be []) forcing
    // reflection. Strict → L1 validation. Length hints below are intent only,
    // NOT enforced — a friction log must never fail the build over word count.
    sessions: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          schemaVersion: z.literal(1).optional(), // absent ⇒ 1; evolution policy: ADR-0009
          session: z.string(), // Claude session id — stable identity
          startedAt: utcTimestamp, // UTC ISO-8601 — session start (ordering anchor)
          endedAt: utcTimestamp, //   UTC ISO-8601 — session end / log authored
          // Autonomy spectrum, judged by who prompted — canonical definitions:
          // CONTEXT.md → Session.
          kind: z.enum(['interactive', 'delegated', 'autonomous']),
          goal: z.string(), // ≤ 8 words — what the session set out to do
          // `in-review` is the honest state of a session that opened a gated PR
          // but hasn't seen it merged — the norm at closure (ADR-0003/0009), not
          // `completed`, which is reserved for work that actually landed (or
          // needed no PR). A later session flips it to `completed` on merge.
          status: z.enum(['completed', 'in-review', 'partial', 'blocked', 'abandoned']),
          outcome: z.string(), // ≤ 8 words — prose nuance on `status`
          summary: z.string(), // ≤ 100 words — the fuller narrative
          prs: z.array(z.string()).default([]), // 0..N already-landed work-PR refs
          // docsRead/skillsUsed are a *merged* field (ADR-0009 amendment): the
          // agent's curated entries plus transcript-observed reads the SessionEnd
          // extractor folds in. Shape is unchanged — `reason` stays required; a
          // derived entry the agent never annotated gets a placeholder —
          // `(read before editing)` for a docsRead path also edited, `(no reason
          // given)` otherwise.
          docsRead: z
            .array(z.object({ path: z.string(), reason: z.string() }))
            .default([]),
          skillsUsed: z
            .array(z.object({ name: z.string(), reason: z.string() }))
            .default([]),
          // Mechanical trace — derived from the session transcript by the
          // SessionEnd extractor (ADR-0009 amendment), never self-reported. All
          // optional: absent ⇒ an older, authored-only log. Additive per the
          // schema-evolution policy (no version bump).
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
          // List EVERY friction — not just one or two — including anything that
          // felt unnecessarily complex or token-heavy. No `tag` yet: the
          // taxonomy is meant to emerge from clustering, once there is data.
          frictions: z.array(
            z.object({
              description: z.string(), // ~20 words — honest description
              solution: z.string(), // possible fix / what would have helped
              severity: z.enum(['nit', 'minor', 'moderate', 'major', 'blocker']),
            }),
          ),
          // Two OPTIONAL authored spark fields (not derivable, unlike the
          // mechanical trace above) — see the `learnings`/`ideas` definitions on
          // the Session glossary entry (CONTEXT.md). Filled in only when the
          // session actually sparked one; `.optional()`, not `.default([])`, so an
          // empty log stays truly empty. Additive per the ADR-0009 schema-evolution
          // policy — no version bump.
          learnings: z.array(z.string()).optional(),
          ideas: z.array(z.string()).optional(),
        })
        .strict(),
    },
  },
})
