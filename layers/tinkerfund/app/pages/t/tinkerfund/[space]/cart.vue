<script setup lang="ts">
import type { TinkerfundZone } from '../../../../utils/cart'

definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, link } = useTinkerfundSpace()
const money = useTinkerfundMoney()
const chosen = ref<TinkerfundZone>()
const [{ shop, zoneName, status, error }, { loaded, zone, view, change }] = await Promise.all([useTinkerfundShop(), useTinkerfundCart(chosen)])
const shippingRows = computed(() => tinkerfundShippingRows(view.value.groups, zoneName(zone.value), money))
const blocked = computed(() => view.value.groups.some((g) => g.lines.some((l) => l.unavailable)))

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: 'Your Cart' }))
</script>

<template>
  <TinkerfundShell>
    <div class="cart">
      <h1 class="tf-h1">Your Cart <span v-if="loaded && view.count" class="count">{{ tinkerfundCount(view.count, 'item') }}</span></h1>

      <p v-if="!loaded" class="empty tf-panel">Opening your Cart…</p>
      <section v-else-if="!view.groups.length" class="empty tf-panel">
        <p>Your Cart is empty. Every Reward you add waits here until you close the tab.</p>
        <NuxtLink class="tf-btn primary" :to="link('/discover')">Discover Campaigns</NuxtLink>
      </section>

      <div v-else class="layout">
        <div class="groups">
          <TinkerfundCartGroup
            v-for="group in view.groups"
            :key="group.campaign"
            :group="group"
            :zone="zoneName(zone)"
            @change="change"
          />
        </div>

        <aside class="summary tf-panel" aria-labelledby="summary-h">
          <h2 id="summary-h">Summary</h2>
          <label class="tf-label" for="tf-zone">Estimate shipping to</label>
          <select id="tf-zone" :value="zone" @change="chosen = ($event.target as HTMLSelectElement).value as TinkerfundZone">
            <option v-for="z in shop?.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
          </select>
          <dl class="sums tf-summary-list">
            <div><dt>Subtotal</dt><dd>{{ money(view.subtotal) }}</dd></div>
            <div v-for="row in shippingRows" :key="row.label"><dt>{{ row.label }}</dt><dd>{{ row.amount }}</dd></div>
            <div class="total"><dt>Estimated total</dt><dd>{{ money(view.total) }}</dd></div>
          </dl>
          <p class="note">Discounts and codes apply at checkout. You’re only charged if a Campaign is funded.</p>
          <p v-if="blocked" class="blocked">Remove what is no longer available to check out.</p>
          <NuxtLink v-else class="tf-btn primary" :to="link('/checkout')">Checkout</NuxtLink>
        </aside>
      </div>
    </div>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.cart { display: grid; gap: 20px; }
h1 { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: baseline; }
.count { color: var(--tf-muted); font: 500 14px/1 var(--tf-mono); }
.empty { display: grid; gap: 14px; justify-items: start; margin: 0; padding: 22px; }
.empty p { margin: 0; }
.layout { display: grid; gap: 20px; align-items: start; }
@media (min-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr) 320px; } }
.groups { display: grid; gap: 14px; }
.summary { display: grid; gap: 10px; padding: 18px; }
@media (min-width: 900px) { .summary { position: sticky; top: 76px; } }
.summary h2 { margin: 0; font: 800 20px/1.1 var(--tf-font); font-stretch: 82%; }
select { padding: 8px 10px; border: 1px solid var(--tf-muted); border-radius: var(--tf-radius); background: var(--tf-surface); color: var(--tf-ink); font: inherit; }
.sums { margin-top: 4px; }
.note { margin: 0; color: var(--tf-muted); font-size: 14px; }
.blocked { margin: 0; color: var(--tf-bad); font-size: 14px; }
</style>
