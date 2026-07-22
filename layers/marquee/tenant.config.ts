// Manifest for the Marquee Tenant — a movie-blog microsite covering the Marvel
// Cinematic Universe in in-universe story order rather than release order
// (CONTEXT.md Tenants roster: Marquee; layers/marquee/CONTEXT.md: Screening,
// Chapter; guest-submitted, issue #551). Declarative intent only:
// `content.config.ts` builds the keyed collection from this manifest at
// config-evaluation time, and the routing map is derived from it at build
// time (ADR-0002/0013/0014) — no generated file involved.
//
// One Space (`reel`) is enough: there is no lifecycle/voice/place distinction
// to model here, just a single ordered run of posts (mirrors the Commits
// Tenant's single-Space `poc` choice).
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'marquee',
  spaces: ['reel'],
  collections: {
    // The routed guide. Named `pages` per the Platform convention the shared
    // resolver enforces (ADR-0006) though it holds film write-ups. The `page`
    // type injects path/title/description/body/seo; the schema below adds
    // only what a Chapter post actually carries. All fields optional because
    // the Space's `index.md` landing carries none of them. `publishedAt`
    // (drives "posted" display) rides in from the `page` kind's contract
    // (shared/kinds.ts, ADR-0025).
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
      schema: z.object({
        // A Chapter's position in the in-universe MCU timeline this Tenant
        // tracks (1 = earliest story chronology, not release order). The
        // landing omits it — hence optional.
        order: z.number().int().positive().optional(),
        // The authored inner SVG markup for this Chapter's original,
        // Ghibli-inspired illustration (never a real film still or official
        // artwork — see the `MarqueePoster` component and layers/marquee/
        // CONTEXT.md for the art direction). Framed + captioned by the shared
        // Poster component, mirroring the Atlas's engraved-plate mechanism.
        illustration: z.string().optional(),
      }),
    },
  },
})
