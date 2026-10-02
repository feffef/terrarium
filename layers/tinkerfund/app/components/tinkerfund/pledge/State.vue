<script setup lang="ts">
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
  <span class="tf-chip" :data-state="state">{{ LABELS[state] }}</span>
</template>

<style scoped>
.tf-chip { justify-self: start; }
[data-state='pending'] { color: var(--tf-warn); }
[data-state='charged'] { color: var(--tf-link); }
[data-state='delivered'] { color: var(--tf-good); }
[data-state='unfunded'], [data-state='cancelled'] { color: var(--tf-muted); }
</style>
