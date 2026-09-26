<script setup lang="ts">
import type { TinkerfundCard, TinkerfundClock } from '../../composables/tinkerfund'

const props = defineProps<{ cards: TinkerfundCard[]; categories: { slug: string; name: string }[]; clock: TinkerfundClock }>()
const { link } = useTinkerfundSpace()
const locale = useTinkerfundLocale()
const money = useTinkerfundMoney()
const category = ref<string>()
const rows = computed(() => props.cards.filter((c) => !category.value || c.category === category.value))
const label = useId()
</script>

<template>
  <div class="index">
    <div class="toolbar">
      <slot />
      <div class="filter" role="group" aria-label="Category">
        <button type="button" :aria-pressed="!category" @click="category = undefined">All</button>
        <button
          v-for="c in categories"
          :key="c.slug"
          type="button"
          :aria-pressed="category === c.slug"
          @click="category = c.slug"
        >
          {{ c.name }}
        </button>
      </div>
    </div>
    <div class="scroll tf-panel" role="region" :aria-labelledby="label" tabindex="0">
      <table>
        <caption :id="label" class="tf-sr">Campaign index, most Backers first</caption>
        <thead>
          <tr>
            <th scope="col" class="wide">ID</th>
            <th scope="col">Invention</th>
            <th scope="col" class="wide">Category</th>
            <th scope="col" class="state">Status</th>
            <th scope="col">Funded</th>
            <th scope="col" class="r wide">Pledged</th>
            <th scope="col" class="r wide">Backers</th>
            <th scope="col" class="r">Remaining</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.path">
            <td class="wide">{{ c.registry }}</td>
            <th scope="row" class="inv">
              <TinkerfundFigure :svg="c.figure" />
              <NuxtLink :to="link(c.path)">{{ c.title }}</NuxtLink>
            </th>
            <td class="wide">{{ c.categoryName }}</td>
            <td class="state"><TinkerfundStateChips :status="c.status" :promoted="c.promoted" /></td>
            <td v-if="c.status.state === 'upcoming'">—</td>
            <td v-else class="funded"><TinkerfundProgressBar class="mini" :percent="c.status.percent" :segments="10" />{{ c.status.percent }}%</td>
            <td class="r wide">{{ c.status.state === 'upcoming' ? '—' : money(c.pledged) }}</td>
            <td class="r wide">{{ c.backers ? c.backers.toLocaleString(locale) : '—' }}</td>
            <td class="r"><TinkerfundTime :at="tinkerfundDeadline(c.status).at" :text="tinkerfundRemaining(c.status, clock.countdown)" /></td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="8" class="none">No Campaign in this category.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.filter { display: inline-flex; flex-wrap: wrap; overflow: hidden; border: var(--tf-hairline); border-radius: var(--tf-radius); background: var(--tf-surface); }
.filter button {
  padding: 8px 12px;
  border: 0;
  border-left: var(--tf-hairline);
  background: none;
  font: 500 12px/1 var(--tf-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color var(--tf-dur) var(--tf-ease);
}
.filter button:first-child { border-left: 0; }
.filter button[aria-pressed='true'] { background: var(--tf-ink); color: var(--tf-surface); }
.scroll { overflow-x: auto; box-shadow: var(--tf-shadow); }
table { width: 100%; min-width: 820px; border-collapse: collapse; font: 500 13px/1.3 var(--tf-mono); font-variant-numeric: tabular-nums; }
th, td { padding: 12px; border-bottom: var(--tf-hairline); text-align: left; vertical-align: middle; }
thead th { padding-block: 10px; color: var(--tf-muted); font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; }
tbody tr:last-child > * { border-bottom: 0; }
tbody tr { transition: background-color var(--tf-dur) var(--tf-ease); }
tbody tr:hover { background: var(--tf-accent-soft); }
.r { text-align: right; }
.inv { display: flex; gap: 10px; align-items: center; min-width: 220px; font: 700 16px/1.15 var(--tf-font); font-stretch: 85%; }
.inv svg { width: 48px; height: 36px; flex: none; }
.inv a { color: var(--tf-ink); text-decoration: none; }
.inv a:hover { text-decoration: underline; }
.funded { white-space: nowrap; }
.funded .mini { display: inline-grid; width: 70px; height: 10px; margin-right: 8px; vertical-align: middle; gap: 1px; }
.none { color: var(--tf-muted); text-align: center; }
/* Narrow screens keep the columns that tell Campaigns apart; the Campaign page has the rest. */
@media (max-width: 640px) {
  table { min-width: 0; }
  .wide, .inv svg, .funded .mini { display: none; }
  .state { width: 1%; }
  .inv { min-width: 0; font-size: 14px; }
  th, td { padding: 10px 6px; }
  thead th { letter-spacing: 0; }
}
</style>
