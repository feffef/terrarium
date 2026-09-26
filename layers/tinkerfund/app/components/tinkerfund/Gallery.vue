<script setup lang="ts">
// qa's front page (issue #1375): each component in its states, against qa's
// edge-case fixtures. Later stories add a section per component they build.
import type { TinkerfundBrowseQuery } from '../../utils/browse'

defineProps<{ title: string; description?: string }>()

const { space, pagesKey, collections } = useSpace('tinkerfund')
const { now, ticking } = await useTinkerfundClock()
const { data: docs } = await useAsyncData(`tinkerfund-gallery-${space}`, () =>
  queryCollection(pagesKey).where('campaign', 'IS NOT NULL').all(),
)
const { data: extra } = await useAsyncData(`tinkerfund-gallery-extra-${space}`, async () => {
  const [promotions, threads, shop] = await Promise.all([
    queryCollection(collections.promotions).all(),
    queryCollection(collections.comments).all(),
    queryCollection(collections.shop).first(),
  ])
  return { promotions, threads, shop }
})

const campaigns = computed(() =>
  (docs.value ?? [])
    .flatMap((doc) => {
      if (!doc.campaign) return []
      const slug = doc.path.split('/').pop()!
      return [{
        ...doc,
        slug,
        campaign: doc.campaign,
        state: deriveCampaignStatus(doc.campaign, doc.campaign.pledged, now.value).state,
        deals: tinkerfundAutomaticDeals(extra.value?.promotions ?? [], slug, now.value),
      }]
    })
    .sort((a, b) => a.campaign.registry.localeCompare(b.campaign.registry)),
)
const zones = computed(() => Object.fromEntries((extra.value?.shop?.zones ?? []).map((z) => [z.id, z.name])))
const thread = computed(() => extra.value?.threads[0])
const pinned = computed(() => new Date(now.value).toISOString())

const { clock, cards, categories, promotions } = await useTinkerfundCatalog()
const deals = computed(() => groupTinkerfundPromotions(promotions.value, now.value))
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
        <span class="tf-label">{{ formatTinkerfundCampaignCount(cards.length) }}</span>
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

    <section aria-labelledby="gallery-readout">
      <h2 id="gallery-readout">Campaign readout <code>TinkerfundReadout</code></h2>
      <p class="case">
        With <code>TinkerfundProgressBar</code>, <code>TinkerfundDealBadge</code> and
        <code>TinkerfundCampaignAction</code>: Back when Live, Notify me when Upcoming, a lock when Ended.
      </p>
      <ul class="specimens wide">
        <li v-for="doc in campaigns" :key="doc.path">
          <TinkerfundReadout
            :slug="doc.slug"
            :title="doc.title"
            :campaign="doc.campaign"
            :deals="doc.deals"
            :now="now"
            :ticking="ticking"
            heading="h3"
          />
        </li>
      </ul>
    </section>

    <section aria-labelledby="gallery-figures">
      <h2 id="gallery-figures">Figures <code>TinkerfundFigureGallery</code></h2>
      <div v-if="campaigns[0]" class="figures">
        <TinkerfundFigureGallery :figures="campaigns[0].campaign.figures" :registry="campaigns[0].campaign.registry" />
      </div>
    </section>

    <section aria-labelledby="gallery-rewards">
      <h2 id="gallery-rewards">Reward cards <code>TinkerfundRewardCard</code></h2>
      <p class="case">Every qa Reward in its Campaign’s state: options, stock, sold out, per-Backer limits, digital, long titles.</p>
      <ul class="specimens">
        <template v-for="doc in campaigns" :key="doc.path">
          <li v-for="reward in doc.campaign.rewards" :key="`${doc.path}-${reward.id}`" class="stack">
            <p class="case">{{ doc.campaign.registry }} · {{ doc.state }}</p>
            <TinkerfundRewardCard :slug="doc.slug" :reward="reward" :state="doc.state" :zones="zones" :now="now" />
          </li>
        </template>
      </ul>
    </section>

    <section aria-labelledby="gallery-addons">
      <h2 id="gallery-addons">Add-ons, Stretch goals <code>TinkerfundAddonList</code> <code>TinkerfundStretchGoals</code></h2>
      <ul class="specimens">
        <template v-for="doc in campaigns" :key="doc.path">
          <li v-if="doc.campaign.addons?.length" class="stack">
            <p class="case">{{ doc.campaign.registry }} · {{ doc.state }}</p>
            <TinkerfundAddonList :slug="doc.slug" :addons="doc.campaign.addons" :state="doc.state" />
          </li>
          <li v-if="doc.campaign.stretchGoals?.length" class="stack">
            <p class="case">{{ doc.campaign.registry }} · pledged {{ doc.campaign.pledged }}</p>
            <TinkerfundStretchGoals :goals="doc.campaign.stretchGoals" :pledged="doc.campaign.pledged" />
          </li>
        </template>
      </ul>
    </section>

    <section aria-labelledby="gallery-comments">
      <h2 id="gallery-comments">Comment thread <code>TinkerfundComments</code></h2>
      <ul class="specimens">
        <li v-if="thread" class="specimen tf-panel">
          <p class="case">{{ thread.campaign }}: an Inventor reply, one level deep</p>
          <TinkerfundComments :comments="thread.comments" :now="now" />
        </li>
        <li class="specimen tf-panel">
          <p class="case">No comments</p>
          <TinkerfundComments :comments="[]" :now="now" />
        </li>
      </ul>
    </section>

    <section aria-labelledby="gallery-nav">
      <h2 id="gallery-nav">Breadcrumbs <code>TinkerfundBreadcrumbs</code></h2>
      <TinkerfundBreadcrumbs
        :items="[{ label: 'Home', to: tinkerfundPath(space) }, { label: 'Workshop' }, { label: campaigns.at(-1)?.title ?? 'Campaign' }]"
      />
      <p class="case">
        <code>TinkerfundSectionNav</code> and the mobile “Back this Campaign” bar live on each Campaign page, since
        they follow its scroll.
      </p>
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
.specimens.wide { grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
.stack { display: grid; gap: 6px; align-content: start; }
.figures { max-width: 560px; }
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
