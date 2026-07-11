// Presentational metadata for the three Personas (layers/blog/CONTEXT.md:
// Persona). The Space
// slug IS the persona's name; this only adds a display capitalisation and a per-
// persona accent colour. NOT the voice/stance — that lives in the `blog-post`
// Skill and each Persona's index.md landing. Lives in `utils/` so Nuxt
// auto-imports the exports into the layer's pages and components.
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

// This slug set is also declared in `../../tenant.config.ts` (the `persona`
// enum / `spaces:`) — that copy is deliberate, not drift to fix: the manifest
// is self-contained (jiti-evaluated at build time) and must not import
// presentation code, so the two sides can't share a single source.
/** Persona slugs in a stable display order (matches the manifest's Space order). */
export const PERSONA_SLUGS = Object.keys(PERSONAS)

export function personaMeta(slug: string): PersonaMeta {
  return PERSONAS[slug] ?? { name: slug, accent: '#4f6f8f' }
}
