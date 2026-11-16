<script setup lang="ts">
import type { GlassboxPageLink } from '../../utils/subjects'

const props = defineProps<{ name: string, lessons: GlassboxPageLink[], base: string, plain?: boolean, intro?: string }>()
const { read } = useGlassboxRead()
const readCount = computed(() => props.lessons.filter((lesson) => read.value.includes(lesson.path)).length)
</script>

<template>
  <article class="article">
    <h1>{{ name }}</h1>
    <p v-if="intro" class="intro">{{ intro }}</p>
    <p v-if="!plain" class="count">{{ glassboxSubjectCount(readCount, lessons.length) }}</p>
    <ul class="list">
      <li v-for="lesson in lessons" :key="lesson.path">
        <NuxtLink :to="`${base}${lesson.path}`">{{ lesson.title }}<template v-if="!plain"><span v-if="read.includes(lesson.path)" class="tick gb-tick" role="img" aria-label="Read"/><span v-else class="book gb-book" aria-hidden="true"/></template></NuxtLink>
        <p v-if="lesson.description">{{ lesson.description }}</p>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.count { color: var(--gb-muted); font-size: 15px; }
.intro { margin: 0 0 22px; color: var(--gb-ink-2); font-size: 18px; line-height: 1.5; }
.list { padding: 0; list-style: none; border-top: 1px solid var(--gb-line); }
.list li { position: relative; padding: 14px 0; border-bottom: 1px solid var(--gb-line); }
.list a { color: var(--gb-ink); font-weight: 500; font-size: 17px; text-decoration: none; }
/* The link's box covers the whole teaser, so a click anywhere on it opens the Lesson. */
.list a::after { content: ''; position: absolute; inset: 0; }
.tick, .book { margin-left: 6px; font-size: 14px; color: var(--gb-accent); }
.list a:hover { color: var(--gb-accent); }
.list p { margin: 4px 0 0; color: var(--gb-muted); font-size: 15px; }
</style>
