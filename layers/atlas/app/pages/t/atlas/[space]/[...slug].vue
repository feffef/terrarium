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
// only the types still import relatively.
import type { Edge, PhenologyPhase, SpecimenView } from '../../../../utils/atlas'

const route = useRoute()
const { space, path, pagesKey, collections } = useSpace('atlas')

const { data } = await useAsyncData(route.path, async () => {
  // One query serves both the entry itself and the rest of the wing (for
  // counterpart names on relations + log mentions) — the doc is in `pages`.
  const pages = await queryCollection(pagesKey).all()
  const interactions = await queryCollection(collections.interactions).all()
  const observations = await queryCollection(collections.observations).all()
  return { pages, interactions, observations }
})

const meta = biomeMeta(space)
const doc = computed(() => data.value?.pages.find((p) => p.path === path) ?? null)
const specimen = computed<SpecimenView | null>(() =>
  doc.value ? toSpecimenView(doc.value) : null,
)
const specimensBySlug = computed(() =>
  Object.fromEntries(
    (data.value?.pages ?? []).filter((p) => p.path !== '/').map(toSpecimenView).map((s) => [s.slug, s]),
  ),
)
const edges = computed<Edge[]>(() => (data.value?.interactions ?? []) as Edge[])
const relations = computed(() =>
  specimen.value ? relationsFor(specimen.value.slug, edges.value) : [],
)
const sightings = computed(() =>
  (data.value?.observations ?? []).filter((o) => o.specimen === specimen.value?.slug),
)
const sigStyle = computed(() => signatureVars(specimen.value?.signature?.colors))

// The almanac (#282): shared needle state for the dial and, later, the
// dial-driven MDC components inside the essay (#283). Provided here — the page
// owns the state; the wheel and any descendant inject it. The needle parks at
// today unless a `?day=` param says otherwise (see composables/almanac.ts).
const phenologyPhases = computed<PhenologyPhase[]>(() => specimen.value?.phenology?.phases ?? [])
provideAlmanac({
  phases: phenologyPhases,
  initialDay: parseAlmanacDayParam(route.query.day),
})
// The dial's rim ticks read the whole biome's dated ledger (map #279), not
// just this specimen's sightings — only `date` is passed.
const biomeObservations = computed(() => (data.value?.observations ?? []).map((o) => ({ date: o.date })))

const title = computed(() => specimen.value?.binomial ?? 'Not found')
useSeoMeta({
  title: () => `${title.value} · The Atlas of the Terrarium`,
  description: () => specimen.value?.common,
})
</script>

<template>
  <main class="atlas" :class="`atlas--${space}`" :style="sigStyle">
    <div class="atlas-page">
      <p class="atlas-crumb">
        <NuxtLink to="/t/atlas">The Atlas</NuxtLink><span class="sep">·</span>
        <NuxtLink :to="`/t/atlas/${space}`">{{ meta.name }}</NuxtLink><span class="sep">·</span>
        <span class="here">{{ specimen?.binomial ?? 'unknown' }}</span>
      </p>

      <article v-if="specimen">
        <AtlasSpecimenPlate
          :illustration="specimen.illustration"
          :number="specimen.plate?.number"
          :binomial="specimen.binomial"
          :conjectural="specimen.plate?.conjectural"
        />

        <div class="atlas-label">
          <h1 class="binomial">{{ specimen.binomial }}</h1>
          <p v-if="specimen.common" class="common">{{ specimen.common }}</p>

          <dl class="record">
            <template v-if="specimen.classification">
              <dt>class</dt><dd>{{ specimen.classification }}</dd>
            </template>
            <template v-if="specimen.rarity">
              <dt>rarity</dt><dd><AtlasRarityMark :grade="specimen.rarity" :show-grade="true" /></dd>
            </template>
            <template v-if="specimen.size">
              <dt>size</dt><dd>{{ specimen.size }}</dd>
            </template>
            <template v-if="specimen.diet">
              <dt>diet</dt><dd>{{ specimen.diet }}</dd>
            </template>
            <template v-if="specimen.activity">
              <dt>active</dt><dd>{{ specimen.activity.label }}</dd>
            </template>
            <template v-if="specimen.signature">
              <dt>signature</dt>
              <dd><AtlasColorSignature :colors="specimen.signature.colors" :gloss="specimen.signature.gloss" /></dd>
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
          <ContentRenderer :value="doc!" />
        </div>

        <section class="entry-section">
          <div class="atlas-sechead"><span class="atlas-eyebrow">Relations · {{ specimen.binomial }}</span></div>
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
