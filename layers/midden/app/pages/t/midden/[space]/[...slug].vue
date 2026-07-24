<script setup lang="ts">
// The site (dig-report) entry (`/t/midden/trench/<site>`). Post-MVP simplification
// (owner-directed, this branch): the scroll-synced stratigraphy gauge is gone —
// the curator's prose with inline `::midden-artifact` embeds (each an open, flat
// find; see MiddenArtifact.vue) is the page. `land → read`. The margin the gauge
// occupied now holds the CONDITION KEY (owner-directed, final merged design): a
// slim, static, `position: sticky` sidebar defining only the grades present in
// THIS report's finds (MiddenConditionKey.vue) — the legend re-homed from the
// landing to where its words actually appear. On narrow viewports the key drops
// above the prose as a short strip instead of overlapping it.
//
// Isolation-respecting and presentation-only (ADR-0004): resolves through the SAME
// shared, unit-tested `resolveSpaceRoute` (via `useSpace`), then reads only this
// Space's own keyed pages/artifacts. The former `useMiddenTrenchData` composable
// was folded away in the simplification — the page's derived data (the compact
// meta line, the present-grade list) is computed straight from this same-Space load.
import { CONDITION_ORDER, type Grade } from '../../../../utils/condition'

const route = useRoute()
const { space, path, pagesKey, collections } = useSpace('midden')
const siteSlug = computed(() => path.replace(/^\//, ''))

const { data } = await useAsyncData(route.path, async () => {
  const pages = await queryCollection(pagesKey).all()
  const site = pages.find((p) => p.path === path) ?? null
  // Only this site's own finds are needed — for the compact meta line below.
  const artifacts = await queryCollection(collections.artifacts).where('site', '=', siteSlug.value).all()
  return { site, artifacts }
})

const site = computed(() => data.value?.site ?? null)
const siteArtifacts = computed(() => data.value?.artifacts ?? [])

// Compact dig-report meta line: which season(s) it spans, the find count, and the
// assessed-date span — all derived from the REAL artifact data.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

const touchedSeasons = computed(() => {
  const strata = new Set(siteArtifacts.value.map((a) => a.stratum))
  return DIG_SEASONS.filter((s) => strata.has(s.slug))
})
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

// The grades present in THIS report's finds, in the canonical decay-then-
// orthogonal order (#523) — the condition key defines only these.
const presentGrades = computed<Grade[]>(() => {
  const present = new Set(siteArtifacts.value.map((a) => a.condition))
  return CONDITION_ORDER.filter((g) => present.has(g))
})

useHead({ title: () => `${site.value?.title ?? 'Not found'} · The Midden` })
</script>

<template>
  <main class="midden" :class="`midden--${space}`">
    <article v-if="site" class="midden-page midden-report">
      <header class="midden-report__head">
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
      </header>

      <MiddenConditionKey v-if="presentGrades.length" :grades="presentGrades" class="midden-report__key" />

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
/* Two columns: the reading column plus the slim sticky condition key in the
   margin the old scroll-gauge occupied. The key's row starts BELOW the masthead
   so it aligns with the first prose, and `position: sticky` keeps it in view
   down the finds. Below 44rem the grid collapses and the key becomes a short
   strip above the prose — it never overlaps the text. */
.midden-report {
  display: grid;
  grid-template-columns: minmax(0, 44rem) 13.5rem;
  grid-template-rows: auto auto;
  column-gap: 3.4rem;
  justify-content: center;
  max-width: 64rem;
  padding-top: 2.4rem;
}
.midden-report__head { grid-column: 1; }
.midden-report__key {
  grid-column: 2;
  grid-row: 2;
  align-self: start;
  position: sticky;
  top: 2.2rem;
  margin-top: 2.8rem;
}
.midden-report__prose { grid-column: 1; grid-row: 2; }

@media (max-width: 44rem) {
  .midden-report { display: block; }
  .midden-report__key {
    position: static;
    margin: 2rem 0 0;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--midden-rule);
  }
}

.midden-report__title {
  margin: 0.35rem 0 0;
  font-size: clamp(2.4rem, 7vw, 3.2rem);
  line-height: 1.05;
  color: var(--midden-ink);
}

.midden-report__dek {
  margin: 0.7rem 0 0;
  font-family: var(--midden-serif);
  font-style: italic;
  font-size: 1.22rem;
  line-height: 1.45;
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

/* The report body is the curator speaking — the serif register; ids, dates and
   provenance inside the finds stay mono (theme.css's two-register split). */
.midden-report__prose {
  margin-top: 0.7rem;
  color: var(--midden-ink);
}
.midden-report__prose :deep(p) {
  font-family: var(--midden-serif);
  font-size: 1.07rem;
  line-height: 1.72;
  margin: 1.25rem 0 0;
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
