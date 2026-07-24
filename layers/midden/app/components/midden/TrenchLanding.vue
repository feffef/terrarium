<script setup lang="ts">
// The Midden's ONE landing (flattened visitor experience, issue #515 redesign
// handoff superseded by an owner-directed post-MVP simplification — see
// layers/midden/CONTEXT.md): rendered identically at the Tenant-root front door
// (`/t/midden`) and at the Space entry (`/t/midden/trench`) — a mirror, not a
// redirect, so a visitor lands in the same place either way. Land → read: a
// tight foreword, the six-grade condition legend shown ONCE, then a plain list
// of dig reports. No stats row, no proportional season bars, no per-site tick
// strips.
//
// The foreword prose and the pull-quote are the verbatim authored copy carried
// over from the pre-simplification front door (not placeholder).
//
// Purely presentational (ADR-0004): resolves the trench Space through the SAME
// shared, unit-tested `resolveSpaceRoute` the catch-all uses. Hardcodes the
// 'trench' Space slug (v1's only Space) rather than reading it from the route,
// because this component is mounted from BOTH a Space-scoped route and the
// Tenant-root route, which has no `space` route param for `useSpace()` to read.
import { resolveSpaceRoute, documentUrl } from '#shared/routing'

const { data } = await useAsyncData('midden-landing-sites', async () => {
  const r = resolveSpaceRoute('midden', 'trench', undefined)
  if (!r) return { sites: [], findCounts: {} as Record<string, number> }
  const [pages, artifactDocs] = await Promise.all([
    queryCollection(r.pagesKey).all(),
    queryCollection(r.collections.artifacts).all(),
  ])
  // The landing's own content doc (path '/') narrates the trench itself, not a
  // dig report — excluded from the list the same way the pre-simplification
  // trench index excluded it.
  const sites = pages.filter((p) => p.path !== '/')
  const findCounts: Record<string, number> = {}
  for (const a of artifactDocs) findCounts[a.site] = (findCounts[a.site] ?? 0) + 1
  return { sites, findCounts }
})

const sites = computed(() => data.value?.sites ?? [])

function siteHref(path: string): string {
  return documentUrl('midden', 'trench', path)
}
function siteFindCount(path: string): number {
  return data.value?.findCounts[path.replace(/^\//, '')] ?? 0
}

useHead({ title: 'The Midden' })
</script>

<template>
  <main class="midden">
    <div class="midden-page midden-landing">
      <p class="tech midden-crumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">/</span><span class="here">the midden</span>
      </p>

      <p class="sc midden-landing__eyebrow">An excavation catalogue</p>
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

      <section class="midden-landing__section">
        <div class="midden-sechead">
          <span class="hand midden-sechead__title">Condition</span>
          <span class="midden-sechead__rule" />
          <span class="hand midden-sechead__aside">curator-graded, never computed</span>
        </div>
        <MiddenGradeLegend />
      </section>

      <section class="midden-landing__section">
        <div class="midden-sechead">
          <span class="hand midden-sechead__title">Dig reports</span>
          <span class="midden-sechead__rule" />
          <span class="mono midden-sechead__aside">{{ sites.length }} sites</span>
        </div>
        <ol v-if="sites.length" class="midden-landing__sites">
          <li v-for="site in sites" :key="site.path" class="midden-landing__site">
            <div class="midden-landing__site-head">
              <NuxtLink :to="siteHref(site.path)" class="midden-landing__site-title">{{ site.title }}</NuxtLink>
              <span class="mono midden-landing__site-count">{{ siteFindCount(site.path) }} finds</span>
            </div>
            <p v-if="site.description" class="midden-landing__site-blurb">{{ site.description }}</p>
          </li>
        </ol>
        <p v-else class="midden-empty">No sites catalogued yet.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.midden-landing {
  max-width: 44rem;
  padding-top: 3.5rem;
}

.midden-landing__eyebrow {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--midden-accent);
}
.midden-landing__title {
  margin: 0.5rem 0 0;
  font-size: clamp(3.2rem, 11vw, 4.5rem);
  line-height: 0.95;
  color: var(--midden-ink);
}

.midden-landing__lede {
  margin: 1.4rem 0 0;
  font-size: 1.05rem;
  line-height: 1.62;
  max-width: 56ch;
  color: var(--midden-ink);
}

.midden-landing__pull {
  margin: 1.3rem 0 0;
  font-size: 1.02rem;
  letter-spacing: 0.03em;
  font-weight: 500;
  color: var(--midden-accent-2);
}

.midden-landing__section {
  margin-top: 0.4rem;
}

.midden-landing__sites {
  list-style: none;
  margin: 0;
  padding: 0;
}
.midden-landing__site {
  padding: 16px 0;
  border-top: 1px solid var(--midden-line);
}
.midden-landing__site-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}
.midden-landing__site-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--midden-accent);
}
.midden-landing__site-title:hover {
  color: var(--midden-accent-2);
}
.midden-landing__site-count {
  flex: none;
  font-size: 0.72rem;
  color: var(--midden-faint);
  white-space: nowrap;
}
.midden-landing__site-blurb {
  margin: 5px 0 0;
  font-size: 0.92rem;
  line-height: 1.5;
  max-width: 56ch;
  color: var(--midden-muted);
}

.midden-empty {
  color: var(--midden-faint);
  font-style: italic;
}
</style>
