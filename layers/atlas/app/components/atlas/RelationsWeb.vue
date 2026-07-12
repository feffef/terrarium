<script setup lang="ts">
// A specimen's own reflection of the food web (#71): the same engraved-plate
// medallions and annotated strands `AtlasFoodWeb` draws for a whole Biome, but
// hub-and-spoke around just this one Specimen — the focus, centred, with each
// Relation as a spoke. Every strand carries its own label (the side-aware
// phrase from `relationsFor`), always on. No hover-driven dim/highlight lives
// IN this diagram (unlike the wandering food web) — hovering a spoke or its
// arrow instead lights the matching row in the `AtlasRelationsList` below,
// via `update:highlight`, so the two views of the same handful of facts read
// as one instrument, not two disconnected ones.
import type { Relation, SpecimenView } from '../../utils/atlas'

const props = defineProps<{
  specimen: SpecimenView
  relations: Relation[]
  specimensBySlug: Record<string, SpecimenView>
  biome: string
}>()
const emit = defineEmits<{ 'update:highlight': [slug: string | null] }>()

const W = 640
const H = 560
const cx = W / 2
const cy = H / 2
const R = 38 // spoke medallion radius
const RF = 46 // the focus's own medallion — a touch larger; this is whose page it is

// Same authored-illustration convention as AtlasFoodWeb: a 0 0 400 300 viewBox
// drawn about its centre (~200,150), scaled and re-centred onto the node.
const FIG_CX = 200
const FIG_CY = 150
const FIG_SCALE = 0.2

interface Pt { x: number; y: number }
// `ux`/`uy`: the unit vector from centre to this spoke — every bit of a
// spoke's OWN furniture (its name, sigrule) is placed further along this
// same outward direction rather than a fixed screen-down offset, so a spoke
// sitting above the focus doesn't have its name land back on the focus.
interface Spoke { r: Relation; other: SpecimenView; x: number; y: number; ux: number; uy: number }

// Spokes evenly on a ring around the focus, first at top. The ring radius is
// sized so even the two longest relation phrases ("pollinated by" /
// "sheltered by") can seat side by side without touching at 3 spokes — see
// LABEL_T below; it needs real room, not just clearance from the medallions.
const RING_R = Math.min(cx, cy) - 90
const LABEL_T = 0.56 // how far out along the spoke line a strand's label seats

const spokes = computed<Spoke[]>(() => {
  const n = props.relations.length
  return props.relations
    .map((r, i): Spoke | null => {
      const other = props.specimensBySlug[r.other]
      if (!other) return null
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const ux = Math.cos(ang)
      const uy = Math.sin(ang)
      return { r, other, x: cx + RING_R * ux, y: cy + RING_R * uy, ux, uy }
    })
    .filter((x): x is Spoke => x !== null)
})

