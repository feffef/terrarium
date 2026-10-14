<script setup lang="ts">
const route = useRoute()
const { pagesKey, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`

// Shaped here so the payload carries only what the page shows (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const [landing, startHere, pages] = await Promise.all([
    queryCollection(pagesKey).path('/').first(),
    queryCollection(pagesKey).path('/walkthroughs/opening-a-page').select('path', 'title', 'description').first(),
    queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title').all(),
  ])
  return { landing, startHere, directory: glassboxDirectory(pages) }
})

const landing = computed(() => data.value?.landing ?? null)

useHead(() => ({ title: `${landing.value?.title ?? 'Glass Box'} · glassbox` }))
useSeoMeta({ description: () => landing.value?.description })
</script>

<template>
  <main class="gb">
    <header>
      <h1>{{ landing?.title }}</h1>
      <ContentRenderer v-if="landing" :value="landing" />
    </header>

    <NuxtLink v-if="data?.startHere" class="start-here" :to="`${base}${data.startHere.path}`">
      <span>Start here · Walkthrough</span>
      <strong>{{ data.startHere.title }}</strong>
      <span>{{ data.startHere.description }}</span>
    </NuxtLink>

    <section v-if="data?.directory.length" class="directory">
      <h2>Subjects</h2>
      <section v-for="subject in data.directory" :key="subject.slug">
        <h3>{{ subject.name }}</h3>
        <ul>
          <li v-for="lesson in subject.lessons" :key="lesson.path">
            <NuxtLink :to="`${base}${lesson.path}`">{{ lesson.title }}</NuxtLink>
          </li>
        </ul>
      </section>
    </section>

    <ContentLoadErrorDialog :status="status" :error="error" />
    <SiteFooter />
  </main>
</template>
