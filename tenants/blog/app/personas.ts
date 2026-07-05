// Presentational metadata for the three Personas (CONTEXT.md: Persona). The Space
// slug IS the persona's name; this only adds a display capitalisation and a per-
// persona accent colour. NOT the voice/stance — that lives in the `blog-post`
// Skill and each Persona's index.md landing. Imported relatively by the layer's
// pages (mirrors how the journal layer imports its types).
export interface PersonaMeta {
  /** Display name shown in the byline. */
  name: string
  /** Accent colour, set inline as `--bl-accent` on the page root. */
  accent: string
}

export const PERSONAS: Record<string, PersonaMeta> = {
  david: { name: 'David', accent: '#4f6f8f' }, // calm, measured blue
  karen: { name: 'Karen', accent: '#b1503f' }, // hostile red-clay
  kevin: { name: 'Kevin', accent: '#4f8f6a' }, // eager green
}

/** Persona slugs in a stable display order (matches the manifest's Space order). */
export const PERSONA_SLUGS = ['david', 'karen', 'kevin'] as const

export function personaMeta(slug: string): PersonaMeta {
  return PERSONAS[slug] ?? { name: slug, accent: '#4f6f8f' }
}
