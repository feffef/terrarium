<script setup lang="ts">
// The biome wing landing (`/t/atlas/<biome>`, #66): one grammar, three rooms.
// A more specific route than the Platform's generic catch-all, so it wins for the
// Space root; specimen entries render via the sibling `[...slug].vue`.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the Space
// through the SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses,
// then reads only this biome's keyed pages/interactions/observations. Biomes
// cannot leak — the whole wing is a same-Space read.
import { resolveSpaceRoute } from '~~/shared/routing'
import { biomeMeta } from '../../../../biomes'
import { signatureVars, toSpecimenView, type Edge, type SpecimenView } from '../../../../utils/atlas'
import SpecimenIndex from '../../../../components/atlas/SpecimenIndex.vue'
import FoodWeb from '../../../../components/atlas/FoodWeb.vue'
import FieldLog from '../../../../components/atlas/FieldLog.vue'
import RhythmBand from '../../../../components/atlas/RhythmBand.vue'
import RarityLegend from '../../../../components/atlas/RarityLegend.vue'

const route = useRoute()
const tenant = 'atlas'
const space = String(route.params.space)

const resolved = resolveSpaceRoute(tenant, space, undefined)
if (!resolved) {
  throw createError({ statusCode: 404, statusMessage: `Unknown biome: ${tenant}/${space}` })
}
const pagesKey = resolved.pagesKey
const interactionsKey = resolved.dataCollections.find((d) => d.name === 'interactions')?.key
const observationsKey = resolved.dataCollections.find((d) => d.name === 'observations')?.key

const { data } = await useAsyncData(route.path, async () => {
  const pages = await queryCollection(pagesKey).all()
  const interactions = interactionsKey ? await queryCollection(interactionsKey).all() : []
  const observations = observationsKey ? await queryCollection(observationsKey).all() : []
  return { pages, interactions, observations }
})

const meta = biomeMeta(space)
const pages = computed(() => data.value?.pages ?? [])
const landing = computed(() => pages.value.find((p) => p.path === '/') ?? null)
const specimens = computed<SpecimenView[]>(() =>
  pages.value
    .filter((p) => p.path !== '/')
    .map(toSpecimenView)
    .sort((a, b) => a.binomial.localeCompare(b.binomial)),
)
const specimensBySlug = computed(() =>
  Object.fromEntries(specimens.value.map((s) => [s.slug, s])),
)
const edges = computed<Edge[]>(() => (data.value?.interactions ?? []) as Edge[])
const observations = computed(() => data.value?.observations ?? [])
const withRhythm = computed(() => specimens.value.filter((s) => s.activity))

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
        <SpecimenIndex :specimens="specimens" :biome="space" />
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">The food web</span></div>
        <FoodWeb :specimens="specimens" :edges="edges" :biome="space" />
      </section>

      <section v-if="withRhythm.length">
        <div class="atlas-sechead"><span class="atlas-eyebrow">Daily choreography</span></div>
        <ul class="choreo">
          <li v-for="s in withRhythm" :key="s.slug" :style="sigStyle(s)">
            <NuxtLink class="cname" :to="`/t/atlas/${space}/${s.slug}`">{{ s.binomial }}</NuxtLink>
            <RhythmBand :bands="s.activity!.bands" :label="s.activity!.label" />
          </li>
        </ul>
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">Field log</span></div>
        <FieldLog :observations="observations" :specimens-by-slug="specimensBySlug" :biome="space" :limit="8" />
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">On rarity</span></div>
        <RarityLegend />
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
</style>
