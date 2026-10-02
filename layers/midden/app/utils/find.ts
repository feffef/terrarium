// The shape of one catalogued find, and the two formatters that render its
// record facts — shared by the Midden's two renderers so they can never drift:
// MiddenArtifact.vue (the trench's display slip) and StoresLanding.vue (the
// stores register). CONTEXT.md's Artifact term defines the fields themselves.
//
// Exports are layer-prefixed (`formatMiddenDate`, not `formatDate`) because Nuxt
// auto-imports every `app/utils` export globally across ALL layers — the same
// collision hazard strata.ts documents for `digSeasonOf`, and the convention the
// Blog and Marquee layers already follow with `formatBlogDate`/`formatMarqueeDate`.
import type { z } from 'zod'
import type { artifactSchema } from '../../tenant.config'

/** One raw `artifacts` Document. The filename (`stem`) IS the slug; the schema
 *  carries no `slug` field of its own. */
export type MiddenArtifactDoc = z.input<typeof artifactSchema> & { stem: string }

export type MiddenProvenance = MiddenArtifactDoc['provenance']

// Deterministic, locale-independent date prose (no `toLocaleDateString`, whose
// SSR/client locale mismatch causes hydration errors). #526 asks only that
// `assessedAt` render as prose, never re-derive condition from it.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-07-16` → `16 Jul 2026`. */
export function formatMiddenDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

/** The file name alone: a repo-root-relative path is long enough to overflow the
 *  record line on a narrow column, and the provenance link already carries the
 *  full path for anyone who follows it. */
function fileNameOf(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

/** A kind-appropriate provenance label derived from the REAL discriminated union. */
export function middenProvenanceLine(p: MiddenProvenance): string {
  switch (p.kind) {
    case 'pr':
      return `PR #${p.number} · ${p.merged ? 'merged' : 'closed'}`
    case 'branch':
      return `branch · ${p.name}`
    case 'commit':
      return `commit ${p.hash.slice(0, 7)}${p.path ? ` · ${fileNameOf(p.path)}` : ''}`
    case 'file':
      return `file · ${fileNameOf(p.path)}`
    case 'dependency':
      return `dependency · ${p.name}`
    case 'skill':
      return `Skill · ${p.name}`
    default:
      return p // exhaustive: `p` is `never` if a provenance kind is added unhandled
  }
}
