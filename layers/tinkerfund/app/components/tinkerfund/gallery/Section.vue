<script setup lang="ts">
import { TINKERFUND_GALLERY_FIXTURE as FIXTURE, type TinkerfundGallerySectionId } from '../../../utils/gallery'

defineProps<{ id: TinkerfundGallerySectionId }>()

const PLEDGE_STATES = ['pending', 'charged', 'delivered', 'unfunded', 'cancelled'] as const

const { link } = useTinkerfundSpace()
const { clock, cards, categories, promotions, zoneName, now, campaigns, backing, cart, quote, receipt, account, thread, log, inventors } =
  await useTinkerfundGallery()
const miniCart = useTemplateRef('miniCart')

const deals = computed(() => groupTinkerfundPromotions(promotions.value, now.value))
// The filters drive a local query here, so the gallery's URL stays put.
const filterQuery = ref<TinkerfundBrowseQuery>({ sort: 'popular' })
const filtered = computed(() => browseTinkerfundListings(cards.value, filterQuery.value))
const bounds = computed(() => tinkerfundPriceBounds(cards.value))
</script>

<template>
  <ul v-if="id === 'status'" class="specimens">
    <li v-for="doc in campaigns" :key="doc.path" class="specimen tf-panel">
      <p class="case">{{ doc.description }}</p>
      <h2><NuxtLink :to="link(doc.path)">{{ doc.title }}</NuxtLink></h2>
      <TinkerfundCampaignStatus :campaign="doc.campaign" :clock="clock" />
    </li>
  </ul>

  <ul v-else-if="id === 'card'" class="specimens cards">
    <li v-for="c in cards" :key="c.path"><TinkerfundBrowseCampaignCard :card="c" :clock="clock" /></li>
  </ul>

  <TinkerfundBrowseIndexTable v-else-if="id === 'index-table'" :cards="cards" :categories="categories" :clock="clock">
    <span class="tf-label">{{ tinkerfundCount(cards.length, 'Campaign') }}</span>
  </TinkerfundBrowseIndexTable>

  <div v-else-if="id === 'filters'" class="filtering">
    <TinkerfundBrowseFilters class="tf-panel" :query="filterQuery" :categories="categories" :bounds="bounds" @update="filterQuery = $event" />
    <ul class="matches">
      <li v-for="c in filtered" :key="c.path">{{ c.registry }} · {{ c.title }}</li>
      <li v-if="!filtered.length">No Campaigns match these filters</li>
    </ul>
  </div>

  <div v-else-if="id === 'deal-banner'" class="stack wide">
    <TinkerfundBrowseDealBanner v-for="p in deals.active" :key="p.stem" :promotion="p" :clock="clock" :more="link('/deals')" />
    <TinkerfundBrowseDealBanner v-for="p in deals.scheduled" :key="p.stem" :promotion="p" :clock="clock" scheduled />
  </div>

  <ul v-else-if="id === 'readout'" class="specimens wide">
    <li v-for="doc in campaigns" :key="doc.path">
      <TinkerfundCampaignReadout
        :slug="doc.slug"
        :title="doc.title"
        :campaign="doc.campaign"
        :deals="doc.deals"
        :clock="clock"
        heading="h2"
      />
    </li>
  </ul>

  <div v-else-if="id === 'figures' && campaigns[0]" class="figures">
    <TinkerfundCampaignFigureGallery :figures="campaigns[0].campaign.figures" :registry="campaigns[0].campaign.registry" />
  </div>

  <ul v-else-if="id === 'rewards'" class="specimens">
    <template v-for="doc in campaigns" :key="doc.path">
      <li v-for="reward in doc.campaign.rewards" :key="`${doc.path}-${reward.id}`" class="stack">
        <p class="case">{{ doc.campaign.registry }} · {{ doc.state }}</p>
        <TinkerfundCampaignRewardCard :reward="reward" :backing="backing(doc.slug, doc.state)" :now="now" :zone-name="zoneName" />
      </li>
    </template>
  </ul>

  <ul v-else-if="id === 'addons'" class="specimens">
    <template v-for="doc in campaigns" :key="doc.path">
      <li v-if="doc.campaign.addons?.length" class="stack">
        <p class="case">{{ doc.campaign.registry }} · {{ doc.state }}</p>
        <TinkerfundCampaignAddonList :addons="doc.campaign.addons" :backing="backing(doc.slug, doc.state)" />
      </li>
      <li v-if="doc.campaign.stretchGoals?.length" class="stack">
        <p class="case">{{ doc.campaign.registry }} · pledged {{ doc.campaign.pledged }}</p>
        <TinkerfundCampaignStretchGoals :goals="doc.campaign.stretchGoals" :pledged="doc.campaign.pledged" />
      </li>
    </template>
  </ul>

  <ul v-else-if="id === 'support'" class="specimens">
    <li class="stack">
      <p class="case">Live</p>
      <TinkerfundCampaignSupportCard :backing="backing(FIXTURE.lamp.slug, 'live')" />
    </li>
    <li class="stack">
      <p class="case">Ended, with a refusal</p>
      <TinkerfundCampaignSupportCard :backing="backing(FIXTURE.hammock.slug, 'ended', { bonus: 'Pledging has closed' })" />
    </li>
  </ul>

  <div v-else-if="id === 'cart'" class="stack narrow">
    <TinkerfundCartGroup v-for="group in cart.groups" :key="group.campaign" :group="group" zone="Europe" />
    <p>
      <button type="button" class="tf-btn" @click="miniCart?.show({ campaign: FIXTURE.stapler.slug, reward: FIXTURE.stapler.rewards[1], options: {}, quantity: 2 })">
        Open the mini-cart
      </button>
    </p>
    <TinkerfundCartMini ref="miniCart" :view="cart" />
  </div>

  <div v-else-if="id === 'checkout'" class="stack narrow">
    <TinkerfundCheckoutHeader :steps="['Shipping', 'Payment', 'Review']" :step="1" />
    <p class="case">The Cart specimen, quoted with the {{ FIXTURE.code }} code:</p>
    <TinkerfundPledgeSummary v-for="group in quote.groups" :key="group.campaign" :pledge="group" zone="Europe" />
    <TinkerfundPledgeSummary
      v-if="receipt"
      :pledge="receipt"
      zone="Europe"
      :reference="receipt.ref"
      :ends-at="resolveTinkerfundOffset('+21d', now)"
      note="A receipt: its reference, and the charge pending until the Campaign ends"
    />
  </div>

  <div v-else-if="id === 'account'" class="stack narrow">
    <p class="chips"><TinkerfundPledgeState v-for="state in PLEDGE_STATES" :key="state" :state="state" /></p>
    <TinkerfundPledgeList :pledges="account.rows" />
    <TinkerfundPledgeEditor v-if="account.lamp && account.entry" :campaign="account.entry.campaign" :pledge="account.lamp" zone="Domestic" />
    <div><TinkerfundPledgeCancel :reference="FIXTURE.lamp.pledge" :title="FIXTURE.lamp.title" /></div>
  </div>

  <ul v-else-if="id === 'updates'" class="specimens">
    <li v-if="log" class="specimen tf-panel">
      <p class="case">{{ log.campaign }}: the newest Update open</p>
      <TinkerfundCampaignUpdates :updates="log.updates" :now="now" />
    </li>
    <li class="specimen tf-panel">
      <p class="case">No Updates</p>
      <TinkerfundCampaignUpdates :updates="[]" :now="now" />
    </li>
  </ul>

  <ul v-else-if="id === 'comments'" class="specimens">
    <li v-if="thread" class="specimen tf-panel">
      <p class="case">{{ thread.campaign }}: an Inventor reply, one level deep</p>
      <TinkerfundCampaignComments
        :comments="thread.comments"
        :now="now"
        :inventor-slug="campaigns.find((c) => c.slug === thread?.campaign)?.campaign.inventor"
      />
    </li>
    <li class="specimen tf-panel">
      <p class="case">No comments</p>
      <TinkerfundCampaignComments :comments="[]" :now="now" />
    </li>
  </ul>

  <div v-else-if="id === 'inventor'" class="stack">
    <TinkerfundInventorProfile
      v-for="inventor in inventors"
      :key="inventor.stem"
      class="specimen tf-panel"
      :inventor="inventor"
      :cards="cards.filter((c) => c.inventor === inventor.stem)"
      :clock="clock"
      heading="h2"
    />
  </div>

  <TinkerfundShellBreadcrumbs
    v-else-if="id === 'breadcrumbs'"
    :items="[{ label: 'Home', to: link() }, { label: 'Workshop' }, { label: campaigns.at(-1)?.title ?? 'Campaign' }]"
  />

  <TinkerfundShellSearchField v-else-if="id === 'search'" class="search" value="lamp" />
</template>

<style scoped>
.specimens {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.specimens.wide { grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
.stack { display: grid; gap: 14px; align-content: start; }
.specimens .stack { gap: 6px; }
.stack > p { margin: 0; }
.narrow { max-width: 760px; }
.figures { max-width: 560px; }
.specimen { display: grid; gap: 8px; align-content: start; padding: 16px; }
.specimen > * { margin: 0; }
.cards li { display: grid; }
.filtering { display: grid; gap: 18px; }
@media (min-width: 720px) { .filtering { grid-template-columns: 260px 1fr; } }
.filtering .tf-panel { padding: 18px; }
.matches { margin: 0; padding: 0; list-style: none; font: 500 13px/1.8 var(--tf-mono); }
.search { max-width: 480px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
h2 { font-size: 18px; line-height: 1.25; overflow-wrap: anywhere; }
.case { max-width: 68ch; color: var(--tf-muted); font-size: 14px; }
</style>
