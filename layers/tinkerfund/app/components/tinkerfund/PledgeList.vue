<script setup lang="ts">
import type { TinkerfundPledgeState } from '../../utils/account'

// The account's Pledges, newest first (story #1385); each opens its receipt.
defineProps<{
  space: string
  rows: { ref: string; title: string; placed: number; state: TinkerfundPledgeState; total: number }[]
}>()

const locale = useTinkerfundLocale()
const money = (amount: number) => formatTinkerfundMoney(amount, locale.value)
</script>

<template>
  <ul class="list">
    <li v-for="row in rows" :key="row.ref" class="row tf-panel">
      <p class="tf-label">Pledge <b class="ref">{{ row.ref }}</b></p>
      <h3><NuxtLink :to="tinkerfundPath(space, `/account/pledges/${row.ref}`)">{{ row.title }}</NuxtLink></h3>
      <TinkerfundPledgeState class="state" :state="row.state" />
      <p class="placed">Placed <TinkerfundTime :at="row.placed" /></p>
      <p class="total">{{ money(row.total) }}</p>
    </li>
  </ul>
</template>

<style scoped>
.list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: 'ref state' 'title title' 'placed total';
  gap: 6px 12px;
  align-items: center;
  padding: 14px 16px;
}
@media (min-width: 720px) {
  .row { grid-template-columns: 110px minmax(0, 1fr) auto 110px; grid-template-areas: 'ref title state total' 'ref placed state total'; }
}
.row > * { margin: 0; }
.tf-label { grid-area: ref; }
.ref { color: var(--tf-ink); font-weight: 600; }
h3 { grid-area: title; font: 800 18px/1.2 var(--tf-font); font-stretch: 82%; overflow-wrap: anywhere; }
h3 a { color: var(--tf-ink); text-decoration: none; }
/* The whole row opens the receipt; the link stays the one accessible target. */
h3 a::after { content: ''; position: absolute; inset: 0; border-radius: var(--tf-radius-panel); }
.row:hover h3 a { text-decoration: underline; }
.state { grid-area: state; justify-self: end; }
.placed { grid-area: placed; color: var(--tf-muted); font-size: 14px; }
.total { grid-area: total; justify-self: end; font: 600 15px/1 var(--tf-mono); font-variant-numeric: tabular-nums; }
</style>
