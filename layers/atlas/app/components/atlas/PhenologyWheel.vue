<script setup lang="ts">
// The almanac dial (#282, map #279): the 24-hour rhythm band (#73) bent into a
// circle and given the year to keep. Rim = the six Glass-Year seasons; inner
// hatched arcs = this specimen's phenology phases (quiet phases in the inverse
// register); rim ticks = the biome's dated observations plus any marks
// descendants register through the Almanac; a brass needle points at the
// shared `day` and is dragged (pointer capture + `unwrapAngle`, so crossing
// 12 o'clock never snaps a year), stepped (arrows ±1 day, PageUp/PageDown ±1
// season, Home = today), and round-tripped to `?day=` on scrub-end via
// `history.replaceState` — shareable position, zero new routes.
//
// Engraved register (/atlas-specimen §2): currentColor line and hatch, fill
// none, and EXACTLY ONE `var(--sig-1)` accent — the needle head. Server-renders
// static and hydrates clean: geometry is deterministic, `today` is
// payload-carried (composables/almanac.ts), and marks arrive reactively.
// All year/angle/point geometry comes from utils/almanac.ts; only the
// presentational rounding of those points lives here.
import type { Span } from '../../utils/almanac'
import type { AlmanacBand, PhenologyPhase } from '../../utils/atlas'

const props = defineProps<{
  /** The specimen's phenology phases; omit/empty for the phase-less fallback. */
  phases?: PhenologyPhase[]
  /** This biome's dated observations (only `date` is read). */
  observations?: { date: string }[]
  /** Composite mode (#285, map #279): one band per specimen sharing this same
   *  wheel — the biome landing's "wing's year" overview. When given (and
   *  non-empty), the wheel renders one concentric annulus per band in place of
   *  the single-specimen phase ring below; the season ring, needle, marks and
   *  interaction are the exact same shared code either way. Leave unset for
   *  the single-specimen entry-page wheel (#282) — behavior there is
   *  untouched. */
  bands?: AlmanacBand[]
  /** The currently highlighted band/specimen slug (composite mode only) — set
   *  it from elsewhere (e.g. the catalogue) to light up the matching band.
   *  Pair with `v-model:highlight` so hovering/focusing a band lights up the
   *  same slug wherever else this is bound. */
  highlight?: string | null
}>()
const emit = defineEmits<{ 'update:highlight': [slug: string | null] }>()

// The shared state — normally provided by the specimen page; a wheel seated
// without a provider (a gallery, or the biome landing's composite) makes its
// own. Composite mode has no single specimen's phases to hand the almanac —
// `::phase`/`::sighting` are specimen-page-only, so the empty getter is
// correct here; the composite draws its own bands straight from `props.bands`.
const almanac = useAlmanac() ?? provideAlmanac({ phases: () => props.phases ?? [] })
const { day, setDay, today, marks, engage } = almanac

// SSR-stable ids for the <defs> this instance owns (patterns, label paths).
const uid = useId()

// ── Geometry (viewBox 0 0 360 360; everything origin-centred inside the
//    translate(180,180) group, per utils/almanac.ts's arcPath convention).
//    Only the radii the script computes with live here — day-independent shapes
//    (bezel, hub, needle shaft/head, mark tick) are static attributes in the
//    template, where the markup itself is their one home. ─────────────────────
const R = {
  labelTop: 157, // season-label arc baselines (bottom labels flip, so they
  labelBottom: 165, // sit deeper and read right-side-up)
  ring0: 124, // season ring annulus
  ring1: 148,
  month1: 153, // month ticks, outward from the ring's outer edge
  newYear: 158, // the day-0 anchor tick reaches further
  obs0: 106, // observation ticks, inward from the ring
  obs1: 114,
  phase0: 62, // phase annulus
  phase1: 100,
}

/** `almanac.ts`'s `pointAt` geometry, rounded for stable SSR markup — the
 *  trigonometry itself stays single-homed in the util. */
function polar(angle: number, r: number): { x: number; y: number } {
  const { x, y } = pointAt(angle, r)
  const rd = (n: number) => {
    const v = Math.round(n * 100) / 100
    return Object.is(v, -0) ? 0 : v
  }
  return { x: rd(x), y: rd(y) }
}

/** The arc a season's rim label rides. Bottom-half labels get a reversed arc at
 *  a deeper radius so they read right-side-up, coin-fashion. */
