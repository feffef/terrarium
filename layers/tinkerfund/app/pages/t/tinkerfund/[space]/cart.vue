<script setup lang="ts">
import type { TinkerfundZone } from '../../../../utils/cart'

definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, collections } = useSpace('tinkerfund')
const locale = useTinkerfundLocale()
const money = (amount: number) => formatTinkerfundMoney(amount, locale.value)

const { data: shop, status, error } = await useAsyncData(`tinkerfund-cart-shop-${space}`, async () => {
  const [shop, backer] = await Promise.all([queryCollection(collections.shop).first(), queryCollection(collections.backer).first()])
  return { zones: shop?.zones ?? [], home: backer?.address.zone }
})
// The estimate starts at the demo Backer's own address; checkout settles it.
const zone = ref<TinkerfundZone>(shop.value?.home ?? 'domestic')
const zoneName = computed(() => shop.value?.zones.find((z) => z.id === zone.value)?.name ?? zone.value)
const { loaded, view, change } = await useTinkerfundCart(zone)
const blocked = computed(() => view.value.groups.some((g) => g.lines.some((l) => l.unavailable)))

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: 'Your Cart' }))
</script>

<template>
  <TinkerfundShell :space="space">
    <div class="cart">
      <h1>Your Cart <span v-if="loaded && view.count" class="count">{{ view.count }} {{ view.count === 1 ? 'item' : 'items' }}</span></h1>

      <p v-if="!loaded" class="empty tf-panel">Opening your Cart…</p>
      <section v-else-if="!view.groups.length" class="empty tf-panel">
        <p>Your Cart is empty. Every Reward you add waits here until you close the tab.</p>
        <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space, '/discover')">Discover Campaigns</NuxtLink>
      </section>

      <div v-else class="layout">
        <div class="groups">
          <TinkerfundCartGroup
            v-for="group in view.groups"
            :key="group.campaign"
            :space="space"
            :group="group"
            :zone="zoneName"
            @change="change"
          />
        </div>

        <aside class="summary tf-panel" aria-labelledby="summary-h">
          <h2 id="summary-h">Summary</h2>
          <label class="tf-label" for="tf-zone">Estimate shipping to</label>
          <select id="tf-zone" v-model="zone">
            <option v-for="z in shop?.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
          </select>
          <dl>
            <div><dt>Subtotal</dt><dd>{{ money(view.subtotal) }}</dd></div>
            <div><dt>Shipping</dt><dd>{{ money(view.shipping) }}</dd></div>
            <div class="total"><dt>Estimated total</dt><dd>{{ money(view.total) }}</dd></div>
          </dl>
          <p class="note">Discounts and codes apply at checkout. You’re only charged if a Campaign is funded.</p>
          <p v-if="blocked" class="blocked">Remove what is no longer available to check out.</p>
          <NuxtLink v-else class="tf-btn primary" :to="tinkerfundPath(space, '/checkout')">Checkout</NuxtLink>
        </aside>
      </div>
    </div>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.cart { display: grid; gap: 20px; }
h1 { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: baseline; margin: 0; font: 800 clamp(30px, 4vw, 42px)/1.05 var(--tf-font); font-stretch: 78%; }
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
dl { display: grid; gap: 6px; margin: 4px 0 0; }
dl div { display: flex; justify-content: space-between; gap: 12px; }
dt { color: var(--tf-muted); }
dd { margin: 0; font: 600 15px/1.4 var(--tf-mono); font-variant-numeric: tabular-nums; }
.total { padding-top: 8px; border-top: var(--tf-hairline); }
.total dt { color: var(--tf-ink); font-weight: 600; }
.total dd { font-size: 18px; }
.note { margin: 0; color: var(--tf-muted); font-size: 14px; }
.blocked { margin: 0; color: var(--tf-bad); font-size: 14px; }
</style>
