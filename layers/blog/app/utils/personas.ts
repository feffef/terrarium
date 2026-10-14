// Presentational metadata for the Personas (layers/blog/GLOSSARY.md: Persona).
// The Space slug IS the persona's name; this only adds a display capitalisation
// and a per-persona accent colour. NOT the voice/stance — that lives in the
// `blog-post` Skill and each Persona's index.md landing. Lives in `utils/` so
// Nuxt auto-imports the exports into the layer's pages and components.
import { routingMap } from '#routing'

interface PersonaMeta {
  /** Display name shown in the byline. */
  name: string
  /** Accent colour, set inline as `--bl-accent` on the page root. */
  accent: string
  /** One-line epithet that tells the four apart at a glance. */
  epithet: string
}

const PERSONAS: Record<string, PersonaMeta> = {
  david: { name: 'David', accent: '#4f6f8f', epithet: 'the curious observer' }, // calm, measured blue
  karen: { name: 'Karen', accent: '#b1503f', epithet: 'the relentless sceptic' }, // hostile red-clay
  kevin: { name: 'Kevin', accent: '#4f8f6a', epithet: 'the dazzled, nervous dev' }, // eager green
  eyra: { name: 'Eyra', accent: '#8f5f9f', epithet: 'the artist in the tank' }, // artsy violet
}

/** Persona slugs in manifest (Space) order. */
export const PERSONA_SLUGS = Object.keys(routingMap.blog)

export function personaMeta(slug: string): PersonaMeta {
  return PERSONAS[slug] ?? { name: slug, accent: '#4f6f8f', epithet: '' }
}
