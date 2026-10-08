<script setup lang="ts">
// The Journal Tenant's standalone Document page. A more specific route than the
// Platform's generic catch-all (`/t/[tenant]/[space]/[...slug]`) because `journal`
// is a static segment, so it wins for journal Documents — `about`, the standalone
// `digests/<day>` permalinks (ADR-0010), and any future journal page — while the
// sibling `index.vue` still owns the Space root. Without it, journal Documents
// would fall through to the Platform's deliberately unstyled catch-all and
// render off-brand.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the request
// through the SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses
// (via the read-only useSpace composable — no isolation logic duplicated or
// changed), then reads only that one (Tenant, Space)'s keyed `pages` collection.
// Spaces cannot leak. `pagesKey` is already this Tenant's own literal `pages`
// keys — derived from the generated `#routing` type (shared/routing.ts).
import JournalScrollTable from '../../../../components/journal/ScrollTable.vue'

const route = useRoute()
const { space, path, pagesKey } = useSpace('journal')

const { data: page, error } = await useAsyncData(route.path, () =>
  queryCollection(pagesKey).path(path).first(),
)

// Breadcrumb trail from the Space-relative slug segments — the Space crumb links
// back to its landing, the rest are plain (the current Document is the last).
const crumbs = computed(() =>
  (Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug])
    .filter((s): s is string => Boolean(s)),
)

if (!page.value && !error.value) setResponseStatus(404)

const { data: tour } = await useAsyncData(`${route.path}:onramp`, async () =>
  page.value?.onramp == null
    ? []
    : onrampSteps(
        await queryCollection(pagesKey)
          .where('onramp', 'IS NOT NULL')
          .select('path', 'onramp', 'onrampLabel', 'onrampBlurb')
          .all(),
      ),
)

// A Digest permalink steps to the days either side and back to the list, so it
// isn't a dead end.
const digestDate = computed(() => path.match(/^\/digests\/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? null)
const { data: digestNav } = await useAsyncData(`${route.path}:digest-nav`, async () => {
  if (!digestDate.value) return null
  const days = (await queryCollection(pagesKey).where('path', 'LIKE', '/digests/%').select('path').all())
    .map((d) => d.path.slice('/digests/'.length))
  return digestNeighbours(days, digestDate.value)
})

const title = computed(() => page.value?.title ?? 'Not found')
useSeoMeta({
  title: () => `${title.value} · journal/${space}`,
  description: () => page.value?.description,
})
</script>

<template>
  <main class="jd jd-doc">
    <JournalBreadcrumb :space="space" :trail="crumbs" />

    <article v-if="page" class="jd-prose">
      <ContentRenderer :value="page" :components="{ table: JournalScrollTable }" />
      <JournalOnrampTour v-if="tour?.length" :steps="tour" :current="path" :base="`/t/journal/${space}`" />
      <nav v-if="digestDate && digestNav" class="digest-nav" aria-label="Digest days">
        <NuxtLink v-if="digestNav.older" :to="`/t/journal/${space}/digests/${digestNav.older}`" rel="prev"><span aria-hidden="true">← </span>{{ digestNav.older }}</NuxtLink>
        <NuxtLink :to="`/t/journal/${space}#${digestAnchor(digestDate)}`">All daily digests</NuxtLink>
        <NuxtLink v-if="digestNav.newer" :to="`/t/journal/${space}/digests/${digestNav.newer}`" rel="next">{{ digestNav.newer }}<span aria-hidden="true"> →</span></NuxtLink>
      </nav>
    </article>
    <div v-else class="jd-prose">
      <h1>Not found</h1>
      <p>No document at <code>{{ path }}</code> in journal/{{ space }}.</p>
    </div>

    <SiteFooter />
  </main>
</template>

<style scoped>
.digest-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1.25rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--jd-line);
  font-family: var(--jd-mono);
  font-size: 0.8rem;
}
</style>
