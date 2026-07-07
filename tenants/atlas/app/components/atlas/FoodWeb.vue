<script setup lang="ts">
// The food web (#70): the biome landing's centerpiece and its proof of life.
// Specimens are nodes — each wearing its own engraved plate (#67/#74), the same
// SVG rendering the specimen page shows, seated in a medallion; interactions are
// annotated strands (each kind visually distinct). Every node is a doorway to its
// entry; hovering/focusing a node lights its strands and dims the rest — the
// "wander". Drawn in the engraved register, and charming when sparse.
import { rarityMeta, signatureVars, type Edge, type SpecimenView } from '../../utils/atlas'

const props = defineProps<{ specimens: SpecimenView[]; edges: Edge[]; biome: string }>()

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

function sig(s: SpecimenView | undefined): string {
  return s?.signature?.colors?.[0]?.hex || 'var(--biome-accent)'
}

// Seat a specimen's engraved plate inside its medallion: re-centre the drawing on
// the node and scale it down. `currentColor` (the linework) and `--sig-*` (the one
// tinted feature) are supplied by the node group's style below.
function figTransform(n: Node): string {
  return `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)}) scale(${FIG_SCALE}) translate(${-FIG_CX} ${-FIG_CY})`
}
function figStyle(s: SpecimenView) {
  return { ...signatureVars(s.signature?.colors), color: 'var(--atlas-ink)' }
}

// Trim an endpoint back along the a→b line so a strand meets the node edge (and
// its arrowhead shows) rather than vanishing under the circle.
function trim(a: Node, b: Node, r: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const L = Math.hypot(dx, dy) || 1
  return { x: a.x + (dx / L) * r, y: a.y + (dy / L) * r }
}

interface Strand { e: Edge; d: string; endStroke: string }

const strands = computed<Strand[]>(() =>
  props.edges
    .map((e): Strand | null => {
      const a = nodeBySlug.value[e.from]
      const b = nodeBySlug.value[e.to]
      if (!a || !b) return null
      const s = trim(a, b, R + 2)
      const t = trim(b, a, R + 8)
      // Control point pulled toward centre — strands bow inward, like a real web.
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const qx = cx + (mx - cx) * 0.45
      const qy = cy + (my - cy) * 0.45
      return { e, d: `M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${t.x.toFixed(1)},${t.y.toFixed(1)}`, endStroke: sig(props.specimens.find((sp) => sp.slug === e.from)) }
    })
    .filter((x): x is Strand => x !== null),
)

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

const LEGEND: { kind: Edge['kind']; label: string }[] = [
  { kind: 'preys-on', label: 'preys on' },
  { kind: 'pollinates', label: 'pollinates' },
  { kind: 'shelters', label: 'shelters' },
  { kind: 'mimics', label: 'mimics' },
  { kind: 'fears', label: 'fears' },
]
const usedKinds = computed(() => new Set(props.edges.map((e) => e.kind)))
</script>

<template>
  <div class="atlas-web">
    <svg v-if="nodes.length" :viewBox="`0 0 ${W} ${H}`" role="group" aria-label="Food web of this biome">
      <defs>
        <marker
          id="atlas-web-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,1 L9,5 L0,9" fill="none" stroke="context-stroke" stroke-width="1.4" />
        </marker>
      </defs>

      <!-- strands first, under the nodes -->
      <path
        v-for="(st, i) in strands"
        :key="`s${i}`"
        class="strand"
        :class="strandClass(st.e)"
        :d="st.d"
        :style="{ stroke: st.endStroke }"
        marker-end="url(#atlas-web-arrow)"
      />

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
            <!-- the medallion: a paper seat that masks strands and carries the
                 specimen's signature as a hairline ring -->
            <circle class="halo" :cx="n.x" :cy="n.y" :r="R" :style="{ stroke: sig(n.s) }" />
            <!-- the engraved plate, seated and scaled. v-html is safe: the
                 illustration is agent-authored, repo-committed markup (see Plate). -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <g v-if="n.s.illustration" class="figure" :transform="figTransform(n)" v-html="n.s.illustration" />
            <text v-else class="mk" :x="n.x" :y="n.y + 3.5" text-anchor="middle">{{ rarityMeta(n.s.rarity).mark }}</text>
            <text class="nm" :x="n.x" :y="n.y + R + 15" text-anchor="middle">{{ n.s.binomial }}</text>
          </g>
        </a>
      </NuxtLink>
    </svg>
    <p v-else class="empty">An empty wing. The naturalists have not yet been.</p>

    <div v-if="edges.length" class="atlas-web-legend">
      <span v-for="l in LEGEND.filter((k) => usedKinds.has(k.kind))" :key="l.kind" class="k">
        <svg viewBox="0 0 26 8"><line class="strand" :class="l.kind" x1="1" y1="4" x2="25" y2="4" /></svg>
        {{ l.label }}
      </span>
    </div>
  </div>
</template>
