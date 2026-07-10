<script setup lang="ts">
// The specimen entry (`/t/atlas/<biome>/<slug>`, #67): plate, museum label, and
// field-note essay — a display case. A more specific route than the Platform's
// generic catch-all, so specimens render in the guide's theme rather than the
// unstyled fallback.
//
// Isolation-respecting and presentation-only (ADR-0004): resolves through the
// SAME shared, unit-tested `resolveSpaceRoute` (via the read-only useSpace
// composable), then reads only this biome's keyed collections. Relations (#71)
// and sightings are same-Space reads — the food-web edges were authored
// in-biome (mirrors ADR-0012), so nothing queries a sibling. `biomeMeta`, the
// utils and the Atlas* components arrive via Nuxt's layer-wide auto-imports;
// only the types still import relatively — `PhenologyPhase` types the almanac's
// phase list below, `AlmanacObservation` the ledger the essay's `::sighting`
// quotes; `entry`'s shape (below) is otherwise left to inference. The
// three-`queryCollection` load itself is single-homed in the `useAtlasWingData`
// composable — the sibling `[space]/index.vue` landing needs the exact same load.
import type { AlmanacObservation } from '../../../../utils/almanacState'
import type { PhenologyPhase } from '../../../../utils/atlas'

const route = useRoute()
const { space, path, pagesKey, collections } = useSpace('atlas')
const { data, edges, observations, specimensBySlug } = await useAtlasWingData(route.path, {
  pagesKey,
  collections,
})

const meta = biomeMeta(space)
// `doc` and `specimen` are bundled into one `entry` so the template narrows
// both together from a single `v-if="entry"`. No cast needed: the return type
// is left to inference so `doc` keeps the exact generated `pages` item shape
// `ContentRenderer` expects.
const entry = computed(() => {
  const doc = data.value?.pages.find((p) => p.path === path) ?? null
  return doc ? { doc, specimen: toSpecimenView(doc) } : null
})
const relations = computed(() =>
  entry.value ? relationsFor(entry.value.specimen.slug, edges.value) : [],
)
const sightings = computed(() =>
  observations.value.filter((o) => o.specimen === entry.value?.specimen.slug),
)
const sigStyle = computed(() => signatureVars(entry.value?.specimen.signature?.colors))

// The almanac (#282): shared needle state for the dial and, later, the
// dial-driven MDC components inside the essay (#283). Provided here — the page
// owns the state; the wheel and any descendant inject it. The needle parks at
// today unless a `?day=` param says otherwise (see composables/almanac.ts).
const phenologyPhases = computed<PhenologyPhase[]>(() => entry.value?.specimen.phenology?.phases ?? [])
provideAlmanac({
  phases: phenologyPhases,
  initialDay: parseAlmanacDayParam(route.query.day),
  // The biome's ledger + this page's own inhabitant, so a `::sighting{date}`
  // in the essay can quote the observation's note without retyping it (#283).
  // Same-Space reads only — `observations` is this biome's keyed collection.
  observations: () => (data.value?.observations ?? []) as AlmanacObservation[],
  specimen: () => entry.value?.specimen.slug,
})
// The dial's rim ticks read the whole biome's dated ledger (map #279), not
// just this specimen's sightings — only `date` is passed.
const biomeObservations = computed(() => (data.value?.observations ?? []).map((o) => ({ date: o.date })))

const title = computed(() => entry.value?.specimen.binomial ?? 'Not found')
useSeoMeta({
  title: () => `${title.value} · The Atlas of the Terrarium`,
  description: () => entry.value?.specimen.common,
})
</script>

<template>
  <main class="atlas" :class="`atlas--${space}`" :style="sigStyle">
    <div class="atlas-page">
      <p class="atlas-crumb">
        <NuxtLink to="/t/atlas">The Atlas</NuxtLink><span class="sep">·</span>
        <NuxtLink :to="`/t/atlas/${space}`">{{ meta.name }}</NuxtLink><span class="sep">·</span>
        <span class="here">{{ entry?.specimen.binomial ?? 'unknown' }}</span>
      </p>

      <article v-if="entry">
        <AtlasSpecimenPlate
          :illustration="entry.specimen.illustration"
          :number="entry.specimen.plate?.number"
          :binomial="entry.specimen.binomial"
          :conjectural="entry.specimen.plate?.conjectural"
        />

        <div class="atlas-label">
          <h1 class="binomial">{{ entry.specimen.binomial }}</h1>
          <p v-if="entry.specimen.common" class="common">{{ entry.specimen.common }}</p>

          <dl class="record">
            <template v-if="entry.specimen.classification">
              <dt>class</dt><dd>{{ entry.specimen.classification }}</dd>
            </template>
            <template v-if="entry.specimen.rarity">
              <dt>rarity</dt><dd><AtlasRarityMark :grade="entry.specimen.rarity" :show-grade="true" /></dd>
            </template>
            <template v-if="entry.specimen.size">
              <dt>size</dt><dd>{{ entry.specimen.size }}</dd>
            </template>
            <template v-if="entry.specimen.diet">
              <dt>diet</dt><dd>{{ entry.specimen.diet }}</dd>
            </template>
            <template v-if="entry.specimen.activity">
              <dt>active</dt><dd>{{ entry.specimen.activity.label }}</dd>
            </template>
            <template v-if="entry.specimen.signature">
              <dt>signature</dt>
              <dd><AtlasColorSignature :colors="entry.specimen.signature.colors" :gloss="entry.specimen.signature.gloss" /></dd>
            </template>
          </dl>
        </div>

        <!-- The almanac dial (#282) heads the field-note essay: the reader
             meets the year, then the prose it drives. It replaced the 24-hour
             rhythm band here (map #279, decision 3) — the daily fact lives on
             as `activity.label` in the record above. -->
        <AtlasPhenologyWheel
          class="entry-almanac"
          :phases="phenologyPhases"
          :observations="biomeObservations"
        />

        <div class="atlas-fieldnote atlas-prose">
          <ContentRenderer :value="entry.doc" />
        </div>

        <section class="entry-section">
          <div class="atlas-sechead"><span class="atlas-eyebrow">Relations · {{ entry.specimen.binomial }}</span></div>
          <AtlasRelationsList :relations="relations" :specimens-by-slug="specimensBySlug" :biome="space" />
        </section>

        <section class="entry-section">
          <div class="atlas-sechead"><span class="atlas-eyebrow">Recent sightings</span></div>
          <AtlasFieldLog :observations="sightings" :specimens-by-slug="specimensBySlug" :biome="space" />
        </section>
      </article>

      <div v-else class="atlas-prose not-found">
        <h1>Not catalogued</h1>
        <p>No specimen answers to <code>{{ path }}</code> in {{ meta.name }}. Perhaps it was never here; perhaps it simply prefers to be elsewhere.</p>
        <p><NuxtLink :to="`/t/atlas/${space}`">Back to {{ meta.name }}</NuxtLink></p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.entry-section { margin-top: 0.5rem; }
.entry-almanac { margin: 2.4rem auto 0.4rem; max-width: 23rem; }
.not-found h1 { font-family: var(--atlas-display); font-size: 2rem; margin: 0 0 0.6rem; }
</style>
