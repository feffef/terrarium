<script setup lang="ts">
// A one-click way out of whichever Tenant a visitor is deep inside, rather
// than only the shared "terrarium" breadcrumb link home (visitor-loop fix,
// 2026-09-24 — see that run's PR for the finding). Deliberately theme-neutral
// (currentColor-derived, no Tenant CSS vars) so one component works unstyled
// inside every Tenant's own look.
const route = useRoute()
// Linking a visitor to the wing they are already in is a dead link.
const sites = computed(() => SITES.filter((s) => s.to.split('/')[2] !== route.path.split('/')[2]))
</script>

<template>
  <footer class="site-footer" aria-label="Other sites in the terrarium, and its source">
    <span class="site-footer-label">Elsewhere:</span>
    <span class="site-footer-links">
      <!-- Each item carries the dot after it, so a wrapped row never starts or ends on a lone one. -->
      <span v-for="(s, i) in sites" :key="s.to" class="site-footer-item">
        <span><NuxtLink :to="s.to">{{ s.name }}</NuxtLink> <span class="site-footer-gloss">({{ s.gloss }})</span></span>
        <span v-if="i < sites.length - 1" class="site-footer-sep" aria-hidden="true">·</span>
      </span>
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
.site-footer-item { display: inline-flex; gap: 0.45rem; align-items: baseline; white-space: nowrap; }
.site-footer-gloss { color: color-mix(in srgb, currentColor 55%, transparent); }
.site-footer-sep { color: color-mix(in srgb, currentColor 35%, transparent); }
.site-footer a {
  color: color-mix(in srgb, currentColor 70%, transparent);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 30%, transparent);
  text-underline-offset: 2px;
}
.site-footer-source { margin-left: auto; }
.site-footer a:hover { color: currentColor; text-decoration-color: currentColor; }
@media (max-width: 480px) {
  .site-footer-label { flex-basis: 100%; }
}
</style>
