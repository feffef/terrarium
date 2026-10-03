<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const slug = String(route.params.inventor)
const { space, collections, link } = useTinkerfundSpace()
const { data: inventor } = await useAsyncData(`tinkerfund-inventor-${space}-${slug}`, () =>
  queryCollection(collections.inventors).where('stem', '=', slug).first(),
)
const { clock, cards } = await useTinkerfundCatalog()
const mine = computed(() => cards.value.filter((c) => c.inventor === slug))
const record = computed(() => {
  const ended = mine.value.filter((c) => c.status.state === 'ended')
  const funded = ended.filter((c) => c.status.outcome === 'funded').length
  return `${tinkerfundCount(mine.value.length, 'Campaign')}${ended.length ? ` · ${funded} funded, ${ended.length - funded} unfunded` : ''}`
})

useSeoMeta(tinkerfundSeo(inventor.value
  ? { kind: 'page', space, title: inventor.value.name, description: inventor.value.bio }
  : { kind: 'not-found', space }))
</script>

<template>
  <TinkerfundShell>
    <template v-if="inventor">
      <header class="intro">
        <!-- eslint-disable-next-line vue/no-v-html -- schema-checked SVG (app/utils/svg.ts, issue #1363) -->
        <svg viewBox="0 0 100 100" role="img" :aria-label="`Portrait of ${inventor.name}`" v-html="inventor.portrait" />
        <p class="tf-label">Inventor · {{ record }}</p>
        <h1 class="tf-h1">{{ inventor.name }}</h1>
        <p class="bio">{{ inventor.bio }}</p>
        <NuxtLink :to="link('/discover')">All Campaigns</NuxtLink>
      </header>
      <ul class="grid">
        <li v-for="c in mine" :key="c.path"><TinkerfundBrowseCampaignCard :card="c" :clock="clock" /></li>
      </ul>
    </template>
    <TinkerfundShellNotFound v-else />
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 6px; justify-items: start; margin-bottom: 22px; }
.intro > * { margin: 0; }
svg { width: 96px; height: 96px; margin-bottom: 8px; border: var(--tf-hairline); border-radius: var(--tf-radius); background: var(--tf-surface); }
.bio { max-width: 60ch; color: var(--tf-muted); }
.intro a { font: 500 13px/1 var(--tf-mono); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.grid li { display: grid; }
</style>
