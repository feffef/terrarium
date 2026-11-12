<script setup lang="ts">
import type { GlassboxPageLink } from '../../utils/subjects'

const props = defineProps<{
  base: string
  path: string
  subjects: ReturnType<typeof glassboxDirectory>
  walkthroughs: GlassboxPageLink[]
}>()
defineEmits<{ close: [] }>()

const currentSubject = computed(() => props.path.split('/')[1])
// PROTOTYPE (#3130): three looks for read state, picked by ?variant=.
const { read, variant, isRead } = useGlassboxRead()
const readIn = (subject: { lessons: { path: string }[] }) => subject.lessons.filter((l) => read.value.includes(l.path)).length
</script>

<template>
  <nav class="sidebar" :class="`v-${variant}`" aria-label="Glass Box">
    <div class="panel-head">
      <span>Subjects</span>
      <button type="button" class="close" aria-label="Close menu" @click="$emit('close')">✕</button>
    </div>

    <section v-if="subjects.length">
      <h2 class="gb-label">Subjects</h2>
      <details v-for="subject in subjects" :key="subject.slug" :open="subject.slug === currentSubject">
        <summary>
          <span>{{ subject.name }}</span>
          <span class="count" :class="{ done: readIn(subject) === subject.lessons.length }">{{ variant === 'B' || !readIn(subject) ? subject.lessons.length : `${readIn(subject)}/${subject.lessons.length}` }}</span>
          <i v-if="variant === 'B' && readIn(subject)" class="bar" :style="{ width: `${(readIn(subject) / subject.lessons.length) * 100}%` }" />
        </summary>
        <ul>
          <li v-for="lesson in subject.lessons" :key="lesson.path" :class="{ read: isRead(lesson.path) }">
            <NuxtLink :to="`${base}${lesson.path}`" :aria-current="lesson.path === path ? 'page' : undefined"><span v-if="variant === 'A' && isRead(lesson.path)" class="tick" aria-label="read">✓</span>{{ lesson.title }}<em v-if="variant === 'C' && isRead(lesson.path)" class="tag">read</em></NuxtLink>
          </li>
        </ul>
      </details>
    </section>

    <section v-if="walkthroughs.length">
      <h2 class="gb-label">Walkthroughs</h2>
      <ul>
        <li v-for="page in walkthroughs" :key="page.path">
          <NuxtLink :to="`${base}${page.path}`" :aria-current="page.path === path ? 'page' : undefined">{{ page.title }}</NuxtLink>
        </li>
      </ul>
    </section>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 16px;
  font-size: 14px;
  line-height: 1.35;
}
.panel-head { display: none; }
a { text-decoration: none; }
a:hover { color: var(--gb-accent); }
h2 { margin: 0; padding: 0 10px 8px; }
ul { list-style: none; margin: 0; padding: 0; }
summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 10px;
  border-radius: 10px;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker { display: none; }
summary:hover { background: var(--gb-tint); }
.count { font: 11.5px var(--gb-mono); color: var(--gb-muted); }
details ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 2px 0 8px 14px;
  padding-left: 10px;
  border-left: 1px solid var(--gb-line);
}
li a {
  display: block;
  padding: 7px 10px;
  border-radius: 9px;
  font-size: 13.5px;
  color: var(--gb-ink-2);
}
li a[aria-current='page'] { background: var(--gb-solid); color: var(--gb-solid-ink); }

/* PROTOTYPE (#3130) */
summary { position: relative; }
.tick { margin-right: 6px; font-size: 12px; color: var(--gb-accent); }
li a[aria-current='page'] .tick { color: inherit; }
.count.done { color: var(--gb-accent); }
.v-B li.read a:not([aria-current='page']) { color: var(--gb-muted); }
.v-B .bar { position: absolute; left: 10px; bottom: 2px; height: 2px; max-width: calc(100% - 20px); border-radius: 2px; background: var(--gb-accent); }
li a { justify-content: space-between; }
.v-A li a, .v-B li a { justify-content: flex-start; }
.tag { margin-left: auto; padding-left: 8px; font: normal 10.5px var(--gb-mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--gb-muted); }
li a[aria-current='page'] .tag { color: inherit; opacity: 0.7; }
.v-C li a { display: flex; align-items: center; }

/* Below 1024px the sidebar is a panel the menu button opens (.gb-doc in theme.css). */
@media (max-width: 1023.98px) {
  .sidebar {
    gap: 6px;
    padding: 14px 18px 22px;
    font-size: 16px;
    border-radius: 22px;
    background: var(--gb-bar);
    border: 1px solid var(--gb-pane-edge);
    box-shadow: var(--gb-pane-shadow);
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 48px;
    font-weight: 600;
  }
  .close {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 12px;
    background: var(--gb-solid);
    color: var(--gb-solid-ink);
    font-size: 16px;
    cursor: pointer;
  }
  section > h2 { display: none; }
  section + section > h2 { display: block; padding-top: 16px; }
  summary { min-height: 44px; padding: 0 4px; border-radius: 0; border-bottom: 1px solid var(--gb-line); font-size: 16px; }
  li a { min-height: 40px; display: flex; align-items: center; padding: 0 12px; font-size: 15px; }
}
</style>
