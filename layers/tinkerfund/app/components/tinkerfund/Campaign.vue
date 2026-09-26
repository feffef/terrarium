<script setup lang="ts">
import type { TinkerfundBacking } from '../../composables/tinkerfund'
import type { TinkerfundCampaign, TinkerfundPage } from '../../types/tinkerfund'
import type { TinkerfundCartRequest } from '../../utils/cart'

const props = defineProps<{ doc: TinkerfundPage & { campaign: TinkerfundCampaign } }>()

const { space, collections, link } = useTinkerfundSpace()
const money = useTinkerfundMoney()
const categories = useTinkerfundCategories()

const slug = computed(() => tinkerfundSlug(props.doc.path))
const [{ view: cart, change: changeCart, pledges, baked, clock }, { zoneName }] = await Promise.all([useTinkerfundCart(), useTinkerfundShop()])
const now = computed(() => clock.value.now)
// Totals, Stretch goals and stock count the visitor's own Pledges (story #1384).
const c = computed(() => withTinkerfundPledges(slug.value, props.doc.campaign, pledges.value, baked.value))

const { data } = await useAsyncData(`tinkerfund-campaign-${space}-${props.doc.path}`, async () => {
  const [inventor, thread, log, promotions] = await Promise.all([
    queryCollection(collections.inventors).where('stem', '=', c.value.inventor).first(),
    queryCollection(collections.comments).where('campaign', '=', slug.value).first(),
    queryCollection(collections.updates).where('campaign', '=', slug.value).first(),
    queryCollection(collections.promotions).all(),
  ])
  return { inventor, comments: thread?.comments ?? [], updates: log?.updates ?? [], promotions }
})

const status = computed(() => deriveCampaignStatus(c.value, c.value.pledged, now.value))
const deals = computed(() => tinkerfundAutomaticDeals(data.value?.promotions ?? [], slug.value, now.value))
const updates = computed(() => data.value?.updates ?? [])
const comments = computed(() => data.value?.comments ?? [])
const commentCount = computed(() => comments.value.reduce((n, t) => n + 1 + (t.replies?.length ?? 0), 0))
const from = computed(() => campaignPriceFrom(c.value.rewards))
const category = computed(() => categories.value.find((x) => x.slug === c.value.category))

const drawer = useTemplateRef('drawer')
const refusals = ref<Record<string, string>>({})
const needsReward = computed(() => !tinkerfundRewarded(
  cart.value.groups.find((g) => g.campaign === slug.value)?.lines ?? [],
  tinkerfundPledgeFor(pledges.value, slug.value),
))

function addToCart(request: TinkerfundCartRequest) {
  const key = 'reward' in request ? `reward:${request.reward}` : 'addon' in request ? `addon:${request.addon}` : 'bonus'
  const message = changeCart(request)
  refusals.value = message ? { [key]: message } : {}
  if (!message) drawer.value?.show(request)
}
const backing = computed<TinkerfundBacking>(() => ({ slug: slug.value, state: status.value.state, refusals: refusals.value, add: addToCart }))
</script>

