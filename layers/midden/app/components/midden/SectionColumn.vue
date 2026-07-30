<script setup lang="ts">
// The stores in section: a stratigraphic drawing of every dig season, oldest at
// the floor, standing above the season-grouped register it indexes.
//
// Unlike the trench face (TrenchFace.vue, pure atmosphere) this drawing carries a
// fact the page states nowhere else. The register lists only seasons that hold
// finds, so a season holding NONE is invisible there — here it is drawn, labelled
// `sterile`, and counted. That is why it takes a real `aria-label` rather than
// `aria-hidden`.
//
// Geometry derives from DIG_SEASONS (strata.ts) rather than being hand-plotted, so
// a new season redraws the section instead of silently rotting it. The waver that
// keeps the boundaries from reading as a bar chart is a fixed table sampled at a
// per-boundary phase — deterministic, so the server and client render identically.
import { DIG_SEASONS } from '../../utils/strata'

const props = defineProps<{
  /** Find count per dig-season slug. Every season, including those holding none. */
  counts: Record<string, number>
}>()

const X0 = 90
const X1 = 500
const FLOOR_Y = 142
/** Vertical units per day of a closed season — band thickness is its real duration. */
const PER_DAY = 7.9
/** Thin seasons stay legible: the Platform's history is young and some strata are 2 days. */
const MIN_BAND = 18.5
/** The open-ended season has no end date to measure, so it takes a fixed thickness. */
const OPEN_BAND = 42.5

const XS = [90, 130, 175, 220, 265, 310, 355, 400, 445, 500]
const WAVER = [0, -1.5, 0.5, -1, 1, -1.5, 0, 1, -1, 0]
/** `[x, dy]` — the torn upper edge of the open season: "section continues above". */
const RAGGED: [number, number][] = [
  [90, 0], [118, -3], [160, 1.5], [185, -1.5], [230, 3], [250, -1],
  [300, 1.5], [340, -2.5], [395, 2.5], [430, -1], [470, 2], [500, 0.5],
]

const DAY_MS = 86_400_000

/** Inclusive day count. `Date.parse` on a YYYY-MM-DD is UTC, so this never varies
 *  with the renderer's timezone (the SSR hazard find.ts documents for date text). */
function inclusiveDays(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1
}

interface Point { x: number, y: number }

