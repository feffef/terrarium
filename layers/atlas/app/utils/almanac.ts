// Pure Glass-Year almanac math for the Atlas layer — the calendar/geometry kernel
// under the almanac dial (#279/#280). Nuxt-free on purpose, mirroring `atlas.ts`:
// the dial SFC and the MDC components pass plain data in, so the fiddly parts
// (wrap-past-New-Year spans, year-boundary arc splits, angle unwrap) stay
// unit-testable without a build.
//
// Conventions (the one home for them — every consumer follows these):
// - The Glass Year IS the real calendar (#279 decision 1): a fixed 365-day year,
//   days indexed 0..364, day 0 = 1 January. Leap days are ignored — 29 February
//   maps onto day 58, the same day as 28 February.
// - Dial angles are in DEGREES: day 0 sits at 12 o'clock (the top of the dial)
//   and days advance CLOCKWISE, one year = 360°. So day d → d · (360/365)°.
// - A `Span` is a half-open day range [start, end): the start day is inside, the
//   end day is not — so adjacent seasons share a boundary day count of zero.
//   Spans may wrap the New Year (start > end, e.g. [300, 45]). A span with
//   start === end means the FULL YEAR (a phase that never ends), not an empty
//   one: an author writing it means "always", and an empty arc is nothing worth
//   drawing. This is the annual twin of `atlas.ts`'s activeAt band logic.
// - `arcPath` geometry is centred on the ORIGIN (0,0): the dial component wraps
//   its paths in a `<g transform="translate(cx, cy)">`.

/** Days in the Glass Year. Fixed — leap days are deliberately ignored. */
export const DAYS_PER_YEAR = 365

// ── Spans ────────────────────────────────────────────────────────────────────

/** A half-open day-of-year range [start, end) on the wheel. May wrap the New
 *  Year (start > end). start === end means the FULL year (see module header). */
export type Span = [number, number]

/** Any integer day → its day on the wheel, 0..364 (365 → 0, -1 → 364). */
export function normalizeDay(day: number): number {
  return ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR
}

/** True when `day` falls inside `span` — the "is the needle inside this arc"
 *  test, and the annual twin of `atlas.ts`'s activeAt. Start is inside, end is
 *  not; wrapped spans cover the New Year; [a, a] covers every day. */
export function inSpan(day: number, span: Span): boolean {
  const d = normalizeDay(Math.floor(day))
  const [a, b] = span
  if (a === b) return true // full year
  return a < b ? d >= a && d < b : d >= a || d < b
}

/** The number of days a span covers (wrapped spans count across the boundary;
 *  [a, a] is the whole year, 365). */
export function spanLength(span: Span): number {
  const [a, b] = span
  if (a === b) return DAYS_PER_YEAR
  return a < b ? b - a : DAYS_PER_YEAR - a + b
}

/** The day at the middle of a span — where the needle swings to "show" it.
 *  Wrap-aware: the midpoint of [300, 45] is 355, near the year boundary, not
 *  172. May be a half day (e.g. 347.5); `dayToAngle` accepts that as-is. */
export function spanMidpoint(span: Span): number {
  return (span[0] + spanLength(span) / 2) % DAYS_PER_YEAR
}

// ── The Glass Year's six seasons ─────────────────────────────────────────────

/** One season of the Glass Year, as it appears on the dial's rim. `name` is the
 *  url-safe slug authors write (`:season{of="long-damp"}`); `label` is the
 *  naturalist's display form; `gloss` is the legend's one-line note. */
export interface Season {
  name: string
  label: string
  span: Span
  gloss?: string
}

/** The six seasons of the Glass Year — a calendar kept by the misting schedule
 *  and the radiator, not the sun (#279 decision 2). They partition the year:
 *  contiguous, non-overlapping, every day in exactly one season (test-pinned).
 *  Listed in year order starting from the season that holds New Year; the
 *  Radiator Months wrap the boundary, as heating seasons do. */
export const GLASS_SEASONS: Season[] = [
  {
    name: 'radiator-months',
    label: 'the Radiator Months',
    span: [320, 45],
    gloss: 'the pipes come on below; the air runs dry-warm and the pool gives up an inch',
  },
  {
    name: 'lamp-lengthening',
    label: "the Lamp's Lengthening",
    span: [45, 106],
    gloss: 'the keepers let the light run longer by small, deniable increments',
  },
  {
    name: 'great-airing',
    label: 'the Great Airing',
    span: [106, 141],
    gloss: 'the lid stands open an hour a day; opinions on the draught differ',
  },
  {
    name: 'long-damp',
    label: 'the Long Damp',
    span: [141, 233],
    gloss: 'the misting at its most liberal; the glass never quite dries, and neither do we',
  },
  {
    name: 'small-dry',
    label: 'the Small Dry',
    span: [233, 260],
    gloss: "a lapse in the misting each year, coinciding, we note, with the keeper's holiday",
  },
  {
    name: 'settling',
    label: 'the Settling',
    span: [260, 320],
    gloss: 'after the great cleaning everything re-arranges itself, an inch at a time',
  },
]

/** The season containing `day` (normalized onto the wheel first). Total: the
 *  partition guarantees every day belongs to exactly one season. */
