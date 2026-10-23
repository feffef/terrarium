// The single-homed cause-of-death table (GLOSSARY.md's Cause of death term): the
// Trench's filter chips, each inline find and each stores card read their label
// and definition from here. The tenant.config.ts `cause` enum backs `cause`.
// Nuxt-free so the filter is unit-testable, like condition.ts.

export type Cause =
  | 'closed-by-owner'
  | 'cost-more-than-it-caught'
  | 'outlived-its-need'
  | 'built-to-be-discarded'
  | 'cut-as-excess'
  | 'broke-something'

export interface CauseMeta {
  cause: Cause
  label: string
  definition: string
}

// Order is the chip order.
export const CAUSES: CauseMeta[] = [
  { cause: 'closed-by-owner', label: 'Closed by owner', definition: 'Someone with the say chose not to land or keep it.' },
  { cause: 'cost-more-than-it-caught', label: 'Cost more than it caught', definition: 'A check or guard whose friction outweighed the mistakes it stopped.' },
  { cause: 'outlived-its-need', label: 'Outlived its need', definition: 'The problem it served went away, and nothing took up its job.' },
  { cause: 'built-to-be-discarded', label: 'Built to be discarded', definition: 'A spike, probe, rehearsal or prototype, thrown away as planned.' },
  { cause: 'cut-as-excess', label: 'Cut as excess', definition: 'It worked, or could have, but added nothing worth keeping.' },
  { cause: 'broke-something', label: 'Broke something', definition: 'Removed because it caused a fault.' },
]

const BY_CAUSE = Object.fromEntries(CAUSES.map((c) => [c.cause, c])) as Record<Cause, CauseMeta>

export function causeMeta(cause: Cause): CauseMeta {
  return BY_CAUSE[cause]
}

/** Parse a `?cause=` query value; anything unknown means no filter. */
export function middenCauseFromQuery(value: unknown): Cause | undefined {
  return typeof value === 'string' && value in BY_CAUSE ? (value as Cause) : undefined
}

/** Each cause with the number of Sites holding at least one find of it, in
 *  chip order; causes no Site holds are left out. */
export function middenCauseTally(siteCauses: Cause[][]): { meta: CauseMeta; sites: number }[] {
  return CAUSES.map((meta) => ({ meta, sites: siteCauses.filter((cs) => cs.includes(meta.cause)).length })).filter((t) => t.sites > 0)
}
