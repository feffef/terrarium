<script setup lang="ts">
// The almanac dial (#282, map #279): the 24-hour rhythm band (#73) bent into a
// circle and given the year to keep. Rim = the six Glass-Year seasons; inner
// hatched arcs = this specimen's phenology phases (quiet phases in the inverse
// register); rim ticks = the biome's dated observations plus any marks
// descendants register through the Almanac; a brass needle points at the
// shared `day`.
//
// The dial is the essay's SEASON SELECTOR (feedback rework): it is the one
// control that turns the field note from season to season. A tap on a season
// snaps the needle to that season's midpoint; a drag scrubs freely (the essay
// still switches at each season boundary); the arrow/PageUp-Down/Home keys
// step it; and every observation/sighting tick is clickable — a tap jumps the
// needle straight to that day and asks the matching `::sighting` to scroll into
// view (`focusDay`). The season the needle rides is lit on the rim so the link
// between dial and prose is never in doubt. Position round-trips to `?day=` on
// scrub-end via `history.replaceState` — shareable, zero new routes.
//
// Engraved register (/atlas-specimen §2): currentColor line and hatch, fill
// none, and EXACTLY ONE `var(--sig-1)` accent — the needle head. Server-renders
// static and hydrates clean: geometry is deterministic, `today` is
// payload-carried (composables/almanac.ts), and marks arrive reactively.
// All year/angle/point geometry comes from utils/almanac.ts; only the
// presentational rounding of those points lives here.
import type { Span } from '../../utils/almanac'
import type { PhenologyPhase } from '../../utils/atlas'

const props = defineProps<{
  /** The specimen's phenology phases; omit/empty for the phase-less fallback
   *  (the biome-landing season dial passes none — it draws only the rim). */
  phases?: PhenologyPhase[]
  /** The specimen's display name — labels its phase arcs as its own in the
   *  caption, distinct from the shared seasons on the rim. */
  specimenLabel?: string
  /** This biome's dated observations (only `date` is read) — the rim ticks. */
  observations?: { date: string }[]
  /** Landing/"wing" context: the season dial on a biome landing, which has no
   *  single specimen and so no phase ring or "no phenology" note — it simply
   *  turns the year for the roster beside it. Leave unset for a specimen entry. */
  wing?: boolean
}>()

// The shared state — normally provided by the owning page (the specimen entry
// or the biome landing); a wheel seated without a provider (e.g. a gallery)
// makes its own.
const almanac = useAlmanac() ?? provideAlmanac({ phases: () => props.phases ?? [] })
const { day, setDay, today, marks, focusDay } = almanac

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

// The season the needle currently rides — lit on the rim, and the axis the
// essay's ::season-note blocks key on (they show iff their season is this one).
const currentSeasonName = computed(() => seasonOf(day.value).name)

