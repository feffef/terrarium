<script setup lang="ts">
// The Search view (`/t/commons/search`) — a live-filtered box over every page
// collection that opted into `#catalog`. Reads only through the sanctioned,
// read-only `queryPages` (the page-kind projection of `queryAcrossTenants`,
// ADR-0025) — never a manifest import or a hardcoded Tenant list. The corpus is
// build-time/committed content (ADR-0001); filtering is client-side over it.
const { data, status, error } = await useAsyncData('commons-search-corpus', () => queryPages())

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

// The whole corpus is hundreds of rows, a very long scroll on a phone.
const PAGE = 30
const limit = ref(PAGE)
watch(q, () => { limit.value = PAGE })
const list = useTemplateRef<HTMLElement>('list')
// The button vanishes after the last page; keep keyboard focus on the new rows.
async function showMore() {
  const first = shown.value.length
  limit.value += PAGE
  await nextTick()
  list.value?.children[first]?.querySelector('a')?.focus()
}
const shown = computed(() => results.value.slice(0, limit.value))
</script>

<template>
  <div class="se">
    <input
      v-model="q"
      class="se-box"
      type="search"
      aria-label="Search page titles, summaries and site names"
      placeholder="Search titles, summaries and sites…"
      autocomplete="off"
      spellcheck="false"
    >

    <p class="count">
      {{ results.length }}
      <template v-if="results.length !== corpus.length">of {{ corpus.length }}</template>
      {{ corpus.length === 1 ? 'page' : 'pages' }}
      across {{ tenantCount }} {{ tenantCount === 1 ? 'site' : 'sites' }}
    </p>

    <ul ref="list" class="hits">
      <li v-for="r in shown" :key="r.url" class="se-result">
        <NuxtLink :to="r.url" class="hit">
          <span class="prov">{{ r.tenant }} <span class="dot">·</span> {{ r.space }}</span>
          <span class="hit-title">{{ r.title ?? r.url }}</span>
          <span v-if="r.description" class="hit-desc">{{ r.description }}</span>
        </NuxtLink>
      </li>
    </ul>
    <button v-if="results.length > shown.length" type="button" class="more" @click="showMore">
      Show {{ Math.min(PAGE, results.length - shown.length) }} more
    </button>
    <p v-if="!results.length" class="empty">Nothing matches “{{ q }}”.</p>

    <ContentLoadErrorDialog :status="status" :error="error" />
  </div>
</template>

<style scoped>
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
.more {
  margin-top: 0.8rem;
  padding: 0.6rem 1rem;
  font: inherit;
  color: var(--co-ink);
  background: var(--co-card);
  border: 1px solid var(--co-line);
  border-radius: 10px;
  cursor: pointer;
}
.more:hover { border-color: var(--co-accent); }
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
.hit-title {
  font-weight: 600;
  font-size: 1.02rem;
}
.hit-desc {
  font-size: 0.88rem;
  color: var(--co-muted);
  line-height: 1.45;
}
</style>
