<script setup lang="ts">
import type { TinkerfundPledgeState } from '../../utils/account'

defineProps<{ state: TinkerfundPledgeState }>()

const LABELS: Record<TinkerfundPledgeState, string> = {
  pending: 'Pending',
  charged: 'Charged',
  delivered: 'Delivered',
  unfunded: 'Not charged',
  cancelled: 'Cancelled',
}
</script>

<template>
  <span class="chip" :data-state="state">{{ LABELS[state] }}</span>
</template>

<style scoped>
.chip {
  justify-self: start;
  padding: 4px 7px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: var(--tf-surface);
  font: 500 11px/1 var(--tf-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
[data-state='pending'] { color: var(--tf-warn); }
[data-state='charged'] { color: var(--tf-link); }
[data-state='delivered'] { color: var(--tf-good); }
[data-state='unfunded'], [data-state='cancelled'] { color: var(--tf-muted); }
</style>
