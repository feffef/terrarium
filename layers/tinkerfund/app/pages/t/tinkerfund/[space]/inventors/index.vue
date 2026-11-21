<script setup lang="ts">
const { space, collections, link, inventorLink } = useTinkerfundSpace()
const { data: inventors } = await useAsyncData(`tinkerfund-inventors-${space}`, () => queryCollection(collections.inventors).select('stem', 'name', 'portrait').all())
const { cards } = await useTinkerfundCatalog()
const rows = computed(() =>
  (inventors.value ?? [])
    .map((i) => ({ ...i, count: cards.value.filter((c) => c.inventor === i.stem).length }))
    .sort((a, b) => a.name.localeCompare(b.name)),
)

useSeoMeta(tinkerfundSeo({ kind: 'page', space, title: 'Inventors', description: 'The people behind the Campaigns.' }))
</script>

<template>
  <TinkerfundShell>
    <header class="intro">
      <p class="tf-label">Inventors · {{ rows.length }}</p>
      <h1 class="tf-h1">Meet the Inventors</h1>
      <NuxtLink :to="link('/discover')">All Campaigns</NuxtLink>
    </header>
    <ul class="grid">
      <li v-for="r in rows" :key="r.stem">
        <NuxtLink class="card tf-panel" :to="inventorLink(r.stem)">
          <!-- eslint-disable-next-line vue/no-v-html -- schema-checked SVG (app/utils/svg.ts, issue #1363) -->
          <svg class="tf-tokens" viewBox="0 0 100 100" aria-hidden="true" v-html="r.portrait" />
          <b>{{ r.name }}</b>
          <span class="tf-label">{{ tinkerfundCount(r.count, 'Campaign') }}</span>
        </NuxtLink>
      </li>
    </ul>
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 6px; justify-items: start; margin-bottom: 22px; }
.intro > * { margin: 0; }
.intro a { font: 500 13px/1 var(--tf-mono); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
.card { display: grid; gap: 6px; justify-items: start; min-width: 0; padding: 16px; color: var(--tf-ink); text-decoration: none; }
.card:hover { border-color: var(--tf-ink); }
.card svg { width: 72px; height: 72px; border: var(--tf-hairline); border-radius: var(--tf-radius); background: var(--tf-surface); color-scheme: light; }
.card b { overflow-wrap: anywhere; font: 800 18px/1.1 var(--tf-font); font-stretch: 82%; }
</style>
