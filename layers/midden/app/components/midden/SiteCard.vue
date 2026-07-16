<script setup lang="ts">
// The trench-index's per-site card (#528's adopted enhancement). Presentational
// only — no data fetching; the trench-index page computes `touchedStrata` (which
// dig-season slugs the site's embedded artifacts span) and passes it in.
//
// The tick-mark strip is a passive PREVIEW, not a filter or a link: one tick per
// DIG_SEASONS entry, in the same oldest-to-newest scale as `StrataLegend`, lit
// only where this site actually has artifacts — "this site's artifacts span
// these seasons" at a glance, comparable card to card because every card draws
// the same fixed scale.
const props = defineProps<{
  title: string
  path: string
  touchedStrata: string[]
}>()

const touchedSet = computed(() => new Set(props.touchedStrata))

const touchedLabels = computed(() => DIG_SEASONS.filter((season) => touchedSet.value.has(season.slug)).map((season) => season.label))
</script>

<template>
  <NuxtLink :to="path" class="midden-site-card">
    <h3 class="midden-site-card__title">{{ title }}</h3>
    <div class="midden-site-card__strata" role="img" :aria-label="`strata touched: ${touchedLabels.join(', ') || 'none'}`">
      <span
        v-for="season in DIG_SEASONS"
        :key="season.slug"
        class="midden-site-card__tick"
        :class="{ 'midden-site-card__tick--touched': touchedSet.has(season.slug) }"
        aria-hidden="true"
      />
    </div>
  </NuxtLink>
</template>

<style scoped>
.midden-site-card {
  display: block;
  padding: 0.9rem 1rem;
  border: 1px solid var(--midden-line, #d8cbb2);
  text-decoration: none;
  color: inherit;
}

.midden-site-card__title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--midden-ink, #33291d);
}

.midden-site-card__strata {
  display: flex;
  gap: 2px;
}

.midden-site-card__tick {
  flex: 1 1 0;
  height: 0.5rem;
  background: var(--midden-line, #d8cbb2);
}

.midden-site-card__tick--touched {
  background: var(--midden-accent, #b4552d);
}
</style>
