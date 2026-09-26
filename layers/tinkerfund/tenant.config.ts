// Manifest for the Tinkerfund Tenant (layers/tinkerfund/CONTEXT.md).
// `prod` holds realistic simulated content; `qa` holds edge-case test data
// that Tinkerfund's e2e tests run against (issue #1375). No `kind`: Tinkerfund
// stays out of the Commons' Catalog. The content model is issue #1366;
// cross-Document references are checked in scripts/validate-content-refs.ts.
// The Collections' schemas live in schemas.ts.
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'
import { campaign, comment, count, offset, pledge, promotion, slug, svg, zone } from './schemas'

export default defineTenant({
  name: 'tinkerfund',
  spaces: ['prod', 'qa'],
  collections: {
    // Campaigns live at campaigns/<slug>.md, their Updates at
    // campaigns/<slug>/updates/<n>.md; other pages carry neither field.
    pages: {
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        campaign: campaign.optional(),
        update: z.object({ published: offset }).strict().optional(),
      }),
    },
    inventors: {
      type: 'data',
      source: '*.yml',
      schema: z.object({ name: z.string(), bio: z.string(), portrait: svg(1024) }).strict(),
    },
    categories: {
      type: 'data',
      source: '*.yml',
      schema: z.object({ name: z.string(), blurb: z.string(), icon: svg(1024), order: count }).strict(),
    },
    comments: {
      type: 'data',
      source: '*.yml',
      schema: z
        .object({
          campaign: slug,
          comments: z.array(comment.extend({ replies: z.array(comment).optional() })),
        })
        .strict(),
    },
    promotions: {
      type: 'data',
      source: '*.yml',
      schema: promotion,
    },
    backer: {
      type: 'data',
      source: '*.yml',
      schema: z
        .object({
          name: z.string(),
          email: z.string().email(),
          address: z
            .object({ street: z.string(), city: z.string(), postcode: z.string(), country: z.string(), zone })
            .strict(),
          pledges: z.array(pledge),
        })
        .strict(),
    },
    shop: {
      type: 'data',
      source: '*.yml',
      schema: z
        .object({
          /** `qa` pins "now" here; `prod` leaves it out and follows real time (#1364). */
          now: z.string().datetime().optional(),
          currency: z.literal('EUR'),
          zones: z.array(z.object({ id: zone, name: z.string() }).strict()),
          payments: z.array(z.object({ id: slug, label: z.string() }).strict()),
        })
        .strict(),
    },
  },
})
