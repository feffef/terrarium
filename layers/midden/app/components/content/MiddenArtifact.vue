<script setup lang="ts">
// `::midden-artifact{slug="..."}` (#521): the MDC embed rendering one
// catalogued Artifact inline inside a Site's dig-report body. Lives in
// `components/content/`, unprefixed, so Nuxt Content's kebab-case tag
// resolution maps `::midden-artifact` to this exact component name —
// mirrors layers/atlas/app/components/content/Sighting.vue's placement and
// the same reasoning.
//
// Same-Space read only (ADR-0004/0006): resolves the CURRENT route's Space
// through `useSpace('midden')` to read this Space's own `artifacts`
// collection key, so an embed inside one Site's body can never reach across
// Spaces — mirrors every other Tenant page's isolation stance.
//
// A broken `slug` reference is loud, not invisible (content-embedded, so a
// silent blank would be worse than a visible gap) — `scripts/
// validate-content-refs.ts`'s `site`/`stratum`/`provenance` checks plus the
// schema itself catch a bad reference at build/CI time, so this fallback
// exists for the rare case that slips through.
import { toMiddenArtifactView } from '../../composables/useMiddenTrenchData'

const props = defineProps<{ slug: string }>()

const { collections } = useSpace('midden')

const { data: artifact } = await useAsyncData(`midden-artifact-${props.slug}`, async () => {
  const doc = await queryCollection(collections.artifacts).where('stem', '=', props.slug).first()
  return doc ? toMiddenArtifactView(doc) : null
})
</script>

<template>
  <MiddenArtifactCard v-if="artifact" :artifact="artifact" />
  <p v-else class="midden-artifact-missing">
    Artifact not found: <code>{{ slug }}</code>
  </p>
</template>

<style scoped>
.midden-artifact-missing {
  padding: 0.7rem 0.9rem;
  margin: 0.9rem 0;
  background: var(--midden-accent-soft, rgba(180, 85, 45, 0.12));
  border: 1px dashed var(--midden-accent, #b4552d);
  color: var(--midden-muted);
  font-family: var(--midden-data);
  font-size: 0.85rem;
}
</style>