function figTransform(x: number, y: number): string {
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${FIG_SCALE}) translate(${-FIG_CX} ${-FIG_CY})`
}
function figStyle(s: SpecimenView) {
  return { ...signatureVars(s.signature?.colors), color: 'var(--atlas-ink)' }
}

// Trim an endpoint back along the a→b line so a strand meets the medallion's
// edge (and its arrowhead shows) rather than vanishing under the circle.
function trim(a: Pt, b: Pt, r: number): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const L = Math.hypot(dx, dy) || 1
  return { x: a.x + (dx / L) * r, y: a.y + (dy / L) * r }
}

interface Strand { r: Relation; other: SpecimenView; d: string; endStroke: string; labelX: number; labelY: number }

// One straight strand per spoke — direction follows the Relation's own `dir`
// (#71: `out` = the focus is the edge's `from`, so the arrow leaves it; `in` =
// the focus is the `to`, so the arrow arrives). No inward bow like the food
// web's: with the focus fixed at centre there's no ambiguity a curve needs to
// resolve, so the straight chord is the clearer read.
const strands = computed<Strand[]>(() =>
  spokes.value.map((sp): Strand => {
    const center: Pt = { x: cx, y: cy }
    const spokePt: Pt = { x: sp.x, y: sp.y }
    const out = sp.r.dir === 'out'
    const from = out ? center : spokePt
    const to = out ? spokePt : center
    const s = trim(from, to, (out ? RF : R) + 2)
    const t = trim(to, from, (out ? R : RF) + 8)
    return {
      r: sp.r,
      other: sp.other,
      d: `M${s.x.toFixed(1)},${s.y.toFixed(1)} L${t.x.toFixed(1)},${t.y.toFixed(1)}`,
      // Colored by the strand's actor, same convention as the food web.
      endStroke: out ? specimenAccent(props.specimen) : specimenAccent(sp.other),
      // Seated a fixed fraction along the FULL centre→spoke line — independent
      // of arrow direction (unlike trimming `s`→`t`, which for an `in`
      // relation put the label hard against the larger focus medallion).
      labelX: cx + sp.ux * RING_R * LABEL_T,
      labelY: cy + sp.uy * RING_R * LABEL_T,
    }
  }),
)

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
      v-if="spokes.length"
      :viewBox="`0 0 ${W} ${H}`"
      role="group"
      :aria-label="`${specimen.binomial}'s relations`"
    >
      <defs>
        <marker
          id="atlas-relweb-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,1 L9,5 L0,9" fill="none" stroke="context-stroke" stroke-width="1.4" />
        </marker>
        <radialGradient id="atlas-relweb-seat">
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
          marker-end="url(#atlas-relweb-arrow)"
        />
        <g class="strand-label">
          <rect
            :x="st.labelX - relationLabelPillWidth(st.r.label) / 2"
            :y="st.labelY - 9"
            :width="relationLabelPillWidth(st.r.label)"
            height="18"
            rx="3"
          />
          <text :x="st.labelX" :y="st.labelY + 4" text-anchor="middle">{{ st.r.label }}</text>
        </g>
      </g>

      <!-- the focus, centred — whose page this is -->
      <g class="node is-focus" :style="figStyle(specimen)">
        <circle class="focus-ring" :cx="cx" :cy="cy" :r="RF + 5" />
        <circle class="seat" :cx="cx" :cy="cy" :r="RF" fill="url(#atlas-relweb-seat)" />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <g v-if="specimen.illustration" class="figure" :transform="figTransform(cx, cy)" v-html="specimen.illustration" />
        <text v-else class="mk" :x="cx" :y="cy + 4" text-anchor="middle">{{ rarityMeta(specimen.rarity).mark }}</text>
        <line
          class="sigrule"
          :x1="cx - 14"
          :x2="cx + 14"
          :y1="cy + RF + 24"
          :y2="cy + RF + 24"
          :style="{ stroke: specimenAccent(specimen) }"
        />
        <text class="nm is-focus" :x="cx" :y="cy + RF + 17" text-anchor="middle">{{ specimen.binomial }}</text>
      </g>

      <!-- the specimens it relates to, one medallion per spoke -->
      <NuxtLink
        v-for="sp in spokes"
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
            <circle class="seat" :cx="sp.x" :cy="sp.y" :r="R" fill="url(#atlas-relweb-seat)" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <g v-if="sp.other.illustration" class="figure" :transform="figTransform(sp.x, sp.y)" v-html="sp.other.illustration" />
            <text v-else class="mk" :x="sp.x" :y="sp.y + 3.5" text-anchor="middle">{{ rarityMeta(sp.other.rarity).mark }}</text>
            <!-- name/sigrule sit further OUT along the spoke's own centre→node
                 direction, not a fixed screen-down offset — a spoke above the
                 focus must not have its name land back on the focus itself -->
            <line
              class="sigrule"
              :x1="sp.x + sp.ux * (R + 28) - sp.uy * 11"
              :y1="sp.y + sp.uy * (R + 28) + sp.ux * 11"
              :x2="sp.x + sp.ux * (R + 28) + sp.uy * 11"
              :y2="sp.y + sp.uy * (R + 28) - sp.ux * 11"
              :style="{ stroke: specimenAccent(sp.other) }"
            />
            <text class="nm" :x="sp.x + sp.ux * (R + 38)" :y="sp.y + sp.uy * (R + 38) + 3.5" text-anchor="middle">{{ sp.other.binomial }}</text>
          </g>
        </a>
      </NuxtLink>
    </svg>
  </div>
</template>