function labelArc(span: Span, flip: boolean): string {
  const a0 = dayToAngle(span[0])
  const sweep = (spanLength(span) * 360) / DAYS_PER_YEAR
  const r = flip ? R.labelBottom : R.labelTop
  const from = polar(flip ? a0 + sweep : a0, r)
  const to = polar(flip ? a0 : a0 + sweep, r)
  const large = sweep > 180 ? 1 : 0
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} ${flip ? 0 : 1} ${to.x} ${to.y}`
}

// The six seasons: annular sectors + rim labels (static — GLASS_SEASONS is a
// constant). Rim text drops a leading "the" (display trim only; the full label
// stays in the tooltip and the caption below).
const seasonViews = GLASS_SEASONS.map((s) => {
  const mid = normalizeAngle(dayToAngle(spanMidpoint(s.span)))
  const flip = mid > 90 && mid < 270
  const start = dayToAngle(s.span[0])
  return {
    ...s,
    ring: arcPath(s.span, R.ring0, R.ring1),
    labelPath: labelArc(s.span, flip),
    rim: s.label.replace(/^the\s+/i, ''),
    tick: { p0: polar(start, R.ring0), p1: polar(start, R.ring1) },
  }
})

// Month ticks anchor the wheel to the real calendar (dateToDay is the one home
// of that mapping). Day 0 is drawn separately as the longer New Year tick.
const monthTicks = Array.from({ length: 11 }, (_, i) => {
  const a = dayToAngle(dateToDay(`2001-${String(i + 2).padStart(2, '0')}-01`))
  return { p0: polar(a, R.ring1), p1: polar(a, R.month1) }
})
const newYearTick = { p0: polar(0, R.ring1), p1: polar(0, R.newYear) }

// A phase drawn as an annulus between r0 and r1, lit when the needle is inside
// it — the one shape shared by the single-specimen ring and every composite band.
function phaseView(p: PhenologyPhase, r0: number, r1: number) {
  return { ...p, d: arcPath(p.span, r0, r1), now: inSpan(day.value, p.span) }
}
const phaseViews = computed(() =>
  (props.phases ?? []).map((p) => phaseView(p, R.phase0, R.phase1)),
)
const hasPhases = computed(() => (props.phases ?? []).length > 0)

// ── Composite mode (#285) ────────────────────────────────────────────────────
// One concentric annulus per band, sharing the phase ring's whole radial span:
// inner edge clear of the needle's counterweight sweep (r ≤ 25), outer edge
// clear of the season ring (r0 = 124) — the annual sibling of #282's single
// phase annulus, subdivided rather than widened.
const isComposite = computed(() => (props.bands?.length ?? 0) > 0)
const R_COMPOSITE = { inner: 30, outer: 116, gap: 2 }
const compositeBands = computed(() => {
  const bands = props.bands ?? []
  const n = bands.length
  if (!n) return []
  const width = Math.max(4, (R_COMPOSITE.outer - R_COMPOSITE.inner - R_COMPOSITE.gap * (n - 1)) / n)
  return bands.map((b, i) => {
    const r0 = R_COMPOSITE.inner + i * (width + R_COMPOSITE.gap)
    const r1 = r0 + width
    return {
      ...b,
      r0,
      r1,
      // A full annulus, drawn transparent — a hover/focus target that covers
      // this specimen's whole radial slot, not just the days it has a phase
      // drawn on (arcPath's [d,d] convention already draws a full ring).
      hit: arcPath([0, 0], r0, r1),
      phaseViews: b.phases.map((p) => phaseView(p, r0, r1)),
    }
  })
})
const highlightedBand = computed(
  () => compositeBands.value.find((b) => b.slug === props.highlight) ?? null,
)
// Bands with a phase live on the needle's current day — the composite's own
// "what's astir" readout, proving the one shared needle drives every band.
const astirNow = computed(() => compositeBands.value.filter((b) => b.phaseViews.some((p) => p.now)))
const dialLabel = computed(() =>
  isComposite.value
    ? `the composite almanac — the wing's year across ${compositeBands.value.length} specimens`
    : 'the almanac dial — day of the Glass Year',
)

function bandEnter(slug: string) {
  emit('update:highlight', slug)
}
function bandLeave(slug: string) {
  if (props.highlight === slug) emit('update:highlight', null)
}

