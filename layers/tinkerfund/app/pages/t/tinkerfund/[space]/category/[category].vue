<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, clock, cards, categories } = await useTinkerfundCatalog()
const category = computed(() => categories.value.find((c) => c.slug === route.params.category))

useSeoMeta(tinkerfundSeo(category.value
  ? { kind: 'listing', space, title: category.value.name, description: category.value.blurb }
  : { kind: 'not-found', space }))
</script>

<template>
  <TinkerfundShell :space="space">
    <template v-if="category">
      <header class="intro">
        <!-- eslint-disable-next-line vue/no-v-html -- validated, token-coloured content SVG (issue #1363) -->
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="category.icon" />
        <p class="tf-label">Category</p>
        <h1>{{ category.name }}</h1>
        <p class="blurb">{{ category.blurb }}</p>
        <NuxtLink :to="tinkerfundPath(space, '/discover')">All categories</NuxtLink>
      </header>
      <TinkerfundBrowse :cards="cards" :categories="categories" :clock="clock" :category="category.slug" />
    </template>
    <TinkerfundNotFound v-else />
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 6px; justify-items: start; margin-bottom: 22px; }
.intro > * { margin: 0; }
svg { width: 32px; height: 32px; fill: none; stroke: var(--tf-accent); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
h1 { font: 800 clamp(30px, 4vw, 44px)/1.02 var(--tf-font); font-stretch: 78%; overflow-wrap: anywhere; }
.blurb { max-width: 60ch; color: var(--tf-muted); }
.intro a { font: 500 13px/1 var(--tf-mono); }
</style>
