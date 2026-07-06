// Presentational metadata for the three biomes (CONTEXT.md: Biome). The Space
// slug IS the biome's name; this adds the editorial framing — display name,
// wing numeral, one-line character, and the JS-side palette echoes the front
// door's swatches and the food-web node strokes need. NOT the content: specimens,
// interactions, and observations all live in the keyed collections. The full
// palette (CSS custom properties) lives in `app/assets/theme.css`, keyed by the
// `.atlas--<slug>` wrapper class; this module only mirrors the two accent hues
// that JS has to draw with. Imported relatively by the layer's pages (aliases
// resolve to the main app, not the layer — docs/agents/tenant-layers.md §1).
export interface BiomeMeta {
  /** Space slug — the biome's identity. */
  slug: string
  /** Display name, e.g. "The Canopy". */
  name: string
  /** Wing numeral in the guide's front matter, e.g. "I". */
  numeral: string
  /** The biome's character in two words, e.g. "dappled, patient". */
  character: string
  /** One sentence of naturalist framing for the front-door directory. */
  blurb: string
  /** Primary accent (leaf/umber/pondlight) — front-door swatch, web strand ink. */
  accent: string
  /** Secondary accent (dapple/rust/glass) — the wing's second swatch. */
  accent2: string
}

export const BIOMES: BiomeMeta[] = [
  {
    slug: 'canopy',
    name: 'The Canopy',
    numeral: 'I',
    character: 'dappled, patient',
    blurb: 'The high green rooms, where light arrives in pieces and everything waits.',
    accent: '#4b7a4a',
    accent2: '#c8a53a',
  },
  {
    slug: 'floor',
    name: 'The Floor',
    numeral: 'II',
    character: 'dark, industrious',
    blurb: 'The under-world of soil and litter, worked over ceaselessly and never quite still.',
    accent: '#9a5a2b',
    accent2: '#b3612f',
  },
  {
    slug: 'pool',
    name: 'The Pool',
    numeral: 'III',
    character: 'cool, glassy',
    blurb: 'The still water at the glass, where the light bends and the slow things live.',
    accent: '#3f7f8f',
    accent2: '#6fa3ad',
  },
]

const BY_SLUG: Record<string, BiomeMeta> = Object.fromEntries(BIOMES.map((b) => [b.slug, b]))

/** Biome slugs in the guide's presentation order (matches the manifest's Spaces). */
export const BIOME_SLUGS = BIOMES.map((b) => b.slug)

export function biomeMeta(slug: string): BiomeMeta {
  return (
    BY_SLUG[slug] ?? {
      slug,
      name: slug,
      numeral: '',
      character: '',
      blurb: '',
      accent: '#6f6656',
      accent2: '#9a927e',
    }
  )
}
