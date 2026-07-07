<script setup lang="ts">
// The Journal Tenant's standalone Document page. A more specific route than the
// Platform's generic catch-all (`/t/[tenant]/[space]/[...slug]`) because `journal`
// is a static segment, so it wins for journal Documents — `about`, the standalone
// `digests/<day>` permalinks (ADR-0010), and any future journal page — while the
// sibling `index.vue` still owns the Space root. Without it these fell through to
// the Platform's deliberately unstyled catch-all and rendered off-brand (#25).
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the request
// through the SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses
// (via the read-only useSpace composable — no isolation logic duplicated or
// changed), then reads only that one (Tenant, Space)'s keyed `pages` collection.
// Spaces cannot leak. `pagesKey` is already this Tenant's own literal `pages`
// keys — derived from the generated `#routing` type (shared/routing.ts, #96/#55).
const route = useRoute()
const { space, path, pagesKey } = useSpace('journal')

const { data: page } = await useAsyncData(route.path, () =>
  queryCollection(pagesKey).path(path).first(),
)

// Breadcrumb trail from the Space-relative slug segments — the Space crumb links
// back to its landing, the rest are plain (the current Document is the last).
const crumbs = computed(() =>
  (Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug])
    .filter((s): s is string => Boolean(s)),
)

const title = computed(() => page.value?.title ?? 'Not found')
useSeoMeta({
  title: () => `${title.value} · journal/${space}`,
  description: () => page.value?.description,
})
</script>

<template>
  <main class="jd">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>
      <span>journal</span>
      <span class="sep">/</span>
      <NuxtLink :to="`/t/journal/${space}`">{{ space }}</NuxtLink>
      <template v-for="(c, i) in crumbs" :key="i">
        <span class="sep">/</span>
        <span :class="{ here: i === crumbs.length - 1 }">{{ c }}</span>
      </template>
    </nav>

    <article v-if="page" class="jd-prose">
      <ContentRenderer :value="page" />
    </article>
    <div v-else class="jd-prose">
      <h1>Not found</h1>
      <p>No document at <code>{{ path }}</code> in journal/{{ space }}.</p>
    </div>
  </main>
</template>
