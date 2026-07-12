<script setup lang="ts">
// The food web (#70): the biome landing's centerpiece and its proof of life.
// Specimens are nodes — each wearing its own engraved plate (#67/#74), the same
// SVG rendering the specimen page shows, seated in a medallion; interactions are
// annotated strands (each kind visually distinct). Each strand's verb phrase
// rides ALONG the strand itself (textPath on an invisible rail, the same
// engraved-map register as the relations web, #71) rather than sitting boxed
// over it. Every node is a doorway to its entry; hovering/focusing a node
// lights its strands and dims the rest — the "wander". Drawn in the engraved
// register, and charming when sparse.
import type { Edge, SpecimenView } from '../../utils/atlas'

const props = defineProps<{ specimens: SpecimenView[]; edges: Edge[]; biome: string }>()

const uid = useId()

const W = 640
const H = 440
const cx = W / 2
const cy = H / 2
const R = 40 // medallion radius — the seat the plate sits in, and the strand-trim edge

// The authored illustrations use a 0 0 400 300 viewBox, drawn about their centre
// (~200,150). We scale each into the medallion and re-centre it on the node.
const FIG_CX = 200
const FIG_CY = 150
const FIG_SCALE = 0.2

interface Node { s: SpecimenView; x: number; y: number }

// Deterministic ring layout — nodes evenly on an ellipse, first at top. Clean for
// the handful of specimens a young wing holds; grows gracefully as sessions add more.
const nodes = computed<Node[]>(() => {
  const n = props.specimens.length
  const rx = W / 2 - 110
  const ry = H / 2 - 96
  return props.specimens.map((s, i) => {
    // A lone specimen sits at center; otherwise spread around the ring.
    if (n === 1) return { s, x: cx, y: cy }
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { s, x: cx + rx * Math.cos(ang), y: cy + ry * Math.sin(ang) }
  })
})

const nodeBySlug = computed<Record<string, Node>>(() =>
  Object.fromEntries(nodes.value.map((n) => [n.s.slug, n])),
)

// Seat a specimen's engraved plate inside its medallion: re-centre the drawing on
// the node and scale it down. `currentColor` (the linework) and `--sig-*` (the one
// tinted feature) are supplied by the node group's style below.
function figTransform(n: Node): string {
  return `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)}) scale(${FIG_SCALE}) translate(${-FIG_CX} ${-FIG_CY})`
}
function figStyle(s: SpecimenView) {
  return { ...signatureVars(s.signature?.colors), color: 'var(--atlas-ink)' }
}

interface Pt { x: number; y: number }

// Trim an endpoint back along the a→b line so a strand meets the node edge (and
// its arrowhead shows) rather than vanishing under the circle.
function trim(a: Node, b: Node, r: number): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const L = Math.hypot(dx, dy) || 1
  return { x: a.x + (dx / L) * r, y: a.y + (dy / L) * r }
}
function pt(p: Pt): string {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
}

interface Strand { e: Edge; d: string; rail: string; endStroke: string; label: string; off: string }

const strands = computed<Strand[]>(() => {
  // A node pair can carry more than one Interaction (e.g. A preys-on B AND B
  // fears A) — same two endpoints, so the same chord. Spread those apart
  // perpendicular to the chord so their curves don't land on top of each
  // other; a pair with only one edge gets offset 0 (unchanged). Labels seat
  // near their ACTOR's end of the strand rather than the midpoint — chord
  // midpoints of a ring all crowd into the same central patch, while the
  // actor's end both spreads phrases toward the perimeter and reads in arrow
  // order ("A —preys on→ B"); multi-edge pairs stagger along the chord on top
  // — which is what lets the old AABB pill-collision pass stay deleted.
  const pairTotal: Record<string, number> = {}
  for (const e of props.edges) {
    const key = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`
    pairTotal[key] = (pairTotal[key] ?? 0) + 1
  }
  const pairSeen: Record<string, number> = {}
  const pairActorSeen: Record<string, number> = {}

  return props.edges
    .map((e): Strand | null => {
      const a = nodeBySlug.value[e.from]
      const b = nodeBySlug.value[e.to]
      if (!a || !b) return null
      const key = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`
      const total = pairTotal[key] ?? 1
      const idx = pairSeen[key] ?? 0
      pairSeen[key] = idx + 1
      const offset = (idx - (total - 1) / 2) * 36

      const s = trim(a, b, R + 2)
      const t = trim(b, a, R + 8)
      // Control point pulled toward centre — strands bow inward, like a real
      // web — then nudged perpendicular to the chord by `offset`.
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      let qx = cx + (mx - cx) * 0.45
      let qy = cy + (my - cy) * 0.45
      if (offset !== 0) {
        // The pair's own canonical direction — the SAME two endpoints in the
        // SAME order regardless of which edge in the pair is being processed.
        // The perpendicular must be measured from a fixed direction, not each
        // edge's own from→to, or reversing the edge flips the perpendicular's
        // sign right along with `offset`'s sign and the two cancel out.
        const [canonA, canonB] = e.from < e.to ? [a, b] : [b, a]
        const dx = canonB.x - canonA.x
        const dy = canonB.y - canonA.y
        const L = Math.hypot(dx, dy) || 1
        qx += (-dy / L) * offset
        qy += (dx / L) * offset
      }

      // The label rail: the same curve lifted a hair's breadth off the strand,
      // ALWAYS oriented left→right (falling back to bottom→top when the chord
      // is nearly vertical) regardless of arrow direction — textPath sets its
      // glyphs along path direction, so a wrongly-oriented rail would hang the
      // phrase upside down.
      const flip = t.x < s.x - 0.5 || (Math.abs(t.x - s.x) <= 0.5 && t.y > s.y)
      const [rs, rt] = flip ? [t, s] : [s, t]
      const dx = rt.x - rs.x
      const dy = rt.y - rs.y
      const L = Math.hypot(dx, dy) || 1
      // The "above the path" side for glyphs on a left→right path.
      const ax = dy / L
      const ay = -dx / L
      const LIFT = 7
      const rail = `M${pt({ x: rs.x + ax * LIFT, y: rs.y + ay * LIFT })} Q${pt({ x: qx + ax * LIFT, y: qy + ay * LIFT })} ${pt({ x: rt.x + ax * LIFT, y: rt.y + ay * LIFT })}`

      // Fraction along the strand measured from the ACTOR's end; the rail may
      // run the other way (it is oriented for upright glyphs, not by actor).
      // An opposite-direction pair separates for free (each phrase sits by its
      // own actor); only same-actor edges of a pair need an along-stagger.
      const actorKey = `${key}|${e.from}`
      const sameActorIdx = pairActorSeen[actorKey] ?? 0
      pairActorSeen[actorKey] = sameActorIdx + 1
      const f = total > 1 ? 0.34 + sameActorIdx * 0.24 : 0.38
      return {
        e,
        d: `M${pt(s)} Q${pt({ x: qx, y: qy })} ${pt(t)}`,
        rail,
        endStroke: specimenAccent(a.s),
        label: relationLabel(e.kind, 'out'),
        off: `${Math.round((flip ? 1 - f : f) * 100)}%`,
      }
    })
    .filter((x): x is Strand => x !== null)
})