export function seasonOf(day: number): Season {
  return GLASS_SEASONS.find((s) => inSpan(day, s.span))!
}

// ── Angles ───────────────────────────────────────────────────────────────────

/** Day-of-year → dial angle in degrees. Day 0 is 12 o'clock; days advance
 *  clockwise; one year is a full turn. Accepts fractional days (a span midpoint,
 *  a mid-drag needle) and days outside 0..364 (they map proportionally). */
export function dayToAngle(day: number): number {
  return (day * 360) / DAYS_PER_YEAR
}

/** Dial angle in degrees → the nearest whole day-of-year, 0..364. The inverse of
 *  `dayToAngle` on whole days. Any real angle is accepted — it is normalized onto
 *  the dial first, and an angle rounding up to "day 365" wraps to day 0. */
export function angleToDay(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360
  return Math.round((normalized * DAYS_PER_YEAR) / 360) % DAYS_PER_YEAR
}

/** Drag continuity: the representation of `next` (given modulo 360) closest to
 *  the previous unwrapped angle, so a needle crossing 12 o'clock keeps moving
 *  smoothly instead of snapping a whole year. The result is NOT normalized —
 *  feed it back in as `prev` on the next move; normalize only when converting
 *  to a day (`angleToDay` already does). */
export function unwrapAngle(prev: number, next: number): number {
  return next + 360 * Math.round((prev - next) / 360)
}

// ── Arc geometry ─────────────────────────────────────────────────────────────

/** A dial point: angle in degrees (0° = 12 o'clock, clockwise) at radius r,
 *  centred on the origin. */
function pointAt(angle: number, r: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) }
}

/** Format a coordinate: 3 decimals, no trailing zeros, never '-0'. */
function fmt(n: number): string {
  const r = Math.round(n * 1000) / 1000
  return (Object.is(r, -0) ? 0 : r).toString()
}

/** One closed annular sector from day d0 to day d1 (d0 < d1, no wrap): outer
 *  arc clockwise, line inward, inner arc back, close. */
function sectorPath(d0: number, d1: number, r0: number, r1: number): string {
  const a0 = dayToAngle(d0)
  const a1 = dayToAngle(d1)
  const large = a1 - a0 > 180 ? 1 : 0
  const p1 = pointAt(a0, r1)
  const p2 = pointAt(a1, r1)
  const p3 = pointAt(a1, r0)
  const p4 = pointAt(a0, r0)
  return (
    `M ${fmt(p1.x)} ${fmt(p1.y)} ` +
    `A ${fmt(r1)} ${fmt(r1)} 0 ${large} 1 ${fmt(p2.x)} ${fmt(p2.y)} ` +
    `L ${fmt(p3.x)} ${fmt(p3.y)} ` +
    `A ${fmt(r0)} ${fmt(r0)} 0 ${large} 0 ${fmt(p4.x)} ${fmt(p4.y)} Z`
  )
}

/** SVG path for a span's annular sector between inner radius `r0` and outer
 *  radius `r1`, centred on the ORIGIN (wrap the dial's paths in a
 *  `<g transform="translate(cx, cy)">`). Always ONE string, usable as a single
 *  `<path d>`: a wrapped span yields two closed subpaths split at the New Year
 *  boundary, and a full-year span ([a, a]) yields two half-ring subpaths (a
 *  single 360° arc would degenerate — its start and end coincide). Each
 *  subpath carries its own large-arc flag. */
export function arcPath(span: Span, r0: number, r1: number): string {
  const [a, b] = span
  // Pieces are (start, end) day pairs with start < end; days past 364 are fine
  // (angles are periodic), which keeps the full-year halves simple.
  const pieces: Array<[number, number]> =
    a === b
      ? [
          [a, a + DAYS_PER_YEAR / 2],
          [a + DAYS_PER_YEAR / 2, a + DAYS_PER_YEAR],
        ]
      : a < b
        ? [[a, b]]
        : [
            [a, DAYS_PER_YEAR],
            [0, b],
          ]
  return pieces
    .filter(([d0, d1]) => d1 > d0)
    .map(([d0, d1]) => sectorPath(d0, d1, r0, r1))
    .join(' ')
}

/** Cumulative days before each month (fixed non-leap year), Jan..Dec. */
const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Real ISO date ('YYYY-MM-DD') → day-of-year (0..364) in the fixed 365-day
 *  Glass Year. The year part is accepted and discarded (every Glass Year is the
 *  same wheel); 29 February clamps to day 58 (= 28 February). Throws on a
 *  malformed string or an impossible month/day. */
export function dateToDay(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new TypeError(`dateToDay: expected 'YYYY-MM-DD', got '${iso}'`)
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) throw new RangeError(`dateToDay: month out of range in '${iso}'`)
  const maxDay = DAYS_IN_MONTH[month - 1]!
  // Allow the one real-world overflow (Feb 29) by clamping; reject the rest.
  if (day < 1 || day > maxDay + (month === 2 ? 1 : 0)) {
    throw new RangeError(`dateToDay: day out of range in '${iso}'`)
  }
  return DAYS_BEFORE_MONTH[month - 1]! + Math.min(day, maxDay) - 1
}
