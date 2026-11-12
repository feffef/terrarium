<script setup lang="ts">
import type { MinimarkTree, Toc } from '@nuxt/content'
import type { GlassboxPageLink } from '../../utils/subjects'
import type { GlassboxTitles } from '../../utils/lesson'

const props = defineProps<{
  page: { path: string, title: string, revisionDate: string, body: MinimarkTree & { toc?: Toc } }
  base: string
  surround: ReturnType<typeof glassboxSurround>
  through: GlassboxPageLink[]
  titles: GlassboxTitles
  dated: boolean
  source?: string
}>()

const { read, reset } = useGlassboxRead()

// Only Lessons with a known title can be listed below, so only they leave Where next.
const readable = computed(() => read.value.filter((path) => props.titles[path]))
const subject = computed(() => glassboxSubjectOf(props.page.path))
const walkthrough = computed(() => glassboxWalkthroughOf(props.page.path))
// The hand-written Where next links already read move into their own section below it.
const readNext = computed(() => subject.value
  ? glassboxNextLessons(props.page.body.value, props.base)
    .filter((path) => readable.value.includes(path))
    .map((path) => ({ path, title: props.titles[path]!, subject: glassboxSubjectOf(path)!.name }))
  : [])
const current = ref<string>()
// Frames first, then separate renders so the table of contents sits between the
// lede and the first section, and each Walkthrough stop can show it is current.
const parts = computed(() => {
  const { body } = props.page
  const framed = subject.value ? glassboxLessonSections(body.value, props.base, props.titles, readable.value) : body.value
  const [intro, rest] = glassboxSplitBeforeBody(framed)
  const sections = glassboxFrameDiagrams(rest)
  const withBody = (nodes: typeof intro) => ({ ...props.page, body: { ...body, value: nodes } })
  return {
    intro: withBody(walkthrough.value ? intro : intro.map((node) => glassboxLessonChipsDeep(node, props.base))),
    sections: (walkthrough.value ? glassboxWalkthroughParts(sections, props.base, props.titles) : [{ nodes: sections.map((node) => glassboxLessonChipsDeep(node, props.base)) }])
      .map((part) => ({ ...part, value: withBody(part.nodes) })),
    toc: subject.value ? glassboxLessonToc(body.toc?.links ?? [], body.value, props.base, readable.value) : body.toc?.links ?? [],
  }
})
</script>

<template>
  <article class="article">
    <p v-if="subject" class="chips"><NuxtLink class="chip" :to="`${base}/${subject.slug}`">{{ subject.name }}</NuxtLink><span>Lesson</span></p>
    <p v-else-if="walkthrough" class="chips"><span class="chip">Walkthrough</span></p>
    <h1 :class="{ lesson: subject || walkthrough }">{{ page.title }}</h1>
    <ContentRenderer class="gb-prose" :value="parts.intro" />
    <GlassboxToc v-if="parts.toc.length" v-model:current="current" :links="parts.toc" />
    <template v-for="(part, i) in parts.sections" :key="i">
      <div v-if="part.stop" class="stop" :class="{ current: part.id === current }">
        <span class="stop-n">{{ part.stop }}</span>
        <ContentRenderer class="gb-prose stop-pane" :value="part.value" />
      </div>
      <ContentRenderer v-else class="gb-prose" :value="part.value" />
    </template>
    <section v-if="readNext.length" class="read">
      <h2>Lessons already read</h2>
      <ul>
        <li v-for="lesson in readNext" :key="lesson.path"><span>{{ lesson.subject }}</span><NuxtLink :to="`${base}${lesson.path}`">{{ lesson.title }}</NuxtLink><span class="tick" role="img" aria-label="Read">✓</span></li>
      </ul>
      <button type="button" class="reset" @click="reset">Reset reading progress</button>
    </section>
    <template v-if="through.length">
      <h2>Walkthroughs through this Lesson</h2>
      <ul class="gb-next">
        <li v-for="w in through" :key="w.path"><span>{{ glassboxLessonLabels.walkthrough }}</span><NuxtLink :to="`${base}${w.path}`">{{ w.title }}</NuxtLink></li>
      </ul>
    </template>
    <GlassboxSurround v-if="surround" :base="base" :prev="surround.prev" :next="surround.next" />
    <GlassboxUpdated v-if="dated" placement="end" :date="page.revisionDate" :source="source" />
  </article>
</template>

<!-- Design 1b's Lesson sections; the frames come from glassboxLessonSections. -->
<style scoped>
.chips { display: flex; gap: 8px; margin: 40px 0 0; font-size: 13px; color: var(--gb-muted); }
.chips span { padding: 5px 12px; }
.chips .chip {
  padding: 5px 12px;
  text-decoration: none;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 99px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
  color: var(--gb-ink);
}
.article h1.lesson { margin-top: 16px; }

