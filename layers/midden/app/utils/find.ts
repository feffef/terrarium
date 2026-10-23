// The shape of one catalogued find, and the two formatters that render its
// record facts — shared by the Midden's two renderers so they can never drift:
// MiddenArtifact.vue (the trench's display slip) and StoresLanding.vue (the
// stores register). GLOSSARY.md's Artifact term defines the fields themselves.
//
// Exports are layer-prefixed (`formatMiddenDate`, not `formatDate`) because Nuxt
// auto-imports every `app/utils` export globally across ALL layers — the same
// collision hazard strata.ts documents for `digSeasonOf`, and the convention the
// Blog layer already follows with `formatBlogDate`.
import type { z } from 'zod'
import type { artifactSchema } from '../../tenant.config'
import type { DigSeason } from './strata'

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

/** A commit provenance whose hash is the find's `removedIn` commit: the commit
 *  that made it is the commit that removed it, so the record line says so once.
 *  Hashes differ in length (7–40), hence the prefix match. */
export function middenRemovedInProvenance(p: MiddenProvenance, removedIn?: string): boolean {
  return p.kind === 'commit' && !!removedIn && (p.hash.startsWith(removedIn) || removedIn.startsWith(p.hash))
}

/** A kind-appropriate provenance label derived from the REAL discriminated union. */
export function middenProvenanceLine(p: MiddenProvenance, removedIn?: string): string {
  switch (p.kind) {
    case 'pr':
      return `PR #${p.number} · ${p.merged ? 'merged' : 'closed'}`
    case 'branch':
      return `branch · ${p.name}`
    case 'commit':
      return `${middenRemovedInProvenance(p, removedIn) ? 'removed in' : 'commit'} ${p.hash.slice(0, 7)}${p.path ? ` · ${fileNameOf(p.path)}` : ''}`
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

/** A dig season's dates as prose: `5 Sep 2026 – 4 Oct 2026`, or `from 5 Oct 2026`
 *  for the open-ended one. */
export function middenSeasonSpan(season: DigSeason): string {
  return season.end ? `${formatMiddenDate(season.start)} – ${formatMiddenDate(season.end)}` : `from ${formatMiddenDate(season.start)}`
}
