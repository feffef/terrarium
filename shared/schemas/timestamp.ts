// The shared UTC-timestamp refinement (ADR-0025). Single home for the "a
// timestamp is a *string*, not `z.date()`" decision: Nuxt Content maps a
// `z.date()` field to a SQL `DATE` column and persists only the `YYYY-MM-DD`
// part, dropping the time-of-day — which would collapse every instant to
// `00:00 UTC` with unstable same-day ordering. A plain string is stored verbatim
// (VARCHAR), so the full instant round-trips through the content DB. The refine
// enforces a canonical `…Z` instant (not a bare date, not a local/offset time)
// so a zone-less value can't be re-parsed in the viewer's zone.
//
// Used by the `session` kind's contract (shared/schemas/session.ts), the `page`
// kind's contract (shared/kinds.ts), and any manifest field that wants the same
// canonical instant (e.g. the Blog's `pingbacks.reactedAt`).
import { z } from 'zod'

export const utcTimestamp = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && !Number.isNaN(Date.parse(v)),
    'must be a UTC ISO-8601 timestamp ending in Z, e.g. 2026-07-05T08:57:53Z',
  )
