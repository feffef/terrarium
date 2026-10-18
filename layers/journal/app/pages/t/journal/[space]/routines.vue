<script setup lang="ts">
// What the scheduled Routine runs cost (GLOSSARY.md: Routine). A static segment,
// so it outranks the sibling `[...slug].vue`. The numbers come from this Space's
// `routines` collection; the prose and the chart blocks come from its
// `/routines` page Document, whose `::routine-chart` and `::routine-weekly-table`
// read what this page provides (app/composables/routineData.ts).
import type { RoutineDoc } from '../../../../types/journal'

definePageMeta({ name: 'journal-routines' })
const PAGE_TITLE = 'Routine costs'

const route = useRoute()
const { space, pagesKey, collections } = useSpace('journal')

const { data } = await useAsyncData(route.path, async () => ({
  page: await queryCollection(pagesKey).path('/routines').first(),
  routines: await queryCollection(collections.routines).select('name', 'runs').all(),
}))
const routines = computed<RoutineDoc[]>(() => data.value?.routines ?? [])
provideRoutineData(routines)

const metric = useRoutineMetric()

useSeoMeta({
  title: () => `${PAGE_TITLE} · journal/${space}`,
  description: () => data.value?.page?.description,
})
</script>

<template>
  <main class="jd jd-doc">
    <JournalBreadcrumb :space="space" :trail="['routines']" />

    <article class="jd-prose">
      <h1>{{ PAGE_TITLE }}</h1>

      <template v-if="routines.length">
        <div class="metric" role="group" aria-label="Metric shown in every chart and the table">
          <button
            v-for="m in ROUTINE_METRICS"
            :key="m.key"
            type="button"
            class="metric-btn"
            :aria-pressed="metric === m.key"
            @click="metric = m.key"
          >{{ m.label }}</button>
        </div>
        <p class="disclaimer">
          Dollar figures price each run's tokens at the pay-per-token API rates.
          What these runs cost under the subscription is significantly lower.
        </p>
        <ContentRenderer v-if="data?.page" :value="data.page" />
      </template>
      <p v-else>No Routine runs are recorded in this Space.</p>
    </article>

    <SiteFooter />
  </main>
</template>

<style scoped>
.metric { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.4rem 0 0.9rem; }
.metric-btn {
  font: inherit;
  font-family: var(--jd-mono);
  font-size: 0.75rem;
  padding: 0.3rem 0.65rem;
  color: var(--jd-muted);
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: 999px;
  cursor: pointer;
}
.metric-btn:hover { color: var(--jd-ink); border-color: var(--jd-accent); }
.metric-btn[aria-pressed='true'] { color: var(--jd-surface); background: var(--jd-accent); border-color: var(--jd-accent); }
.metric-btn:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 2px; }
.disclaimer {
  padding: 0.6rem 0.8rem;
  font-size: 0.88rem;
  border-left: 3px solid var(--jd-sev-minor);
  background: var(--jd-surface);
}
</style>
