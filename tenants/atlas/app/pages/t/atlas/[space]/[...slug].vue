<script setup lang="ts">
// The specimen entry (`/t/atlas/<biome>/<slug>`, #67): plate, museum label, and
// field-note essay — a display case. A more specific route than the Platform's
// generic catch-all, so specimens render in the guide's theme rather than the
// unstyled fallback.
//
// Isolation-respecting and presentation-only (ADR-0004): resolves through the
// SAME shared, unit-tested `resolveSpaceRoute`, then reads only this biome's keyed
// collections. Relations (#71) and sightings are same-Space reads — the food-web
// edges were authored in-biome (mirrors ADR-0012), so nothing queries a sibling.
import { resolveSpaceRoute } from '~~/shared/routing'
import { biomeMeta } from '../../../../biomes'
import { relationsFor, signatureVars, toSpecimenView, type Edge, type SpecimenView } from '../../../../utils/atlas'
import SpecimenPlate from '../../../../components/atlas/SpecimenPlate.vue'
import RarityMark from '../../../../components/atlas/RarityMark.vue'
import RhythmBand from '../../../../components/atlas/RhythmBand.vue'
import ColorSignature from '../../../../components/atlas/ColorSignature.vue'
import RelationsList from '../../../../components/atlas/RelationsList.vue'
import FieldLog from '../../../../components/atlas/FieldLog.vue'

const route = useRoute()
const tenant = 'atlas'
const space = String(route.params.space)

const resolved = resolveSpaceRoute(tenant, space, route.params.slug)
if (!resolved) {
  throw createError({ statusCode: 404, statusMessage: `Unknown biome: ${tenant}/${space}` })
}
const { path, pagesKey } = resolved
const interactionsKey = resolved.dataCollections.find((d) => d.name === 'interactions')?.key
const observationsKey = resolved.dataCollections.find((d) => d.name === 'observations')?.key

const { data } = await useAsyncData(route.path, async () => {
  const doc = await queryCollection(pagesKey).path(path).first()
  // The rest of the wing, for counterpart names on relations + log mentions.
  const pages = await queryCollection(pagesKey).all()
  const interactions = interactionsKey ? await queryCollection(interactionsKey).all() : []
  const observations = observationsKey ? await queryCollection(observationsKey).all() : []
  return { doc, pages, interactions, observations }
})

const meta = biomeMeta(space)
const specimen = computed<SpecimenView | null>(() =>
  data.value?.doc ? toSpecimenView(data.value.doc) : null,
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

const title = computed(() => specimen.value?.binomial ?? 'Not found')
useHead({ title: `${title.value} · The Atlas of the Terrarium` })
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
        <SpecimenPlate
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
              <dt>rarity</dt><dd><RarityMark :grade="specimen.rarity" :show-grade="true" /></dd>
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
              <dd><ColorSignature :colors="specimen.signature.colors" :gloss="specimen.signature.gloss" /></dd>
            </template>
          </dl>

          <RhythmBand
            v-if="specimen.activity"
            class="entry-rhythm"
            :bands="specimen.activity.bands"
            :label="specimen.activity.label"
          />
        </div>

        <div class="atlas-fieldnote atlas-prose">
          <ContentRenderer :value="data!.doc!" />
        </div>

        <section class="entry-section">
          <div class="atlas-sechead"><span class="atlas-eyebrow">Relations · {{ specimen.binomial }}</span></div>
          <RelationsList :relations="relations" :specimens-by-slug="specimensBySlug" :biome="space" />
        </section>

        <section class="entry-section">
          <div class="atlas-sechead"><span class="atlas-eyebrow">Recent sightings</span></div>
          <FieldLog :observations="sightings" :specimens-by-slug="specimensBySlug" :biome="space" />
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
.entry-rhythm { margin-top: 1.2rem; max-width: 26rem; }
.not-found h1 { font-family: var(--atlas-display); font-size: 2rem; margin: 0 0 0.6rem; }
</style>
