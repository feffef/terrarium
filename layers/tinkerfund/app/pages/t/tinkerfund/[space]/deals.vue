<script setup lang="ts">
definePageMeta({ viewTransition: true })

const { space, now, clock, cards, promotions } = await useTinkerfundCatalog()
const deals = computed(() => groupTinkerfundPromotions(promotions.value, now.value))
const campaignOf = (slug?: string) => slug === undefined ? undefined : cards.value.find((c) => c.path === `/campaigns/${slug}`)
const groups = computed(() => [
  { id: 'tf-deals-now', title: 'Running now', list: deals.value.active, scheduled: false },
  { id: 'tf-deals-soon', title: 'Starting soon', list: deals.value.scheduled, scheduled: true },
].filter((g) => g.list.length))

useSeoMeta(tinkerfundSeo({ kind: 'listing', space, title: 'Deals', description: 'Promotions running now on Tinkerfund, and the ones starting soon.' }))
</script>

<template>
  <TinkerfundShell :space="space">
    <header class="intro">
      <p class="tf-label">Promotions · {{ deals.active.length }} running</p>
      <h1>Deals</h1>
    </header>

    <p v-if="!deals.active.length" class="empty tf-panel">
      No Deals are running right now.
      <NuxtLink :to="tinkerfundPath(space, '/discover')">Discover Campaigns</NuxtLink> in the meantime.
    </p>

    <section v-for="group in groups" :key="group.id" :aria-labelledby="group.id" class="group">
      <h2 :id="group.id" :class="{ 'tf-sr': !group.scheduled }">{{ group.title }}</h2>
      <article v-for="p in group.list" :key="p.slug" class="deal">
        <TinkerfundDealBanner :promotion="p" :clock="clock" :scheduled="group.scheduled" />
        <div v-if="campaignOf(p.campaign)" class="campaign">
          <TinkerfundCampaignCard :card="campaignOf(p.campaign)!" :clock="clock" />
        </div>
        <p v-else-if="!p.campaign" class="all">
          Applies to every Campaign. <NuxtLink :to="tinkerfundPath(space, '/discover?state=live')">Browse Live Campaigns</NuxtLink>
        </p>
      </article>
    </section>
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 6px; margin-bottom: 22px; }
.intro > * { margin: 0; }
h1 { font: 800 clamp(30px, 4vw, 44px)/1.02 var(--tf-font); font-stretch: 78%; }
h2 { margin: 0 0 4px; font: 800 24px/1.1 var(--tf-font); font-stretch: 80%; }
.group { display: grid; gap: 22px; margin-bottom: 44px; }
.deal { display: grid; gap: 14px; }
.campaign { max-width: 360px; display: grid; }
.all { margin: 0; color: var(--tf-muted); }
.empty { margin: 0 0 44px; padding: 28px; }
</style>
