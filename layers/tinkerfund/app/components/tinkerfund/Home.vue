<script setup lang="ts">
const { clock, cards, categories, promotions } = await useTinkerfundCatalog()
const home = computed(() => tinkerfundHomeSections(cards.value, clock.value.now))
const deal = computed(() => groupTinkerfundPromotions(promotions.value, clock.value.now).active[0])
const tiles = computed(() =>
  categories.value.map((c) => ({ ...c, count: cards.value.filter((card) => card.category === c.slug).length })),
)
const { link } = useTinkerfundSpace()
const locale = useTinkerfundLocale()
const money = useTinkerfundMoney()
</script>

<template>
  <div class="home">
    <section v-if="home.featured" class="hero tf-panel" aria-labelledby="tf-featured">
      <div class="fig">
        <span class="tf-label">FIG. 1 · {{ home.featured.registry }}</span>
        <TinkerfundFigure :svg="home.featured.figure" />
      </div>
      <div class="read">
        <p class="row"><span class="id">{{ home.featured.registry }}</span><TinkerfundStateChips :status="home.featured.status" :promoted="home.featured.promoted" /></p>
        <p class="tf-label">Featured · {{ home.featured.categoryName }} · {{ home.featured.inventorName }}</p>
        <h2 id="tf-featured" class="tf-h1">{{ home.featured.title }}</h2>
        <p class="tag">{{ home.featured.description }}</p>
        <p class="big">{{ home.featured.status.percent }}<small>% funded</small></p>
        <TinkerfundProgressBar :percent="home.featured.status.percent" :segments="25" />
        <dl class="tiles">
          <div><dt>Pledged</dt><dd>{{ money(home.featured.pledged) }}</dd></div>
          <div><dt>Goal</dt><dd>{{ money(home.featured.goal) }}</dd></div>
          <div><dt>Backers</dt><dd>{{ home.featured.backers.toLocaleString(locale) }}</dd></div>
          <div>
            <dt>Remaining</dt>
            <dd><TinkerfundTime :at="tinkerfundDeadline(home.featured.status).at" :text="tinkerfundRemaining(home.featured.status, clock.countdown)" /></dd>
          </div>
        </dl>
        <p class="actions">
          <NuxtLink class="tf-btn primary" :to="link(home.featured.path)">View Campaign</NuxtLink>
          <NuxtLink class="tf-btn" :to="link('/discover')">Discover all</NuxtLink>
        </p>
      </div>
    </section>

    <section v-if="home.endingSoon.length" aria-labelledby="tf-ending">
      <div class="head">
        <h2 id="tf-ending">Ending soon</h2>
        <NuxtLink :to="link('/discover?soon=1&sort=ending')">See all</NuxtLink>
      </div>
      <ul class="scroller">
        <li v-for="c in home.endingSoon" :key="c.path"><TinkerfundCampaignCard :card="c" :clock="clock" /></li>
      </ul>
    </section>

    <TinkerfundDealBanner v-if="deal" :promotion="deal" :clock="clock" :more="link('/deals')" />

    <section v-if="tiles.length" aria-labelledby="tf-categories-h">
      <div class="head"><h2 id="tf-categories-h">Browse by category</h2></div>
      <ul class="cats">
        <li v-for="c in tiles" :key="c.slug">
          <NuxtLink class="cat tf-panel" :to="link(`/category/${c.slug}`)">
            <!-- eslint-disable-next-line vue/no-v-html -- validated, token-coloured content SVG (issue #1363) -->
            <svg viewBox="0 0 24 24" aria-hidden="true" v-html="c.icon" />
            <b>{{ c.name }}</b>
            <span class="blurb">{{ c.blurb }}</span>
            <span class="tf-label">{{ tinkerfundCount(c.count, 'Campaign') }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="home.popular.length" aria-labelledby="tf-popular">
      <TinkerfundIndexTable :cards="home.popular" :categories="categories" :clock="clock">
        <h2 id="tf-popular">Popular now</h2>
      </TinkerfundIndexTable>
    </section>

    <section v-if="home.justLaunched.length" aria-labelledby="tf-launched">
      <div class="head">
        <h2 id="tf-launched">Just launched</h2>
        <NuxtLink :to="link('/discover?state=live&sort=newest')">See all</NuxtLink>
      </div>
      <ul class="grid">
        <li v-for="c in home.justLaunched" :key="c.path"><TinkerfundCampaignCard :card="c" :clock="clock" /></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home { display: grid; grid-template-columns: minmax(0, 1fr); gap: 44px; }
h2 { margin: 0; font: 800 24px/1.1 var(--tf-font); font-stretch: 80%; }
.head { display: flex; gap: 12px; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
.head a { font: 500 13px/1 var(--tf-mono); }

.hero { display: grid; overflow: hidden; box-shadow: var(--tf-shadow); }
@media (min-width: 860px) { .hero { grid-template-columns: 1.15fr 1fr; } }
.fig { position: relative; padding: 44px 36px 28px; background: var(--tf-paper), var(--tf-surface); border-bottom: var(--tf-hairline); }
@media (min-width: 860px) { .fig { border-bottom: 0; border-right: var(--tf-hairline); } }
.fig .tf-label { position: absolute; left: 12px; top: 10px; }
.fig svg { display: block; width: 100%; max-height: 340px; }
.read { display: grid; gap: 14px; align-content: start; padding: 22px; }
.read > * { margin: 0; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.id { padding: 4px 8px; border-radius: 5px; background: var(--tf-accent); color: var(--tf-accent-ink); font: 600 13px/1 var(--tf-mono); }
.tag { color: var(--tf-muted); }
.big { font: 600 clamp(40px, 5vw, 56px)/1 var(--tf-mono); letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.big small { margin-left: 2px; color: var(--tf-muted); font-size: 0.5em; letter-spacing: 0; }
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: var(--tf-hairline);
  border-radius: var(--tf-radius);
  background: var(--tf-line);
}
.tiles div { display: grid; gap: 3px; padding: 10px 12px; background: var(--tf-surface); }
dt { font: 500 10px/1.2 var(--tf-mono); letter-spacing: 0.07em; text-transform: uppercase; color: var(--tf-muted); }
dd { margin: 0; font: 600 16px/1.2 var(--tf-mono); font-variant-numeric: tabular-nums; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }

ul { margin: 0; padding: 0; list-style: none; }
.scroller { display: grid; grid-auto-flow: column; grid-auto-columns: min(300px, 82vw); gap: 16px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x mandatory; }
.scroller li, .grid li { display: grid; scroll-snap-align: start; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
.cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 14px; }
.cat {
  display: grid;
  gap: 6px;
  height: 100%;
  box-sizing: border-box;
  padding: 18px;
  color: var(--tf-ink);
  text-decoration: none;
  transition: border-color var(--tf-dur) var(--tf-ease);
}
.cat:hover { border-color: var(--tf-ink); }
.cat svg { width: 28px; height: 28px; fill: none; stroke: var(--tf-accent); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.cat b { font: 800 22px/1.1 var(--tf-font); font-stretch: 82%; }
.blurb { color: var(--tf-muted); font-size: 14px; }
</style>
