<script setup lang="ts">
// The stratigraphic depth-gauge (#524; redesign handoff, direction 1a's slim
// "Section" margin). A Site page's scroll-synced cross-section of the dig
// seasons its embedded artifacts span: a narrow vertical gauge, oldest at the
// BOTTOM like a real trench wall, each segment sized proportionally to how much
// is actually deposited in that season (an informationally-honest section, not
// decorative equal-height bands). The currently-scrolled season gets the
// terracotta fill, an `aria-current="location"`, AND a hand-written "you're
// here" marker (colour is never the sole active signal — a11y).
//
// The real behaviour contract from #524 is preserved verbatim through the
// restyle:
//   · SSR-first — each segment server-renders a real `<a href="#artifact-…">`,
//     so no-JS / screen-reader users get full navigation; the observer is
//     progressive enhancement added only in onMounted.
//   · The page-level IntersectionObserver (rootMargin '-40% 0px -55% 0px') over
//     every `[data-stratum]` element retains the previous active season when a
//     prose gap means nothing intersects, rather than blanking the highlight.
//
// Pure presentational consumer of `artifacts` — it does not query content. The
// `[data-stratum]`/`id="artifact-<slug>"` elements it observes are rendered
// elsewhere on the page (ArtifactCard, via the `::midden-artifact` embeds).
import type { DigSeason } from '../../utils/strata'
import type { Grade } from '../../utils/condition'

const props = defineProps<{
  artifacts: Array<{ slug: string; stratum: string; condition: Grade }>
}>()

interface StratumBand {
  season: DigSeason
  firstArtifactSlug: string
  count: number
}

// One band per dig season actually represented in `artifacts`, oldest-first
// (DIG_SEASONS' own order) — a season with nothing deposited on this page gets
// no band (the same "nothing worth drawing" convention as an empty almanac arc).
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

// Rendered newest-first in the DOM so a plain top-to-bottom flex column puts the
// oldest band last — physically at the bottom, like a real trench wall.
const bandsNewestFirst = computed(() => [...bandsOldestFirst.value].reverse())

const totalFinds = computed(() => props.artifacts.length)

// The curator's date labels drop the "the " article — the gauge is narrow.
function shortLabel(label: string): string {
  return label.replace(/^the /i, '')
}

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
  <nav v-if="bandsOldestFirst.length" class="midden-gauge" aria-label="Dig seasons">
    <div class="mono midden-gauge__cap">Section</div>
    <ol class="midden-gauge__bands">
      <li
        v-for="band in bandsNewestFirst"
        :key="band.season.slug"
        class="midden-gauge__band"
        :class="{ 'midden-gauge__band--active': activeStratum === band.season.slug }"
        :style="{ flexGrow: band.count }"
      >
        <a
          class="midden-gauge__link"
          :href="`#artifact-${band.firstArtifactSlug}`"
          :aria-current="activeStratum === band.season.slug ? 'location' : undefined"
          @click="onBandClick(band.firstArtifactSlug, $event)"
        >
          <span class="mono midden-gauge__name">{{ shortLabel(band.season.label) }}</span>
        </a>
        <span
          v-if="activeStratum === band.season.slug"
          class="hand midden-gauge__here"
          aria-hidden="true"
        >you're here</span>
      </li>
    </ol>
    <div class="mono midden-gauge__total">{{ totalFinds }}&darr;</div>
  </nav>
</template>

<style scoped>
.midden-gauge {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--midden-rule);
  background: var(--midden-slate-wash);
}

.midden-gauge__cap {
  padding: 14px 0 9px;
  text-align: center;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.62rem;
  color: var(--midden-slate-2);
}

.midden-gauge__bands {
  flex: 1;
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  min-height: 22rem;
}

.midden-gauge__band {
  position: relative;
  flex-basis: 0;
  flex-shrink: 1;
  min-height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--midden-slate-wash);
  color: var(--midden-slate-2);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.midden-gauge__band + .midden-gauge__band {
  border-top: 1px solid var(--midden-rule);
}
.midden-gauge__band--active {
  background: var(--midden-accent);
  color: var(--midden-accent-ink);
}

.midden-gauge__link {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: inherit;
}
.midden-gauge__link:hover { color: inherit; }
.midden-gauge__link:focus-visible {
  outline: 2px solid var(--midden-accent);
  outline-offset: -2px;
}

.midden-gauge__name {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.6rem;
  padding: 8px 0;
}

.midden-gauge__here {
  position: absolute;
  top: 6px;
  left: 5px;
  font-size: 0.8rem;
  line-height: 1;
  color: var(--midden-accent-ink);
  pointer-events: none;
}

.midden-gauge__total {
  padding: 9px 0 14px;
  text-align: center;
  font-size: 0.7rem;
  color: var(--midden-faint);
}

/* On a narrow viewport the gauge lies down into a horizontal strip above the
   reading column (the page switches to a single column at the same breakpoint). */
@media (max-width: 44rem) {
  .midden-gauge {
    flex-direction: row;
    align-items: stretch;
    border-right: 0;
    border-bottom: 1px solid var(--midden-rule);
  }
  .midden-gauge__cap,
  .midden-gauge__total {
    display: flex;
    align-items: center;
    padding: 0 12px;
    writing-mode: horizontal-tb;
  }
  .midden-gauge__bands {
    flex-direction: row;
    min-height: 0;
    flex: 1;
  }
  .midden-gauge__band {
    min-height: 2.6rem;
    flex-basis: 0;
  }
  .midden-gauge__band + .midden-gauge__band {
    border-top: 0;
    border-left: 1px solid var(--midden-rule);
  }
  .midden-gauge__name {
    writing-mode: horizontal-tb;
    transform: none;
    padding: 0 6px;
    text-align: center;
  }
  .midden-gauge__here { top: 2px; left: 4px; }
}
</style>
