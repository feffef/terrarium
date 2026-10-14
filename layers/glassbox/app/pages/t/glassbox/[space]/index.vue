<script setup lang="ts">
const route = useRoute()
const { pagesKey, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`

// Shaped here so the payload carries only what the page shows (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const [landing, startHere, pages] = await Promise.all([
    queryCollection(pagesKey).path('/').first(),
    queryCollection(pagesKey).path(glassboxStartHere).select('path', 'title', 'description').first(),
    queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title').all(),
  ])
  return { landing, startHere, directory: glassboxDirectory(pages) }
})

const landing = computed(() => data.value?.landing ?? null)

useHead(() => ({ title: `${landing.value?.title ?? 'Glass Box'} · glassbox` }))
useSeoMeta({ description: () => landing.value?.description })
</script>

<template>
  <main class="gb gb-landing">
    <header class="gb-header">
      <NuxtLink class="gb-brand" :to="base"><strong>Glass Box</strong> <span>Terrarium, explained from the inside</span></NuxtLink>
    </header>

    <div class="hero">
      <h1>{{ landing?.title }}</h1>
      <ContentRenderer v-if="landing" class="lede" :value="landing" />
    </div>

    <NuxtLink v-if="data?.startHere" class="start-here gb-pane" :to="`${base}${data.startHere.path}`">
      <span class="start-text">
        <span class="gb-label">Start here · Walkthrough</span>
        <strong>{{ data.startHere.title }}</strong>
        <span class="start-desc">{{ data.startHere.description }}</span>
      </span>
      <span class="arrow" aria-hidden="true">→</span>
    </NuxtLink>

    <section v-if="data?.directory.length" class="directory">
      <div class="directory-head">
        <h2>Subjects</h2>
        <p>Each Subject is the tool whose official docs its Lessons link.</p>
      </div>
      <div class="cards">
        <section v-for="subject in data.directory" :key="subject.slug" class="card gb-pane">
          <h3>{{ subject.name }} <span>{{ subject.slug }}/</span></h3>
          <ul>
            <li v-for="lesson in subject.lessons" :key="lesson.path">
              <NuxtLink :to="`${base}${lesson.path}`">{{ lesson.title }}</NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <ContentLoadErrorDialog :status="status" :error="error" />
    <SiteFooter />
  </main>
</template>

<style scoped>
.gb-landing { padding: 0 max(16px, calc((100% - 1152px) / 2)) 72px; }
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 64px 0 48px;
  text-align: center;
}
h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(40px, 7vw, 72px);
  line-height: 1;
  font-weight: 600;
  letter-spacing: -0.04em;
  text-wrap: balance;
}
.lede { max-width: 640px; font-size: 20px; line-height: 1.55; color: var(--gb-ink-2); text-wrap: pretty; }
.lede :deep(p) { margin: 0; }
.start-here {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  max-width: 860px;
  margin: 0 auto 56px;
  padding: 26px 30px;
  border-radius: 22px;
  color: inherit;
  text-decoration: none;
}
.start-text { display: flex; flex-direction: column; gap: 6px; }
.start-text .gb-label { color: var(--gb-accent); }
.start-text strong { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
.start-desc { font-size: 16px; color: var(--gb-muted); line-height: 1.5; }
.arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--gb-solid);
  color: var(--gb-solid-ink);
  font-size: 22px;
}
.directory-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px 16px;
  margin-bottom: 16px;
}
.directory-head h2 { margin: 0; font-size: 22px; font-weight: 600; }
.directory-head p { margin: 0; font-size: 14px; color: var(--gb-muted); }
.cards { columns: 3 260px; column-gap: 14px; }
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  break-inside: avoid;
}
.card h3 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}
.card h3 span { font: 400 11.5px var(--gb-mono); color: var(--gb-muted); }
.card ul { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; font-size: 15px; line-height: 1.45; }
.card a { color: var(--gb-ink-2); text-decoration: none; }
.card a:hover { color: var(--gb-accent); }

@media (max-width: 640px) {
  .hero { padding: 40px 0 32px; }
  .lede { font-size: 18px; }
  .start-here { padding: 20px; gap: 16px; }
  .start-text strong { font-size: 24px; }
  .arrow { width: 44px; height: 44px; }
}
</style>
