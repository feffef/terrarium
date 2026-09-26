<script setup lang="ts">
import type { TinkerfundCard, TinkerfundClock } from '../../composables/tinkerfund'

const props = defineProps<{ card: TinkerfundCard; clock: TinkerfundClock }>()
const { link } = useTinkerfundSpace()
const money = useTinkerfundMoney()
const upcoming = computed(() => props.card.status.state === 'upcoming')
const time = computed(() => tinkerfundTimeTile(props.card.status, props.clock.countdown))
</script>

<template>
  <article class="card tf-panel">
    <div class="fig">
      <div class="top">
        <span class="tf-label">FIG. 1 · {{ card.registry }}</span>
        <TinkerfundStateChips :status="card.status" :promoted="card.promoted" />
      </div>
      <TinkerfundFigure :svg="card.figure" />
    </div>
    <div class="body">
      <div>
        <h3><NuxtLink :to="link(card.path)">{{ card.title }}</NuxtLink></h3>
        <p class="by">{{ card.categoryName }} · {{ card.inventorName }}</p>
      </div>
      <TinkerfundProgressBar v-if="!upcoming" :percent="card.status.percent" />
      <dl class="tiles">
        <template v-if="upcoming">
          <div><dt>Goal</dt><dd>{{ money(card.goal) }}</dd></div>
          <div><dt>From</dt><dd>{{ card.priceFrom === undefined ? '—' : money(card.priceFrom) }}</dd></div>
        </template>
        <template v-else>
          <div><dt>Pledged</dt><dd>{{ money(card.pledged) }}</dd></div>
          <div><dt>Funded</dt><dd>{{ card.status.percent }}%</dd></div>
        </template>
        <div>
          <dt>{{ time.label }}</dt>
          <dd><TinkerfundTime :at="time.at" :text="time.text" /></dd>
        </div>
      </dl>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  transition: border-color var(--tf-dur) var(--tf-ease), transform var(--tf-dur) var(--tf-ease);
}
.card:hover { border-color: var(--tf-ink); transform: translateY(-2px); }
.card:focus-within { border-color: var(--tf-ink); }
.fig { display: grid; grid-template-rows: auto 1fr; gap: 4px; aspect-ratio: 16 / 10; padding: 8px 10px 10px; background: var(--tf-paper), var(--tf-bg); border-bottom: var(--tf-hairline); }
.top { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between; }
svg { display: block; width: 80%; height: 100%; min-height: 0; margin-inline: auto; }
.body { display: grid; gap: 10px; align-content: start; padding: 14px 16px 16px; }
h3 { margin: 0; font: 700 20px/1.1 var(--tf-font); font-stretch: 85%; overflow-wrap: anywhere; }
h3 a { color: var(--tf-ink); text-decoration: none; }
/* The whole card is the link's hit area. */
h3 a::after { content: ''; position: absolute; inset: 0; }
h3 a:focus-visible { outline: none; }
.card:has(h3 a:focus-visible) { outline: 2px solid var(--tf-link); outline-offset: 2px; }
.by { margin: 4px 0 0; color: var(--tf-muted); font-size: 14px; }
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: var(--tf-hairline);
  border-radius: var(--tf-radius);
  background: var(--tf-line);
}
.tiles div { display: grid; gap: 3px; padding: 8px 10px; background: var(--tf-surface); }
dt { font: 500 10px/1.2 var(--tf-mono); letter-spacing: 0.07em; text-transform: uppercase; color: var(--tf-muted); }
dd { margin: 0; font: 600 14px/1.2 var(--tf-mono); font-variant-numeric: tabular-nums; }
</style>