.read { margin-top: 40px; }
.read h2 { margin: 0 0 12px; font-size: 22px; }
.read ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--gb-line); font-size: 16px; }
.read li { display: grid; grid-template-columns: 120px minmax(0, 1fr) auto; align-items: center; min-height: 48px; border-bottom: 1px solid var(--gb-line); }
.read li span:first-child { font: 11px var(--gb-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--gb-muted); }
.read a { color: var(--gb-ink); font-weight: 500; text-decoration: none; }
.read a:hover { color: var(--gb-accent); }
.tick { color: var(--gb-accent); }
.reset { margin-top: 14px; padding: 0; border: 0; background: none; font: 12.5px var(--gb-mono); color: var(--gb-muted); text-decoration: underline; cursor: pointer; }

.article :deep(.gb-skip) { font-size: 15px; color: var(--gb-muted); }
.article :deep(.gb-skip strong) { color: var(--gb-ink); font-weight: 600; }

.article :deep(.gb-concept) {
  --gb-concept-pad: 28px;
  --gb-kicker-h: 18px;
  --gb-kicker-gap: 8px;
  padding: var(--gb-concept-pad) 32px 30px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 18px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
  backdrop-filter: blur(16px);
}
.article :deep(:is(.gb-kicker, .gb-divider, .gb-next span)) {
  font: 11px var(--gb-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gb-muted);
}
.article :deep(.gb-kicker) { margin: 0; line-height: var(--gb-kicker-h); }
/* A jump to The concept clears its kicker too. */
.article :deep(.gb-concept h2) {
  margin: var(--gb-kicker-gap) 0 14px;
  scroll-margin-top: calc(var(--gb-heading-clear) + var(--gb-concept-pad) + var(--gb-kicker-h) + var(--gb-kicker-gap));
}
.article :deep(.gb-concept > :last-child) { margin-bottom: 0; }
.article :deep(.gb-ref) {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 10px 16px;
  border-radius: 12px;
  background: var(--gb-solid);
  color: var(--gb-solid-ink);
  font-size: 14.5px;
}
.article :deep(.gb-ref span) { font: 11px var(--gb-mono); letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.7; }
.article :deep(.gb-ref a) { color: inherit; text-decoration: none; }
.article :deep(.gb-ref a)::after { content: ' ↗'; }

.article :deep(.gb-divider) { display: flex; align-items: center; gap: 12px; margin: 28px 0 18px; }
.article :deep(.gb-divider)::before, .article :deep(.gb-divider)::after { content: ''; flex: 1; height: 1px; background: var(--gb-line); }
.article :deep(.gb-divider + h2) { margin-top: 0; }

