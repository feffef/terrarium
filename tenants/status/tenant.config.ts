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
    // Structured glossary terms — queryable data, not routed. Strict → L1 contract.
    glossary: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          term: z.string(),
          definition: z.string(),
        })
        .strict(),
    },
  },
})
