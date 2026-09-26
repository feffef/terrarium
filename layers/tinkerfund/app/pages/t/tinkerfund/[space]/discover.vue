<script setup lang="ts">
definePageMeta({ viewTransition: true })

const { space, clock, cards, categories } = await useTinkerfundCatalog()

useSeoMeta(tinkerfundSeo({ kind: 'listing', space, title: 'Discover', description: 'Every Campaign on Tinkerfund, to filter and sort.' }))
</script>

<template>
  <TinkerfundShell :space="space">
    <header class="intro">
      <p class="tf-label">Index · {{ formatTinkerfundCampaignCount(cards.length) }} on file</p>
      <h1>Discover</h1>
    </header>
    <TinkerfundBrowse :cards="cards" :categories="categories" :clock="clock" />
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 6px; margin-bottom: 22px; }
.intro > * { margin: 0; }
h1 { font: 800 clamp(30px, 4vw, 44px)/1.02 var(--tf-font); font-stretch: 78%; }
</style>
