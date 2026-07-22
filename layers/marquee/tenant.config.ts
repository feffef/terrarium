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

// A UTC ISO-8601 timestamp kept as a *string* on purpose (NOT `z.date()`,
// which truncates to a DATE column and drops time-of-day). Copied locally
// rather than shared: Tenants share no code (CONTEXT.md isolation stance).
const utcTimestamp = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && !Number.isNaN(Date.parse(v)),
    'must be a UTC ISO-8601 timestamp ending in Z, e.g. 2026-07-17T09:00:00Z',
  )

export default defineTenant({
  name: 'marquee',
  spaces: ['reel'],
  collections: {
    // The routed guide. Named `pages` per the Platform convention the shared
    // resolver enforces (ADR-0006) though it holds film write-ups. The `page`
    // type injects path/title/description/body/seo; the schema below adds
    // only what a Chapter post actually carries. All fields optional because
    // the Space's `index.md` landing carries none of them.
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
      schema: z.object({
        // A Chapter's position in the in-universe MCU timeline this Tenant
        // tracks (1 = earliest story chronology, not release order). The
        // landing omits it — hence optional.
        order: z.number().int().positive().optional(),
        // Publish instant — drives "posted" display, mirrors the Blog's field.
        publishedAt: utcTimestamp.optional(),
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
