<script setup lang="ts">
const route = useRoute()
const { pagesKey, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`

// Shaped here so the payload carries only what the page shows (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const [landing, pages] = await Promise.all([
    queryCollection(pagesKey).path('/').first(),
    queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title', 'description').all(),
  ])
  const stories = glassboxStories.flatMap((story) => {
    const page = pages.find((p) => p.path === story.path)
    return page ? [{ ...story, title: page.title, description: page.description }] : []
  })
  const told = new Set<string>(stories.map((story) => story.path))
  return {
    landing,
    stories,
    directory: glassboxDirectory(pages),
    walkthroughs: glassboxWalkthroughs(pages).filter((page) => !told.has(page.path)),
  }
})

const landing = computed(() => data.value?.landing ?? null)
// The landing's first paragraph is the hero's lede; the rest is the About section.
const intro = computed(() => {
  const page = landing.value
  if (!page) return null
  const [lede, ...about] = page.body.value
  const part = (value: typeof about) => ({ ...page, body: { ...page.body, value } })
  return { lede: part(lede ? [lede] : []), about: about.length ? part(about) : null }
})
const fileUrl = (path: string) => landing.value && glassboxFileUrl(path, landing.value.revision)
const folderUrl = (slug: string) => fileUrl(`layers/glassbox/content/${space}/pages/${slug}/`)
const sources = [
  { path: 'CLAUDE.md', label: 'Instructions' },
  { path: 'docs/adr/', label: 'Decisions' },
  { path: 'GLOSSARY.md', label: 'Terms' },
  { path: 'layers/glassbox/', label: "This site's code" },
]
provide(glassboxRevisionKey, computed(() => landing.value ?? undefined))

useHead(() => ({ title: `${landing.value?.title ?? 'Glass Box'} · glassbox` }))
useSeoMeta({ description: () => landing.value?.description })
</script>

<template>
  <main class="gb gb-landing">
    <header class="gb-header">
      <GlassboxBrand :to="base" />
    </header>

    <div class="hero">
      <h1>{{ landing?.title }}</h1>
      <ContentRenderer v-if="intro" class="lede" :value="intro.lede" />
    </div>

    <nav v-if="data?.stories.length" class="stories" aria-label="Stories">
      <NuxtLink v-for="story in data.stories" :key="story.path" class="story gb-pane" :to="`${base}${story.path}`">
        <span class="gb-label">{{ story.verb }}<template v-if="story.path === glassboxStartHere"> · Start here</template></span>
        <strong>{{ story.title }}</strong>
        <span class="teaser">{{ story.description }}</span>
        <span class="arrow" aria-hidden="true">→</span>
      </NuxtLink>
    </nav>

    <section v-if="data?.walkthroughs.length" class="band">
      <h2>{{ data.stories.length ? 'More Walkthroughs' : 'Walkthroughs' }}</h2>
      <ul>
        <li v-for="page in data.walkthroughs" :key="page.path">
          <NuxtLink :to="`${base}${page.path}`"><strong>{{ page.title }} →</strong><span class="teaser">{{ page.description }}</span></NuxtLink>
        </li>
      </ul>
      <a class="folder" :href="folderUrl('walkthroughs')" title="Folder in the repo">folder ↗</a>
    </section>

    <section v-if="data?.directory.length" class="directory">
      <h2>Subjects</h2>
      <div class="cards">
        <section v-for="subject in data.directory" :key="subject.slug" class="card gb-pane">
          <div class="card-head">
            <h3>{{ subject.name }}</h3>
            <span class="count">{{ subject.lessons.length }} {{ subject.lessons.length === 1 ? 'Lesson' : 'Lessons' }}</span>
          </div>
          <p class="blurb">{{ subject.blurb }}</p>
          <ul>
            <li v-for="lesson in subject.lessons" :key="lesson.path">
              <NuxtLink :to="`${base}${lesson.path}`"><span class="title">{{ lesson.title }}</span><span class="teaser">{{ lesson.description }}</span></NuxtLink>
            </li>
          </ul>
          <a class="folder" :href="folderUrl(subject.slug)" title="Folder in the repo">folder ↗</a>
        </section>
      </div>
    </section>

    <section v-if="landing" class="sources">
      <h2 class="gb-label">Primary sources, at this edition's commit</h2>
      <ul>
        <li v-for="source in sources" :key="source.path">
          <a class="gb-pane" :href="fileUrl(source.path)"><span>{{ source.label }}</span><code>{{ source.path }}</code></a>
        </li>
      </ul>
    </section>

    <section v-if="intro?.about" class="about">
      <h2>About</h2>
      <ContentRenderer :value="intro.about" />
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
  font-size: clamp(34px, 9vw, 72px);
  line-height: 1;
  font-weight: 600;
  letter-spacing: -0.04em;
  text-wrap: balance;
}
.lede { max-width: 560px; font-size: 19px; line-height: 1.55; color: var(--gb-ink-2); text-wrap: pretty; }
.lede :deep(p) { margin: 0; }
h2 { margin: 0 0 16px; font-size: 22px; font-weight: 600; }
section { margin-bottom: 56px; }
.teaser {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--gb-muted);
}
.folder { align-self: flex-end; margin-top: auto; font: 400 11.5px var(--gb-mono); color: var(--gb-muted); text-decoration: underline 1px dotted; text-underline-offset: 3px; }

/* Story tiles, Start here first. */
.stories {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 56px;
}
.story {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 22px 24px;
  border-radius: 20px;
  color: inherit;
  text-decoration: none;
}
.story .gb-label { color: var(--gb-accent); }
.story strong { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
.story .teaser { font-size: 15px; -webkit-line-clamp: 4; }
.arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  width: 40px;
  height: 40px;
  margin-top: auto;
  border-radius: 50%;
  background: var(--gb-solid);
  color: var(--gb-solid-ink);
  font-size: 18px;
}
.story:hover strong { color: var(--gb-accent); }

/* The other Walkthroughs, one full-width band. */
.band {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 22px 24px;
  border-radius: 20px;
  background: var(--gb-solid);
  color: var(--gb-solid-ink);
}
.band h2 { margin-bottom: 10px; font-size: 18px; }
.band ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px 24px; margin: 0; padding: 0; list-style: none; }
.band a { display: flex; flex-direction: column; gap: 2px; color: inherit; text-decoration: none; }
.band a:hover strong { text-decoration: underline; }
.band strong { font-weight: 600; }
.band .teaser, .band .folder { color: inherit; opacity: 0.7; }

/* Row-first, at most three across, so the cards read in the Subject map's order. */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(max(260px, calc((100% - 28px) / 3)), 1fr));
  align-items: stretch;
  gap: 14px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 18px 20px;
  border-radius: 16px;
}
.card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.card h3 { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.3; }
.count { font: 11.5px var(--gb-mono); color: var(--gb-muted); white-space: nowrap; }
.blurb { margin: -4px 0 4px; font-size: 14px; line-height: 1.45; color: var(--gb-muted); }
.card ul { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
.card li a { display: flex; flex-direction: column; gap: 1px; text-decoration: none; }
.card .title { font-size: 15px; line-height: 1.4; color: var(--gb-ink); font-weight: 500; }
.card li a:hover .title { color: var(--gb-accent); }

.sources ul { display: flex; flex-wrap: wrap; gap: 10px; margin: 0; padding: 0; list-style: none; }
.sources h2 { margin-bottom: 12px; }
.sources a { display: flex; flex-direction: column; gap: 2px; padding: 10px 16px; border-radius: 12px; color: var(--gb-ink); text-decoration: none; font-size: 14px; }
.sources a span::after { content: ' ↗'; color: var(--gb-muted); }
.sources code { color: var(--gb-muted); }

.about { max-width: 720px; font-size: 16px; color: var(--gb-ink-2); }
.about :deep(p) { margin: 0 0 0.8em; }

/* A light slab glares on a dark page; Article.vue's Try it box does the same. */
@media (prefers-color-scheme: dark) {
  .band { border: 1px solid color-mix(in srgb, var(--gb-accent) 25%, transparent); background: var(--gb-tint); color: var(--gb-ink); }
}
@media (max-width: 860px) {
  .stories { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .hero { padding: 28px 0 32px; }
  .lede { font-size: 17px; }
  .story { position: relative; padding: 18px 64px 18px 20px; }
  .arrow { position: absolute; top: 18px; right: 16px; width: 36px; height: 36px; margin: 0; }
  .story strong { font-size: 20px; }
  section, .stories { margin-bottom: 40px; }
}
</style>
