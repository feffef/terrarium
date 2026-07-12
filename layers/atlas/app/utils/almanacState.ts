// Pure logic under the Almanac's shared state (#282, map #279) — mark-list
// semantics, the `?day=` param parser, and today-as-a-Glass-day. Deliberately
// framework-free (not even Vue) so it unit-tests in the node program
// (`layers/atlas/tests/unit/almanac-state.spec.ts`), matching `utils/atlas.ts`.
// The reactive shell — the `Almanac` interface, its factory, and the
// provide/inject glue — lives in `composables/almanac.ts`, whose header
// documents the contract #283 builds against.
import { DAYS_PER_YEAR, dateToDay, normalizeDay } from './almanac'

/** A distinguished tick a descendant registers on the dial — e.g. a later
 *  `::sighting{date}` MDC component (#283) marking its dated observation.
 *  `id` must be stable for the component instance (use `useId()`); `day` is a
 *  day-of-year (normalized on registration); `kind` groups marks for styling
 *  (default `'sighting'`); `label` is optional accessible/tooltip text. */
export interface AlmanacMark {
  id: string
  day: number
  kind?: string
  label?: string
}

/** `marks` with `mark` registered: the day is rounded + normalized onto the
 *  wheel, a mark with the same id is replaced (registration is idempotent —
 *  re-running setup must not duplicate), and the result is sorted by day then
 *  id so the dial's render order is deterministic. Pure — returns a new list. */
export function withAlmanacMark(marks: AlmanacMark[], mark: AlmanacMark): AlmanacMark[] {
  return [
    ...marks.filter((m) => m.id !== mark.id),
    { ...mark, day: normalizeDay(Math.round(mark.day)) },
  ].sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))
}

/** `marks` without the mark registered under `id`; unknown ids are a no-op.
 *  Pure — returns a new list. */
export function withoutAlmanacMark(marks: AlmanacMark[], id: string): AlmanacMark[] {
  return marks.filter((m) => m.id !== id)
}

/** One dated field-log entry as the Almanac carries it (#283) — the subset of
 *  an `observations` Document a `::sighting{date}` needs to quote the ledger
 *  without retyping it (the note stays single-homed in the YAML). */
export interface AlmanacObservation {
  date: string
  time?: string
  specimen?: string
  note?: string
}

/** The ledger's entry for a real date ('YYYY-MM-DD', exact string match).
 *  Prefers an observation of `specimen` (the page's own inhabitant); falls
 *  back to the first in-list observation of that date by anyone in the biome.
 *  `undefined` when the ledger is silent — the caller decides how honest to
 *  be about that. Pure. */
export function findObservationOn(
  observations: AlmanacObservation[],
  date: string,
  specimen?: string,
): AlmanacObservation | undefined {
  const onDate = observations.filter((o) => o.date === date)
  return (specimen ? onDate.find((o) => o.specimen === specimen) : undefined) ?? onDate[0]
}

/** Parse a `?day=` query value (string | string[] | null from vue-router) into
 *  a day-of-year, or `null` when absent/malformed/out of range — strict on
 *  purpose so a garbled shared link falls back to today rather than snapping
 *  the needle somewhere surprising. Accepts whole days 0..364 only. */
export function parseAlmanacDayParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || !/^\d{1,3}$/.test(raw)) return null
  const n = Number(raw)
  return n >= 0 && n < DAYS_PER_YEAR ? n : null
}

/** A `Date`'s day in the fixed 365-day Glass Year (local time — the observer's
 *  day, not UTC's). Delegates to `dateToDay`, the calendar's one home, so
 *  29 February clamps onto day 58 there and nowhere else. */
export function glassDayOf(date: Date): number {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return dateToDay(`${date.getFullYear()}-${mm}-${dd}`)
}
