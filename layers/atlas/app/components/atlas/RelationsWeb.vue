<script setup lang="ts">
// A specimen's own reflection of the food web (#71): the focus seated at the
// left like the subject of a plate, its Relations fanned out to the right on a
// shallow arc — the shape of a genealogical or taxonomic chart rather than a
// clock face, so every strand runs mostly horizontal and its verb phrase can
// be set ALONG the strand (an italic annotation riding the line, as on an
// engraved map) instead of boxed over it. Strands bow gently outward like the
// food web's; direction follows each Relation's `dir`. No hover-driven
// dim/highlight lives IN this diagram (unlike the wandering food web) —
// hovering a spoke or its strand instead lights the matching row in the
// `AtlasRelationsList` below, via `update:highlight`, so the two views of the
// same handful of facts read as one instrument, not two disconnected ones.
import type { Relation, SpecimenView } from '../../utils/atlas'

const props = defineProps<{
  specimen: SpecimenView
  relations: Relation[]
  specimensBySlug: Record<string, SpecimenView>
  biome: string
}>()
const emit = defineEmits<{ 'update:highlight': [slug: string | null] }>()

const uid = useId()

const W = 680
const R = 38 // spoke medallion radius
const RF = 46 // the focus's own medallion — a touch larger; this is whose page it is
const FX = 110 // the focus column
const RX = 330 // fan reach (horizontal semi-axis)
const RY = 200 // fan spread (vertical semi-axis)

// Same authored-illustration convention as AtlasFoodWeb: a 0 0 400 300 viewBox
// drawn about its centre (~200,150), scaled and re-centred onto the node.
const FIG_CX = 200
const FIG_CY = 150
const FIG_SCALE = 0.2

interface Pt { x: number; y: number }
interface Spoke { r: Relation; other: SpecimenView; x: number; y: number }

// Hand-tuned fan angles (degrees off horizontal) for the counts the data
// actually holds (1–4 relations today); beyond that, spread evenly and let it
// crowd gracefully. Kept moderate so no strand turns steep enough to make its
// along-the-line label awkward to read.
const FAN: Record<number, number[]> = {
  1: [0],
  2: [-26, 26],
  3: [-45, 0, 45],
  4: [-58, -21, 21, 58],
}
function fanAngles(n: number): number[] {
  const preset = FAN[n]
  if (preset) return preset
  return Array.from({ length: n }, (_, i) => -64 + (i * 128) / (n - 1))
}

// The fan's vertical extent depends on how many spokes it holds, so the canvas
// height (and the focus's own y) is derived, not fixed — a sparse web gets a
// short plate instead of floating in empty paper.
const view = computed(() => {
  const paired = props.relations.flatMap((r) => {
    const other = props.specimensBySlug[r.other]
    return other ? [{ r, other }] : []
  })
  const angles = fanAngles(paired.length || 1)
  const half = RY * Math.max(0, ...angles.map((a) => Math.abs(Math.sin((a * Math.PI) / 180))))
  const fy = Math.round(Math.max(76, half + R + 18))
  const H = Math.round(fy + Math.max(RF + 52, half + R + 20))
  const spokes: Spoke[] = paired.map((p, i) => {
    const a = ((angles[i] ?? 0) * Math.PI) / 180
    return { ...p, x: FX + RX * Math.cos(a), y: fy + RY * Math.sin(a) }
  })
  return { spokes, fy, H }
})

