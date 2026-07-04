// Manifest for the Journal Tenant — the Platform's self-documentation (CONTEXT.md).
// Declarative intent only — the generator expands this into keyed collections.
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

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
      }),
    },
    // The Platform's Skill catalogue — structured data, not routed. Strict → L1.
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
          importance: z.enum(['core', 'supporting', 'peripheral']),
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
          session: z.string(), // Claude session id — stable identity
          date: z.date(),
          kind: z.enum(['interactive', 'autonomous']),
          goal: z.string(), // ≤ 8 words — what the session set out to do
          status: z.enum(['completed', 'partial', 'blocked', 'abandoned']),
          outcome: z.string(), // ≤ 8 words — prose nuance on `status`
          summary: z.string(), // ≤ 100 words — the fuller narrative
          prs: z.array(z.string()).default([]), // 0..N already-landed work-PR refs
          docsRead: z
            .array(z.object({ path: z.string(), reason: z.string() }))
            .default([]),
          skillsUsed: z
            .array(z.object({ name: z.string(), reason: z.string() }))
            .default([]),
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
        })
        .strict(),
    },
  },
})
