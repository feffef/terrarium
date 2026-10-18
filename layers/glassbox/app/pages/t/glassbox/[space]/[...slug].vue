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
// A Subject has no page of its own: send its bare folder URL to its card on the landing.
const subjectCard = data.value?.subjects.find((subject) => path === `/${subject.slug}`)
if (!page.value && subjectCard) await navigateTo(`${base}#${subjectCard.slug}`, { replace: true })
else if (!page.value && !error.value) setResponseStatus(404)
provide(glassboxRevisionKey, computed(() => page.value ?? undefined))
// On main, not at `revision`: a page is pinned before it is written, so its own file there is older or missing.
const source = computed(() => page.value ? glassboxFileUrl(`layers/glassbox/content/${space}/pages/${page.value.stem}.md`, 'main') : undefined)
provide(glassboxTermsKey, computed(() => data.value?.terms ?? {}))

const { menuOpen, openMenu, closeMenu } = useGlassboxMenu()

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
        <GlassboxUpdated v-if="page" placement="header" :date="page.revisionDate" :source="source" />
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

      <GlassboxArticle v-if="page" class="gb-column" :page="page" :base="base" :surround="data?.surround ?? null" :through="data?.through ?? []" :draft="space === 'drafts'" :source="source" />

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
