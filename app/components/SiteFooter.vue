<script setup lang="ts">
// A one-click way out of whichever Tenant a visitor is deep inside, rather
// than only the shared "terrarium" breadcrumb link home (visitor-loop fix,
// 2026-09-24 — see that run's PR for the finding). Deliberately theme-neutral
// (currentColor-derived, no Tenant CSS vars) so one component works unstyled
// inside every Tenant's own look.
const SITES = [
  { name: 'Journal', to: '/t/journal/current' },
  { name: 'Blog', to: '/t/blog' },
  { name: 'Midden', to: '/t/midden' },
  { name: 'Atlas', to: '/t/atlas' },
  { name: 'Tinkerfund', to: '/t/tinkerfund' },
]
// Reachable from inside the sites, but kept off the homepage (#1316 rulings).
const QUIET_SITES = [
  { name: 'Search', to: '/t/commons/search' },
  { name: 'Marquee', to: '/t/marquee' },
]

const route = useRoute()
// Linking a visitor to the wing they are already in is a dead link.
const sites = computed(() => (route.path === '/' ? SITES : [...SITES, ...QUIET_SITES]).filter((s) => s.to.split('/')[2] !== route.path.split('/')[2]))
</script>

<template>
  <footer class="site-footer" aria-label="Other sites in the terrarium, and its source">
    <span class="site-footer-label">Elsewhere:</span>
    <span class="site-footer-links">
      <template v-for="(s, i) in sites" :key="s.to">
        <span v-if="i" class="site-footer-sep" aria-hidden="true">·</span>
        <NuxtLink :to="s.to">{{ s.name }}</NuxtLink>
      </template>
    </span>
    <a class="site-footer-source" :href="REPO_URL">Source on GitHub</a>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem;
  font-family: system-ui, sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.01em;
}
.site-footer-label { color: color-mix(in srgb, currentColor 55%, transparent); }
.site-footer-links { display: inline-flex; flex-wrap: wrap; gap: 0.45rem; align-items: baseline; }
.site-footer-sep { color: color-mix(in srgb, currentColor 35%, transparent); }
.site-footer a {
  color: color-mix(in srgb, currentColor 70%, transparent);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 30%, transparent);
  text-underline-offset: 2px;
}
.site-footer-source { margin-left: auto; }
.site-footer a:hover { color: currentColor; text-decoration-color: currentColor; }
</style>
