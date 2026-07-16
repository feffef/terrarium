<script setup lang="ts">
// The trench-index site row (#528; redesign handoff, direction 1d "Sites"): one
// dig report as a numbered row — index number, linked title + one-line blurb,
// and a tick-mark strip previewing which dig seasons the site's finds span, with
// the site's find count. Presentational only — the trench-index page computes
// `touchedStrata` (the dig-season slugs the site's embedded artifacts span),
// `blurb` (the site page's own `description` frontmatter), and `findsCount`.
//
// The tick strip is a passive PREVIEW, not a filter or a link: one tick per
// DIG_SEASONS entry, in the same oldest-to-newest scale for every row, lit only
// where this site actually has artifacts — comparable card to card because every
// row draws the same fixed scale.
const props = defineProps<{
  num: string
  title: string
  path: string
  blurb?: string
  touchedStrata: string[]
  findsCount: number
}>()

const touchedSet = computed(() => new Set(props.touchedStrata))
const touchedLabels = computed(() =>
  DIG_SEASONS.filter((season) => touchedSet.value.has(season.slug)).map((season) => season.label),
)
</script>

<template>
  <div class="midden-siterow">
    <span class="mono midden-siterow__num">{{ num }}</span>
    <div class="midden-siterow__body">
      <NuxtLink :to="path" class="midden-siterow__title">{{ title }}</NuxtLink>
      <p v-if="blurb" class="midden-siterow__blurb">{{ blurb }}</p>
    </div>
    <div class="midden-siterow__meta">
      <span
        class="midden-siterow__ticks"
        role="img"
        :aria-label="`seasons touched: ${touchedLabels.join(', ') || 'none'}`"
      >
        <span
          v-for="season in DIG_SEASONS"
          :key="season.slug"
          class="midden-siterow__tick"
          :class="{ 'midden-siterow__tick--on': touchedSet.has(season.slug) }"
          :title="season.label"
          aria-hidden="true"
        />
      </span>
      <span class="mono midden-siterow__finds">{{ findsCount }} finds</span>
    </div>
  </div>
</template>

<style scoped>
.midden-siterow {
  display: grid;
  grid-template-columns: 2.4rem 1fr auto;
  gap: 18px;
  align-items: baseline;
  padding: 15px 0;
  border-top: 1px solid var(--midden-line);
}

.midden-siterow__num {
  color: var(--midden-faint);
  font-size: 0.78rem;
}

.midden-siterow__title {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--midden-accent);
}
.midden-siterow__title:hover {
  color: var(--midden-accent-2);
}
.midden-siterow__blurb {
  margin: 4px 0 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--midden-muted);
}

.midden-siterow__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.midden-siterow__ticks {
  display: flex;
  gap: 4px;
}
.midden-siterow__tick {
  width: 11px;
  height: 11px;
  border: 1px solid var(--midden-rule);
  background: transparent;
}
.midden-siterow__tick--on {
  border-color: var(--midden-accent);
  background: var(--midden-accent);
}
.midden-siterow__finds {
  color: var(--midden-faint);
  font-size: 0.72rem;
}

@media (max-width: 34rem) {
  .midden-siterow {
    grid-template-columns: 2rem 1fr;
    gap: 6px 12px;
  }
  .midden-siterow__meta {
    grid-column: 2 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
