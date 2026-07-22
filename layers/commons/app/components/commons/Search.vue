<script setup lang="ts">
// The Search view (`/t/commons/search`) — a live-filtered box over every page
// collection that opted into `#catalog`. Reads only through the sanctioned,
// read-only `queryAcrossTenants` (ADR-0025) — never a manifest import or a
// hardcoded Tenant list. The corpus is build-time/committed content (ADR-0001);
// filtering is client-side over that baked index.
const { data, status, error } = await useAsyncData('commons-search-corpus', () => queryAcrossTenants('page'))

// Sort the corpus by Tenant then title so the un-filtered list reads as a stable
// directory, not manifest order.
const corpus = computed(() =>
  [...(data.value ?? [])].sort(
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
</script>

<template>
  <div class="se">
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

    <ContentLoadErrorDialog :status="status" :error="error" context="/t/commons/search" />
  </div>
</template>

<style scoped>
.box {
  display: block;
}
.se-box {
  width: 100%;
  box-sizing: border-box;
  padding: 0.8rem 1rem;
  font-size: 1.05rem;
  color: var(--co-ink);
  background: var(--co-card);
  border: 1px solid var(--co-line);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.se-box:focus-visible {
  border-color: var(--co-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--co-accent) 22%, transparent);
}
.count {
  margin: 0.9rem 0 0.4rem;
  font-size: 0.85rem;
  color: var(--co-muted);
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
  border: 1px solid var(--co-line);
  border-radius: 10px;
  background: var(--co-card);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.12s ease;
}
.hit:hover {
  border-color: var(--co-accent);
  transform: translateY(-1px);
}
.prov {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--co-accent);
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
  color: var(--co-muted);
  line-height: 1.45;
}
.empty {
  margin: 1rem 0 0;
  color: var(--co-muted);
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
