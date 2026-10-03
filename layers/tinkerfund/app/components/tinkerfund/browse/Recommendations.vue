<script setup lang="ts">
defineProps<{ title: string; cards: TinkerfundCard[]; clock: TinkerfundClock }>()
const id = useId()
</script>

<template>
  <section v-if="cards.length" class="recommendations">
    <h2 :id="id">{{ title }}</h2>
    <ul :aria-labelledby="id">
      <li v-for="c in cards" :key="c.path"><TinkerfundBrowseCampaignCard :card="c" :clock="clock" /></li>
    </ul>
  </section>
</template>

<style scoped>
.recommendations { min-width: 0; }
h2 { margin: 0 0 14px; padding-bottom: 10px; border-bottom: var(--tf-hairline); font: 800 22px/1 var(--tf-font); font-stretch: 80%; }
/* A sideways row on phones; the padding keeps the cards' hover lift and focus ring unclipped. */
ul {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: min(78%, 280px);
  gap: 14px;
  margin: -6px -16px 0;
  padding: 6px 16px 10px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 16px;
  list-style: none;
}
li { display: grid; scroll-snap-align: start; }
@media (min-width: 720px) {
  ul { grid-auto-flow: row; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin: 0; padding: 0; overflow: visible; }
}
</style>
