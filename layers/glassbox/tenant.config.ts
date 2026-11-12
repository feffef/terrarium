// Manifest for the Glass Box Tenant (layers/glassbox/GLOSSARY.md).
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'glassbox',
  spaces: ['guide', 'workshop'],
  collections: {
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        // For glassbox-curate's guide index, never shown to visitors; page-checks.ts requires it on guide pages (writing-pages.md, Pin).
        teaches: z.string().optional(),
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
        lesson: z.string().optional(), // GLOSSARY.md, Term
      }),
    },
    // The workshop Space's state (GLOSSARY.md): one entry per curate run, named
    // by its UTC start time, `YYYY-MM-DDTHHMM.yml`.
    runs: {
      type: 'data',
      source: '**/*.yml',
      schema: z.object({
        session: z.string(),
        mode: z.enum(['autonomous', 'interactive']),
        focus: z.string(), // one line: what the run took on and why
        changes: z.array(z.string()), // "page | what changed | why"
        pagesRead: z.array(z.string()), // every page read in full by a fresh reader or the lead, and nothing else; tracks coverage
      }),
    },
    // glassbox-update's full-check state; a list because a page-to-date map is not a plain ZodObject.
    checks: {
      type: 'data',
      source: '**/*.yml',
      schema: z.object({
        pages: z.array(z.object({ page: z.string(), checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'checked must be YYYY-MM-DD') })),
      }),
    },
  },
})
