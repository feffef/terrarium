<script setup lang="ts">
import type { CampaignStatus } from '../../utils/status'

defineProps<{ status: CampaignStatus; promoted?: boolean }>()
</script>

<template>
  <span class="chips">
    <span class="chip" :data-state="status.outcome ?? status.state">{{ tinkerfundStateLabel(status) }}</span>
    <span v-if="status.endingSoon" class="chip soon">Ending soon</span>
    <span v-if="promoted" class="chip deal">Deal</span>
  </span>
</template>

<style scoped>
.chips { display: inline-flex; flex-wrap: wrap; gap: 4px; }
.chip {
  padding: 4px 7px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: var(--tf-surface);
  font: 500 11px/1 var(--tf-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
[data-state='live'] { color: var(--tf-good); }
[data-state='upcoming'] { color: var(--tf-muted); }
[data-state='funded'] { color: var(--tf-link); }
[data-state='unfunded'] { color: var(--tf-bad); }
.soon { border-color: transparent; background: var(--tf-mark); color: var(--tf-mark-ink); }
.deal { border-color: transparent; background: var(--tf-accent); color: var(--tf-accent-ink); }
</style>