function figTransform(x: number, y: number): string {
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${FIG_SCALE}) translate(${-FIG_CX} ${-FIG_CY})`
}
function figStyle(s: SpecimenView) {
  return { ...signatureVars(s.signature?.colors), color: 'var(--atlas-ink)' }
}

/** `p` moved `r` along the p→q direction — trims a curve end back to a
 *  medallion's edge (and leaves room for the arrowhead on the target side). */
function toward(p: Pt, q: Pt, r: number): Pt {
  const dx = q.x - p.x
  const dy = q.y - p.y
  const L = Math.hypot(dx, dy) || 1
  return { x: p.x + (dx / L) * r, y: p.y + (dy / L) * r }
}
function pt(p: Pt): string {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
}

interface Strand { r: Relation; other: SpecimenView; d: string; rail: string; endStroke: string }

const strands = computed<Strand[]>(() => {
  const F: Pt = { x: FX, y: view.value.fy }
  return view.value.spokes.map((sp): Strand => {
    const S: Pt = { x: sp.x, y: sp.y }
    const dx = S.x - F.x
    const dy = S.y - F.y
    const L = Math.hypot(dx, dy) || 1
    const ux = dx / L
    const uy = dy / L
    // Bow each strand gently outward, away from the fan's axis (a level strand
    // bows up), echoing the food web's curved strands.
    let bx = -uy
    let by = ux
    if (dy > 0.5 ? by < 0 : by > 0) {
      bx = -bx
      by = -by
    }
    const qOff = Math.min(36, L * 0.11)
    const Q: Pt = { x: (F.x + S.x) / 2 + bx * qOff, y: (F.y + S.y) / 2 + by * qOff }
    const out = sp.r.dir === 'out'
    const pF = toward(F, Q, out ? RF + 2 : RF + 9)
    const pS = toward(S, Q, out ? R + 9 : R + 2)
    // The visible path runs in the arrow's direction (#71: `out` = the focus is
    // the edge's `from`, so the arrow leaves it; `in` = it arrives).
    const d = out ? `M${pt(pF)} Q${pt(Q)} ${pt(pS)}` : `M${pt(pS)} Q${pt(Q)} ${pt(pF)}`
    // The label rail is the same curve lifted a hair's breadth above, and ALWAYS
    // oriented focus→spoke (left→right) regardless of arrow direction — textPath
    // sets its glyphs along path direction, so an `in`-oriented rail would hang
    // the phrase upside down.
    let ax = -uy
    let ay = ux
    if (ay > 0) {
      ax = -ax
      ay = -ay
    }
    const LIFT = 8
    const rail = `M${pt({ x: pF.x + ax * LIFT, y: pF.y + ay * LIFT })} Q${pt({ x: Q.x + ax * LIFT, y: Q.y + ay * LIFT })} ${pt({ x: pS.x + ax * LIFT, y: pS.y + ay * LIFT })}`
    return {
      r: sp.r,
      other: sp.other,
      d,
      rail,
      // Colored by the strand's actor, same convention as the food web.
      endStroke: out ? specimenAccent(props.specimen) : specimenAccent(sp.other),
    }
  })
})

function spokeEnter(slug: string) {
  emit('update:highlight', slug)
}
function spokeLeave() {
  emit('update:highlight', null)
}
</script>

<template>
  <div class="atlas-web atlas-relweb">
    <svg
      v-if="view.spokes.length"
      :viewBox="`0 0 ${W} ${view.H}`"
      role="group"
      :aria-label="`${specimen.binomial}'s relations`"
    >
      <defs>
        <marker
          :id="`${uid}-arrow`"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,1 L9,5 L0,9" fill="none" stroke="context-stroke" stroke-width="1.4" />
        </marker>
        <radialGradient :id="`${uid}-seat`">
          <stop offset="52%" stop-color="var(--atlas-paper)" stop-opacity="1" />
          <stop offset="100%" stop-color="var(--atlas-paper)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- strands, each with a wide invisible hit-path so hovering the arrow
           itself (not just its far node) also lights the matching row below -->
      <g v-for="(st, i) in strands" :key="`s${i}`">
        <path
          class="strand-hit"
          :d="st.d"
          @mouseenter="spokeEnter(st.other.slug)"
          @mouseleave="spokeLeave()"
        />
        <path
          class="strand"
          :class="st.r.kind"
          :d="st.d"
          :style="{ stroke: st.endStroke }"
          :marker-end="`url(#${uid}-arrow)`"
        />
        <path :id="`${uid}-rail-${i}`" class="rail" :d="st.rail" />
        <text class="rel-lbl" text-anchor="middle">
          <textPath :href="`#${uid}-rail-${i}`" startOffset="50%">{{ st.r.label }}</textPath>
        </text>
      </g>

      <!-- the focus, seated at the left — whose page this is -->
      <g class="node is-focus" :style="figStyle(specimen)">
        <circle class="focus-ring" :cx="FX" :cy="view.fy" :r="RF + 5" />
        <circle class="seat" :cx="FX" :cy="view.fy" :r="RF" :fill="`url(#${uid}-seat)`" />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <g v-if="specimen.illustration" class="figure" :transform="figTransform(FX, view.fy)" v-html="specimen.illustration" />
        <text v-else class="mk" :x="FX" :y="view.fy + 4" text-anchor="middle">{{ rarityMeta(specimen.rarity).mark }}</text>
        <text class="nm is-focus" :x="FX" :y="view.fy + RF + 21" text-anchor="middle">{{ specimen.binomial }}</text>
        <line
          class="sigrule"
          :x1="FX - 12"
          :x2="FX + 12"
          :y1="view.fy + RF + 30"
          :y2="view.fy + RF + 30"
          :style="{ stroke: specimenAccent(specimen) }"
        />
      </g>

      <!-- the specimens it relates to, one medallion per spoke, each named to
           its right like a chart key — strands arrive from the left, so the
           name's column stays clear of every line -->
      <NuxtLink
        v-for="sp in view.spokes"
        :key="`${sp.r.kind}-${sp.r.dir}-${sp.other.slug}`"
        v-slot="{ href, navigate }"
        :to="`/t/atlas/${biome}/${sp.other.slug}`"
        custom
      >
        <a
          class="node-hit"
          :href="href"
          :aria-label="`${sp.other.binomial}, ${specimen.binomial} ${sp.r.label} ${sp.other.binomial}`"
          @click="navigate"
          @mouseenter="spokeEnter(sp.other.slug)"
          @mouseleave="spokeLeave()"
          @focus="spokeEnter(sp.other.slug)"
          @blur="spokeLeave()"
        >
          <g class="node" :style="figStyle(sp.other)">
            <circle class="seat" :cx="sp.x" :cy="sp.y" :r="R" :fill="`url(#${uid}-seat)`" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <g v-if="sp.other.illustration" class="figure" :transform="figTransform(sp.x, sp.y)" v-html="sp.other.illustration" />
            <text v-else class="mk" :x="sp.x" :y="sp.y + 3.5" text-anchor="middle">{{ rarityMeta(sp.other.rarity).mark }}</text>
            <text class="nm" :x="sp.x + R + 14" :y="sp.y + 3.5" text-anchor="start">{{ sp.other.binomial }}</text>
            <line
              class="sigrule"
              :x1="sp.x + R + 14"
              :x2="sp.x + R + 38"
              :y1="sp.y + 13"
              :y2="sp.y + 13"
              :style="{ stroke: specimenAccent(sp.other) }"
            />
          </g>
        </a>
      </NuxtLink>
    </svg>
  </div>
</template>
