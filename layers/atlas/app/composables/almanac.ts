// The Almanac — the shared reactive state under the specimen page's almanac
// dial (#282, map #279), and THE contract the dial-driven MDC components
// (#283: `:season`, `::phase`, `::sighting`) build against. Auto-imported
// layer-wide (docs/agents/tenant-layers.md §1).
//
// ── The contract ─────────────────────────────────────────────────────────────
// The specimen page owns the state and provides it once in its setup:
//
//   const almanac = provideAlmanac({
//     phases: () => specimen.value?.phenology?.phases ?? [], // live getter
//     initialDay: parseAlmanacDayParam(route.query.day),     // null → today
//   })
//
// Any descendant — the wheel itself, or an MDC component arbitrarily deep
// inside `<ContentRenderer>` — injects it:
//
//   const almanac = useAlmanac()   // Almanac | null
//
// `useAlmanac()` returns **null** (never throws) when no ancestor provided the
// state, so an MDC component pasted into a non-specimen Document degrades
// gracefully instead of crashing the page — always null-check.
//
// Typical #283 usage: a `::phase{of="x"}` finds its span via
// `almanac.phases.value.find(p => p.name === of)` and lights up when
// `inSpan(almanac.day.value, span)`; a `::sighting{date}` does
// `register({ id: useId(), day: dateToDay(date), kind: 'sighting' })` in setup
// and `unregister(id)` in `onUnmounted`. Marks registered by components that
// render after the wheel (everything inside the essay does) appear on the dial
// reactively — client-side, post-hydration — by design, so the server-rendered
// markup stays mismatch-free.
//
// ── #283 extensions ──────────────────────────────────────────────────────────
// `engaged`/`engage()` — progressive-enhancement gate (map #279 decision 4):
// false until the reader first takes hold of the needle (the wheel flips it on
// first pointer grab or keyboard scrub; the prose handles that swing the
// needle flip it too). `::phase` gates its ink↔pencil register on it, so the
// essay server-renders fully inked and STAYS inked for a reader who never
// touches the dial.
// `observations`/`findSighting(date)` — the biome's dated ledger, provided by
// the page alongside `phases`, so a `::sighting{date}` can quote the
// observation's own note without retyping it (single-homed; lookup semantics
// in utils/almanacState.ts's findObservationOn).
//
// ── SSR / hydration (#279 decision 4) ────────────────────────────────────────
// `today` is computed once per request on the server and carried to the client
// in the Nuxt payload (`useState`), so a request served across midnight — or a
// server in another timezone — cannot park the SSR needle on one day and the
// hydrating client's on another. The state itself is created in the page's
// setup, i.e. per request: nothing leaks across requests. The mark-list and
// parsing semantics are pure functions in `utils/almanacState.ts`, unit-tested
// in `layers/atlas/tests/unit/almanac-state.spec.ts`.
import type { InjectionKey, MaybeRefOrGetter, Ref } from 'vue'
import type { AlmanacMark, AlmanacObservation } from '../utils/almanacState'
import type { PhenologyPhase } from '../utils/atlas'

/** The Almanac contract — what `useAlmanac()` returns (protocol in the file
 *  header above). */
