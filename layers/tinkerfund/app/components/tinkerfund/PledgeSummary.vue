<script setup lang="ts">
import type { TinkerfundReceiptLine } from '../../utils/checkout'

const props = defineProps<{
  pledge: {
    campaign: string
    title: string
    lines: (TinkerfundReceiptLine & { ships?: boolean; unavailable?: string })[]
    unshipped?: string[]
    bonus?: number
    discount: number
    shipping: number
    rezoned?: boolean
    total: number
  }
  zone: string
  reference?: string
  /** When the Campaign ends: the charge is pending until then (issue #1365). */
  endsAt?: number
  note?: string
}>()

const id = useId()
const money = useTinkerfundMoney()
const { campaignLink } = useTinkerfundSpace()
const shippingRow = computed(() => tinkerfundShippingRow(props.pledge, props.zone, money))
</script>

<template>
  <section class="pledge tf-panel" :aria-labelledby="`${id}-h`">
    <header class="top">
      <p v-if="reference" class="tf-label">Pledge <b class="ref">{{ reference }}</b></p>
      <h2 :id="`${id}-h`"><NuxtLink :to="campaignLink(pledge.campaign)">{{ pledge.title }}</NuxtLink></h2>
      <p v-if="note" class="note">{{ note }}</p>
      <p v-if="pledge.unshipped?.length" class="flag">{{ tinkerfundPledgeDoesntShip(pledge.unshipped, zone) }}</p>
    </header>
    <ul class="lines">
      <li v-for="line in pledge.lines" :key="line.key">
        <span class="what">
          <span>{{ line.quantity }} × {{ line.title }}</span>
          <span v-if="line.detail" class="detail">{{ line.detail }}</span>
          <span v-if="line.unavailable" class="flag">No longer available: {{ line.unavailable }}</span>
          <span v-else-if="line.ships === false" class="flag">Doesn’t ship to {{ zone }}</span>
        </span>
        <span class="amount">{{ money(line.amount) }}</span>
      </li>
      <li v-if="pledge.bonus">
        <span class="what">{{ pledge.lines.length ? 'Bonus support' : 'Just support it' }}</span>
        <span class="amount">{{ money(pledge.bonus) }}</span>
      </li>
    </ul>
    <dl class="sums tf-summary-list compact">
      <div v-if="pledge.discount"><dt>Discount</dt><dd>−{{ money(pledge.discount) }}</dd></div>
      <div><dt>{{ shippingRow.label }}</dt><dd>{{ shippingRow.amount }}</dd></div>
      <div class="total"><dt>Total</dt><dd>{{ money(pledge.total) }}</dd></div>
    </dl>
    <p v-if="endsAt !== undefined" class="pending">
      <b>Pending.</b> You’ll only be charged if this Campaign is funded, when it ends on <TinkerfundTime :at="endsAt" />.
    </p>
  </section>
</template>

<style scoped>
.pledge { display: grid; gap: 8px; padding: 16px; }
.top { display: grid; gap: 4px; }
.top > * { margin: 0; }
.ref { color: var(--tf-ink); font-weight: 600; }
h2 { font: 800 19px/1.15 var(--tf-font); font-stretch: 82%; overflow-wrap: anywhere; }
h2 a { color: var(--tf-ink); text-decoration: none; }
h2 a:hover { text-decoration: underline; }
.note { color: var(--tf-muted); font-size: 14px; }
.lines { display: grid; margin: 0; padding: 0; list-style: none; }
li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: var(--tf-hairline); }
.what { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.detail { color: var(--tf-muted); font-size: 13px; }
.flag { color: var(--tf-bad); font-size: 14px; }
.amount { font: 600 14px/1.4 var(--tf-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
.sums { margin-top: 4px; }
.pending { margin: 4px 0 0; padding: 10px 12px; border-radius: var(--tf-radius); background: var(--tf-bg); font-size: 14px; }
</style>