// One tick per distinct observed day — several sightings on a day are one mark
// on the rim, as they are one day in the ledger.
const obsTicks = computed(() => {
  const days = new Set<number>()
  for (const o of props.observations ?? []) days.add(dateToDay(o.date))
  return [...days].sort((a, b) => a - b).map((d) => {
    const a = dayToAngle(d)
    return { day: d, p0: polar(a, R.obs0), p1: polar(a, R.obs1) }
  })
})

// Registered marks (#283's ::sighting, via the Almanac contract) — rendered
// live so the contract is exercised now; `hot` flares the tick the needle is on.
const markViews = computed(() =>
  marks.value.map((m) => ({ ...m, angle: dayToAngle(m.day), hot: m.day === day.value })),
)

// ── Readout ──────────────────────────────────────────────────────────────────
const season = computed(() => seasonOf(day.value))
const currentPhase = computed(
  () => (props.phases ?? []).find((p) => inSpan(day.value, p.span)) ?? null,
)
const valueText = computed(() => {
  const parts = [`day ${day.value}`, season.value.label]
  if (currentPhase.value) parts.push(currentPhase.value.label)
  return parts.join(', ')
})

// ── The needle ───────────────────────────────────────────────────────────────
// Rendered at an *unwrapped* angle so a step or drag across New Year turns the
// short way instead of unwinding a whole year (the CSS transition interpolates
// whatever numbers we hand it).
const displayAngle = ref(dayToAngle(day.value))
watch(day, (d) => {
  displayAngle.value = unwrapAngle(displayAngle.value, dayToAngle(d))
})

// ── Interaction ──────────────────────────────────────────────────────────────
const svgEl = ref<SVGSVGElement | null>(null)
const scrubbing = ref(false)
let dragAngle = 0 // unwrapped running angle during a drag

function pointerAngle(e: PointerEvent): number {
  // The dial is centred in a square viewBox, so the element box's centre IS the
  // dial centre. atan2(dx, -dy) puts 0° at 12 o'clock, clockwise.
  const rect = svgEl.value!.getBoundingClientRect()
  const dx = e.clientX - (rect.left + rect.width / 2)
  const dy = e.clientY - (rect.top + rect.height / 2)
  return (Math.atan2(dx, -dy) * 180) / Math.PI
}

function onPointerDown(e: PointerEvent) {
  if (!svgEl.value || (e.pointerType === 'mouse' && e.button !== 0)) return
  engage() // the reader has the needle — the essay's ink may follow it now (#283)
  svgEl.value.setPointerCapture(e.pointerId)
  scrubbing.value = true
  dragAngle = unwrapAngle(displayAngle.value, pointerAngle(e))
  setDay(angleToDay(dragAngle))
  e.preventDefault()
}
function onPointerMove(e: PointerEvent) {
  if (!scrubbing.value) return
  dragAngle = unwrapAngle(dragAngle, pointerAngle(e))
  setDay(angleToDay(dragAngle))
}
function endScrub(e: PointerEvent) {
  if (!scrubbing.value) return
  scrubbing.value = false
  // A lifted touch pointer no longer exists — release only what is still held.
  if (svgEl.value?.hasPointerCapture(e.pointerId)) svgEl.value.releasePointerCapture(e.pointerId)
  commitDayToUrl()
}

function adjacentSeasonDay(step: 1 | -1): number {
  const n = GLASS_SEASONS.length
  const i = GLASS_SEASONS.findIndex((s) => s.name === seasonOf(day.value).name)
  return Math.round(spanMidpoint(GLASS_SEASONS[(i + step + n) % n]!.span))
}

function onKeydown(e: KeyboardEvent) {
  let next: number
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      next = day.value + 1
      break
    case 'ArrowLeft':
    case 'ArrowDown':
      next = day.value - 1
      break
    case 'PageUp':
      next = adjacentSeasonDay(1)
      break
    case 'PageDown':
      next = adjacentSeasonDay(-1)
      break
    case 'Home':
      next = today
      break
    default:
      return
  }
  e.preventDefault()
  engage() // a keyboard scrub engages the dial exactly as a pointer grab does
  setDay(next)
  commitDayToUrl()
}

/** Scrub-end: mirror the day into `?day=` (shareable, zero new routes). Parked
 *  at today — the default — the param comes off, keeping the canonical URL
 *  clean. `history.state` is passed through so vue-router's state survives. */
