<script setup lang="ts">
// The stratigraphy sidebar (#524, panel-resolved — implement exactly, no
// re-litigating). A Site page's scroll-synced cross-section of the dig
// seasons its embedded artifacts span: stacked slate bands, oldest at the
// bottom like a real trench wall, band height proportional to how much is
// actually deposited in that season (an "informationally honest"
// cross-section, not decorative equal-height bands).
//
// Pure presentational consumer of `artifacts` — it does not query content
// itself (a different story's page component passes the list in). The
// `[data-stratum]`/`id="artifact-<slug>"` elements the scroll-sync observes
// are rendered elsewhere on the page, by a component this sidebar doesn't own.
import type { DigSeason } from '../../utils/strata'

const props = defineProps<{
  artifacts: Array<{ slug: string; stratum: string }>
}>()

interface StratumBand {
  season: DigSeason
  firstArtifactSlug: string
  count: number
}

// One band per dig season actually represented in `artifacts`, oldest-first
// (DIG_SEASONS' own order) — a season with nothing deposited on this page
// gets no band, the same "nothing worth drawing" convention as an empty arc
// in the Atlas's almanac (utils/almanac.ts).
const bandsOldestFirst = computed<StratumBand[]>(() => {
  const bySlug = new Map<string, { firstArtifactSlug: string; count: number }>()
  for (const artifact of props.artifacts) {
    const existing = bySlug.get(artifact.stratum)
    if (existing) existing.count += 1
    else bySlug.set(artifact.stratum, { firstArtifactSlug: artifact.slug, count: 1 })
  }
  return DIG_SEASONS.filter((season) => bySlug.has(season.slug)).map((season) => ({
    season,
    ...bySlug.get(season.slug)!,
  }))
})

// Rendered newest-first in the DOM so a plain top-to-bottom flex column puts
// the oldest band last — physically at the bottom, like a real trench wall.
const bandsNewestFirst = computed(() => [...bandsOldestFirst.value].reverse())

const activeStratum = ref<string | null>(null)

let observer: IntersectionObserver | null = null

onMounted(() => {
  // Progressive enhancement only — this whole block is client-side scroll-sync,
  // never part of the SSR render (#524).
  if (!import.meta.client) return
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-stratum]'))
  if (targets.length === 0) return

  observer = new IntersectionObserver(
    (entries) => {
      const intersecting = entries.filter((e) => e.isIntersecting)
      // A prose gap between artifacts means nothing currently intersects —
      // retain the previous active stratum rather than blanking the highlight.
      if (intersecting.length === 0) return
      const topmost = intersecting.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b))
      const stratum = (topmost.target as HTMLElement).dataset.stratum
      if (stratum) activeStratum.value = stratum
    },
    { rootMargin: '-40% 0px -55% 0px' },
  )
  for (const target of targets) observer.observe(target)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})

function onBandClick(firstArtifactSlug: string, event: MouseEvent) {
  if (!import.meta.client) return
  const target = document.getElementById(`artifact-${firstArtifactSlug}`)
  if (!target) return // fall back to the native href jump
  event.preventDefault()
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <nav v-if="bandsOldestFirst.length" class="midden-stratigraphy-sidebar" aria-label="Dig seasons">
    <header class="midden-stratigraphy-sidebar__header">
      <MiddenGradeLegend />
    </header>
    <ol class="midden-stratigraphy-sidebar__bands">
      <li
        v-for="band in bandsNewestFirst"
        :key="band.season.slug"
        class="midden-stratigraphy-sidebar__band"
        :class="{ 'midden-stratigraphy-sidebar__band--active': activeStratum === band.season.slug }"
        :style="{ flexGrow: band.count }"
      >
        <a
          :href="`#artifact-${band.firstArtifactSlug}`"
          :aria-current="activeStratum === band.season.slug ? 'location' : undefined"
          @click="onBandClick(band.firstArtifactSlug, $event)"
        >
          {{ band.season.label }}
        </a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.midden-stratigraphy-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.midden-stratigraphy-sidebar__header {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--midden-line, #cabfa9);
}

.midden-stratigraphy-sidebar__bands {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  min-height: 24rem;
  gap: 2px;
}

.midden-stratigraphy-sidebar__band {
  flex-basis: 0;
  flex-shrink: 1;
  min-height: 2.5rem;
  background: var(--midden-slate, #5a5f66);
  transition: background-color 0.2s ease;
}

.midden-stratigraphy-sidebar__band a {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0.4rem 0.75rem;
  color: var(--midden-slate-ink, #eceef0);
  text-decoration: none;
  font-size: 0.85rem;
  line-height: 1.2;
}

.midden-stratigraphy-sidebar__band--active {
  background: var(--midden-accent, #b5623a);
}

.midden-stratigraphy-sidebar__band--active a {
  color: var(--midden-accent-ink, #fff8f0);
  font-weight: 600;
}
</style>
