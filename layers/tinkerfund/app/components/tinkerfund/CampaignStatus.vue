<script setup lang="ts">
import type { TinkerfundMoment } from '../../composables/tinkerfund'

const props = defineProps<{
  campaign: { registry: string; launch: string; end: string; goal: number; pledged: number }
  moment: TinkerfundMoment
}>()

// State is fixed for the page's "now"; only the relative time moves (issue #1364).
const status = computed(() => deriveCampaignStatus(props.campaign, props.campaign.pledged, props.moment.now))
const clock = ref(props.moment.now)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (props.moment.ticking) timer = setInterval(() => (clock.value = Date.now()), 60_000)
})
onUnmounted(() => clearInterval(timer))

const when = computed(() => {
  const { label, at } = tinkerfundDeadline(status.value)
  const remaining = tinkerfundRemaining(status.value, clock.value)
  const text = { upcoming: remaining, live: `${remaining} to go`, ended: `${label} ${formatTinkerfundAgo(clock.value, at)}` }
  return { at, text: text[status.value.state] }
})
</script>

<template>
  <div class="status">
    <span class="tf-label">{{ campaign.registry }}</span>
    <span class="state" :data-state="status.state">{{ TINKERFUND_STATE_LABELS[status.state] }}</span>
    <span v-if="status.outcome" class="state">{{ TINKERFUND_STATE_LABELS[status.outcome] }}</span>
    <span v-if="status.endingSoon" class="badge soon">Ending soon</span>
    <span v-if="status.goalReached" class="badge">Goal reached</span>
    <span class="readout">{{ status.percent }}% funded</span>
    <TinkerfundTime class="readout" :at="when.at" :text="when.text" />
  </div>
</template>

<style scoped>
.status { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin-bottom: 18px; }
.state, .badge, .readout { font: 500 13px/1.4 var(--tf-mono); }
.state { padding: 2px 8px; border: var(--tf-hairline); border-radius: var(--tf-radius); }
.state[data-state='live'] { color: var(--tf-good); }
.badge { padding: 2px 8px; border-radius: var(--tf-radius); background: var(--tf-accent-soft); }
.badge.soon { background: var(--tf-mark); color: var(--tf-mark-ink); }
</style>
