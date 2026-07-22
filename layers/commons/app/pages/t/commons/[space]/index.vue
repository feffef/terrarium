<script setup lang="ts">
// The Commons Space landing (`/t/commons/search`, `/t/commons/timeline`) — a more
// specific route than the Platform's generic catch-all, so it wins for each Space
// root and renders that Space's cross-Tenant view.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves its OWN Space
// through the same shared `resolveSpaceRoute` (via useSpace) to read the landing
// copy, then hands off to the per-Space view component, each of which reaches
// other Tenants ONLY through the sanctioned, read-only `queryAcrossTenants`
// primitive (ADR-0025) — directly for Search, via this layer's `queryTimeline`
// normalization for Timeline — never a manifest import or a hardcoded Tenant list.
const route = useRoute()
const { space, pagesKey } = useSpace('commons')

const { data, status, error } = await useAsyncData(route.path, () =>
  queryCollection(pagesKey).path('/').first(),
)
const landing = computed(() => data.value ?? null)
const title = computed(() => landing.value?.title ?? 'Commons')

useHead(() => ({ title: `${title.value} · commons`, bodyAttrs: { class: 'commons-page' } }))
useSeoMeta({ description: () => landing.value?.description })
</script>

<template>
  <main class="co">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span><span class="here">commons</span>
      <span class="sep">/</span><span class="here">{{ space }}</span>
    </p>

    <header class="masthead">
      <h1>{{ title }}</h1>
      <p v-if="landing?.description" class="tagline">{{ landing.description }}</p>
      <nav class="views" aria-label="Commons views">
        <NuxtLink to="/t/commons/search" class="view" :class="{ on: space === 'search' }">Search</NuxtLink>
        <NuxtLink to="/t/commons/timeline" class="view" :class="{ on: space === 'timeline' }">Timeline</NuxtLink>
      </nav>
    </header>

    <div v-if="landing" class="prose">
      <ContentRenderer :value="landing" />
    </div>

    <CommonsSearch v-if="space === 'search'" />
    <CommonsTimeline v-else-if="space === 'timeline'" />

    <!-- A failed client-side load of the landing itself must never present as a
         silent blank (issue #236). Each view component raises its own for its
         cross-Tenant read. -->
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </main>
</template>

<style scoped>
.co {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}
.crumb {
  font-size: 0.85rem;
  opacity: 0.7;
  margin: 0 0 1.5rem;
}
.crumb a {
  color: inherit;
}
.crumb .sep {
  margin: 0 0.4rem;
  opacity: 0.5;
}
.masthead h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 2.6rem);
  letter-spacing: -0.02em;
}
.tagline {
  margin: 0.4rem 0 0;
  color: var(--co-muted);
  font-size: 1.05rem;
  line-height: 1.5;
}
.prose {
  margin: 1.2rem 0 1.6rem;
  color: var(--co-muted);
  line-height: 1.6;
}
.prose :deep(p) {
  margin: 0 0 0.8rem;
}
.views {
  display: flex;
  gap: 0.4rem;
  margin-top: 1rem;
}
.view {
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--co-line);
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--co-muted);
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}
.view:hover {
  border-color: var(--co-accent);
  color: var(--co-ink);
}
.view.on {
  background: var(--co-accent);
  border-color: var(--co-accent);
  color: var(--co-card);
}
</style>