<template>
  <article class="tf-campaign">
    <TinkerfundBreadcrumbs
      :items="[
        { label: 'Home', to: link() },
        { label: category?.name ?? c.category, to: link(`/category/${c.category}`) },
        { label: doc.title },
      ]"
    />

    <div class="hero">
      <TinkerfundFigureGallery :figures="c.figures" :registry="c.registry" />
      <TinkerfundReadout
        class="readout"
        :slug="slug"
        :title="doc.title"
        :description="doc.description"
        :inventor="data?.inventor?.name"
        :campaign="c"
        :deals="deals"
        :clock="clock"
      />
    </div>

    <TinkerfundSectionNav
      :sections="[
        { id: 'story', label: 'Story' },
        { id: 'rewards', label: 'Rewards', count: c.rewards.length },
        { id: 'updates', label: 'Updates', count: updates.length },
        { id: 'comments', label: 'Comments', count: commentCount },
      ]"
    />

    <div class="body">
      <section id="story" class="story" aria-labelledby="story-h">
        <h2 id="story-h">Story</h2>
        <div class="story-grid">
          <ContentRenderer :value="doc" class="tf-prose" />
          <table class="specs">
            <caption>Specifications</caption>
            <tbody>
              <tr v-for="spec in c.specifications" :key="spec.label">
                <th scope="row">{{ spec.label }}</th>
                <td>{{ spec.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <template v-if="c.stretchGoals?.length">
          <h3>Stretch goals</h3>
          <TinkerfundStretchGoals :goals="c.stretchGoals" :pledged="c.pledged" />
        </template>
      </section>

      <section id="rewards" class="rewards" aria-labelledby="rewards-h" tabindex="-1">
        <h2 id="rewards-h">Rewards</h2>
        <p v-for="deal in deals" :key="deal.stem"><TinkerfundDealBadge :promotion="deal" /></p>
        <TinkerfundRewardCard v-for="reward in c.rewards" :key="reward.id" :reward="reward" :backing="backing" :now="now" :zone-name="zoneName" />
        <template v-if="c.addons?.length">
          <h3>Add-ons</h3>
          <TinkerfundAddonList :addons="c.addons" :backing="backing" :needs-reward="needsReward" />
        </template>
        <TinkerfundSupportCard :backing="backing" />
      </section>

      <section id="updates" aria-labelledby="updates-h">
        <h2 id="updates-h">Updates</h2>
        <TinkerfundUpdates :updates="updates" :now="now" />
      </section>

      <section id="comments" aria-labelledby="comments-h">
        <h2 id="comments-h">Comments</h2>
        <TinkerfundComments :comments="comments" :now="now" />
      </section>
    </div>

    <div class="tf-backbar">
      <span v-if="from !== undefined" class="from">From <b>{{ money(from) }}</b></span>
      <TinkerfundCampaignAction :slug="slug" :state="status.state" />
    </div>
    <TinkerfundMiniCart ref="drawer" :view="cart" />
  </article>
</template>

<style scoped>
.hero { display: grid; gap: 18px; }
@media (min-width: 860px) {
  .hero { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: start; }
  .readout { position: sticky; top: 76px; }
}

.body { display: grid; gap: 36px; padding-top: 24px; }
.body > section { min-width: 0; }
@media (min-width: 1000px) {
  .body {
    grid-template-columns: minmax(0, 1fr) 360px;
    grid-template-rows: auto auto 1fr;
    column-gap: 32px;
  }
  .rewards {
    grid-column: 2;
    grid-row: 1 / span 3;
    align-self: start;
    position: sticky;
    top: 120px;
    max-height: calc(100vh - 136px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
  }
}

h2 { margin: 0 0 14px; padding-bottom: 10px; border-bottom: var(--tf-hairline); font: 800 22px/1 var(--tf-font); font-stretch: 80%; }
h3 { margin: 28px 0 10px; font: 800 18px/1.1 var(--tf-font); font-stretch: 82%; }
.rewards { display: grid; gap: 12px; align-content: start; }
.rewards > h2, .rewards > h3, .rewards > p { margin: 0; }
.rewards > h3 { margin-top: 12px; }

.story { container-type: inline-size; }
.story-grid { display: grid; gap: 24px; }
@container (min-width: 620px) { .story-grid { grid-template-columns: minmax(0, 1fr) 240px; align-items: start; } }
.story :deep(.tf-prose h2) { margin-top: 20px; font-size: 20px; }
.story :deep(.tf-prose > :first-child) { margin-top: 0; }
.specs { width: 100%; border-collapse: collapse; font-size: 14px; }
.specs caption { padding-bottom: 8px; text-align: left; font: 500 11px/1.2 var(--tf-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--tf-muted); }
.specs th, .specs td { padding: 8px 0; border-top: var(--tf-hairline); text-align: left; vertical-align: top; }
.specs th { padding-right: 12px; color: var(--tf-muted); font: 500 12px/1.5 var(--tf-mono); }
.specs td { font-weight: 600; }

.tf-backbar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin: 28px -16px 0;
  padding: 10px 16px;
  border-top: var(--tf-hairline);
  background: var(--tf-surface);
}
.from { font-size: 14px; color: var(--tf-muted); }
.from b { color: var(--tf-ink); font: 600 16px/1 var(--tf-mono); }
@media (min-width: 720px) { .tf-backbar { margin-inline: -28px; padding-inline: 28px; } }
/* WCAG 2.2 SC 2.4.11: keep focused controls and anchor targets clear of the sticky header, section nav and back bar. */
:global(html:has(.tf-campaign)) { scroll-padding-top: 7rem; }
@media (max-width: 999px) { :global(html:has(.tf-backbar)) { scroll-padding-bottom: 6rem; } }
@media (min-width: 1000px) { .tf-backbar { display: none; } }
</style>