function waver(y: number, phase: number): Point[] {
  return XS.map((x, i) => ({ x, y: round(y + WAVER[(i + phase) % WAVER.length]!) }))
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function points(ps: Point[]): string {
  return ps.map((p) => `${p.x},${p.y}`).join(' ')
}

function polyline(ps: Point[]): string {
  return ps.map((p) => `${p.x} ${p.y}`).join(' L')
}

const bands = computed(() => {
  let bottom = FLOOR_Y
  return DIG_SEASONS.map((season, i) => {
    const height = season.end === null
      ? OPEN_BAND
      : Math.max(MIN_BAND, inclusiveDays(season.start, season.end) * PER_DAY)
    const top = round(bottom - height)
    const band = {
      season,
      top,
      bottom,
      mid: round((top + bottom) / 2),
      count: props.counts[season.slug] ?? 0,
      /** Textures cycle so a fifth season is drawn rather than left blank. */
      texture: (['hatch', 'ash', 'tick', null] as const)[i % 4],
      wash: i % 2 === 0,
      isOpen: season.end === null,
    }
    bottom = top
    return band
  })
})

const topY = computed(() => bands.value[bands.value.length - 1]?.top ?? 15)
const raggedPoints = computed(() => RAGGED.map(([x, dy]) => ({ x, y: round(topY.value + dy) })))

/** The boundary a band sits ON — shared with the band below so the two never gap. */
function lowerEdge(index: number): Point[] {
  if (index === 0) return [{ x: X0, y: FLOOR_Y }, { x: X1, y: FLOOR_Y }]
  return waver(bands.value[index - 1]!.top, index - 1)
}

function upperEdge(index: number): Point[] {
  if (index === bands.value.length - 1) return raggedPoints.value
  return waver(bands.value[index]!.top, index)
}

function bandPath(index: number): string {
  const top = upperEdge(index)
  const bottom = [...lowerEdge(index)].reverse()
  return `M${polyline(top)} L${polyline(bottom)} Z`
}

/** Internal season boundaries only — the floor is the frame, the top is the tear. */
const boundaries = computed(() =>
  bands.value.slice(0, -1).map((_, i) => points(waver(bands.value[i]!.top, i))),
)

/** The rod stands proud of the surface: an object in the tip, not a border stripe. */
const rod = computed(() => {
  const top = round(topY.value - 7)
  const seg = round((FLOOR_Y - top) / 5)
  return Array.from({ length: 5 }, (_, i) => ({ y: round(top + i * seg), h: seg, fired: i % 2 === 0 }))
})

const vbTop = computed(() => Math.min(0, round(topY.value - 11)))
const vbHeight = computed(() => 164 - vbTop.value)

function countLabel(n: number): string {
  if (n === 0) return 'sterile'
  return `${n} ${n === 1 ? 'find' : 'finds'}`
}

const summary = computed(() =>
  `The stores in section, oldest at the floor: ${bands.value
    .map((b) => `${b.season.label}, ${countLabel(b.count)}`)
    .reverse()
    .join('; ')}. The surface is still accumulating.`,
)
</script>

<template>
  <figure class="midden-section">
    <svg
      class="midden-section__svg"
      :viewBox="`0 ${vbTop} 700 ${vbHeight}`"
      width="100%"
      role="img"
      :aria-label="summary"
    >
      <defs>
        <pattern id="ms-hatch45" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" class="p-hair" />
        </pattern>
        <pattern id="ms-ash" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1.1" cy="1.1" r="0.58" class="p-dot" />
          <circle cx="3.1" cy="3.2" r="0.48" class="p-dot" />
        </pattern>
        <!-- Four dashes of varied length and phase: irregular loam, not ruled lines. -->
        <pattern id="ms-tick" width="30" height="9" patternUnits="userSpaceOnUse">
          <line x1="1" y1="2.5" x2="7.5" y2="2.5" class="p-tick" />
          <line x1="16" y1="2.5" x2="20.5" y2="2.5" class="p-tick" />
          <line x1="9.5" y1="7" x2="15" y2="7" class="p-tick" />
          <line x1="23.5" y1="7" x2="28" y2="7" class="p-tick" />
        </pattern>
      </defs>

      <template v-for="(band, i) in bands" :key="band.season.slug">
        <path v-if="band.wash" :d="bandPath(i)" class="f-wash" />
        <path v-if="band.texture === 'hatch'" :d="bandPath(i)" fill="url(#ms-hatch45)" opacity="0.6" />
        <path v-else-if="band.texture === 'ash'" :d="bandPath(i)" fill="url(#ms-ash)" opacity="0.75" />
        <path v-else-if="band.texture === 'tick'" :d="bandPath(i)" fill="url(#ms-tick)" opacity="0.6" />
      </template>

      <!-- Frame: sides and floor. No top rule — the open season tears off instead. -->
      <line :x1="X0" :y1="raggedPoints[0]!.y" :x2="X0" :y2="FLOOR_Y" class="s-slate2" stroke-width="1.3" />
      <line :x1="X1" :y1="raggedPoints[raggedPoints.length - 1]!.y" :x2="X1" :y2="FLOOR_Y" class="s-slate2" stroke-width="1.3" />
      <line :x1="X0" :y1="FLOOR_Y" :x2="X1" :y2="FLOOR_Y" class="s-slate2" stroke-width="1.6" />

      <polyline
        v-for="(edge, i) in boundaries"
        :key="`edge-${i}`"
        :points="edge"
        class="f-none s-slateline"
        stroke-width="0.8"
      />
      <polyline :points="points(raggedPoints)" class="f-none s-slate2" stroke-width="1.1" />

      <g class="s-mutedc" stroke-width="0.9">
        <rect
          v-for="(seg, i) in rod"
          :key="`rod-${i}`"
          x="106"
          :y="seg.y"
          width="7"
          :height="seg.h"
          :class="seg.fired ? 'f-accent' : 'f-paper2'"
        />
      </g>

      <line x1="82" :y1="bands[bands.length - 1]!.bottom" x2="82" :y2="FLOOR_Y" class="s-slate2" stroke-width="0.8" />
      <g class="s-slate2" stroke-width="0.8">
        <line v-for="band in bands" :key="`tick-${band.season.slug}`" x1="78" :y1="band.bottom" x2="86" :y2="band.bottom" />
      </g>
      <g class="svg-tech f-muted" font-size="8" text-anchor="end">
        <text v-for="band in bands" :key="`date-${band.season.slug}`" x="74" :y="band.bottom + 2.5">{{ band.season.start }}</text>
      </g>

      <g class="s-slateline" stroke-width="1">
        <line v-for="band in bands" :key="`lead-${band.season.slug}`" x1="502" :y1="band.mid" x2="511" :y2="band.mid" />
      </g>
      <g class="svg-sc f-slate2" font-size="9">
        <text v-for="band in bands" :key="`label-${band.season.slug}`" x="515" :y="band.mid + 3">
          {{ band.season.label }}<tspan class="svg-tech f-faint" font-size="7.5" dx="6">{{ countLabel(band.count) }}</tspan>
        </text>
      </g>

      <text :x="X0" y="158" class="svg-tech f-faint" font-size="7.5">
        the stores in section &#183; oldest at the floor &#183; the surface still accumulating
      </text>
    </svg>
  </figure>
</template>

<style scoped>
.midden-section {
  margin: 2.2rem 0 0;
}
.midden-section__svg { display: block; }

/* Colour comes from classes referencing the theme tokens, never from `fill=`/
   `stroke=` attributes — that is what makes the dark-mode token flip carry here
   for free (theme.css). */
.f-none { fill: none; }
.f-wash { fill: var(--midden-slate-wash); }
.f-accent { fill: var(--midden-accent); }
.f-paper2 { fill: var(--midden-paper-2); }
.f-faint { fill: var(--midden-faint); }
.f-muted { fill: var(--midden-muted); }
.f-slate2 { fill: var(--midden-slate-2); }
.s-slate2 { stroke: var(--midden-slate-2); }
.s-slateline { stroke: var(--midden-slate-line); }
.s-mutedc { stroke: var(--midden-muted); }
.p-hair { stroke: var(--midden-slate-2); stroke-width: 0.7; }
.p-dot { fill: var(--midden-slate-2); }
.p-tick { stroke: var(--midden-slate-2); stroke-width: 0.9; }

.svg-sc {
  font-family: var(--midden-typewriter);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.svg-tech {
  font-family: var(--midden-mono);
  text-transform: none;
  letter-spacing: 0;
}

/* Below the stores' two-column breakpoint the drawing's right-hand labels would
   be squeezed to nothing, and it is supplementary — the register carries the same
   seasons as text. */
@media (max-width: 44rem) {
  .midden-section { display: none; }
}
</style>