// The six seasons: annular sectors + rim labels + a full-sector wash so a tap
// anywhere in the sector selects it. GLASS_SEASONS is constant, so the static
// parts are computed once; `isCurrent` is read reactively in the template.
const seasonViews = GLASS_SEASONS.map((s) => {
  const mid = normalizeAngle(dayToAngle(spanMidpoint(s.span)))
  const flip = mid > 90 && mid < 270
  const start = dayToAngle(s.span[0])
  return {
    ...s,
    ring: arcPath(s.span, R.ring0, R.ring1),
    fill: arcPath(s.span, R.phase0 - 2, R.ring1), // the lit wedge, rim to hub
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

// A phase drawn as an annulus between r0 and r1, lit when the needle is inside it.
function phaseView(p: PhenologyPhase, r0: number, r1: number) {
  return { ...p, d: arcPath(p.span, r0, r1), now: inSpan(day.value, p.span) }
}
const phaseViews = computed(() =>
  (props.phases ?? []).map((p) => phaseView(p, R.phase0, R.phase1)),
)
const hasPhases = computed(() => (props.phases ?? []).length > 0)

// One tick per distinct observed day — several sightings on a day are one mark
// on the rim, as they are one day in the ledger. Each is clickable.
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
// Two clearly-LABELLED lines so the dial's two vocabularies never blur into one:
// "season" names one of the six shared Glass-Year seasons (the rim); the second
// line names THIS specimen's own phenology phase (the inner arcs), captioned with
// its binomial. Without the labels, "the Lamp's Lengthening — the new blade" read
// as one compound; with them it reads as a season and a creature's phase.
const season = computed(() => seasonOf(day.value))
const currentPhase = computed(
  () => (props.phases ?? []).find((p) => inSpan(day.value, p.span)) ?? null,
)
const phaseLabelText = computed(() => `${props.specimenLabel ?? 'this inhabitant'} phase`)
const valueText = computed(() => {
  const s = `season ${season.value.label}, day ${day.value}`
  return hasPhases.value && currentPhase.value
    ? `${phaseLabelText.value}: ${currentPhase.value.label}; ${s}`
    : s
})
const dialLabel = computed(() =>
  hasPhases.value
    ? 'the almanac dial — turn it to read the field note phase by phase'
    : "the wing's almanac — turn it to read the year season by season",
)

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
let downAngle = 0 // where the current press began — to tell a tap from a drag
let moved = false // did this press travel far enough to count as a scrub?

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
  svgEl.value.setPointerCapture(e.pointerId)
  scrubbing.value = true
  moved = false
  downAngle = pointerAngle(e)
  dragAngle = unwrapAngle(displayAngle.value, downAngle)
  setDay(angleToDay(dragAngle))
  e.preventDefault()
}
function onPointerMove(e: PointerEvent) {
  if (!scrubbing.value) return
  const a = pointerAngle(e)
  if (Math.abs(unwrapAngle(downAngle, a) - downAngle) > 3) moved = true
  dragAngle = unwrapAngle(dragAngle, a)
  setDay(angleToDay(dragAngle))
}
function endScrub(e: PointerEvent) {
  if (!scrubbing.value) return
  scrubbing.value = false
  // A lifted touch pointer no longer exists — release only what is still held.
  if (svgEl.value?.hasPointerCapture(e.pointerId)) svgEl.value.releasePointerCapture(e.pointerId)
  // A tap (no real travel) snaps the needle to the midpoint of the unit it
  // picked — this specimen's phase when the dial drives phases (the essay's
  // axis), otherwise the season — so it "clicks in" rather than parking on an
  // odd day. A real drag keeps the day the reader scrubbed to.
  if (!moved) {
    const span = hasPhases.value && currentPhase.value ? currentPhase.value.span : seasonOf(day.value).span
    setDay(spanMidpoint(span))
  }
  commitDayToUrl()
}

/** A tap on a tick: jump the needle to that exact day and ask the matching
 *  `::sighting` to scroll into view. `.stop` on the handlers keeps the dial's
 *  own scrub/snap out of it, so the day stays exact. */
function tapTick(d: number) {
  focusDay(d)
  commitDayToUrl()
}

function adjacentSeasonDay(step: 1 | -1): number {
  const n = GLASS_SEASONS.length
  const i = GLASS_SEASONS.findIndex((s) => s.name === seasonOf(day.value).name)
  return Math.round(spanMidpoint(GLASS_SEASONS[(i + step + n) % n]!.span))
}

// PageUp/PageDown step by whole UNITS: this specimen's phases when the dial
// drives them (so the reader pages through the creature's own arc), else the
// shared seasons (the biome-landing dial). Phases ordered by span start.
function adjacentUnitDay(step: 1 | -1): number {
  const ps = props.phases ?? []
  if (!hasPhases.value || ps.length === 0) return adjacentSeasonDay(step)
  const ordered = [...ps].sort((a, b) => a.span[0] - b.span[0])
  const i = ordered.findIndex((p) => p.name === currentPhase.value?.name)
  const idx = (((i < 0 ? 0 : i) + step) % ordered.length + ordered.length) % ordered.length
  return Math.round(spanMidpoint(ordered[idx]!.span))
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
      next = adjacentUnitDay(1)
      break
    case 'PageDown':
      next = adjacentUnitDay(-1)
      break
    case 'Home':
      next = today
      break
    default:
      return
  }
  e.preventDefault()
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
  <figure class="atlas-almanac" :class="{ 'is-scrubbing': scrubbing, 'is-wing': wing, 'is-phase-mode': hasPhases }">
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
      </defs>

      <g transform="translate(180, 180)">
        <!-- bezel: the engraved double rule -->
        <circle class="bezel" r="176" />
        <circle class="bezel bezel-in" r="172.5" />

        <!-- the lit wedge of the season the needle rides, drawn under the ring
             so the rim and labels stay crisp on top -->
        <path
          v-for="s in seasonViews"
          v-show="s.name === currentSeasonName"
          :key="`lit-${s.name}`"
          class="season-lit"
          :d.attr="s.fill"
        />

        <!-- season ring -->
        <g class="seasons">
          <path
            v-for="s in seasonViews"
            :key="s.name"
            class="season"
            :class="{ 'is-current': s.name === currentSeasonName }"
            :d.attr="s.ring"
          >
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
          <text
            v-for="(s, i) in seasonViews"
            :key="s.name"
            class="rim-label"
            :class="{ 'is-current': s.name === currentSeasonName }"
          >
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
        <g v-if="hasPhases" class="phases">
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

        <!-- observation ticks: the biome's dated ledger on the rim, each a tap
             target that jumps the needle to that day -->
        <g class="observations">
          <g
            v-for="t in obsTicks"
            :key="t.day"
            class="obs"
            @pointerdown.stop
            @click.stop="tapTick(t.day)"
          >
            <line
              class="obs-tick"
              :x1.attr="t.p0.x"
              :y1.attr="t.p0.y"
              :x2.attr="t.p1.x"
              :y2.attr="t.p1.y"
            />
            <line
              class="obs-hit"
              :x1.attr="t.p0.x"
              :y1.attr="t.p0.y"
              :x2.attr="t.p1.x"
              :y2.attr="t.p1.y"
            />
          </g>
        </g>

        <!-- registered marks (Almanac contract): distinguished ticks that flare
             when the needle crosses them, and tap to their sighting -->
        <g class="marks">
          <g
            v-for="m in markViews"
            :key="m.id"
            class="mark"
            :class="[`mark--${m.kind ?? 'sighting'}`, { 'is-hot': m.hot }]"
            :transform.attr="`rotate(${m.angle})`"
            @pointerdown.stop
            @click.stop="tapTick(m.day)"
          >
            <line x1="0" y1="-104" x2="0" y2="-116" />
            <path class="gem" d="M 0 -126 L 3 -121 L 0 -116 L -3 -121 Z">
              <title v-if="m.label">{{ m.label }}</title>
            </path>
            <line class="mark-hit" x1="0" y1="-102" x2="0" y2="-128" />
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

    <figcaption class="wcap" aria-hidden="true">
      <!-- On a specimen the dial drives the creature's own phases (the essay's
           axis, read first); the season is shown beneath as informational
           context. The biome-landing dial has no phases and reads season-only. -->
      <p v-if="hasPhases" class="wread wphase-row">
        <span class="wlabel">{{ phaseLabelText }}</span>
        <span class="wval"><span class="wphase">{{ currentPhase ? currentPhase.label : '—' }}</span></span>
      </p>
      <p class="wread wseason-row">
        <span class="wlabel">season</span>
        <span class="wval"><span class="wseason">{{ season.label }}</span><span class="wday">d. {{ day }}</span></span>
      </p>
      <slot name="caption" />
    </figcaption>
  </figure>
</template>
