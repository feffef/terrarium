// Manifest for the Blog Tenant — a simple blog reporting on the Terrarium from
// several angles (CONTEXT.md Tenants roster: Blog; layers/blog/CONTEXT.md:
// Persona / Pingback). Declarative intent
// only; `content.config.ts` builds the keyed collections from this manifest at
// config-evaluation time, and the routing map is derived at build time
// (ADR-0013/0014) — there is no separate generator step.
//
// Each Space IS a Persona (its slug is the persona's name): `david` (neutral
// observer), `karen` (snarky sceptic), `kevin` (dazzled dev). Two collections per
// Space: `pages` (the routed blog — an index.md landing + posts) and `pingbacks`
// (inbound reactions authored here by *other* Personas; ADR-0012).
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

// A UTC ISO-8601 timestamp kept as a *string* on purpose (NOT `z.date()`, which
// truncates to a DATE column and drops the time-of-day). Copied locally rather
// than shared: Tenants share no code (CONTEXT.md isolation stance).
const utcTimestamp = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && !Number.isNaN(Date.parse(v)),
    'must be a UTC ISO-8601 timestamp ending in Z, e.g. 2026-07-05T08:57:53Z',
  )

// The Persona set, doubling as the Space slugs. Single-homed here so the zod
// enum below and `spaces:` can't drift apart (manifest is self-contained — no
// import from the layer's `app/` presentation code, which has its own,
// deliberately separate copy; see `app/utils/personas.ts`).
const personaSlugs = ['david', 'karen', 'kevin'] as const

// Used to type the ends of a Pingback so a reaction can only name a Persona
// that exists.
const persona = z.enum(personaSlugs)

// The curated cross-Persona Tag vocabulary (layers/blog/CONTEXT.md: Tag). Fixed
// and small on purpose — an enum, not free text, so an out-of-vocabulary tag
// fails `pnpm validate:content` (ADR-0004 L1) instead of drifting into a
// near-duplicate the `/t/blog` browse view can't group with the rest.
const blogTags = [
  'autonomy',
  'governance',
  'self-merge',
  'safety-gate',
  'session-logs',
  'skills',
  'multi-tenancy',
  'content-pipeline',
  'self-review',
  'provenance',
  'deploy',
  'testing',
  'bugs',
  'innovation',
  'slop',
] as const
const tag = z.enum(blogTags)

export default defineTenant({
  name: 'blog',
  // Personas-as-Spaces: same content model, physically isolated content per
  // Persona. The slug is the persona's name (layers/blog/CONTEXT.md: Persona).
  spaces: [...personaSlugs],
  collections: {
    // The routed blog. Named `pages` per the Platform convention the shared
    // resolver enforces (ADR-0006) though it holds blog *posts*. Non-strict: the
    // `page` type injects path/title/description/body/seo.
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
      schema: z.object({
        // Posts carry a publish instant (drives the reverse-chron feed); the
        // Space's index.md landing omits it — hence optional.
        publishedAt: utcTimestamp.optional(),
        // Present only on a *reaction* post: the outbound "in reply to" ref. The
        // target's title is inlined so the header renders with no cross-Space read.
        reactsTo: z
          .object({ persona, path: z.string(), title: z.string() })
          .optional(),
        // Topic labels for the cross-Persona `/t/blog` browse view — 2-5 is the
        // usual count, drawn only from the curated `blogTags` vocabulary above.
        // Optional so the Space's index.md landing (no topic of its own) omits it.
        tags: z.array(tag).optional(),
      }),
    },
    // Pingbacks — inbound reaction records (ADR-0012). A Pingback lives in the
    // *reacted-to* Persona's Space, denormalised at author time so the post page
    // renders its backlinks from a same-Space read. Strict → free L1 validation.
    // Append-only + strict: schema-evolution policy in ADR-0009 (no schemaVersion
    // needed until the first breaking change).
    pingbacks: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          target: z.string(), // Space-relative path of the post here being reacted to
          fromPersona: persona, // the reacting Persona (a sibling Space)
          fromPath: z.string(), // the reacting post's Space-relative path
          fromTitle: z.string(), // the reacting post's title — inlined, no cross-Space query
          blurb: z.string(), // one-line gist of the reaction
          reactedAt: utcTimestamp, // UTC ISO-8601 — when the reaction was authored
        })
        .strict(),
    },
  },
})
