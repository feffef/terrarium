<script setup lang="ts">
// The Search landing (`/t/search/all`) — a more specific route than the
// Platform's generic catch-all, so it wins for the Space root and renders a real
// search interface over the cross-Tenant catalog.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves its OWN
// Space through the same shared `resolveSpaceRoute` (via useSpace) to read its
// landing copy, and reaches every OTHER Tenant only through the sanctioned,
// read-only `queryAcrossTenants` (#catalog, ADR-0025) — never a manifest import
// or a hardcoded Tenant list.
const route = useRoute()
const { pagesKey } = useSpace('search')

// Corpus + landing are both build-time/committed data (ADR-0001): the index is
// whatever content was baked, queried once here, then filtered client-side.
// `status`/`error` surface a failed client-side load through the
// ContentLoadErrorDialog rather than a silent blank (issue #236).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const landing = await queryCollection(pagesKey).path('/').first()
  const corpus = await queryAcrossTenants('page')
  return { landing, corpus }
})

const landing = computed(() => data.value?.landing ?? null)
// Sort the corpus by Tenant then title so the un-filtered list reads as a stable
// directory, not manifest order.
const corpus = computed(() =>
  [...(data.value?.corpus ?? [])].sort(
    (a, b) => a.tenant.localeCompare(b.tenant) || (a.title ?? a.url).localeCompare(b.title ?? b.url),
  ),
)
const tenantCount = computed(() => new Set(corpus.value.map((r) => r.tenant)).size)

const q = ref('')
const results = computed(() => {
  const needle = q.value.trim().toLowerCase()
  if (!needle) return corpus.value
  return corpus.value.filter((r) =>
    [r.title, r.description, r.tenant, r.space].some((f) => f?.toLowerCase().includes(needle)),
  )
})

const title = computed(() => landing.value?.title ?? 'Search')
useHead(() => ({ title: `${title.value} · search`, bodyAttrs: { class: 'se-page' } }))
useSeoMeta({ description: () => landing.value?.description })
</script>

<template>
  <main class="se">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span><span class="here">search</span>
    </p>

    <header class="masthead">
      <h1>{{ title }}</h1>
      <p v-if="landing?.description" class="tagline">{{ landing.description }}</p>
    </header>

    <div v-if="landing" class="prose">
      <ContentRenderer :value="landing" />
    </div>

    <label class="box">
      <span class="visually-hidden">Search across every Tenant</span>
      <input
        v-model="q"
        class="se-box"
        type="search"
        placeholder="Search across every Tenant…"
        autocomplete="off"
        spellcheck="false"
      >
    </label>

    <p class="count">
      {{ results.length }}
      <template v-if="results.length !== corpus.length">of {{ corpus.length }}</template>
      {{ corpus.length === 1 ? 'page' : 'pages' }}
      across {{ tenantCount }} {{ tenantCount === 1 ? 'tenant' : 'tenants' }}
    </p>

    <ul class="hits">
      <li v-for="r in results" :key="r.url" class="se-result">
        <NuxtLink :to="r.url" class="hit">
          <span class="prov">{{ r.tenant }} <span class="dot">·</span> {{ r.space }}</span>
          <span class="hit-title">{{ r.title ?? r.url }}</span>
          <span v-if="r.description" class="hit-desc">{{ r.description }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p v-if="!results.length" class="empty">Nothing matches “{{ q }}”.</p>

    <!-- A failed client-side content load must never present as a silent blank
         (issue #236) — raise a modal with message / technical details / reload. -->
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </main>
</template>

<style scoped>
.se {
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
  color: var(--se-muted);
  font-size: 1.05rem;
  line-height: 1.5;
}
.prose {
  margin: 1.2rem 0 1.6rem;
  color: var(--se-muted);
  line-height: 1.6;
}
.prose :deep(p) {
  margin: 0 0 0.8rem;
}
.box {
  display: block;
}
.se-box {
  width: 100%;
  box-sizing: border-box;
  padding: 0.8rem 1rem;
  font-size: 1.05rem;
  color: var(--se-ink);
  background: var(--se-card);
  border: 1px solid var(--se-line);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.se-box:focus-visible {
  border-color: var(--se-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--se-accent) 22%, transparent);
}
.count {
  margin: 0.9rem 0 0.4rem;
  font-size: 0.85rem;
  color: var(--se-muted);
}
.hits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hit {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0.95rem;
  border: 1px solid var(--se-line);
  border-radius: 10px;
  background: var(--se-card);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.12s ease;
}
.hit:hover {
  border-color: var(--se-accent);
  transform: translateY(-1px);
}
.prov {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--se-accent);
}
.prov .dot {
  opacity: 0.5;
}
.hit-title {
  font-weight: 600;
  font-size: 1.02rem;
}
.hit-desc {
  font-size: 0.88rem;
  color: var(--se-muted);
  line-height: 1.45;
}
.empty {
  margin: 1rem 0 0;
  color: var(--se-muted);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
