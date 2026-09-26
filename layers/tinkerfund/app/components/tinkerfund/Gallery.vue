<script setup lang="ts">
// qa's front page (issue #1375): each component in its states, against qa's
// edge-case fixtures. Later stories add a section per component they build.
import type { TinkerfundBrowseQuery } from '../../utils/browse'

defineProps<{ title: string; description?: string }>()

const { space, pagesKey } = useSpace('tinkerfund')
const { now, ticking } = await useTinkerfundClock()
const { data: docs } = await useAsyncData(`tinkerfund-gallery-${space}`, () =>
  queryCollection(pagesKey).where('campaign', 'IS NOT NULL').all(),
)

const campaigns = computed(() =>
  (docs.value ?? [])
    .flatMap((doc) => (doc.campaign ? [{ ...doc, campaign: doc.campaign }] : []))
    .sort((a, b) => a.campaign.registry.localeCompare(b.campaign.registry)),
)
const pinned = computed(() => new Date(now.value).toISOString())

const { clock, cards, categories, promotions } = await useTinkerfundCatalog()
const deals = computed(() => tinkerfundDeals(promotions.value, now.value))
// The filters drive a local query here, so the gallery's URL stays put.
const filterQuery = ref<TinkerfundBrowseQuery>({ sort: 'popular' })
const filtered = computed(() => browseTinkerfundListings(cards.value, filterQuery.value))
const bounds = computed(() => tinkerfundPriceBounds(cards.value))
</script>

<template>
  <div class="gallery">
    <header class="intro">
      <p class="tf-label">Tinkerfund · {{ space }} · now pinned at <time :datetime="pinned">{{ pinned.slice(0, 16).replace('T', ' ') }} UTC</time></p>
      <h1>{{ title }}</h1>
      <p class="lead">{{ description }}</p>
    </header>

    <section aria-labelledby="gallery-status">
      <h2 id="gallery-status">Campaign status <code>TinkerfundCampaignStatus</code></h2>
      <ul class="specimens">
        <li v-for="doc in campaigns" :key="doc.path" class="specimen tf-panel">
          <p class="case">{{ doc.description }}</p>
          <h3><NuxtLink :to="tinkerfundPath(space, doc.path)">{{ doc.title }}</NuxtLink></h3>
          <TinkerfundCampaignStatus :campaign="doc.campaign" :now="now" :ticking="ticking" />
        </li>
      </ul>
    </section>

    <section aria-labelledby="gallery-card">
      <h2 id="gallery-card">Campaign card <code>TinkerfundCampaignCard</code></h2>
      <p class="case">Every state, a zero-Backer Campaign, a title that wraps, and an On-Deal chip. Used by Home, Discover, Category and Deals.</p>
      <ul class="specimens cards">
        <li v-for="c in cards" :key="c.path"><TinkerfundCampaignCard :card="c" :clock="clock" /></li>
      </ul>
    </section>

    <section aria-labelledby="gallery-index">
      <h2 id="gallery-index">Index table <code>TinkerfundIndexTable</code></h2>
      <p class="case">Home's Popular now. Pick Empty Shelf for the empty row; scroll sideways on a phone.</p>
      <TinkerfundIndexTable :cards="cards" :categories="categories" :clock="clock">
        <span class="tf-label">{{ cards.length }} Campaigns</span>
      </TinkerfundIndexTable>
    </section>

    <section aria-labelledby="gallery-filters">
      <h2 id="gallery-filters">Discover filters <code>TinkerfundBrowseFilters</code></h2>
      <p class="case">Discover's side column and mobile drawer. Here they filter a local list; on Discover they write the URL query.</p>
      <div class="filters">
        <TinkerfundBrowseFilters class="tf-panel" :query="filterQuery" :categories="categories" :bounds="bounds" @update="filterQuery = $event" />
        <ul class="matches">
          <li v-for="c in filtered" :key="c.path">{{ c.registry }} · {{ c.title }}</li>
          <li v-if="!filtered.length">No Campaigns match these filters</li>
        </ul>
      </div>
    </section>

    <section aria-labelledby="gallery-deal">
      <h2 id="gallery-deal">Deal banner <code>TinkerfundDealBanner</code></h2>
      <p class="case">An Active Promotion applied automatically, and a Scheduled one; qa's expired code never shows.</p>
      <div class="deals">
        <TinkerfundDealBanner v-for="p in deals.active" :key="p.slug" :promotion="p" :clock="clock" more="#gallery-deal" />
        <TinkerfundDealBanner v-for="p in deals.scheduled" :key="p.slug" :promotion="p" :clock="clock" scheduled />
      </div>
    </section>

    <section aria-labelledby="gallery-frame">
      <h2 id="gallery-frame">Page frame</h2>
      <p class="case">
        <code>TinkerfundShell</code> frames this page: the demo bar with <code>TinkerfundResetDemo</code>,
        <code>TinkerfundHeader</code> with <code>TinkerfundWordmark</code> and <code>TinkerfundSearchField</code>,
        and <code>TinkerfundFooter</code> with <code>TinkerfundThemeSwitch</code>. Narrow the window for the menu
        dialog; switch the theme to see every specimen in Light and Dark.
      </p>
    </section>
  </div>
</template>

<style scoped>
.gallery { display: grid; grid-template-columns: minmax(0, 1fr); gap: 36px; }
.intro { display: grid; gap: 10px; }
.intro > * { margin: 0; }
h1 { font: 800 clamp(30px, 4vw, 42px)/1.05 var(--tf-font); font-stretch: 78%; }
.lead { color: var(--tf-muted); }
h2 { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; margin: 0 0 14px; font-size: 22px; }
code { font: 500 13px/1.4 var(--tf-mono); overflow-wrap: anywhere; }
h2 code { color: var(--tf-muted); }
.specimens {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.specimen { display: grid; gap: 8px; align-content: start; padding: 16px; }
.specimen > * { margin: 0; }
.cards li { display: grid; }
.filters { display: grid; gap: 18px; }
@media (min-width: 720px) { .filters { grid-template-columns: 260px 1fr; } }
.filters .tf-panel { padding: 18px; }
.matches { margin: 0; padding: 0; list-style: none; font: 500 13px/1.8 var(--tf-mono); }
.deals { display: grid; gap: 14px; }
h3 { font-size: 18px; line-height: 1.25; overflow-wrap: anywhere; }
.case { max-width: 68ch; margin: 0; color: var(--tf-muted); font-size: 14px; }
</style>
