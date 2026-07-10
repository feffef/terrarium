// Manifest for the Atlas Tenant — a lavishly designed natural-history field guide
// to a fictional ecosystem observed under glass (CONTEXT.md: Atlas / Biome /
// Specimen / Interaction / Observation; PRD #64). Declarative intent only:
// `content.config.ts` builds the keyed collections from this manifest at
// config-evaluation time, and the routing map is derived from it at build time
// (ADR-0002/0013/0014) — no generated file involved.
//
// The Atlas gives Spaces a third meaning: **places**. Where the Journal uses
// Spaces as lifecycle (`current`/`archived`) and the Blog as voices (Personas),
// the Atlas uses them as **biomes** — the same guide structure in each wing, with
// fully separate populations (a Specimen belongs to exactly one biome).
//
// Three collections per biome:
//  - `pages`        the routed guide: each Specimen is one page (structured
//                   frontmatter = the museum label; the body = the field-note
//                   essay), plus the biome's `index.md` landing intro.
//  - `interactions` the food-web edges — one directed edge per file. Both the
//                   diagram (#70) and a Specimen's own Relations (#71) are two
//                   views of THIS single-homed data. Same-biome only, so the web
//                   is always a same-Space read (mirrors ADR-0012's stance).
//  - `observations` the field log — dated sightings that accumulate over time
//                   (#72). Append-only in spirit; the world's heartbeat.
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

// The rarity ladder (#69), abundant → mythic. Ordered least-to-most precious;
// the layer maps each grade to its mark, dots, and legend gloss.
const rarity = z.enum(['abundant', 'common', 'uncommon', 'rare', 'mythic'])

// The five relationship kinds of the food web (#70/#71). Each edge is DIRECTED
// from → to; the layer derives the reverse label ("preys-on" ⇒ "preyed on by")
// so both directions are visible from one authored fact (single-home).
const interactionKind = z.enum(['preys-on', 'pollinates', 'mimics', 'shelters', 'fears'])

// A time-of-day bucket for the field log (#72) — coarse on purpose; the Atlas is
// a naturalist's notebook, not a timestamp.
const timeOfDay = z.enum(['dawn', 'noon', 'dusk', 'night'])

// One color of a Specimen's color signature (#68): a named hue and its hex. Named
// because the museum label states them in words ("lantern gold on soot"); the hex
// is what the page quietly wears.
const signatureColor = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'signature color must be a #rrggbb hex'),
})

export default defineTenant({
  name: 'atlas',
  // Biomes-as-Spaces: one grammar, three rooms, separate lives (#66). Ordered
  // canopy → floor → pool as the guide presents its wings.
  spaces: ['canopy', 'floor', 'pool'],
  collections: {
    // The routed guide. Named `pages` per the Platform convention the shared
    // resolver enforces (ADR-0006) though it holds Specimen entries + the biome
    // landing intro. The `page` type injects path/title/description/body/seo, so
    // the schema adds only the museum-label record. All fields optional because
    // the biome `index.md` landing is a plain page carrying none of them.
    pages: {
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        // The museum label (#67). `title` (from the page type) holds the Latin
        // binomial; these complete the caption card.
        commonName: z.string().optional(), // "the lantern moth"
        classification: z.string().optional(), // invented class, e.g. "glimmerwing"
        rarity: rarity.optional(),
        size: z.string().optional(), // free text, e.g. "3 cm at rest"
        diet: z.string().optional(), // free text, e.g. "starlight, mostly"
        // Activity rhythm (#73): a label plus the hour-bands the creature stirs,
        // each [startHour, endHour] on a 0–24 clock. Drives the rhythm band and
        // the wing-level composite.
        activity: z
          .object({
            label: z.string(), // "dusk-flier", "ever-waking"
            bands: z.array(z.tuple([z.number().min(0).max(24), z.number().min(0).max(24)])),
          })
          .optional(),
        // Phenology (#279): the annual sibling of `activity` — a creature's
        // phases across the Glass Year, each a day-of-year `span` that may wrap
        // ([300, 45]) exactly as the hour-bands above may wrap midnight. The
        // Glass Year IS the real 365-day calendar; the six tenant-wide seasons
        // it's divided into live in `utils/almanac.ts`, not here — a phase is
        // the separate, free-form, per-creature thing the almanac dial reads.
        phenology: z
          .object({
            phases: z
              .array(
                z.object({
                  name: z.string(), // slug a ::phase binds to
                  label: z.string(), // in-voice, e.g. "the lantern swell"
                  span: z.tuple([z.number().min(0).max(365), z.number().min(0).max(365)]), // day-of-year; may wrap
                  gloss: z.string().optional(),
                  quiet: z.boolean().optional(), // a going-dark phase — hatched inverse
                }),
              )
              .min(1),
          })
          .optional(),
        // Color signature (#68): 2–3 named hues that ARE the creature's identity.
        signature: z
          .object({
            colors: z.array(signatureColor).min(2).max(3),
            gloss: z.string(), // the label's spoken form, "lantern gold on soot"
          })
          .optional(),
        // The engraved plate (#67/#74). `illustration` is the authored inner SVG
        // markup (paths/lines in the guide's engraved style), framed + captioned
        // by the shared Plate component. `conjectural` grants a mythic plate the
        // "reconstructed from a partial sighting" register.
        plate: z
          .object({
            number: z.string(), // roman numeral, e.g. "XIV"
            conjectural: z.boolean().optional(),
          })
          .optional(),
        illustration: z.string().optional(), // inner SVG markup (viewBox 0 0 400 300)
      }),
    },
    // Food-web edges (#70/#71). One directed edge per file, same-biome only.
    // Strict → free L1 validation. Note carries the naturalist's one-liner.
    interactions: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          from: z.string(), // Specimen slug — the actor
          to: z.string(), // Specimen slug — the acted-upon
          kind: interactionKind,
          note: z.string(), // one line in the naturalist's voice
        })
        .strict(),
    },
    // Field log (#72). One dated observation per file; append-only in spirit.
    observations: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'observation date must be YYYY-MM-DD'),
          time: timeOfDay,
          // Optional: some entries are ambient ("something rippled. no further data").
          specimen: z.string().optional(), // Specimen slug observed, if any
          note: z.string(),
        })
        .strict(),
    },
  },
})