// Neighbour set for the hover dimming.
const neighbours = computed<Record<string, Set<string>>>(() => {
  const m: Record<string, Set<string>> = {}
  for (const e of props.edges) {
    ;(m[e.from] ??= new Set()).add(e.to)
    ;(m[e.to] ??= new Set()).add(e.from)
  }
  return m
})

const hot = ref<string | null>(null)

function nodeClass(slug: string) {
  if (!hot.value) return {}
  const connected = hot.value === slug || neighbours.value[hot.value]?.has(slug)
  return { hot: hot.value === slug, dim: !connected }
}
function strandClass(e: Edge) {
  const on = hot.value && (e.from === hot.value || e.to === hot.value)
  return [e.kind, { hot: on, dim: hot.value && !on }]
}
</script>

<template>
  <div class="atlas-web">
    <svg v-if="nodes.length" :viewBox="`0 0 ${W} ${H}`" role="group" aria-label="Food web of this biome">
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
        <!-- A borderless seat in the page's own paper colour: solid at the centre,
             fading to nothing at the rim. Invisible on empty paper; it only reveals
             itself by quietly softening the strands that pass under a specimen. -->
        <radialGradient :id="`${uid}-seat`">
          <stop offset="52%" stop-color="var(--atlas-paper)" stop-opacity="1" />
          <stop offset="100%" stop-color="var(--atlas-paper)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- strands first, under the nodes; each carries its verb phrase riding
           its own rail, so the web reads without having to wander it first -->
      <g v-for="(st, i) in strands" :key="`s${i}`">
        <path
          class="strand"
          :class="strandClass(st.e)"
          :d="st.d"
          :style="{ stroke: st.endStroke }"
          :marker-end="`url(#${uid}-arrow)`"
        />
        <path :id="`${uid}-rail-${i}`" class="rail" :d="st.rail" />
        <text class="web-lbl" :class="strandClass(st.e)" text-anchor="middle">
          <textPath :href="`#${uid}-rail-${i}`" :startOffset="st.off">{{ st.label }}</textPath>
        </text>
      </g>

      <!-- nodes -->
      <NuxtLink
        v-for="n in nodes"
        :key="n.s.slug"
        v-slot="{ href, navigate }"
        :to="`/t/atlas/${biome}/${n.s.slug}`"
        custom
      >
        <a
          class="node-hit"
          :href="href"
          :aria-label="`${n.s.binomial}, ${n.s.common} — ${rarityMeta(n.s.rarity).grade}`"
          @click="navigate"
          @mouseenter="hot = n.s.slug"
          @mouseleave="hot = null"
          @focus="hot = n.s.slug"
          @blur="hot = null"
        >
          <g class="node" :class="nodeClass(n.s.slug)" :style="figStyle(n.s)">
            <!-- the seat: a borderless page-coloured vignette that softens the
                 strands beneath the specimen, and the hover/click hit target -->
            <circle class="seat" :cx="n.x" :cy="n.y" :r="R" :fill="`url(#${uid}-seat)`" />
            <!-- the engraved plate, drawn straight onto the page. v-html is safe: the
                 illustration is agent-authored, repo-committed markup (see Plate). -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <g v-if="n.s.illustration" class="figure" :transform="figTransform(n)" v-html="n.s.illustration" />
            <text v-else class="mk" :x="n.x" :y="n.y + 3.5" text-anchor="middle">{{ rarityMeta(n.s.rarity).mark }}</text>
            <!-- the specimen's colour, carried as a short engraved rule under the name -->
            <line class="sigrule" :x1="n.x - 13" :x2="n.x + 13" :y1="n.y + R + 22" :y2="n.y + R + 22" :style="{ stroke: specimenAccent(n.s) }" />
            <text class="nm" :x="n.x" :y="n.y + R + 15" text-anchor="middle">{{ n.s.binomial }}</text>
          </g>
        </a>
      </NuxtLink>
    </svg>
    <p v-else class="empty">An empty wing. The naturalists have not yet been.</p>
  </div>
</template>
