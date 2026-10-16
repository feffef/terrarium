// Manifest for the Glass Box Tenant (layers/glassbox/GLOSSARY.md).
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'glassbox',
  spaces: ['guide', 'drafts'],
  collections: {
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        revision: z.string().regex(/^[0-9a-f]{40}$/, 'revision must be a full commit hash'),
        revisionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'revisionDate must be YYYY-MM-DD'),
      }),
    },
    terms: {
      type: 'data',
      source: '**/*.yml',
      schema: z.object({
        term: z.string(),
        definition: z.string(),
        source: z.string().optional(),
      }),
    },
  },
})
