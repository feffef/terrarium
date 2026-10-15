<script setup lang="ts">
import type { GlassboxPageLink } from '../../utils/subjects'

const props = defineProps<{
  base: string
  path: string
  subjects: ReturnType<typeof glassboxDirectory>
  walkthroughs: GlassboxPageLink[]
}>()
defineEmits<{ close: [] }>()

const startHere = computed(() => props.walkthroughs.find((page) => page.path === glassboxStartHere))
const currentSubject = computed(() => props.path.split('/')[1])
</script>

<template>
  <nav class="sidebar" aria-label="Glass Box">
    <div class="panel-head">
      <span>Subjects</span>
      <button type="button" class="close" aria-label="Close menu" @click="$emit('close')">✕</button>
    </div>

    <NuxtLink v-if="startHere" class="start" :to="`${base}${startHere.path}`">
      <span class="gb-label">Start here</span>
      <strong>{{ startHere.title }}</strong>
    </NuxtLink>

    <section v-if="subjects.length">
      <h2 class="gb-label">Subjects</h2>
      <details v-for="subject in subjects" :key="subject.slug" :open="subject.slug === currentSubject">
        <summary>
          <span>{{ subject.name }}</span>
          <span class="count">{{ subject.lessons.length }}</span>
        </summary>
        <ul>
          <li v-for="lesson in subject.lessons" :key="lesson.path">
            <NuxtLink :to="`${base}${lesson.path}`" :aria-current="lesson.path === path ? 'page' : undefined">{{ lesson.title }}</NuxtLink>
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
.start {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--gb-tint);
  color: var(--gb-ink);
}
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

/* Below 1024px the sidebar is a panel the menu button opens (.gb-doc in theme.css). */
@media (max-width: 1023.98px) {
  .sidebar {
    gap: 6px;
    padding: 14px 18px 22px;
    font-size: 16px;
    border-radius: 22px;
    background: color-mix(in srgb, var(--gb-bg) 72%, transparent);
    backdrop-filter: blur(20px);
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
  .start { flex-direction: row; justify-content: space-between; align-items: center; min-height: 48px; padding: 0 14px; margin-bottom: 6px; }
  section > h2 { display: none; }
  section + section > h2 { display: block; padding-top: 16px; }
  summary { min-height: 44px; padding: 0 4px; border-radius: 0; border-bottom: 1px solid var(--gb-line); font-size: 16px; }
  li a { min-height: 40px; display: flex; align-items: center; padding: 0 12px; font-size: 15px; }
}
</style>
