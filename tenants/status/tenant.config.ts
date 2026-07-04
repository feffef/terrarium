// Manifest for the Living-Documentation Tenant (CONTEXT.md).
// Declarative intent only — the generator expands this into keyed collections.
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'status',
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
    // The Platform's Skill catalog — structured data, not routed. Strict → L1
    // contract. `category` mirrors the ADR-0005 split; the `sync` job would
    // derive these entries from `.agents/skills/` once it exists.
    skills: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          name: z.string(),
          category: z.enum(['platform-operation', 'general-engineering']),
          summary: z.string(),
        })
        .strict(),
    },
  },
})
