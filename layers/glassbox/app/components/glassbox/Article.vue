<script setup lang="ts">
import type { MinimarkTree, Toc } from '@nuxt/content'
import type { GlassboxPageLink } from '../../utils/subjects'

const props = defineProps<{
  page: { path: string, title: string, revisionDate: string, body: MinimarkTree & { toc?: Toc } }
  base: string
  surround: ReturnType<typeof glassboxSurround>
  through: GlassboxPageLink[]
}>()

const subject = computed(() => glassboxSubjectOf(props.page.path))
const walkthrough = computed(() => glassboxWalkthroughOf(props.page.path))
const current = ref<string>()
// Frames first, then separate renders so the table of contents sits between the
// lede and the first section, and each Walkthrough stop can show it is current.
const parts = computed(() => {
  const { body } = props.page
  const framed = subject.value ? glassboxLessonSections(body.value, props.base) : body.value
  const [intro, rest] = glassboxSplitBeforeBody(framed)
  const sections = glassboxFrameDiagrams(rest)
  const withBody = (nodes: typeof intro) => ({ ...props.page, body: { ...body, value: nodes } })
  return {
    intro: withBody(intro),
    sections: (walkthrough.value ? glassboxWalkthroughParts(sections, props.base) : [{ nodes: sections }])
      .map((part) => ({ ...part, value: withBody(part.nodes) })),
    toc: body.toc?.links ?? [],
  }
})
</script>

<template>
  <article class="article">
    <p v-if="subject" class="chips"><span class="chip">{{ subject.name }}</span><span>Lesson</span></p>
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
    <template v-if="through.length">
      <h2>Walkthroughs through this Lesson</h2>
      <ul class="gb-next">
        <li v-for="w in through" :key="w.path"><span>{{ glassboxLessonLabels.walkthrough }}</span><NuxtLink :to="`${base}${w.path}`">{{ w.title }}</NuxtLink></li>
      </ul>
    </template>
    <GlassboxSurround v-if="surround" :base="base" :prev="surround.prev" :next="surround.next" />
    <GlassboxUpdated placement="end" :date="page.revisionDate" />
  </article>
</template>

<!-- Design 1b's Lesson sections; the frames come from glassboxLessonSections. -->
<style scoped>
.chips { display: flex; gap: 8px; margin: 40px 0 0; font-size: 13px; color: var(--gb-muted); }
.chips span { padding: 5px 12px; }
.chips .chip {
  border: 1px solid var(--gb-pane-edge);
  border-radius: 99px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
  color: var(--gb-ink);
}
.article h1.lesson { margin-top: 16px; }

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
  margin-top: 36px;
  padding: 26px 30px;
  border-radius: 18px;
  background: var(--gb-solid);
  color: var(--gb-solid-ink);
  font-size: 18px;
  line-height: 1.55;
}
.article :deep(.gb-try h2) {
  margin: 0;
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
  padding: 22px 24px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 16px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
  backdrop-filter: blur(16px);
}
.stop-pane :deep(h2) { margin: 0 0 10px; font-size: 22px; }
.stop-pane :deep(> :last-child) { margin-bottom: 0; }
.stop.current .stop-n { border-color: var(--gb-solid); background: var(--gb-solid); color: var(--gb-solid-ink); }
.stop.current .stop-pane { border-color: color-mix(in srgb, var(--gb-accent) 45%, transparent); }
.stop-pane :deep(.gb-stop-links) { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; padding: 0; list-style: none; }
.stop-pane :deep(.gb-stop-links li) {
  position: relative;
  margin: 0;
  padding: 3px 11px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 8px;
  background: var(--gb-bg);
  font-size: 14px;
  line-height: 1.5;
}
.stop-pane :deep(.gb-stop-links span:first-child) { color: var(--gb-muted); }
.stop-pane :deep(.gb-stop-links span:first-child)::after { content: ' · '; }
.stop-pane :deep(.gb-stop-links li > a:not(.file)) { color: var(--gb-ink); text-decoration: none; }
.stop-pane :deep(.gb-stop-links li > a:not(.file))::after { content: ' →'; }

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
  .stop-pane { padding: 18px 16px; }
  .article :deep(.gb-case) { padding: 18px; }
  .stop-pane :deep(h2) { font-size: 20px; }
  .article :deep(.gb-concept) { --gb-concept-pad: 20px; padding: var(--gb-concept-pad) 18px; border-radius: 16px; }
  .article :deep(.gb-concept h2) { font-size: 23px; }
  .article :deep(.gb-cards) { grid-template-columns: 1fr; }
  .article :deep(.gb-try) { padding: 18px; font-size: 16px; }
  .article :deep(.gb-next li) { grid-template-columns: 100px minmax(0, 1fr) auto; }
}
</style>
