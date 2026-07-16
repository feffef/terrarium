<script setup lang="ts">
// The site (dig-report) entry (`/t/midden/trench/<site>`, issue #515): the
// curator's prose plus inline `::midden-artifact` embeds, with the
// stratigraphy sidebar (#524) once the site actually embeds artifacts.
// Mirrors layers/atlas/app/pages/t/atlas/[space]/[...slug].vue's ROLE.
//
// Isolation-respecting and presentation-only (ADR-0004): resolves through the
// SAME shared, unit-tested `resolveSpaceRoute` (via `useSpace`), then reads
// only this Space's own keyed pages/artifacts via `useMiddenTrenchData` — the
// sibling `[space]/index.vue` landing needs the exact same load.
const route = useRoute()
const { space, path, pagesKey, collections } = useSpace('midden')
const { sites, artifactsBySite } = await useMiddenTrenchData(route.path, { pagesKey, collections })

const site = computed(() => sites.value.find((p) => p.path === path) ?? null)
const siteSlug = computed(() => path.replace(/^\//, ''))
const siteArtifacts = computed(() => artifactsBySite.value.get(siteSlug.value) ?? [])
// The sidebar only needs the {slug, stratum} pairs — it renders elsewhere on
// this same page (ArtifactCard, via `::midden-artifact` embeds) the
// `[data-stratum]`/`id="artifact-<slug>"` elements it scroll-syncs against.
const sidebarArtifacts = computed(() => siteArtifacts.value.map((a) => ({ slug: a.slug, stratum: a.stratum })))

useHead({ title: () => `${site.value?.title ?? 'Not found'} · The Midden` })
</script>

<template>
  <main class="midden" :class="`midden--${space}`">
    <div class="midden-page">
      <p class="midden-crumb">
        <NuxtLink to="/t/midden">The Midden</NuxtLink><span class="sep">·</span>
        <NuxtLink :to="`/t/midden/${space}`">The Trench</NuxtLink><span class="sep">·</span>
        <span class="here">{{ site?.title ?? 'unknown' }}</span>
      </p>

      <article v-if="site" class="midden-site" :class="{ 'midden-site--with-sidebar': sidebarArtifacts.length }">
        <div class="midden-site-body">
          <h1>{{ site.title }}</h1>
          <div class="midden-site-prose">
            <ContentRenderer :value="site" />
          </div>
        </div>

        <aside v-if="sidebarArtifacts.length" class="midden-site-aside">
          <MiddenStratigraphySidebar :artifacts="sidebarArtifacts" />
        </aside>
      </article>

      <div v-else class="midden-not-found">
        <h1>Not catalogued</h1>
        <p>No site answers to <code>{{ path }}</code> in the trench. Perhaps it was never dug; perhaps it is simply elsewhere.</p>
        <p><NuxtLink :to="`/t/midden/${space}`">Back to the trench</NuxtLink></p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.midden-site {
  display: block;
}
.midden-site--with-sidebar {
  display: grid;
  grid-template-columns: 1fr minmax(14rem, 18rem);
  gap: 2rem;
  align-items: start;
}

.midden-site-body h1 {
  font-family: var(--midden-display);
  font-size: clamp(2rem, 6vw, 3rem);
  line-height: 1.05;
  margin: 0 0 1rem;
  color: var(--midden-ink);
  text-wrap: balance;
}

.midden-site-prose {
  color: var(--midden-ink);
}

.midden-site-aside {
  position: sticky;
  top: 1.5rem;
}

.midden-not-found h1 {
  font-family: var(--midden-display);
  font-size: 2rem;
  margin: 0 0 0.6rem;
}

@media (max-width: 44rem) {
  .midden-site--with-sidebar {
    grid-template-columns: 1fr;
  }
  .midden-site-aside {
    position: static;
    order: -1;
  }
}
</style>