.article :deep(.gb-cards) { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
.article :deep(.gb-card) {
  --gb-card-pad: 20px;
  padding: var(--gb-card-pad) 22px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 16px;
  background: var(--gb-pane);
  font-size: 15.5px;
  line-height: 1.6;
}
.article :deep(.gb-card h3) { margin: 0 0 10px; font-size: 17px; scroll-margin-top: calc(var(--gb-heading-clear) + var(--gb-card-pad)); }
.article :deep(.gb-card ul) { padding-left: 18px; }
.article :deep(.gb-card > :last-child) { margin-bottom: 0; }

.article :deep(.gb-try) {
  --gb-try-pad: 26px;
  margin-top: 36px;
  padding: var(--gb-try-pad) 30px;
  border-radius: 18px;
  background: var(--gb-solid);
  color: var(--gb-solid-ink);
  font-size: 18px;
  line-height: 1.55;
}
/* A jump to Try it clears the box's top too. */
.article :deep(.gb-try h2) {
  margin: 0;
  scroll-margin-top: calc(var(--gb-heading-clear) + var(--gb-try-pad));
  font: 11px var(--gb-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.article :deep(.gb-try :is(h2, a)) { color: var(--gb-solid-accent); }
.article :deep(.gb-try p) { margin: 10px 0 0; }
/* A fence keeps its own code background, so it takes the page's ink, not the box's. */
.article :deep(.gb-try pre) { color: var(--gb-ink); }

.article :deep(h2:has(+ .gb-next)) { font-size: 22px; margin-top: 40px; }
.article :deep(.gb-next) { padding: 0; list-style: none; border-top: 1px solid var(--gb-line); font-size: 16px; }
.article :deep(.gb-next li) {
  position: relative;
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 48px;
  margin: 0;
  border-bottom: 1px solid var(--gb-line);
}
.article :deep(.gb-next li)::after { content: '→'; color: var(--gb-accent); }
.article :deep(.gb-next a) { color: var(--gb-ink); font-weight: 500; text-decoration: none; }
.article :deep(.gb-next a)::after { content: ''; position: absolute; inset: 0; }

/* Walkthrough stops: numbered circles on a thread, each stop its own pane. */
.stop { position: relative; display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 16px; margin-top: 16px; }
.stop:has(+ .stop)::before { content: ''; position: absolute; top: 44px; bottom: -16px; left: 21.5px; width: 1px; background: var(--gb-line); }
.stop-n {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--gb-line);
  border-radius: 50%;
  background: var(--gb-bg);
  font-size: 15px;
  font-weight: 600;
}
.stop-pane {
  --gb-stop-pad: 22px;
  padding: var(--gb-stop-pad) 24px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 16px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
  backdrop-filter: blur(16px);
}
/* A jump to a stop clears its pane's top too; .article outranks theme.css's heading rule. */
.article .stop-pane :deep(h2) { margin: 0 0 10px; font-size: 22px; scroll-margin-top: calc(var(--gb-heading-clear) + var(--gb-stop-pad)); }
.stop-pane :deep(> :last-child) { margin-bottom: 0; }
.stop.current .stop-n { border-color: var(--gb-solid); background: var(--gb-solid); color: var(--gb-solid-ink); }
.stop.current .stop-pane { border-color: color-mix(in srgb, var(--gb-accent) 45%, transparent); }
.article :deep(.gb-lessons) { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; padding: 0; list-style: none; }
.article :deep(.gb-lessons li) {
  position: relative;
  margin: 0;
  padding: 3px 11px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 8px;
  background: var(--gb-bg);
  font-size: 14px;
  line-height: 1.5;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.article :deep(.gb-lessons span:first-child) { color: var(--gb-muted); }
.article :deep(.gb-lessons span:first-child)::after { content: ' · '; }
.article :deep(.gb-lessons li > a:not(.file)) { color: var(--gb-ink); text-decoration: none; }
/* A book marks a link to another Glass Box page, as "?" marks a term. Navigation (the
   subject chip, Surround cards, Where next rows) is already read as a link, and a file link has its ↗. */
.article :deep(a[href^="/t/glassbox/"]:not(.file, .chip, .card, .gb-next a, .read a))::after {
  content: '';
  display: inline-block;
  inline-size: 0.85em;
  block-size: 0.85em;
  margin-inline-start: 0.3em;
  vertical-align: -0.08em;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 3.5C6.5 2.5 4 2.3 1.5 2.8v9.7c2.5-.5 5-.3 6.5.7 1.5-1 4-1.2 6.5-.7V2.8C12 2.3 9.5 2.5 8 3.5zM8 3.5v9.7' fill='none' stroke='black' stroke-width='1.4' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat;
}
.article :deep(:is(.gb-lessons li, .lesson) > a:not(.file))::after { background: var(--gb-accent); }
.article :deep(li > .gb-lessons), .article :deep(li > p > .gb-lessons) { display: inline; margin: 0; }
.article :deep(li > .gb-lessons li), .article :deep(li > p > .gb-lessons li) { display: inline-block; margin: 3px 6px 3px 0; padding: 0 8px; font-size: 13px; }

.article :deep(.gb-case) {
  margin-top: 36px;
  padding: 24px 28px;
  border: 1px solid color-mix(in srgb, var(--gb-accent) 25%, transparent);
  border-radius: 18px;
  background: var(--gb-tint);
}
.article :deep(.gb-case h2) {
  margin: 0;
  font: 11px var(--gb-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gb-accent);
}
.article :deep(.gb-case p) { margin: 10px 0 0; }

@media (prefers-color-scheme: dark) {
  .stop.current .stop-n { border-color: var(--gb-ink); background: var(--gb-ink); color: var(--gb-bg); }
  .article :deep(.gb-try) {
    border: 1px solid color-mix(in srgb, var(--gb-accent) 25%, transparent);
    background: var(--gb-tint);
    color: var(--gb-ink);
  }
}
@media (max-width: 640px) {
  .stop { grid-template-columns: 32px minmax(0, 1fr); gap: 10px; }
  .stop:has(+ .stop)::before { top: 32px; left: 15.5px; }
  .stop-n { width: 32px; height: 32px; font-size: 13px; }
  .stop-pane { --gb-stop-pad: 18px; padding: var(--gb-stop-pad) 16px; }
  .article :deep(.gb-case) { padding: 18px; }
  .article .stop-pane :deep(h2) { font-size: 20px; }
  .article :deep(.gb-concept) { --gb-concept-pad: 20px; padding: var(--gb-concept-pad) 18px; border-radius: 16px; }
  .article :deep(.gb-concept h2) { font-size: 23px; }
  .article :deep(.gb-cards) { grid-template-columns: 1fr; }
  .article :deep(.gb-try) { --gb-try-pad: 18px; padding: var(--gb-try-pad); font-size: 16px; }
  .article :deep(.gb-next li) { grid-template-columns: 100px minmax(0, 1fr) auto; }
  .read li { grid-template-columns: 112px minmax(0, 1fr) auto; }
}
</style>
