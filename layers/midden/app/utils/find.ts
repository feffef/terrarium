// The shape of one catalogued find, and the two formatters that render its
// record facts — shared by the Midden's two renderers so they can never drift:
// MiddenArtifact.vue (the trench's display slip) and StoresLanding.vue (the
// stores register). CONTEXT.md's Artifact term defines the fields themselves.
//
// Exports are layer-prefixed (`formatMiddenDate`, not `formatDate`) because Nuxt
// auto-imports every `app/utils` export globally across ALL layers — the same
// collision hazard strata.ts documents for `digSeasonOf`, and the convention the
// Blog and Marquee layers already follow with `formatBlogDate`/`formatMarqueeDate`.

/** An Artifact's own words, quoted verbatim (tenant.config.ts's `inscription`). */
export interface MiddenInscription {
  text: string
  source: string
}

/** One curator-curated link to the artifact's preserved original state
 *  (tenant.config.ts's `remainEntry` — SHA-pinned, immutable). */
export interface MiddenRemain {
  label: string
  url: string
}

/** The discriminated provenance union (tenant.config.ts's `provenance`), mirrored
 *  as a plain TS type — the manifest exports only the zod schema, not its
 *  inferred type. */
export type MiddenProvenance =
  | { kind: 'pr'; number: number; merged: boolean; url?: string; continuityCheck?: string }
  | { kind: 'branch'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'commit'; hash: string; path?: string; url?: string; continuityCheck?: string }
  | { kind: 'file'; path: string; url?: string; continuityCheck?: string }
  | { kind: 'dependency'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'skill'; name: string; url?: string; continuityCheck?: string }

/** One raw `artifacts` Document, narrowed to the fields a find renders. The
 *  filename (`stem`) IS the slug; the schema carries no `slug` field of its own.
 *  `site` is absent on a stored find — see tenant.config.ts's `site` comment. */
export interface MiddenArtifactDoc {
  stem: string
  title: string
  stratum: string
  condition: import('./condition').Grade
  provenance: MiddenProvenance
  catalogNote: string
  assessedAt: string
  site?: string
  removedIn?: string
  remains?: MiddenRemain[]
  inscription?: MiddenInscription
}

// Deterministic, locale-independent date prose (no `toLocaleDateString`, whose
// SSR/client locale mismatch causes hydration errors). #526 asks only that
// `assessedAt` render as prose, never re-derive condition from it.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-07-16` → `16 Jul 2026`. */
export function formatMiddenDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

/** A kind-appropriate provenance label derived from the REAL discriminated union. */
export function middenProvenanceLine(p: MiddenProvenance): string {
  switch (p.kind) {
    case 'pr':
      return `PR #${p.number} · ${p.merged ? 'merged' : 'closed'}`
    case 'branch':
      return `branch · ${p.name}`
    case 'commit':
      return `commit ${p.hash.slice(0, 7)}${p.path ? ` · ${p.path}` : ''}`
    case 'file':
      return `file · ${p.path}`
    case 'dependency':
      return `dependency · ${p.name}`
    case 'skill':
      return `Skill · ${p.name}`
    default:
      return p // exhaustive: `p` is `never` if a provenance kind is added unhandled
  }
}
