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
const query = computed(() => parseTinkerfundBrowseQuery(route.query))
const results = computed(() =>
  browseTinkerfundListings(props.cards, props.category ? { ...query.value, category: props.category } : query.value),
)
const bounds = computed(() => tinkerfundPriceBounds(props.cards))

function update(next: TinkerfundBrowseQuery) {
  if (props.category) delete next.category
  navigateTo({ query: tinkerfundBrowseRouteQuery(next) }, { replace: true })
}

const drawer = useTemplateRef<HTMLDialogElement>('drawer')
const closeOnBackdrop = (e: MouseEvent) => {
  if (e.target === drawer.value) drawer.value?.close()
}
</script>

<template>
  <div class="browse">
    <div class="toolbar">
      <p class="count" role="status">{{ formatTinkerfundCampaignCount(results.length) }}</p>
      <button type="button" class="tf-btn filters-btn" @click="drawer?.showModal()">Filters</button>
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

    <dialog ref="drawer" class="drawer" aria-label="Filters" @click="closeOnBackdrop">
      <div class="drawer-body">
        <div class="drawer-top">
          <h2>Filters</h2>
          <button type="button" class="close" aria-label="Close filters" @click="drawer?.close()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <TinkerfundBrowseFilters :query="query" :categories="category ? undefined : categories" :bounds="bounds" @update="update" />
        <button type="button" class="tf-btn primary" @click="drawer?.close()">Show {{ formatTinkerfundCampaignCount(results.length) }}</button>
      </div>
    </dialog>
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

.drawer {
  margin: 0 0 0 auto;
  width: min(360px, 88vw);
  max-width: none;
  height: 100dvh;
  max-height: none;
  padding: 0;
  border: 0;
  border-left: var(--tf-hairline);
  background: var(--tf-surface);
  color: var(--tf-ink);
  translate: 0 0;
  transition: translate var(--tf-dur) var(--tf-ease), overlay var(--tf-dur) allow-discrete,
    display var(--tf-dur) allow-discrete;
}
.drawer:not([open]) { translate: 100% 0; }
@starting-style { .drawer[open] { translate: 100% 0; } }
.drawer::backdrop { background: rgb(0 0 0 / 0.45); }
.drawer-body { display: grid; gap: 22px; padding: 16px; }
.drawer-top { display: flex; justify-content: space-between; align-items: center; }
.drawer-top h2 { margin: 0; font-size: 22px; }
.close { display: inline-grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: var(--tf-radius); background: none; cursor: pointer; }
.close svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
</style>
