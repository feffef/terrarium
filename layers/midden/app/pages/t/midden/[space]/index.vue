<script setup lang="ts">
// The trench index (`/t/midden/trench`, issue #528): the landing Site's own
// prose, a static strata legend (#528), and the site directory. Mirrors
// layers/atlas/app/pages/t/atlas/[space]/index.vue's ROLE (Space landing).
//
// Isolation-respecting and presentation-only (ADR-0004): resolves the Space
// through the SAME shared, unit-tested `resolveSpaceRoute` (via the read-only
// `useSpace` composable), then reads only this Space's own keyed
// pages/artifacts through `useMiddenTrenchData` — the sibling `[...slug].vue`
// site entry needs the exact same load (that composable's own header).
//
// `touchedStrata` is derived HERE, per site, by de-duplicating
// `artifactsBySite`'s stratum list — the composable stays a raw grouping, and
// only this page's directory listing needs the per-site dedupe.
const route = useRoute()
const { space, pagesKey, collections } = useSpace('midden')
const { sites, artifactsBySite } = await useMiddenTrenchData(route.path, { pagesKey, collections })

const landing = computed(() => sites.value.find((p) => p.path === '/') ?? null)
const siteList = computed(() => sites.value.filter((p) => p.path !== '/'))

function siteSlug(sitePath: string): string {
  return sitePath.replace(/^\//, '')
}

function touchedStrata(sitePath: string): string[] {
  const artifacts = artifactsBySite.value.get(siteSlug(sitePath)) ?? []
  return [...new Set(artifacts.map((a) => a.stratum))]
}

function siteHref(sitePath: string): string {
  return `/t/midden/${space}${sitePath}`
}

useHead({ title: `${landing.value?.title ?? 'The Trench'} · The Midden` })
</script>

<template>
  <main class="midden" :class="`midden--${space}`">
    <div class="midden-page">
      <p class="midden-crumb">
        <NuxtLink to="/t/midden">The Midden</NuxtLink><span class="sep">·</span><span class="here">The Trench</span>
      </p>

      <header class="midden-trench-head">
        <p class="midden-eyebrow">Trench</p>
        <h1>{{ landing?.title ?? 'The Trench' }}</h1>
        <div v-if="landing" class="midden-trench-intro">
          <ContentRenderer :value="landing" />
        </div>
      </header>

      <section>
        <div class="midden-sechead"><span class="midden-eyebrow">Dig seasons</span></div>
        <MiddenStrataLegend />
      </section>

      <section>
        <div class="midden-sechead"><span class="midden-eyebrow">Sites</span></div>
        <ul v-if="siteList.length" class="midden-site-list">
          <li v-for="site in siteList" :key="site.path">
            <MiddenSiteCard
              :title="site.title ?? siteSlug(site.path)"
              :path="siteHref(site.path)"
              :touched-strata="touchedStrata(site.path)"
            />
          </li>
        </ul>
        <p v-else class="midden-empty">No sites catalogued yet.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.midden-trench-head {
  margin-bottom: 1.4rem;
}
.midden-trench-head h1 {
  font-family: var(--midden-display);
  font-size: clamp(2rem, 6vw, 3rem);
  line-height: 1.05;
  margin: 0.4rem 0 0;
  color: var(--midden-ink);
  text-wrap: balance;
}
.midden-trench-intro {
  margin-top: 1rem;
  max-width: 42rem;
  color: var(--midden-muted);
}

.midden-site-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.7rem;
}

.midden-empty {
  color: var(--midden-faint);
  font-style: italic;
}
</style>
