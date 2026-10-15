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
  return { page, subjects: glassboxDirectory(pages), walkthroughs: glassboxWalkthroughs(pages), surround: glassboxSurround(pages, path) }
})

const page = computed(() => data.value?.page ?? null)
// Two renders so the table of contents sits between the lede and the first section.
const parts = computed(() => {
  if (!page.value) return null
  const { body } = page.value
  const [intro, sections] = glassboxSplitAtFirstSection(body.value)
  return {
    intro: { ...page.value, body: { ...body, value: intro } },
    sections: { ...page.value, body: { ...body, value: sections } },
    toc: body.toc?.links ?? [],
  }
})
if (!page.value && !error.value) setResponseStatus(404)

const menuOpen = ref(false)
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
watch(() => route.path, () => { menuOpen.value = false })

async function openMenu() {
  menuOpen.value = true
  await nextTick()
  document.querySelector<HTMLElement>('#gb-nav .close')?.focus()
}
function closeMenu() {
  if (!menuOpen.value) return
  menuOpen.value = false
  menuButton.value?.focus()
}

useHead(() => ({ title: `${page.value?.title ?? 'Not found'} · glassbox` }))
useSeoMeta({ description: () => page.value?.description })
</script>

<template>
  <main class="gb gb-doc" :class="{ 'menu-open': menuOpen }" @keydown.esc="closeMenu">
    <GlassboxSidebar
      id="gb-nav"
      class="gb-sidebar"
      :base="base"
      :path="path"
      :subjects="data?.subjects ?? []"
      :walkthroughs="data?.walkthroughs ?? []"
      @close="closeMenu"
    />

    <div class="gb-main">
      <header class="gb-header">
        <GlassboxBrand :to="base" />
        <GlassboxUpdated v-if="page" class="in-header" :date="page.revisionDate" />
        <button
          ref="menuButton"
          type="button"
          class="gb-menu"
          aria-controls="gb-nav"
          :aria-expanded="menuOpen"
          aria-label="Open menu"
          @click="openMenu"
        >≡</button>
      </header>

      <article v-if="page && parts" class="gb-column">
        <h1>{{ page.title }}</h1>
        <ContentRenderer class="gb-prose" :value="parts.intro" />
        <GlassboxToc v-if="parts.toc.length" :links="parts.toc" />
        <ContentRenderer class="gb-prose" :value="parts.sections" />
        <GlassboxSurround v-if="data?.surround" :base="base" :prev="data.surround.prev" :next="data.surround.next" />
        <GlassboxUpdated class="at-end" :date="page.revisionDate" />
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
