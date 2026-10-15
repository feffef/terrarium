<script setup lang="ts">
import type { MinimarkTree } from '@nuxt/content'

const props = defineProps<{ page: { path: string, title: string, body: MinimarkTree } }>()

const subject = computed(() => glassboxSubjectOf(props.page.path))
const shown = computed(() => subject.value
  ? { ...props.page, body: { ...props.page.body, value: glassboxLessonSections(props.page.body.value) } }
  : props.page)
</script>

<template>
  <article class="article">
    <p v-if="subject" class="chips"><span class="chip">{{ subject.name }}</span><span>Lesson</span></p>
    <h1 :class="{ lesson: subject }">{{ page.title }}</h1>
    <ContentRenderer class="gb-prose" :value="shown" />
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
  padding: 28px 32px 30px;
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
.article :deep(.gb-kicker) { margin: 0; }
.article :deep(.gb-concept h2) { margin: 8px 0 14px; }
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
  padding: 20px 22px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 16px;
  background: var(--gb-pane);
  font-size: 15.5px;
  line-height: 1.6;
}
.article :deep(.gb-card h3) { margin: 0 0 10px; font-size: 17px; }
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

@media (prefers-color-scheme: dark) {
  .article :deep(.gb-try) {
    border: 1px solid color-mix(in srgb, var(--gb-accent) 25%, transparent);
    background: var(--gb-tint);
    color: var(--gb-ink);
  }
}
@media (max-width: 640px) {
  .article :deep(.gb-concept) { padding: 20px 18px; border-radius: 16px; }
  .article :deep(.gb-concept h2) { font-size: 23px; }
  .article :deep(.gb-cards) { grid-template-columns: 1fr; }
  .article :deep(.gb-try) { padding: 18px; font-size: 16px; }
  .article :deep(.gb-next li) { grid-template-columns: 84px minmax(0, 1fr) auto; }
}
</style>
