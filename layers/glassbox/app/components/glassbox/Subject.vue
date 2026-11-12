<script setup lang="ts">
import type { GlassboxPageLink } from '../../utils/subjects'

const props = defineProps<{ name: string, lessons: GlassboxPageLink[], base: string }>()
const { read } = useGlassboxRead()
const readCount = computed(() => props.lessons.filter((lesson) => read.value.includes(lesson.path)).length)
</script>

<template>
  <article class="article">
    <h1>{{ name }}</h1>
    <p class="count">{{ glassboxSubjectCount(readCount, lessons.length) }}</p>
    <ul class="list">
      <li v-for="lesson in lessons" :key="lesson.path">
        <NuxtLink :to="`${base}${lesson.path}`">{{ lesson.title }}<span v-if="read.includes(lesson.path)" class="tick gb-tick" role="img" aria-label="Read"/><span v-else class="book" aria-hidden="true"/></NuxtLink>
        <p v-if="lesson.description">{{ lesson.description }}</p>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.count { color: var(--gb-muted); font-size: 15px; }
.list { padding: 0; list-style: none; border-top: 1px solid var(--gb-line); }
.list li { position: relative; padding: 14px 0; border-bottom: 1px solid var(--gb-line); }
.list a { color: var(--gb-ink); font-weight: 500; font-size: 17px; text-decoration: none; }
/* The link's box covers the whole teaser, so a click anywhere on it opens the Lesson. */
.list a::after { content: ''; position: absolute; inset: 0; }
.tick, .book { margin-left: 6px; font-size: 14px; color: var(--gb-accent); }
/* The book Article.vue puts after a link to another Glass Box page, which a read Lesson swaps for the tick. */
.book {
  display: inline-block;
  inline-size: 0.85em;
  block-size: 0.85em;
  vertical-align: -0.08em;
  background: currentColor;
  mask: var(--gb-book) center / contain no-repeat;
}
.list a:hover { text-decoration: underline; }
.list p { margin: 4px 0 0; color: var(--gb-muted); font-size: 15px; }
</style>
