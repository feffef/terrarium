// The Artifact view shape + formatting helpers for the Midden layer — folded
// here from the retired `useMiddenTrenchData` composable when the visitor flow
// was flattened to land → read (owner-directed post-MVP simplification; see
// layers/midden/CONTEXT.md). Nuxt-free on purpose (mirrors utils/condition.ts):
// plain types and pure functions, auto-imported into the layer's components.
import type { Grade } from './condition'

/** An Artifact's own words, quoted verbatim (tenant.config.ts's `inscription`). */
export interface MiddenInscription {
  text: string
  source: string
}

/** The discriminated provenance union (tenant.config.ts's `provenance`),
 *  mirrored as a plain TS type — the manifest only exports the zod schema
 *  itself, not its inferred type, so the components that need the shape share
 *  this one declaration instead of re-deriving it per call site. */
export type MiddenProvenance =
  | { kind: 'pr'; number: number; merged: boolean; url?: string; continuityCheck?: string }
  | { kind: 'branch'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'commit'; hash: string; path?: string; url?: string; continuityCheck?: string }
  | { kind: 'file'; path: string; url?: string; continuityCheck?: string }
  | { kind: 'dependency'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'skill'; name: string; url?: string; continuityCheck?: string }

/** One catalogued Artifact, with the content-collection `stem` surfaced as
 *  `slug` — tenant.config.ts's `artifacts` schema carries no `slug` field of
 *  its own; the filename (Nuxt Content's `stem` base field) IS the slug every
 *  `::midden-artifact{slug="..."}` embed and the `site` back-reference
 *  resolve against. */
export interface MiddenArtifactView {
  slug: string
  title: string
  stratum: string
  condition: Grade
  provenance: MiddenProvenance
  site: string
  catalogNote: string
  assessedAt: string
  inscription?: MiddenInscription
}

/** A raw `artifacts` collection Document, as returned by `queryCollection` —
 *  narrowed to the fields `toMiddenArtifactView` reads. */
export interface MiddenArtifactDoc {
  stem: string
  title: string
  stratum: string
  condition: Grade
  provenance: MiddenProvenance
  site: string
  catalogNote: string
  assessedAt: string
  inscription?: MiddenInscription
}

/** Map one raw `artifacts` Document onto its `MiddenArtifactView`. */
export function toMiddenArtifactView(doc: MiddenArtifactDoc): MiddenArtifactView {
  return {
    slug: doc.stem,
    title: doc.title,
    stratum: doc.stratum,
    condition: doc.condition,
    provenance: doc.provenance,
    site: doc.site,
    catalogNote: doc.catalogNote,
    assessedAt: doc.assessedAt,
    inscription: doc.inscription,
  }
}

/** The compact provenance line — a kind-appropriate label derived from the
 *  discriminated union, shared by every surface that prints one. */
export function provenanceLine(p: MiddenProvenance): string {
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

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Deterministic, locale-independent date prose (no `toLocaleDateString`, whose
 *  SSR/client locale mismatch causes hydration errors). */
export function formatMiddenDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}
