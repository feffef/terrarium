<script setup lang="ts">
// qa's front page (issue #1375): each component in its states, against qa's
// edge-case fixtures. Later stories add a section per component they build.
defineProps<{ title: string; description?: string }>()

const { space, pagesKey } = useSpace('tinkerfund')
const { now, ticking } = await useTinkerfundClock()
const { data: docs } = await useAsyncData(`tinkerfund-gallery-${space}`, () =>
  queryCollection(pagesKey).where('campaign', 'IS NOT NULL').all(),
)

const campaigns = computed(() =>
  (docs.value ?? [])
    .flatMap((doc) => (doc.campaign ? [{ ...doc, campaign: doc.campaign }] : []))
    .sort((a, b) => a.campaign.registry.localeCompare(b.campaign.registry)),
)
const pinned = computed(() => new Date(now.value).toISOString())
</script>

<template>
  <div class="gallery">
    <header class="intro">
      <p class="tf-label">Tinkerfund · {{ space }} · now pinned at <time :datetime="pinned">{{ pinned.slice(0, 16).replace('T', ' ') }} UTC</time></p>
      <h1>{{ title }}</h1>
      <p class="lead">{{ description }}</p>
    </header>

    <section aria-labelledby="gallery-status">
      <h2 id="gallery-status">Campaign status <code>TinkerfundCampaignStatus</code></h2>
      <ul class="specimens">
        <li v-for="doc in campaigns" :key="doc.path" class="specimen tf-panel">
          <p class="case">{{ doc.description }}</p>
          <h3><NuxtLink :to="tinkerfundPath(space, doc.path)">{{ doc.title }}</NuxtLink></h3>
          <TinkerfundCampaignStatus :campaign="doc.campaign" :now="now" :ticking="ticking" />
        </li>
      </ul>
    </section>

    <section aria-labelledby="gallery-frame">
      <h2 id="gallery-frame">Page frame</h2>
      <p class="case">
        <code>TinkerfundShell</code> frames this page: the demo bar with <code>TinkerfundResetDemo</code>,
        <code>TinkerfundHeader</code> with <code>TinkerfundWordmark</code> and <code>TinkerfundSearchField</code>,
        and <code>TinkerfundFooter</code> with <code>TinkerfundThemeSwitch</code>. Narrow the window for the menu
        dialog; switch the theme to see every specimen in Light and Dark.
      </p>
    </section>
  </div>
</template>

<style scoped>
.gallery { display: grid; gap: 36px; }
.intro { display: grid; gap: 10px; }
.intro > * { margin: 0; }
h1 { font: 800 clamp(30px, 4vw, 42px)/1.05 var(--tf-font); font-stretch: 78%; }
.lead { color: var(--tf-muted); }
h2 { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; margin: 0 0 14px; font-size: 22px; }
code { font: 500 13px/1.4 var(--tf-mono); overflow-wrap: anywhere; }
h2 code { color: var(--tf-muted); }
.specimens {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.specimen { display: grid; gap: 8px; align-content: start; padding: 16px; }
.specimen > * { margin: 0; }
h3 { font-size: 18px; line-height: 1.25; overflow-wrap: anywhere; }
.case { max-width: 68ch; margin: 0; color: var(--tf-muted); font-size: 14px; }
</style>
