<script setup lang="ts">
// A new query remounts the page, so everything below reads it once.
definePageMeta({ viewTransition: true, key: (route) => route.fullPath })

const route = useRoute()
const q = String([route.query.q].flat()[0] ?? '').trim()
const search = useTinkerfundSearch()
const { space } = useSpace('tinkerfund')
const found = useAsyncData(`tinkerfund-search-${space}-${q}`, () => search(q))
const [{ clock, cards }, { data: hits, status, error }] = await Promise.all([useTinkerfundCatalog(), found])
const results = computed(() => {
  const byPath = new Map(cards.value.map((c) => [c.path, c]))
  return (hits.value ?? []).flatMap((h) => byPath.get(h.path) ?? [])
})

// A results page for any typed words is not worth indexing.
useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: q ? `Search: ${q}` : 'Search' }))
</script>

<template>
  <TinkerfundShell :space="space">
    <header class="intro">
      <p class="tf-label">Search · {{ q ? formatTinkerfundCampaignCount(results.length) : 'Campaigns and Inventors' }}</p>
      <h1>{{ q ? `Results for “${q}”` : 'Search' }}</h1>
      <TinkerfundSearchField class="field" :value="q" :autofocus="!q" />
    </header>

    <ul v-if="results.length" class="grid">
      <li v-for="c in results" :key="c.path"><TinkerfundCampaignCard :card="c" :clock="clock" /></li>
    </ul>
    <div v-else class="empty tf-panel">
      <template v-if="q">
        <p class="tf-label">0 results</p>
        <h2>No Campaign matches “{{ q }}”</h2>
        <p>Try another word, an Inventor’s name, or browse every Campaign.</p>
      </template>
      <template v-else>
        <h2>Search the catalog</h2>
        <p>Type a Campaign or an Inventor’s name. Suggestions appear as you type.</p>
      </template>
      <NuxtLink class="tf-btn" :to="tinkerfundPath(space, '/discover')">Discover Campaigns</NuxtLink>
    </div>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 6px; margin-bottom: 22px; }
.intro > * { margin: 0; }
h1 { font: 800 clamp(30px, 4vw, 44px)/1.02 var(--tf-font); font-stretch: 78%; overflow-wrap: anywhere; }
.field { max-width: 560px; margin-top: 10px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.grid li { display: grid; }
.empty { display: grid; gap: 10px; justify-items: start; padding: 28px; background: var(--tf-paper), var(--tf-surface); }
.empty > * { margin: 0; }
.empty h2 { font: 800 26px/1.1 var(--tf-font); font-stretch: 80%; overflow-wrap: anywhere; }
</style>
