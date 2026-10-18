<script setup lang="ts">
const route = useRoute()
const { pagesKey, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`
// Drafts are left alone: the exercises collected here are the guide's.
if (space !== 'guide') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

// Each Lesson stays the one home of its exercise; only those sections travel in the payload (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const pages = await queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title', 'body').all()
  const links = pages.map(({ path, title }) => ({ path, title }))
  const exercises = glassboxDirectory(pages)
    .map((subject) => ({
      slug: subject.slug,
      name: subject.name,
      lessons: subject.lessons.flatMap((lesson) => {
        const value = glassboxTryIt(lesson.body.value)
        return value.length ? [{ path: lesson.path, title: lesson.title, body: { type: lesson.body.type, value } }] : []
      }),
    }))
    .filter((subject) => subject.lessons.length)
  return { subjects: glassboxDirectory(links), walkthroughs: glassboxWalkthroughs(links), exercises }
})

const { menuOpen, openMenu, closeMenu } = useGlassboxMenu()

useHead({ title: 'Try it in your project · glassbox' })
useSeoMeta({ description: 'The exercise at the end of every Lesson, on one page.' })
</script>

<template>
  <main class="gb gb-doc" :class="{ 'menu-open': menuOpen }" @keydown.esc="closeMenu">
    <GlassboxSidebar
      id="gb-nav"
      class="gb-sidebar"
      :base="base"
      path="/try-it"
      :subjects="data?.subjects ?? []"
      :walkthroughs="data?.walkthroughs ?? []"
      @close="closeMenu"
    />

    <div class="gb-main">
      <header class="gb-header">
        <GlassboxBrand :to="base" />
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

      <div class="gb-column">
        <div class="intro">
          <h1>Try it in your project</h1>
          <p>Every Lesson ends with one small thing to do in your own project. Here they are together; each title opens its Lesson.</p>
        </div>

        <section v-for="subject in data?.exercises ?? []" :key="subject.slug" class="subject">
          <h2>{{ subject.name }}</h2>
          <article v-for="lesson in subject.lessons" :key="lesson.path" class="gb-pane">
            <h3><NuxtLink :to="`${base}${lesson.path}`">{{ lesson.title }} →</NuxtLink></h3>
            <ContentRenderer :value="{ body: lesson.body }" />
          </article>
        </section>
      </div>

      <ContentLoadErrorDialog :status="status" :error="error" />
      <SiteFooter class="gb-column" />
    </div>
  </main>
</template>

<style scoped>
.intro { padding: 0 0 32px; }
.intro p { margin: 0; font-size: 17px; line-height: 1.55; color: var(--gb-ink-2); }
.subject { margin-bottom: 40px; }
h2 { margin: 0 0 14px; font-size: 22px; font-weight: 600; }
article { margin: 0 0 12px; padding: 16px 20px; border-radius: 14px; }
h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
h3 a { color: var(--gb-ink); text-decoration: none; }
h3 a:hover { color: var(--gb-accent); }
article :deep(p) { margin: 0; font-size: 15px; line-height: 1.6; color: var(--gb-ink-2); }
</style>
