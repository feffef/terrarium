<script setup lang="ts">
// The Midden's ONE landing, shown at both `/t/midden` and `/t/midden/trench`
// (owner-directed post-MVP flattening, layers/midden/CONTEXT.md): a tight
// curator's foreword, the six-grade condition legend shown once, and the plain
// list of dig reports. The former front door and trench index were
// near-duplicates; both page files now render this component — mirrored, not
// redirected.
//
// Purely presentational (ADR-0004): resolves the trench Space through the SAME
// shared, unit-tested `resolveSpaceRoute` the catch-all uses — called directly
// (not via `useSpace`) because `/t/midden` has no `space` route param. The
// foreword prose and pull-quote are verbatim authored copy from the
// Claude-Design session — not placeholder.
import { resolveSpaceRoute } from '#shared/routing'
import { CONDITION_GRADES } from '../../utils/condition'

interface SiteRow {
  path: string
  title?: string
  description?: string
}

const { data } = await useAsyncData('midden-landing', async () => {
  const r = resolveSpaceRoute('midden', 'trench', undefined)
  if (!r) return { sites: [] as SiteRow[], counts: {} as Record<string, number> }
  const pages = (await queryCollection(r.pagesKey).all()) as SiteRow[]
  const artifactDocs = (await queryCollection(r.collections.artifacts).all()) as { site: string }[]
  const counts: Record<string, number> = {}
  for (const a of artifactDocs) counts[a.site] = (counts[a.site] ?? 0) + 1
  // The '/' page is the retired trench-index landing text, not a dig report.
  return { sites: pages.filter((p) => p.path !== '/'), counts }
})

const sites = computed(() => data.value?.sites ?? [])

function siteSlug(sitePath: string): string {
  return sitePath.replace(/^\//, '')
}
function findsCount(sitePath: string): number {
  return data.value?.counts[siteSlug(sitePath)] ?? 0
}
function siteNum(index: number): string {
  return String(index + 1).padStart(2, '0')
}

useHead({ title: 'The Midden' })
</script>

<template>
  <main class="midden">
    <div class="midden-page midden-landing">
      <p class="tech midden-crumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">/</span><span class="here">the midden</span>
      </p>

      <p class="sc midden-eyebrow">An excavation catalogue</p>
      <h1 class="doctitle midden-landing__title">The Midden</h1>

      <p class="midden-landing__lede">
        Every other quarter of this place shows the platform building. The Midden
        shows what it set down and walked away from — dead branches, pull requests
        closed unmerged, dependencies carried and never called, whole files retired
        the day the build outgrew them.
      </p>
      <p class="midden-landing__lede">
        Nothing is here by accident, and nothing is here in apology. A thing earns
        a place only once it is unambiguously over: not paused, not renamed, not
        merged elsewhere under a new name. We date it, we grade it for condition,
        and where anything survives to quote, we quote it.
      </p>

      <p class="sc midden-landing__pull">&ldquo;You catalogue a corpse only where nothing living grew back.&rdquo;</p>

      <section>
        <div class="midden-sechead">
          <span class="hand midden-sechead__title">How finds are graded</span>
          <span class="midden-sechead__rule" />
          <span class="hand midden-sechead__aside">curator-graded, never computed</span>
        </div>
        <dl class="midden-legend">
          <div v-for="c in CONDITION_GRADES" :key="c.grade" class="midden-legend__row">
            <dt class="sc midden-legend__grade">{{ c.label }}</dt>
            <dd class="midden-legend__def">{{ c.definition }}</dd>
          </div>
        </dl>
      </section>

      <section>
        <div class="midden-sechead">
          <span class="hand midden-sechead__title">Dig reports</span>
          <span class="midden-sechead__rule" />
          <span class="mono midden-sechead__aside">{{ sites.length }} sites</span>
        </div>
        <ol v-if="sites.length" class="midden-sites">
          <li v-for="(site, i) in sites" :key="site.path" class="midden-sites__row">
            <span class="mono midden-sites__num">{{ siteNum(i) }}</span>
            <div class="midden-sites__body">
              <NuxtLink :to="`/t/midden/trench${site.path}`" class="midden-sites__link">{{ site.title ?? siteSlug(site.path) }}</NuxtLink>
              <p v-if="site.description" class="midden-sites__blurb">{{ site.description }}</p>
            </div>
            <span class="mono midden-sites__finds">{{ findsCount(site.path) }} finds</span>
          </li>
        </ol>
        <p v-else class="midden-sites__empty">No sites catalogued yet.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.midden-landing {
  max-width: 44rem;
  padding-top: 3.5rem;
}

.midden-landing__title {
  margin: 0.5rem 0 0;
  font-size: clamp(3rem, 11vw, 4.25rem);
  line-height: 0.95;
  color: var(--midden-ink);
}

.midden-landing__lede {
  margin: 1.5rem 0 0;
  font-size: 1.02rem;
  line-height: 1.64;
  max-width: 58ch;
  color: var(--midden-ink);
}

.midden-landing__pull {
  margin: 1.4rem 0 0.4rem;
  font-size: 0.94rem;
  letter-spacing: 0.04em;
  font-weight: 500;
  color: var(--midden-accent-2);
}

.midden-legend {
  margin: 0;
}
.midden-legend__row {
  display: grid;
  grid-template-columns: 9.5rem 1fr;
  gap: 4px 18px;
  align-items: baseline;
  padding: 6px 0;
}
.midden-legend__grade {
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  color: var(--midden-ink);
}
.midden-legend__def {
  margin: 0;
  font-family: var(--midden-hand);
  font-style: italic;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--midden-muted);
}

.midden-sites {
  list-style: none;
  margin: 0;
  padding: 0;
}
.midden-sites__row {
  display: grid;
  grid-template-columns: 2.2rem 1fr auto;
  gap: 16px;
  align-items: baseline;
  padding: 14px 0;
  border-top: 1px solid var(--midden-line);
}
.midden-sites__num {
  color: var(--midden-faint);
  font-size: 0.78rem;
}
.midden-sites__link {
  font-family: var(--midden-hand);
  font-size: 1.3rem;
  line-height: 1.25;
  font-weight: 500;
  color: var(--midden-accent);
}
.midden-sites__link:hover {
  color: var(--midden-accent-2);
}
.midden-sites__blurb {
  margin: 4px 0 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--midden-muted);
}
.midden-sites__finds {
  color: var(--midden-faint);
  font-size: 0.72rem;
}
.midden-sites__empty {
  color: var(--midden-faint);
  font-style: italic;
}

@media (max-width: 34rem) {
  .midden-legend__row {
    grid-template-columns: 1fr;
    gap: 1px;
    padding: 8px 0;
  }
  .midden-sites__row {
    grid-template-columns: 1.8rem 1fr;
    gap: 4px 12px;
  }
  .midden-sites__finds {
    grid-column: 2;
  }
}
</style>
