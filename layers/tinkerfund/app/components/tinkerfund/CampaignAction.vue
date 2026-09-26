<script setup lang="ts">
// Only a Live Campaign takes Pledges (issue #1364): Upcoming offers a
// reminder, Ended is locked.
const props = defineProps<{ slug: string; state: CampaignState }>()
const { space } = useSpace('tinkerfund')
const notify = useState(`tinkerfund-notify-${space}-${props.slug}`, () => false)
</script>

<template>
  <a v-if="state === 'live'" class="tf-btn primary" href="#rewards">Back this Campaign</a>
  <button v-else-if="state === 'upcoming'" type="button" class="tf-btn" :aria-pressed="notify" @click="notify = !notify">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="notify ? 'M5 12.5l4.5 4.5L19 7.5' : 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4'" /></svg>
    Notify me
  </button>
  <p v-else class="tf-btn locked">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
    Pledging has closed
  </p>
</template>

<style scoped>
svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
[aria-pressed='true'] { background: var(--tf-ink); color: var(--tf-surface); }
.locked { margin: 0; color: var(--tf-muted); cursor: default; }
</style>
