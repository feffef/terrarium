<script setup lang="ts">
import { glassboxPageTerms } from '../../../../../page-refs.ts'

const route = useRoute()
const { path, pagesKey, collections, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`

// The sidebar needs titles and paths only: they travel in the payload (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const [page, pages, walkthroughs] = await Promise.all([
    queryCollection(pagesKey).path(path).first(),
    // A Subject page lists each Lesson's description and a Where next row shows its target's; no other page carries them.
    glassboxSubjectAt(path) || glassboxSubjectOf(path) || glassboxWalkthroughOf(path)
      ? queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title', 'description').all()
      : queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title').all(),
    // The prefix glassboxWalkthroughOf tests, as SQL.
    glassboxSubjectOf(path)
      ? queryCollection(pagesKey).where('path', 'LIKE', '/walkthroughs/%').order('stem', 'ASC').select('path', 'title', 'body').all()
      : [],
  ])
  const termIds = glassboxPageTerms(page?.body)
  const terms = termIds.length
    ? await queryCollection(collections.terms).where('stem', 'IN', termIds).select('stem', 'definition', 'source', 'lesson').all()
    : []
  // A Subject page's list reads descriptions off `pages`; a Where next row reads its target's from `descriptions`, so only those travel.
  const nextTargets = page ? glassboxNextTargets(page.body.value, base) : []
  const links = glassboxSubjectAt(path) ? pages : pages.map(({ path, title }) => ({ path, title }))
  return {
    page,
    through: glassboxWalkthroughsThrough(walkthroughs, `${base}${path}`),
    terms: Object.fromEntries(terms.map(({ stem, ...t }) => [stem, { ...t, lessonTitle: pages.find((p) => `/t/glassbox/guide${p.path}` === t.lesson)?.title }])),
    subjects: glassboxDirectory(links),
    walkthroughs: glassboxWalkthroughs(links),
    surround: glassboxSurround(links, path),
    titles: Object.fromEntries(pages.map((p) => [p.path, p.title])),
    descriptions: Object.fromEntries(pages.flatMap((p): [string, string][] => nextTargets.includes(p.path) && 'description' in p && p.description ? [[p.path, String(p.description)]] : [])),
  }
})

const page = computed(() => data.value?.page ?? null)
// A Subject has no content file: its page lists its Lessons.
const subject = computed(() => data.value?.subjects.find((s) => path === `/${s.slug}`))
if (!page.value && !subject.value && !error.value) setResponseStatus(404)
provide(glassboxRevisionKey, computed(() => page.value ?? undefined))
// On main, not at `revision`: a page is pinned before it is written, so its own file there is older or missing.
const source = computed(() => page.value ? glassboxFileUrl(`layers/glassbox/content/${space}/pages/${page.value.stem}.md`, 'main') : undefined)
provide(glassboxTermsKey, computed(() => data.value?.terms ?? {}))

const { menuOpen, openMenu, closeMenu } = useGlassboxMenu()
// The workshop is a live record of one page, not a textbook edition: no Subjects to list and no
// edition date (GLOSSARY.md, A curated textbook and Two Spaces).
const live = space === 'workshop'

// Read state is browser-only, so it is set after mount (GLOSSARY.md, Reading progress).
const reading = useGlassboxRead()
let seen: IntersectionObserver | undefined
onMounted(async () => {
  // Every page shows sidebar ticks, so load always; only a Lesson page then marks itself read.
  reading.load()
  if (!page.value || !glassboxSubjectOf(path)) return
  // Read means the visitor scrolled to Where next, or to Lessons already read, which replaces it once all its links are read.
  await nextTick()
  const end = document.querySelector(`.gb-column #${glassboxLessonIds.whereNext}, .gb-column .read`)
  if (!end) return
  seen = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return
    reading.mark(path)
    seen?.disconnect()
  })
  seen.observe(end)
})
onBeforeUnmount(() => seen?.disconnect())

useHead(() => ({ title: `${page.value?.title ?? subject.value?.name ?? 'Not found'} · glassbox` }))
useSeoMeta({ description: () => page.value?.description })
</script>

<template>
  <main class="gb gb-doc" :class="{ 'menu-open': menuOpen, 'gb-bare': live }" @keydown.esc="closeMenu">
    <GlassboxSidebar
      v-if="!live"
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
        <GlassboxBrand :to="live ? '/t/glassbox/guide' : base" />
        <GlassboxUpdated v-if="page && !live" placement="header" :date="page.revisionDate" :source="source" />
        <button
          v-if="!live"
          ref="menuButton"
          type="button"
          class="gb-menu"
          aria-controls="gb-nav"
          :aria-expanded="menuOpen"
          aria-label="Open menu"
          @click="openMenu"
        >≡</button>
      </header>

      <GlassboxArticle v-if="page" class="gb-column" :page="page" :base="base" :surround="data?.surround ?? null" :through="data?.through ?? []" :titles="data?.titles ?? {}" :descriptions="data?.descriptions ?? {}" :dated="!live" :source="source" />

      <GlassboxSubject v-else-if="subject" class="gb-column" :name="subject.name" :lessons="subject.lessons" :base="base" />

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
