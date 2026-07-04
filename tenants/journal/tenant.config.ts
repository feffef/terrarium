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
  },
})
