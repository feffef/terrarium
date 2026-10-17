<script setup lang="ts">
const route = useRoute()
const { pagesKey, collections, space } = useSpace('glassbox')
const base = `/t/glassbox/${space}`

// Shaped here so the payload carries only what the page shows (ADR-0028).
const { data, status, error } = await useAsyncData(route.path, async () => {
  const [landing, pages, terms] = await Promise.all([
    queryCollection(pagesKey).path('/').first(),
    queryCollection(pagesKey).order('stem', 'ASC').select('path', 'title', 'description').all(),
    queryCollection(collections.terms).where('stem', 'IN', [...glassboxLandingTerms]).select('stem', 'term', 'definition', 'source').all(),
  ])
  return {
    landing,
    words: glassboxLandingTerms.flatMap((id) => terms.filter((t) => t.stem === id)),
    directory: glassboxDirectory(pages),
    walkthroughs: glassboxWalkthroughs(pages),
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
const openTerm = ref<string>()
const openEntry = computed(() => data.value?.words.find((word) => word.stem === openTerm.value))
const definitionId = useId()
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

    <section v-if="data?.directory.length" class="directory">
      <h2>Subjects</h2>
      <div class="cards">
        <section v-for="subject in data.directory" :id="subject.slug" :key="subject.slug" class="card gb-pane">
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
          <a class="folder" :href="folderUrl(subject.slug)" title="This folder in the GitHub repo">files on GitHub ↗</a>
        </section>
      </div>
    </section>

    <section v-if="data?.walkthroughs.length" class="walkthroughs">
      <h2>Walkthroughs</h2>
      <ul>
        <li v-for="page in data.walkthroughs" :key="page.path">
          <NuxtLink :to="`${base}${page.path}`"><strong>{{ page.title }} →</strong><span class="teaser">{{ page.description }}</span></NuxtLink>
        </li>
      </ul>
      <a class="folder" :href="folderUrl('walkthroughs')" title="This folder in the GitHub repo">files on GitHub ↗</a>
    </section>

    <section v-if="data?.words.length" class="words" aria-labelledby="words-h">
      <h2 id="words-h" class="gb-label">Terms you’ll meet</h2>
      <p class="hint">Tap a term to see what it means.</p>
      <ul>
        <li v-for="word in data.words" :key="word.stem">
          <button
            type="button"
            :aria-expanded="openTerm === word.stem"
            :aria-controls="definitionId"
            @click="openTerm = openTerm === word.stem ? undefined : word.stem"
          >{{ word.term }}</button>
        </li>
      </ul>
      <p v-show="openEntry" :id="definitionId" class="definition" role="note" aria-live="polite">{{ openEntry?.definition }}<File v-if="openEntry?.source" class="source">{{ openEntry.source }}</File></p>
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
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--gb-muted);
}
.folder { align-self: flex-end; margin-top: auto; font: 400 11.5px var(--gb-mono); color: var(--gb-muted); text-decoration: underline 1px dotted; text-underline-offset: 3px; }

/* The term strip: chips like Term.vue's inline terms, one definition open at a time. */
.words { margin-bottom: 40px; }
.words h2 { margin-bottom: 4px; }
.words .hint { margin: 0 0 10px; font-size: 13px; color: var(--gb-muted); }
.words ul { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.words button { all: unset; cursor: pointer; padding: 4px 12px; border: 1px solid var(--gb-line); border-radius: 999px; font-size: 14px; }
.words button:hover, .words button[aria-expanded='true'] { color: var(--gb-accent); border-color: var(--gb-accent); }
.words button:focus-visible { outline: 2px solid var(--gb-accent); outline-offset: 2px; }
.definition { max-width: 720px; margin: 12px 0 0; padding: 10px 14px; border-radius: 12px; background: var(--gb-tint); color: var(--gb-ink-2); font-size: 14px; line-height: 1.5; }
.definition .source { margin-inline-start: 0.4em; }

/* Plain, not a pane: Walkthroughs aren't ready to stand out (GLOSSARY.md). */
.walkthroughs { display: flex; flex-direction: column; gap: 4px; }
.walkthroughs ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px 24px; margin: 0 0 6px; padding: 0; list-style: none; }
.walkthroughs a { display: flex; flex-direction: column; gap: 2px; color: inherit; text-decoration: none; }
.walkthroughs a:hover strong { color: var(--gb-accent); }
.walkthroughs strong { font-weight: 600; }

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
.card .teaser { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.card .title { font-size: 15px; line-height: 1.4; color: var(--gb-ink); font-weight: 500; }
.card .title::after { content: ' →'; color: var(--gb-muted); }
.card li a:hover .title { color: var(--gb-accent); }

.sources ul { display: flex; flex-wrap: wrap; gap: 10px; margin: 0; padding: 0; list-style: none; }
.sources h2 { margin-bottom: 12px; }
.sources a { display: flex; flex-direction: column; gap: 2px; padding: 10px 16px; border-radius: 12px; color: var(--gb-ink); text-decoration: none; font-size: 14px; }
.sources a span::after { content: ' ↗'; color: var(--gb-muted); }
.sources code { color: var(--gb-muted); }

.about { max-width: 720px; font-size: 16px; color: var(--gb-ink-2); }
.about :deep(p) { margin: 0 0 0.8em; }

@media (max-width: 640px) {
  .hero { padding: 28px 0 32px; }
  .lede { font-size: 17px; }
  section { margin-bottom: 40px; }
}
</style>
