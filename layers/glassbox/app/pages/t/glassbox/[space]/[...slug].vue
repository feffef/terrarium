<script setup lang="ts">
import { glassboxPageTerms } from '../../../../../page-refs.ts'

const route = useRoute()
const { path, pagesKey, collections, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`

// The sidebar needs titles and paths only: they travel in the payload (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const [page, pages, walkthroughs] = await Promise.all([
    queryCollection(pagesKey).path(path).first(),
    queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title').all(),
    // The prefix glassboxWalkthroughOf tests, as SQL.
    glassboxSubjectOf(path)
      ? queryCollection(pagesKey).where('path', 'LIKE', '/walkthroughs/%').select('path', 'title', 'body').all()
      : [],
  ])
  const termIds = glassboxPageTerms(page?.body)
  const terms = termIds.length
    ? await queryCollection(collections.terms).where('stem', 'IN', termIds).select('stem', 'definition', 'source').all()
    : []
  return {
    page,
    through: glassboxWalkthroughsThrough(walkthroughs, `${base}${path}`),
    terms: Object.fromEntries(terms.map(({ stem, ...t }) => [stem, t])),
    subjects: glassboxDirectory(pages),
    walkthroughs: glassboxWalkthroughs(pages),
    surround: glassboxSurround(pages, path),
  }
})

const page = computed(() => data.value?.page ?? null)
if (!page.value && !error.value) setResponseStatus(404)
provide(glassboxRevisionKey, computed(() => page.value ?? undefined))
provide(glassboxTermsKey, computed(() => data.value?.terms ?? {}))

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
        <GlassboxUpdated v-if="page" placement="header" :date="page.revisionDate" />
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

      <GlassboxArticle v-if="page" class="gb-column" :page="page" :base="base" :surround="data?.surround ?? null" :through="data?.through ?? []" :draft="space === 'drafts'" />

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