function commitDayToUrl() {
  if (import.meta.server) return
  const url = new URL(window.location.href)
  if (day.value === today) url.searchParams.delete('day')
  else url.searchParams.set('day', String(day.value))
  history.replaceState(history.state, '', url.toString())
}
</script>

<template>
  <figure class="atlas-almanac" :class="{ 'is-scrubbing': scrubbing }">
    <svg
      ref="svgEl"
      viewBox="0 0 360 360"
      role="slider"
      tabindex="0"
      :aria-label="dialLabel"
      aria-valuemin="0"
      aria-valuemax="364"
      :aria-valuenow="day"
      :aria-valuetext="valueText"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endScrub"
      @pointercancel="endScrub"
      @keydown="onKeydown"
    >
      <!-- NOTE: every dynamic geometry binding below uses the `.attr` modifier.
           During hydration Vue force-patches dynamic props and would try the
           DOM *property* (el.transform, el.r, …) — getter-only on SVG elements,
           which logs "Failed setting prop" warnings; `.attr` pins attribute
           semantics. Constant geometry is written as static attributes. -->
      <defs>
        <path
          v-for="(s, i) in seasonViews"
          :id="`${uid}-sl${i}`"
          :key="s.name"
          :d.attr="s.labelPath"
          fill="none"
        />
        <pattern
          :id="`${uid}-hatch`"
          patternUnits="userSpaceOnUse"
          width="5"
          height="5"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" stroke-width="0.7" opacity="0.45" />
        </pattern>
        <pattern
          :id="`${uid}-hatch-quiet`"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
          patternTransform="rotate(-45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="0.6" opacity="0.25" />
        </pattern>

        <!-- composite mode (#285): one hatch pair per band, coloured directly
             (not via currentColor — a <pattern>'s content does not reliably
             inherit the referencing element's `color` across browsers) so each
             band's hatch carries that specimen's own tint. -->
        <template v-for="(cb, i) in compositeBands" :key="`pat-${cb.slug}`">
          <pattern
            :id="`${uid}-c${i}-hatch`"
            patternUnits="userSpaceOnUse"
            width="5"
            height="5"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="5" :stroke.attr="cb.color || 'currentColor'" stroke-width="0.75" opacity="0.55" />
          </pattern>
          <pattern
            :id="`${uid}-c${i}-hatch-quiet`"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(-45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" :stroke.attr="cb.color || 'currentColor'" stroke-width="0.6" opacity="0.3" />
          </pattern>
        </template>
      </defs>

      <g transform="translate(180, 180)">
        <!-- bezel: the engraved double rule -->
        <circle class="bezel" r="176" />
        <circle class="bezel bezel-in" r="172.5" />

        <!-- season ring -->
        <g class="seasons">
          <path v-for="s in seasonViews" :key="s.name" class="season" :d.attr="s.ring">
            <title>{{ s.label }}{{ s.gloss ? ` — ${s.gloss}` : '' }}</title>
          </path>
          <line
            v-for="s in seasonViews"
            :key="`t-${s.name}`"
            class="season-tick"
            :x1.attr="s.tick.p0.x"
            :y1.attr="s.tick.p0.y"
            :x2.attr="s.tick.p1.x"
            :y2.attr="s.tick.p1.y"
          />
        </g>
        <g class="rim-labels" aria-hidden="true">
          <text v-for="(s, i) in seasonViews" :key="s.name" class="rim-label">
            <textPath :href.attr="`#${uid}-sl${i}`" startOffset="50%" text-anchor="middle">
              {{ s.rim }}
            </textPath>
          </text>
        </g>

        <!-- calendar anchors: month ticks + the New Year tick at 12 o'clock -->
        <g class="months">
          <line
            v-for="(t, i) in monthTicks"
            :key="i"
            class="month-tick"
            :x1.attr="t.p0.x"
            :y1.attr="t.p0.y"
            :x2.attr="t.p1.x"
            :y2.attr="t.p1.y"
          />
          <line
            class="newyear-tick"
            :x1.attr="newYearTick.p0.x"
            :y1.attr="newYearTick.p0.y"
            :x2.attr="newYearTick.p1.x"
            :y2.attr="newYearTick.p1.y"
          />
        </g>

        <!-- phase annuli: the specimen's own year, hatched; quiet = inverse -->
        <g v-if="!isComposite" class="phases">
          <path
            v-for="p in phaseViews"
            :key="p.name"
            class="phase"
            :class="{ 'is-quiet': p.quiet, 'is-now': p.now }"
            :d.attr="p.d"
            :fill.attr="`url(#${uid}-${p.quiet ? 'hatch-quiet' : 'hatch'})`"
          >
            <title>{{ p.label }}{{ p.gloss ? ` — ${p.gloss}` : '' }}</title>
          </path>
        </g>

        <!-- composite phase annuli (#285): one concentric band per specimen,
             the same hatched register, each tinted by its own signature. -->
        <g v-else class="phases composite">
          <g
            v-for="(cb, i) in compositeBands"
            :key="cb.slug"
            class="cband"
            :class="{ hot: highlight === cb.slug, dim: !!highlight && highlight !== cb.slug }"
            :style="{ color: cb.color || 'currentColor' }"
          >
            <path
              v-for="p in cb.phaseViews"
              :key="p.name"
              class="phase"
              :class="{ 'is-quiet': p.quiet, 'is-now': p.now }"
              :d.attr="p.d"
              :fill.attr="`url(#${uid}-c${i}-${p.quiet ? 'hatch-quiet' : 'hatch'})`"
            >
              <title>{{ cb.label }}{{ p.gloss ? ` — ${p.gloss}` : `, ${p.label}` }}</title>
            </path>
            <path
              class="hit"
              :d.attr="cb.hit"
              tabindex="0"
              role="img"
              :aria-label="`${cb.label} — its year in this wheel`"
              @mouseenter="bandEnter(cb.slug)"
              @mouseleave="bandLeave(cb.slug)"
              @focus="bandEnter(cb.slug)"
              @blur="bandLeave(cb.slug)"
            />
          </g>
        </g>

        <!-- observation ticks: the biome's dated ledger on the rim -->
        <g class="observations">
          <line
            v-for="t in obsTicks"
            :key="t.day"
            class="obs-tick"
            :x1.attr="t.p0.x"
            :y1.attr="t.p0.y"
            :x2.attr="t.p1.x"
            :y2.attr="t.p1.y"
          />
        </g>

        <!-- registered marks (Almanac contract): distinguished ticks that flare
             when the needle crosses them -->
        <g class="marks">
          <g
            v-for="m in markViews"
            :key="m.id"
            class="mark"
            :class="[`mark--${m.kind ?? 'sighting'}`, { 'is-hot': m.hot }]"
            :transform.attr="`rotate(${m.angle})`"
          >
            <line x1="0" y1="-104" x2="0" y2="-116" />
            <path class="gem" d="M 0 -126 L 3 -121 L 0 -116 L -3 -121 Z">
              <title v-if="m.label">{{ m.label }}</title>
            </path>
          </g>
        </g>

        <!-- the needle: ink shaft, brass head — the dial's ONE signature accent -->
        <g class="needle" :transform.attr="`rotate(${displayAngle})`">
          <line class="shaft" x1="0" y1="16" x2="0" y2="-98" />
          <circle class="counterweight" cy="22" r="3" />
          <path class="head" d="M 0 -116 L 3.4 -104 L 0 -97 L -3.4 -104 Z" />
        </g>
        <circle class="hub" r="4.5" />
        <circle class="hub-dot" r="1.4" />
      </g>
    </svg>

    <figcaption class="wcap">
      <p class="wread" aria-hidden="true">
        <span class="wday">d. {{ day }}</span>
        <span class="wsep">·</span>
        <span class="wseason">{{ season.label }}</span>
        <template v-if="currentPhase">
          <span class="wsep">—</span>
          <span class="wphase">{{ currentPhase.label }}</span>
        </template>
      </p>
      <p v-if="isComposite" class="wcomposite" aria-live="polite">
        <template v-if="highlightedBand">{{ highlightedBand.label }}</template>
        <template v-else-if="astirNow.length">astir now: {{ astirNow.map((b) => b.label).join(', ') }}</template>
        <template v-else>the wing rests; nothing stirs today</template>
      </p>
      <p v-if="!isComposite && !hasPhases" class="wempty">
        No phases recorded yet; the wheel turns for this inhabitant all the same.
      </p>
    </figcaption>
  </figure>
</template>
