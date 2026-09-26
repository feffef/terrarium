<script setup lang="ts">
import type { TinkerfundCard } from '../../composables/tinkerfund'
import type { TinkerfundBrowseQuery, TinkerfundSort } from '../../utils/browse'

// Discover, or a Category page when `category` is set. Every filter and the
// sort live in the URL query (issue #1367).
const props = defineProps<{
  cards: TinkerfundCard[]
  categories: { slug: string; name: string }[]
  clock: number
  category?: string
}>()

const route = useRoute()
const router = useRouter()
// A change made while the previous one is still navigating builds on it, not
// on the route it hasn't reached yet (PR #1396).
const pending = shallowRef<TinkerfundBrowseQuery>()
const query = computed(() => pending.value ?? parseTinkerfundBrowseQuery(route.query))
const results = computed(() =>
  browseTinkerfundListings(props.cards, props.category ? { ...query.value, category: props.category } : query.value),
)
const bounds = computed(() => tinkerfundPriceBounds(props.cards))

function update(next: TinkerfundBrowseQuery) {
  if (props.category) delete next.category
  pending.value = next
  // Not navigateTo(): mid-navigation it returns the route instead of going there.
  router.replace({ query: tinkerfundBrowseRouteQuery(next) }).finally(() => {
    if (pending.value === next) pending.value = undefined
  })
}

const drawer = useTemplateRef('drawer')
</script>

<template>
  <div class="browse">
    <div class="toolbar">
      <p class="count" role="status">{{ tinkerfundCount(results.length, 'Campaign') }}</p>
      <button type="button" class="tf-btn filters-btn" @click="drawer?.open()">Filters</button>
      <label class="sort">
        <span class="tf-label">Sort</span>
        <select :value="query.sort" @change="update({ ...query, sort: ($event.target as HTMLSelectElement).value as TinkerfundSort })">
          <option v-for="(label, value) in TINKERFUND_SORTS" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
    </div>

    <div class="layout">
      <aside class="side" aria-label="Filters">
        <TinkerfundBrowseFilters :query="query" :categories="category ? undefined : categories" :bounds="bounds" @update="update" />
      </aside>

      <ul v-if="results.length" class="grid">
        <li v-for="c in results" :key="c.path"><TinkerfundCampaignCard :card="c" :clock="clock" /></li>
      </ul>
      <div v-else class="empty tf-panel">
        <p class="tf-label">0 results</p>
        <h2>No Campaigns match these filters</h2>
        <p>Try a wider price range or fewer filters.</p>
        <button type="button" class="tf-btn" @click="update({ sort: query.sort })">Clear filters</button>
      </div>
    </div>

    <TinkerfundDrawer ref="drawer" aria-label="Filters" close-label="Close filters">
      <template #top><h2>Filters</h2></template>
      <template #default="{ close }">
        <TinkerfundBrowseFilters :query="query" :categories="category ? undefined : categories" :bounds="bounds" @update="update" />
        <button type="button" class="tf-btn primary" @click="close">Show {{ tinkerfundCount(results.length, 'Campaign') }}</button>
      </template>
    </TinkerfundDrawer>
  </div>
</template>

<style scoped>
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 18px; }
.count { margin: 0 auto 0 0; font: 500 13px/1 var(--tf-mono); color: var(--tf-muted); }
.sort { display: flex; gap: 8px; align-items: center; }
select {
  padding: 8px 10px;
  border: 1px solid var(--tf-muted);
  border-radius: var(--tf-radius);
  background: var(--tf-surface);
  font: 500 13px/1 var(--tf-mono);
}
.filters-btn { padding: 8px 14px; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; }
.side { display: none; }
@media (min-width: 860px) {
  .layout { grid-template-columns: 220px minmax(0, 1fr); }
  .side { display: block; }
  .filters-btn { display: none; }
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  align-content: start;
}
.grid li { display: grid; }
.empty { display: grid; gap: 10px; justify-items: start; align-content: start; padding: 28px; background: var(--tf-paper), var(--tf-surface); }
.empty > * { margin: 0; }
.empty h2 { font: 800 26px/1.1 var(--tf-font); font-stretch: 80%; }
</style>
