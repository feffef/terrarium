<script setup lang="ts">
// A static segment, so it outranks the sibling `[...slug].vue`. Reads only this
// Space's own sessions via useSpace, like index.vue.
import type { NoteItem } from '../../../../types/journal'

definePageMeta({ name: 'journal-ideas' })
const PAGE_TITLE = 'Ideas & learnings'

const route = useRoute()
const { space, collections } = useSpace('journal')

const { data } = await useAsyncData(route.path, () =>
  queryCollection(collections.sessions).order('endedAt', 'DESC').all(),
)
const notes = computed(() => sessionNotes(data.value ?? []))

// Keyed by index: several ideas can share one session.
const copiedIdeaIndex = ref<number | null>(null)
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null
const copyIdeaPrompt = async (item: NoteItem, i: number) => {
  try {
    await navigator.clipboard.writeText(ideaGrillPrompt(item))
    copiedIdeaIndex.value = i
    if (copiedResetTimer) clearTimeout(copiedResetTimer)
    copiedResetTimer = setTimeout(() => (copiedIdeaIndex.value = null), 1600)
  } catch {
    // Clipboard unavailable (insecure origin, denied permission): no confirmation.
  }
}
onBeforeUnmount(() => {
  if (copiedResetTimer) clearTimeout(copiedResetTimer)
})

useSeoMeta({ title: () => `${PAGE_TITLE} · journal/${space}` })
</script>

<template>
  <main class="jd">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>
      <span>journal</span>
      <span class="sep">/</span>
      <NuxtLink :to="`/t/journal/${space}`">{{ space }}</NuxtLink>
      <span class="sep">/</span>
      <span class="here">{{ PAGE_TITLE }}</span>
    </nav>

    <article class="jd-prose">
      <h1>{{ PAGE_TITLE }}</h1>
      <p>
        What agents noted along the way in this Space's sessions, newest first:
        <strong>ideas</strong> for future work — not built yet, just noted — and
        <strong>learnings</strong> they worked out during the work.
      </p>

      <h2>Ideas <span class="n">{{ notes.ideas.length }}</span></h2>
      <ol v-if="notes.ideas.length" class="notes">
        <li v-for="(item, i) in notes.ideas" :key="i">
          <button
            type="button"
            class="idea-copy"
            :class="{ copied: copiedIdeaIndex === i }"
            :aria-label="`Copy a grill-with-docs prompt to refine this idea (from session ${item.session})`"
            :title="copiedIdeaIndex === i ? 'Copied grill prompt' : 'Copy grill prompt for this idea'"
            @click="copyIdeaPrompt(item, i)"
          >
            <!-- A lightbulb doubled like the copy icon's two-sheet motif: "copy this idea". -->
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
            >
              <g transform="translate(5 0.5) scale(0.7)">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
              </g>
              <g transform="translate(-0.5 5) scale(0.7)">
                <path
                  d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
                  style="fill: var(--jd-surface)"
                />
                <path d="M9 18h6" />
                <path d="M10 21h4" />
              </g>
            </svg>
          </button>
          <span>{{ item.note }}</span>
          <NuxtLink class="src" :to="`/t/journal/${space}#${item.anchor}`">source →</NuxtLink>
        </li>
      </ol>
      <p v-else>No ideas logged in this Space yet.</p>

      <h2>Learnings <span class="n">{{ notes.learnings.length }}</span></h2>
      <ul v-if="notes.learnings.length" class="notes">
        <li v-for="(item, i) in notes.learnings" :key="i">
          <span class="bullet" aria-hidden="true">›</span>
          <span>{{ item.note }}</span>
          <NuxtLink class="src" :to="`/t/journal/${space}#${item.anchor}`">source →</NuxtLink>
        </li>
      </ul>
      <p v-else>No learnings logged in this Space yet.</p>
    </article>

    <SiteFooter />
  </main>
</template>

<style scoped>
.jd-prose { max-width: 80ch; }
.n { color: var(--jd-faint); font-weight: 400; margin-left: 0.4rem; }
.notes { list-style: none; padding: 0; }
.notes li {
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  gap: 0.7rem;
  align-items: baseline;
  margin: 0;
  padding: 0.4rem 0;
  border-top: 1px solid var(--jd-line);
  font-size: 0.92rem;
}
.notes li:first-child { border-top: 0; }
.notes li > span:not(.bullet) { overflow-wrap: anywhere; }
.bullet { color: var(--jd-accent); font-weight: 600; }
.jd-prose .src {
  font-family: var(--jd-mono);
  font-size: 0.7rem;
  color: var(--jd-faint);
  text-decoration: none;
  white-space: nowrap;
}
.jd-prose .src:hover { color: var(--jd-accent); text-decoration: underline; }
.idea-copy {
  align-self: start;
  display: inline-flex;
  padding: 0;
  margin-top: 0.1rem;
  background: none;
  border: none;
  color: var(--jd-faint);
  cursor: pointer;
  transition: color 0.15s ease, transform 0.15s ease;
}
.idea-copy svg { width: 1.05rem; height: 1.05rem; display: block; }
.idea-copy:hover, .idea-copy.copied { color: var(--jd-accent); }
.idea-copy.copied { transform: scale(1.12); cursor: default; }
.idea-copy:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 2px; border-radius: 4px; }
</style>
