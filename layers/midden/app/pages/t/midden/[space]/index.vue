<script setup lang="ts">
// The trench index (`/t/midden/trench`, issue #528; redesign handoff, direction
// 1d "Trench index"): the landing Site's own prose, then three ruled sections —
// the dig seasons as proportional bars, the condition ladder, and the numbered
// site directory. Mirrors the Atlas Space-landing ROLE.
//
// Isolation-respecting and presentation-only (ADR-0004): resolves the Space
// through the SAME shared, unit-tested `resolveSpaceRoute` (via `useSpace`),
// then reads only this Space's own keyed pages/artifacts through
// `useMiddenTrenchData` — the sibling `[...slug].vue` site entry needs the exact
// same load. The per-season tally and each site's touched-strata/finds-count are
// derived HERE from that one load.
const route = useRoute()
const { space, pagesKey, collections } = useSpace('midden')
const { sites, artifacts, artifactsBySite } = await useMiddenTrenchData(route.path, { pagesKey, collections })

const landing = computed(() => sites.value.find((p) => p.path === '/') ?? null)
const siteList = computed(() => sites.value.filter((p) => p.path !== '/'))

// Per-dig-season find counts, driving the proportional bars (StrataLegend).
const seasonCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const a of artifacts.value) counts[a.stratum] = (counts[a.stratum] ?? 0) + 1
  return counts
})

function siteSlug(sitePath: string): string {
  return sitePath.replace(/^\//, '')
}
function siteArtifacts(sitePath: string) {
  return artifactsBySite.value.get(siteSlug(sitePath)) ?? []
}
function touchedStrata(sitePath: string): string[] {
  return [...new Set(siteArtifacts(sitePath).map((a) => a.stratum))]
}
function siteHref(sitePath: string): string {
  return `/t/midden/${space}${sitePath}`
}
function siteNum(index: number): string {
  return String(index + 1).padStart(2, '0')
}

useHead({ title: `${landing.value?.title ?? 'The Trench'} · The Midden` })
</script>

<template>
  <main class="midden" :class="`midden--${space}`">
    <div class="midden-page">
      <p class="tech midden-crumb">
        <NuxtLink to="/t/midden">the midden</NuxtLink><span class="sep">/</span><span class="here">trench</span>
      </p>

      <header class="midden-trench-head">
        <p class="sc midden-eyebrow">The trench</p>
        <h1 class="doctitle midden-trench-head__title">{{ landing?.title ?? 'The Trench' }}</h1>
        <div v-if="landing" class="midden-trench-intro">
          <ContentRenderer :value="landing" />
        </div>
      </header>

      <section>
        <div class="midden-sechead">
          <span class="hand midden-sechead__title">Dig seasons</span>
          <span class="midden-sechead__rule" />
          <span class="hand midden-sechead__aside">newest at the surface</span>
        </div>
        <MiddenStrataLegend :counts="seasonCounts" />
      </section>

      <section>
        <div class="midden-sechead">
          <span class="hand midden-sechead__title">The condition ladder</span>
          <span class="midden-sechead__rule" />
          <span class="hand midden-sechead__aside">curator-graded, never computed</span>
        </div>
        <MiddenGradeLegend />
      </section>

      <section>
        <div class="midden-sechead">
          <span class="hand midden-sechead__title">Sites</span>
          <span class="midden-sechead__rule" />
          <span class="mono midden-sechead__aside">{{ siteList.length }} dig reports</span>
        </div>
        <div v-if="siteList.length" class="midden-site-list">
          <MiddenSiteCard
            v-for="(site, i) in siteList"
            :key="site.path"
            :num="siteNum(i)"
            :title="site.title ?? siteSlug(site.path)"
            :path="siteHref(site.path)"
            :blurb="site.description"
            :touched-strata="touchedStrata(site.path)"
            :finds-count="siteArtifacts(site.path).length"
          />
        </div>
        <p v-else class="midden-empty">No sites catalogued yet.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.midden-trench-head {
  margin-bottom: 1.4rem;
}
.midden-trench-head__title {
  font-size: clamp(2.4rem, 8vw, 3.4rem);
  line-height: 1.02;
  margin: 0.4rem 0 0;
  color: var(--midden-ink);
}
.midden-trench-intro {
  margin-top: 1rem;
  max-width: 60ch;
  color: var(--midden-muted);
}

.midden-site-list {
  display: flex;
  flex-direction: column;
}

.midden-empty {
  color: var(--midden-faint);
  font-style: italic;
}
</style>
