<script setup lang="ts">
defineProps<{ status: CampaignStatus; promoted?: boolean }>()
</script>

<template>
  <span class="chips">
    <span class="tf-chip" :data-state="status.outcome ?? status.state">{{ tinkerfundStateLabel(status) }}</span>
    <span v-if="status.endingSoon" class="tf-chip soon">Ending soon</span>
    <span v-if="promoted" class="tf-chip deal">Deal</span>
  </span>
</template>

<style scoped>
.chips { display: inline-flex; flex-wrap: wrap; gap: 4px; }
[data-state='live'] { color: var(--tf-good); }
[data-state='upcoming'] { color: var(--tf-muted); }
[data-state='funded'] { color: var(--tf-link); }
[data-state='unfunded'] { color: var(--tf-bad); }
.soon { border-color: transparent; background: var(--tf-mark); color: var(--tf-mark-ink); }
.deal { border-color: transparent; background: var(--tf-accent); color: var(--tf-accent-ink); }
</style>
