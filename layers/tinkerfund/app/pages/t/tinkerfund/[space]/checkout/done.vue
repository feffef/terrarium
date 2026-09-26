<script setup lang="ts">
// The Confirmation (story #1384): the Pledges a checkout just placed, named
// by ref in the URL and read from the visitor's overlay after mount.
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, collections } = useSpace('tinkerfund')
const locale = useTinkerfundLocale()
const money = (amount: number) => formatTinkerfundMoney(amount, locale.value)

const { data: shop, status, error } = await useAsyncData(`tinkerfund-done-shop-${space}`, () => queryCollection(collections.shop).first())
const { loaded, pledges, catalog, now } = await useTinkerfundCart()

const refs = computed(() => String(route.query.refs ?? '').split(',').filter(Boolean))
const receipts = computed(() =>
  refs.value.flatMap((ref) => {
    const pledge = pledges.value.find((p) => p.ref === ref)
    const entry = pledge && catalog.value[pledge.campaign]
    if (!pledge || !entry) return []
    return [{
      ...tinkerfundReceipt(pledge, entry),
      zone: shop.value?.zones.find((z) => z.id === pledge.zone)?.name ?? pledge.zone,
      payment: shop.value?.payments.find((p) => p.id === pledge.payment)?.label ?? pledge.payment,
      endsAt: resolveTinkerfundOffset(entry.campaign.end, now.value),
    }]
  }))
const total = computed(() => Math.round(receipts.value.reduce((n, r) => n + r.total, 0) * 100) / 100)

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: 'Pledge confirmed' }))
</script>

<template>
  <TinkerfundShell :space="space">
    <div class="done">
      <h1 v-if="!loaded">Opening your receipt…</h1>
      <section v-else-if="!receipts.length" class="empty tf-panel">
        <h1>No Pledge to show</h1>
        <p>This receipt belongs to a tab that has since closed, or to a demo that was reset.</p>
        <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space)">Back to the shop</NuxtLink>
      </section>

      <template v-else>
        <header class="intro">
          <p class="tf-label">Confirmation · nothing has been charged</p>
          <h1>{{ receipts.length === 1 ? 'Your Pledge is in' : `Your ${receipts.length} Pledges are in` }}</h1>
          <p class="lead">Paid with {{ receipts[0]!.payment }}, which is to say not at all. Each Campaign is charged separately, and only if it is funded.</p>
        </header>
        <TinkerfundPledgeSummary
          v-for="r in receipts"
          :key="r.ref"
          :space="space"
          :pledge="r"
          :zone="r.zone"
          :reference="r.ref"
          :ends-at="r.endsAt"
        />
        <p v-if="receipts.length > 1" class="grand">Total across your Pledges <b>{{ money(total) }}</b></p>
        <p class="actions">
          <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space, '/discover')">Keep browsing</NuxtLink>
          <NuxtLink class="tf-btn" :to="tinkerfundPath(space, `/campaigns/${receipts[0]!.campaign}`)">See {{ receipts[0]!.title }}</NuxtLink>
        </p>
      </template>
    </div>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.done { display: grid; gap: 16px; max-width: 760px; }
.empty { display: grid; gap: 14px; justify-items: start; margin: 0; padding: 22px; }
.empty > * { margin: 0; }
.intro { display: grid; gap: 8px; }
.intro > * { margin: 0; }
h1 { margin: 0; font: 800 clamp(30px, 4vw, 42px)/1.05 var(--tf-font); font-stretch: 78%; }
.lead { color: var(--tf-muted); }
.grand { display: flex; justify-content: space-between; margin: 0; padding: 12px 16px; border-top: var(--tf-hairline); }
.grand b { font: 600 18px/1.2 var(--tf-mono); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 0; }
</style>
