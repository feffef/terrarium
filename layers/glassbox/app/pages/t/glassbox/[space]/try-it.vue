<script setup lang="ts">
const route = useRoute()
const { pagesKey, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`
// Only the guide holds finished Lessons (layers/glassbox/GLOSSARY.md); drafts are left alone.
if (space !== 'guide') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

// Each Lesson stays the one home of its exercise; only those sections travel in the payload (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const pages = await queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title', 'body').all()
  return glassboxDirectory(pages)
    .map((subject) => ({
      slug: subject.slug,
      name: subject.name,
      lessons: subject.lessons.flatMap((lesson) => {
        const value = glassboxTryIt(lesson.body.value)
        return value.length ? [{ path: lesson.path, title: lesson.title, body: { ...lesson.body, value } }] : []
      }),
    }))
    .filter((subject) => subject.lessons.length)
})

useHead({ title: 'Try it in your project · glassbox' })
useSeoMeta({ description: 'The exercise at the end of every Lesson, on one page.' })
</script>

<template>
  <main class="gb gb-tryit">
    <header class="gb-header">
      <GlassboxBrand :to="base" />
    </header>

    <div class="intro">
      <h1>Try it in your project</h1>
      <p>Every Lesson ends with one small thing to do in your own project. Here they are together; each title opens its Lesson.</p>
    </div>

    <section v-for="subject in data ?? []" :key="subject.slug" class="subject">
      <h2>{{ subject.name }}</h2>
      <article v-for="lesson in subject.lessons" :key="lesson.path" class="gb-pane">
        <h3><NuxtLink :to="`${base}${lesson.path}`">{{ lesson.title }} →</NuxtLink></h3>
        <ContentRenderer :value="{ body: lesson.body }" />
      </article>
    </section>

    <ContentLoadErrorDialog :status="status" :error="error" />
    <SiteFooter />
  </main>
</template>

<style scoped>
.gb-tryit { padding: 0 max(16px, calc((100% - 760px) / 2)) 72px; }
.intro { padding: 48px 0 32px; }
h1 { margin: 0 0 12px; font-size: clamp(30px, 7vw, 48px); line-height: 1.05; font-weight: 600; letter-spacing: -0.03em; }
.intro p { margin: 0; font-size: 17px; line-height: 1.55; color: var(--gb-ink-2); }
.subject { margin-bottom: 40px; }
h2 { margin: 0 0 14px; font-size: 22px; font-weight: 600; }
article { margin: 0 0 12px; padding: 16px 20px; border-radius: 14px; }
h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
h3 a { color: var(--gb-ink); text-decoration: none; }
h3 a:hover { color: var(--gb-accent); }
article :deep(p) { margin: 0; font-size: 15px; line-height: 1.6; color: var(--gb-ink-2); }
</style>
