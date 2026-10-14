<script setup lang="ts">
const route = useRoute()
const { path, pagesKey, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`

// The sidebar needs titles and paths only: they travel in the payload (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const [page, pages] = await Promise.all([
    queryCollection(pagesKey).path(path).first(),
    queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title').all(),
  ])
  return { page, subjects: glassboxDirectory(pages), walkthroughs: glassboxWalkthroughs(pages) }
})

const page = computed(() => data.value?.page ?? null)
if (!page.value && !error.value) setResponseStatus(404)

const menuOpen = ref(false)
watch(() => route.path, () => { menuOpen.value = false })

useHead(() => ({ title: `${page.value?.title ?? 'Not found'} · glassbox` }))
useSeoMeta({ description: () => page.value?.description })
</script>

<template>
  <main class="gb gb-doc" :class="{ 'menu-open': menuOpen }">
    <GlassboxSidebar
      id="gb-nav"
      class="gb-sidebar"
      :base="base"
      :path="path"
      :subjects="data?.subjects ?? []"
      :walkthroughs="data?.walkthroughs ?? []"
      @close="menuOpen = false"
    />

    <div class="gb-main">
      <header class="gb-header">
        <NuxtLink class="gb-brand" :to="base"><strong>Glass Box</strong> <span>Terrarium, explained from the inside</span></NuxtLink>
        <button
          type="button"
          class="gb-menu"
          aria-controls="gb-nav"
          :aria-expanded="menuOpen"
          aria-label="Open menu"
          @click="menuOpen = true"
        >≡</button>
      </header>

      <article v-if="page" class="gb-column">
        <h1>{{ page.title }}</h1>
        <ContentRenderer class="gb-prose" :value="page" />
      </article>

      <div v-else class="gb-column">
        <h1>Not found</h1>
        <p>No page answers to <code>{{ path }}</code> in Glass Box.</p>
        <p><NuxtLink :to="base">Back to Glass Box</NuxtLink></p>
      </div>

      <ContentLoadErrorDialog :status="status" :error="error" />
      <SiteFooter class="gb-column" />
    </div>
  </main>
</template>
