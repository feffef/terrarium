<script setup lang="ts">
definePageMeta({ viewTransition: true })

const { space, clock, cards, categories } = await useTinkerfundCatalog()

useSeoMeta(tinkerfundSeo({ kind: 'listing', space, title: 'Discover', description: 'Every Campaign on Tinkerfund, to filter and sort.' }))
</script>

<template>
  <TinkerfundShell>
    <header class="intro">
      <p class="tf-label">Index · {{ tinkerfundCount(cards.length, 'Campaign') }} on file</p>
      <h1 class="tf-h1">Discover</h1>
    </header>
    <TinkerfundBrowse :cards="cards" :categories="categories" :clock="clock" />
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 6px; margin-bottom: 22px; }
.intro > * { margin: 0; }
</style>
