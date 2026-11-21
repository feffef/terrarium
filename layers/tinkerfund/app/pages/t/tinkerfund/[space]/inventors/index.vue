<script setup lang="ts">
// PROTOTYPE sample for the owner (issue #3556); not production.
const { space, collections, link, inventorLink } = useTinkerfundSpace()
const { data: inventors } = await useAsyncData(`tinkerfund-inventors-${space}`, () => queryCollection(collections.inventors).all())
const { cards } = await useTinkerfundCatalog()
const rows = computed(() =>
  (inventors.value ?? [])
    .map((i) => ({ slug: String(i.stem).split('/').pop() as string, name: i.name, portrait: i.portrait, count: cards.value.filter((c) => c.inventor === String(i.stem).split('/').pop()).length }))
    .sort((a, b) => a.name.localeCompare(b.name)),
)
useSeoMeta({ title: 'Inventors' })
</script>

<template>
  <TinkerfundShell>
    <header class="intro">
      <p class="tf-label">Inventors · {{ rows.length }}</p>
      <h1 class="tf-h1">Meet the Inventors</h1>
    </header>
    <ul class="grid">
      <li v-for="r in rows" :key="r.slug">
        <NuxtLink class="card tf-panel" :to="inventorLink(r.slug)">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <svg class="tf-tokens" viewBox="0 0 100 100" aria-hidden="true" v-html="r.portrait" />
          <b>{{ r.name }}</b>
          <span class="tf-label">{{ tinkerfundCount(r.count, 'Campaign') }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p><NuxtLink :to="link('/discover')">All Campaigns</NuxtLink></p>
  </TinkerfundShell>
</template>

<style scoped>
.intro > * { margin: 0 0 6px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 16px; margin: 18px 0; padding: 0; list-style: none; }
.card { display: grid; gap: 6px; justify-items: start; padding: 16px; color: var(--tf-ink); text-decoration: none; }
.card:hover { border-color: var(--tf-ink); }
.card svg { width: 72px; height: 72px; border: var(--tf-hairline); border-radius: var(--tf-radius); background: var(--tf-surface); color-scheme: light; }
.card b { font: 800 18px/1.1 var(--tf-font); font-stretch: 82%; }
</style>
