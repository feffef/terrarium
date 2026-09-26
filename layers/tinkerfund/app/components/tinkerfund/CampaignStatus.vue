<script setup lang="ts">
const props = defineProps<{
  campaign: { registry: string; launch: string; end: string; goal: number; pledged: number }
  now: number
  ticking: boolean
}>()

// State is fixed for the page's "now"; only the countdown moves (issue #1364).
const status = computed(() => deriveCampaignStatus(props.campaign, props.campaign.pledged, props.now))
const clock = ref(props.now)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (props.ticking) timer = setInterval(() => (clock.value = Date.now()), 60_000)
})
onUnmounted(() => clearInterval(timer))

const STATE_LABEL = { upcoming: 'Upcoming', live: 'Live', ended: 'Ended' } as const
const countdown = computed(() => {
  const { state, launchAt, endAt } = status.value
  if (state === 'ended') return undefined
  const at = state === 'live' ? endAt : launchAt
  const left = formatTinkerfundCountdown(tinkerfundCountdown(clock.value, at))
  return { at, text: state === 'live' ? `${left} to go` : `Launches in ${left}` }
})
</script>

<template>
  <div class="status">
    <span class="tf-label">{{ campaign.registry }}</span>
    <span class="state" :data-state="status.state">{{ STATE_LABEL[status.state] }}</span>
    <span v-if="status.outcome" class="state">{{ status.outcome === 'funded' ? 'Funded' : 'Unfunded' }}</span>
    <span v-if="status.endingSoon" class="badge soon">Ending soon</span>
    <span v-if="status.goalReached" class="badge">Goal reached</span>
    <span class="readout">{{ status.percent }}% funded</span>
    <time v-if="countdown" class="readout" :datetime="new Date(countdown.at).toISOString()">{{ countdown.text }}</time>
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
