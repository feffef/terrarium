<script setup lang="ts">
const props = defineProps<{
  inventor: { name: string; bio: string; portrait: string }
  cards: TinkerfundCard[]
  clock: TinkerfundClock
  heading?: 'h1' | 'h2'
}>()
const { link } = useTinkerfundSpace()
const money = useTinkerfundMoney()
const locale = useTinkerfundLocale()
const record = computed(() => {
  const ended = props.cards.filter((c) => c.status.state === 'ended')
  const funded = ended.filter((c) => c.status.outcome === 'funded').length
  const raised = props.cards.reduce((sum, c) => sum + c.pledged, 0)
  const backers = props.cards.reduce((sum, c) => sum + c.backers, 0)
  return [
    tinkerfundCount(props.cards.length, 'Campaign'),
    ended.length && `${funded} funded, ${ended.length - funded} unfunded`,
    props.cards.length && `${money(raised)} raised`,
    props.cards.length && `${backers.toLocaleString(locale.value)} Backer${backers === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ')
})
</script>

<template>
  <div>
    <header class="intro">
      <!-- eslint-disable-next-line vue/no-v-html -- schema-checked SVG (app/utils/svg.ts, issue #1363) -->
      <svg viewBox="0 0 100 100" role="img" :aria-label="`Portrait of ${inventor.name}`" v-html="inventor.portrait" />
      <p class="tf-label">Inventor · {{ record }}</p>
      <component :is="heading ?? 'h1'" class="tf-h1">{{ inventor.name }}</component>
      <p class="bio">{{ inventor.bio }}</p>
      <NuxtLink :to="link('/discover')">All Campaigns</NuxtLink>
    </header>
    <ul v-if="cards.length" class="grid">
      <li v-for="c in cards" :key="c.path"><TinkerfundBrowseCampaignCard :card="c" :clock="clock" /></li>
    </ul>
    <p v-else class="empty">No Campaigns yet.</p>
  </div>
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
.empty { margin: 0; color: var(--tf-muted); }
</style>
