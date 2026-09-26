<script setup lang="ts">
import type { TinkerfundClock } from '../../composables/tinkerfund'
import type { TinkerfundCampaign, TinkerfundPromotion } from '../../types/tinkerfund'

const props = defineProps<{
  slug: string
  title: string
  description?: string
  inventor?: string
  campaign: TinkerfundCampaign
  deals: TinkerfundPromotion[]
  clock: TinkerfundClock
  /** The page's h1 by default; the qa gallery shows several at once. */
  heading?: 'h1' | 'h3'
}>()

const locale = useTinkerfundLocale()
const money = useTinkerfundMoney()
const status = computed(() => deriveCampaignStatus(props.campaign, props.campaign.pledged, props.clock.now))
const deadline = computed(() => tinkerfundDeadline(status.value))
const from = computed(() => campaignPriceFrom(props.campaign.rewards))
</script>

<template>
  <div class="readout tf-panel">
    <TinkerfundCampaignStatus :campaign="campaign" :clock="clock" />
    <p class="date">{{ deadline.label }} <TinkerfundTime :at="deadline.at" /></p>
    <component :is="heading ?? 'h1'" class="tf-h1">{{ title }}</component>
    <p v-if="description" class="lead">{{ description }}</p>
    <p v-if="inventor" class="by">by <b>{{ inventor }}</b></p>
    <div>
      <p class="big">{{ money(campaign.pledged) }}</p>
      <p class="sub">pledged of {{ money(campaign.goal) }} goal</p>
    </div>
    <TinkerfundProgressBar :percent="status.percent" />
    <dl class="tiles">
      <div><dt>Backers</dt><dd>{{ campaign.backers.toLocaleString(locale) }}</dd></div>
      <div><dt>Funded</dt><dd>{{ status.percent }}%</dd></div>
      <div v-if="from !== undefined"><dt>From</dt><dd>{{ money(from) }}</dd></div>
    </dl>
    <p v-for="deal in deals" :key="deal.stem" class="deals">
      <TinkerfundDealBadge :promotion="deal" />
    </p>
    <TinkerfundCampaignAction :slug="slug" :state="status.state" />
  </div>
</template>

<style scoped>
.readout { display: grid; gap: 14px; align-content: start; padding: 20px; box-shadow: var(--tf-shadow); }
.readout > * { margin: 0; }
.readout :deep(.status) { margin-bottom: 0; }
.lead { color: var(--tf-muted); }
.date { color: var(--tf-muted); font: 500 12px/1.4 var(--tf-mono); }
.by { font-size: 14px; }
.big { margin: 0; font: 600 34px/1 var(--tf-mono); font-variant-numeric: tabular-nums; }
.sub { margin: 4px 0 0; color: var(--tf-muted); font-size: 14px; }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tiles div { padding: 10px 12px; border: var(--tf-hairline); border-radius: var(--tf-radius); }
dt { font: 500 10px/1.2 var(--tf-mono); text-transform: uppercase; letter-spacing: 0.07em; color: var(--tf-muted); }
dd { margin: 4px 0 0; font: 600 17px/1.2 var(--tf-mono); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
</style>
