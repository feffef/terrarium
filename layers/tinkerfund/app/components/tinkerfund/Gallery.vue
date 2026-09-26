<script setup lang="ts">
// qa's front page (issue #1375): each component in its states, against qa's
// edge-case fixtures. Later stories add a section per component they build.
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

// A Cart that hits every notice at once, shipped to Europe.
const cartSpecimen = computed(() => resolveTinkerfundCart(
  [
    { campaign: 'last-minute-lamp', lines: [{ reward: 'lamp', options: { colour: 'white' }, quantity: 1 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 3 },
    { campaign: 'goal-exact-stapler', lines: [{ reward: 'early-bird', options: {}, quantity: 1 }, { reward: 'stapler', options: {}, quantity: 2 }], addons: [{ id: 'staple', quantity: 3 }] },
    { campaign: 'indoor-hammock', lines: [{ reward: 'hammock', options: {}, quantity: 1 }], addons: [] },
    { campaign: 'self-assembling-workbench', lines: [], addons: [], bonus: 25 },
  ],
  Object.fromEntries(campaigns.value.map((doc) => [doc.slug, { title: doc.title, campaign: doc.campaign }])),
  now.value,
  'europe',
))
const miniCart = useTemplateRef('miniCart')
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

    <section aria-labelledby="gallery-support">
      <h2 id="gallery-support">Bonus support <code>TinkerfundSupportCard</code></h2>
      <ul class="specimens">
        <li class="stack">
          <p class="case">Live</p>
          <TinkerfundSupportCard slug="last-minute-lamp" state="live" />
        </li>
        <li class="stack">
          <p class="case">Ended, with a refusal</p>
          <TinkerfundSupportCard slug="indoor-hammock" state="ended" refusal="Pledging has closed" />
        </li>
      </ul>
    </section>

    <section aria-labelledby="gallery-cart">
      <h2 id="gallery-cart">Cart <code>TinkerfundCartGroup</code> <code>TinkerfundMiniCart</code></h2>
      <p class="case">
        Shipped to Europe: a Reward that doesn’t ship there, sold-out lines, an Ended Campaign, and a no-Reward Pledge.
      </p>
      <div class="cart">
        <TinkerfundCartGroup v-for="group in cartSpecimen.groups" :key="group.campaign" :space="space" :group="group" zone="Europe" />
      </div>
      <p>
        <button type="button" class="tf-btn" @click="miniCart?.show({ campaign: 'goal-exact-stapler', reward: 'stapler', options: {}, quantity: 2 })">
          Open the mini-cart
        </button>
      </p>
      <TinkerfundMiniCart ref="miniCart" :space="space" :view="cartSpecimen" />
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
.gallery { display: grid; gap: 36px; }
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
.cart { display: grid; gap: 14px; max-width: 760px; }
.specimen { display: grid; gap: 8px; align-content: start; padding: 16px; }
.specimen > * { margin: 0; }
h3 { font-size: 18px; line-height: 1.25; overflow-wrap: anywhere; }
.case { max-width: 68ch; margin: 0; color: var(--tf-muted); font-size: 14px; }
</style>
