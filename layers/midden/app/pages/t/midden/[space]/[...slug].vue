<script setup lang="ts">
// The site (dig-report) entry (`/t/midden/trench/<site>`, issue #515).
// Flattened visitor experience (post-MVP simplification, layers/midden/
// CONTEXT.md): the curator's prose in a single quiet reading column, with
// inline `::midden-artifact` embeds rendering each find open by default. The
// sticky scroll-synced stratigraphy gauge and its grid/margin column are gone
// — a dig report is now just land → read.
//
// Isolation-respecting and presentation-only (ADR-0004): resolves through the
// SAME shared, unit-tested `resolveSpaceRoute` (via `useSpace`).
const route = useRoute()
const { space, path, pagesKey, collections } = useSpace('midden')

const { data } = await useAsyncData(route.path, async () => {
  const pages = await queryCollection(pagesKey).all()
  const foundSite = pages.find((p) => p.path === path) ?? null
  if (!foundSite) return { site: null, artifacts: [] as Array<{ stratum: string; assessedAt: string }> }

  const slug = path.replace(/^\//, '')
  const artifactDocs = await queryCollection(collections.artifacts).where('site', '=', slug).all()
  return {
    site: foundSite,
    artifacts: artifactDocs.map((a) => ({ stratum: a.stratum, assessedAt: a.assessedAt })),
  }
})

const site = computed(() => data.value?.site ?? null)
const siteSlug = computed(() => path.replace(/^\//, ''))
const siteArtifacts = computed(() => data.value?.artifacts ?? [])

// Compact dig-report meta line: which season(s) it spans, the find count, and
// the assessed-date span — all derived from the REAL artifact data.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

const touchedSeasons = computed(() =>
  DIG_SEASONS.filter((s) => new Set(siteArtifacts.value.map((a) => a.stratum)).has(s.slug)),
)
const seasonSummary = computed(() => {
  const t = touchedSeasons.value
  return t.length === 1 ? t[0]!.label : `${t.length} seasons`
})
const assessedSpan = computed(() => {
  const dates = siteArtifacts.value.map((a) => a.assessedAt).sort()
  if (dates.length === 0) return ''
  const lo = formatDate(dates[0]!)
  const hi = formatDate(dates[dates.length - 1]!)
  return lo === hi ? lo : `${lo} – ${hi}`
})

useHead({ title: () => `${site.value?.title ?? 'Not found'} · The Midden` })
</script>

<template>
  <main class="midden" :class="`midden--${space}`">
    <article v-if="site" class="midden-page midden-report">
      <p class="tech midden-crumb">
        <NuxtLink to="/t/midden">the midden</NuxtLink><span class="sep">/</span><NuxtLink :to="`/t/midden/${space}`">trench</NuxtLink><span class="sep">/</span><span class="here">{{ siteSlug }}</span>
      </p>

      <p class="sc midden-eyebrow">Dig report</p>
      <h1 class="doctitle midden-report__title">{{ site.title }}</h1>
      <p v-if="site.description" class="midden-report__dek">{{ site.description }}</p>

      <div v-if="siteArtifacts.length" class="tech midden-report__meta">
        <span>{{ seasonSummary }}</span><span class="midden-report__dot">·</span>
        <span>{{ siteArtifacts.length }} finds</span><span class="midden-report__dot">·</span>
        <span>assessed {{ assessedSpan }}</span>
      </div>

      <div class="midden-report__prose">
        <ContentRenderer :value="site" />
      </div>
    </article>

    <div v-else class="midden-page">
      <p class="tech midden-crumb">
        <NuxtLink to="/t/midden">the midden</NuxtLink><span class="sep">/</span><NuxtLink :to="`/t/midden/${space}`">trench</NuxtLink>
      </p>
      <div class="midden-not-found">
        <h1 class="doctitle">Not catalogued</h1>
        <p>No site answers to <code>{{ path }}</code> in the trench. Perhaps it was never dug; perhaps it is simply elsewhere.</p>
        <p><NuxtLink :to="`/t/midden/${space}`">Back to the trench</NuxtLink></p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.midden-report {
  max-width: 44rem;
}

.midden-report__title {
  margin: 0.35rem 0 0;
  font-size: clamp(2.4rem, 7vw, 3.2rem);
  line-height: 1.05;
  color: var(--midden-ink);
}

.midden-report__dek {
  margin: 0.6rem 0 0;
  font-style: italic;
  font-size: 1.2rem;
  line-height: 1.4;
  color: var(--midden-muted);
}

.midden-report__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin: 1rem 0 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--midden-rule);
  color: var(--midden-faint);
}
.midden-report__dot { opacity: 0.55; }

.midden-report__prose {
  margin-top: 0.5rem;
  color: var(--midden-ink);
}
.midden-report__prose :deep(p) {
  font-size: 1.02rem;
  line-height: 1.66;
  margin: 1.1rem 0 0;
}
.midden-report__prose :deep(em) { font-style: italic; }
.midden-report__prose :deep(code) {
  font-family: var(--midden-mono);
  font-size: 0.88em;
  background: var(--midden-accent-soft);
  padding: 0.05em 0.35em;
  border-radius: 2px;
}

.midden-not-found h1 {
  font-size: 2.2rem;
  margin: 0 0 0.6rem;
}
</style>
