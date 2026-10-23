// The single-homed cause-of-death table (GLOSSARY.md's Cause of death term).
// Nuxt-free so the filter is unit-testable, like condition.ts.
import type { z } from 'zod'
import type { artifactSchema } from '../../tenant.config'

export type MiddenCause = z.input<typeof artifactSchema>['cause']

export interface MiddenCauseMeta {
  cause: MiddenCause
  /** Lower-case: it always reads inside a run of record facts. */
  label: string
  definition: string
}

// Order is the chip order.
export const MIDDEN_CAUSES: MiddenCauseMeta[] = [
  { cause: 'closed-by-owner', label: 'closed by owner', definition: 'Someone with the say chose not to land or keep it, or left it unlanded.' },
  { cause: 'cost-more-than-it-caught', label: 'cost more than it caught', definition: 'A check or guard whose friction outweighed the mistakes it stopped.' },
  { cause: 'outlived-its-need', label: 'outlived its need', definition: 'The need it served went away or moved elsewhere, leaving it nothing to do.' },
  { cause: 'built-to-be-discarded', label: 'built to be discarded', definition: 'A spike, probe, rehearsal or prototype, thrown away as planned.' },
  { cause: 'cut-as-excess', label: 'cut as excess', definition: 'It worked, but added nothing worth keeping.' },
  { cause: 'never-worked', label: 'never worked', definition: 'It could not have done its job as built.' },
  { cause: 'broke-something', label: 'broke something', definition: 'Removed because it caused a fault.' },
]

const BY_CAUSE = Object.fromEntries(MIDDEN_CAUSES.map((c) => [c.cause, c])) as Record<MiddenCause, MiddenCauseMeta>

export function middenCauseMeta(cause: MiddenCause): MiddenCauseMeta {
  return BY_CAUSE[cause]
}

/** An unknown or repeated `?cause=` means no filter, never an empty Trench. */
export function middenCauseFromQuery(value: unknown): MiddenCause | undefined {
  return typeof value === 'string' && Object.hasOwn(BY_CAUSE, value) ? (value as MiddenCause) : undefined
}

/** Chips for the causes some Site holds, each with how many Sites it leaves. */
export function middenCauseTally(siteCauses: MiddenCause[][]): { meta: MiddenCauseMeta; sites: number }[] {
  return MIDDEN_CAUSES.map((meta) => ({ meta, sites: siteCauses.filter((cs) => cs.includes(meta.cause)).length })).filter((t) => t.sites > 0)
}