export interface Almanac {
  /** The needle's current day-of-year, always normalized to 0..364. Reactive
   *  and shared: the wheel writes it on drag, `::phase`/`:season` read it. */
  day: Ref<number>
  /** Move the needle. Rounds + normalizes onto the wheel (365 → 0, -1 → 364). */
  setDay: (d: number) => void
  /** The real current day-of-year — the needle's home/reset position. */
  today: number
  /** The specimen's phenology phases (empty array when it has none), so a
   *  `::phase{of="name"}` can look up its span and compute `inSpan(day, span)`.
   *  A Ref because the catch-all page instance can be reused across specimens. */
  phases: Readonly<Ref<PhenologyPhase[]>>
  /** Marks registered by descendants, deduped by id and sorted by day (then
   *  id) — see `withAlmanacMark` in utils/almanacState.ts. */
  marks: Readonly<Ref<AlmanacMark[]>>
  /** Register (or re-register — same id replaces) a mark. Call in setup. */
  register: (mark: AlmanacMark) => void
  /** Remove a mark by id — call on unmount. Unknown ids are a no-op. */
  unregister: (id: string) => void
  /** True once the reader has taken hold of the needle — false on every fresh
   *  render, server and client alike (#283 extension; see header). `::phase`
   *  reads it so the essay stays fully inked until the dial is engaged. */
  engaged: Readonly<Ref<boolean>>
  /** Flip `engaged` (idempotent). Called by whichever interaction first hands
   *  the reader the needle — the wheel's pointer/keyboard scrub, or a prose
   *  handle's deliberate needle-swing. */
  engage: () => void
  /** A monotonic pulse bumped by `focusDay` — the "take me to this exact day
   *  AND draw the reader's eye there" signal the clickable dial ticks fire. A
   *  `::sighting` watches it and scrolls its quote into view when its own day
   *  is the target, so it reacts to a deliberate tap on its tick, not to every
   *  drag that happens to cross its day. */
  focusPulse: Readonly<Ref<number>>
  /** Move the needle to `day` (engaging the dial) and bump `focusPulse` — the
   *  clickable-tick path, distinct from the silent `setDay`. */
  focusDay: (day: number) => void
  /** This biome's dated field-log observations (empty when none provided) —
   *  the ledger a `::sighting{date}` quotes. */
  observations: Readonly<Ref<AlmanacObservation[]>>
  /** The ledger's entry for a real date ('YYYY-MM-DD'): an observation of this
   *  page's own specimen when there is one, else any in-biome entry of that
   *  date; `undefined` when the ledger is silent. Reactive when called inside
   *  a computed (it reads `observations`). */
  findSighting: (date: string) => AlmanacObservation | undefined
}

export interface ProvideAlmanacOptions {
  /** The specimen's phases; a getter/ref keeps it live across page reuse. */
  phases?: MaybeRefOrGetter<PhenologyPhase[] | undefined>
  /** Override the real current day (0..364) — for tests; defaults to
   *  `useGlassToday()`. */
  today?: number
  /** Where the needle parks initially — a parsed `?day=` param when present.
   *  `null`/`undefined` mean "no override": park at today. */
  initialDay?: number | null
  /** This biome's dated observations, for `findSighting` — a getter/ref keeps
   *  it live across page reuse (#283 extension). */
  observations?: MaybeRefOrGetter<AlmanacObservation[] | undefined>
  /** The page's own specimen slug — `findSighting` prefers its observations
   *  over another inhabitant's on the same date. */
  specimen?: MaybeRefOrGetter<string | undefined>
}

/** The provide/inject key — exported for tests; app code should use
 *  `provideAlmanac()`/`useAlmanac()` instead of touching it. */
export const almanacInjectionKey: InjectionKey<Almanac> = Symbol('atlas-almanac')

/** Create the Almanac state, `provide()` it to descendants, and return it.
 *  Call once from the owning page's setup. */
export function provideAlmanac(options: ProvideAlmanacOptions = {}): Almanac {
  const today = normalizeDay(Math.round(options.today ?? useGlassToday()))
  const day = ref(normalizeDay(Math.round(options.initialDay ?? today)))
  const markList = ref<AlmanacMark[]>([])
  const engaged = ref(false)
  const focusPulse = ref(0)
  const observations = computed(() => toValue(options.observations) ?? [])

  const almanac: Almanac = {
    day,
    setDay: (d: number) => {
      day.value = normalizeDay(Math.round(d))
    },
    today,
    phases: computed(() => toValue(options.phases) ?? []),
    marks: computed(() => markList.value),
    register: (mark: AlmanacMark) => {
      markList.value = withAlmanacMark(markList.value, mark)
    },
    unregister: (id: string) => {
      markList.value = withoutAlmanacMark(markList.value, id)
    },
    engaged,
    engage: () => {
      engaged.value = true
    },
    focusPulse,
    focusDay: (d: number) => {
      engaged.value = true
      day.value = normalizeDay(Math.round(d))
      focusPulse.value++
    },
    observations,
    findSighting: (date: string) =>
      findObservationOn(observations.value, date, toValue(options.specimen)),
  }
  provide(almanacInjectionKey, almanac)
  return almanac
}

/** The Almanac provided by an ancestor, or null when none was — degrade
 *  gracefully (render static, register nothing) rather than assume. */
export function useAlmanac(): Almanac | null {
  return inject(almanacInjectionKey, null)
}

/** Today as a Glass-Year day (0..364), SSR-stable: computed on the server,
 *  payload-carried, identical during hydration. */
export function useGlassToday(): number {
  return useState('atlas-glass-today', () => glassDayOf(new Date())).value
}
