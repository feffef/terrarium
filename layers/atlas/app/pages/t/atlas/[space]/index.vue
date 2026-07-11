<script setup lang="ts">
// The biome wing landing (`/t/atlas/<biome>`, #66): one grammar, three rooms.
// A more specific route than the Platform's generic catch-all, so it wins for the
// Space root; specimen entries render via the sibling `[...slug].vue`.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the Space
// through the SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses
// (via the read-only useSpace composable), then reads only this biome's keyed
// pages/interactions/observations. Biomes cannot leak — the whole wing is a
// same-Space read. `biomeMeta`, the utils (`toSpecimenView`, `signatureVars`)
// and the Atlas* components arrive via Nuxt's layer-wide auto-imports; only the
// types still import relatively. The three-`queryCollection` load itself (and
// the shared `specimensBySlug` lookup) is single-homed in the
// `useAtlasWingData` composable — the sibling `[...slug].vue` entry page needs
// the exact same load (code review; see that composable's header for why).
import type { AlmanacBand, SpecimenView } from '../../../../utils/atlas'

const route = useRoute()
const { space, pagesKey, collections } = useSpace('atlas')
const { pages, edges, observations, specimensBySlug } = await useAtlasWingData(route.path, {
  pagesKey,
  collections,
})

const meta = biomeMeta(space)
const landing = computed(() => pages.value.find((p) => p.path === '/') ?? null)
const specimens = computed<SpecimenView[]>(() =>
  pages.value
    .filter((p) => p.path !== '/')
    .map(toSpecimenView)
    .sort((a, b) => a.binomial.localeCompare(b.binomial)),
)
const withRhythm = computed(() => specimens.value.filter((s) => s.activity))

// The composite almanac wheel (#285, map #279): the annual sibling of "Daily
// choreography" above — one band per phenology-carrying specimen, stacked
// into ONE wheel instead of one dial each. Only #284's specimens (today: just
// `lumina-fabulae` in canopy) carry `phenology` yet; this reads the
// collection at runtime, so it fills in as that content lands — nothing here
// is hard-coded to a specimen.
const withPhenology = computed(() => specimens.value.filter((s) => (s.phenology?.phases.length ?? 0) > 0))
const phenologyBands = computed<AlmanacBand[]>(() =>
  withPhenology.value.map((s) => ({
    slug: s.slug,
    label: s.binomial,
    phases: s.phenology!.phases,
    color: s.signature?.colors?.[0]?.hex,
  })),
)
// Shared hover/focus state, both directions: the wheel and the catalogue each
// bind `v-model:highlight` to this one ref, so a band lights up its row and a
// row lights up its band.
const hoveredSpecimen = ref<string | null>(null)

const sigStyle = (s: SpecimenView) => signatureVars(s.signature?.colors)

useHead({ title: `${meta.name} · The Atlas of the Terrarium` })
</script>

<template>
  <main class="atlas" :class="`atlas--${space}`">
    <div class="atlas-page">
      <p class="atlas-crumb">
        <NuxtLink to="/t/atlas">The Atlas</NuxtLink><span class="sep">·</span><span class="here">{{ meta.name }}</span>
      </p>

      <header class="biome-head">
        <p class="atlas-eyebrow">Wing {{ meta.numeral }} · {{ meta.character }}</p>
        <h1>{{ landing?.title ?? meta.name }}</h1>
        <div v-if="landing" class="atlas-prose biome-intro">
          <ContentRenderer :value="landing" />
        </div>
      </header>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">The catalogue</span></div>
        <AtlasSpecimenIndex v-model:highlight="hoveredSpecimen" :specimens="specimens" :biome="space" />
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">The food web</span></div>
        <AtlasFoodWeb :specimens="specimens" :edges="edges" :biome="space" />
      </section>

      <section v-if="withRhythm.length">
        <div class="atlas-sechead"><span class="atlas-eyebrow">Daily choreography</span></div>
        <ul class="choreo">
          <li v-for="s in withRhythm" :key="s.slug" :style="sigStyle(s)">
            <NuxtLink class="cname" :to="`/t/atlas/${space}/${s.slug}`">{{ s.binomial }}</NuxtLink>
            <AtlasRhythmBand :bands="s.activity!.bands" :label="s.activity!.label" />
          </li>
        </ul>
      </section>

      <section v-if="withPhenology.length" class="almanac-section">
        <div class="atlas-sechead"><span class="atlas-eyebrow">The wing's year</span></div>
        <p class="almanac-lede">
          Every inhabitant with a recorded phenology, stacked onto one dial — the same needle
          turns every band at once.
        </p>
        <div class="composite-wrap">
          <AtlasPhenologyWheel
            v-model:highlight="hoveredSpecimen"
            class="composite-wheel"
            :bands="phenologyBands"
            :observations="observations"
          />
        </div>
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">Field log</span></div>
        <AtlasFieldLog :observations="observations" :specimens-by-slug="specimensBySlug" :biome="space" :limit="8" />
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">On rarity</span></div>
        <AtlasRarityLegend />
      </section>
    </div>
  </main>
</template>

<style scoped>
.biome-head { margin-bottom: 1rem; }
.biome-head h1 {
  font-family: var(--atlas-display);
  font-size: clamp(2.6rem, 8vw, 4.4rem);
  line-height: 0.98;
  letter-spacing: -0.02em;
  margin: 0.5rem 0 0;
  text-wrap: balance;
}
.biome-intro { margin-top: 1.1rem; max-width: 40rem; color: var(--atlas-muted); }
.choreo { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.4rem; }
.choreo li {
  display: grid;
  grid-template-columns: minmax(9rem, 12rem) 1fr;
  gap: 0.4rem 1.4rem;
  align-items: center;
}
.choreo .cname {
  font-family: var(--atlas-display);
  font-style: italic;
  font-size: 1.05rem;
  color: var(--atlas-ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.choreo .cname:hover { color: var(--biome-accent); border-bottom-color: currentColor; }
@media (max-width: 34rem) {
  .choreo li { grid-template-columns: 1fr; gap: 0.5rem; }
}
.almanac-lede { max-width: 34rem; color: var(--atlas-muted); margin: 0 0 1.3rem; font-size: 0.95rem; }
.composite-wrap { display: flex; justify-content: center; }
.composite-wheel { width: 100%; max-width: 26rem; }
</style>
