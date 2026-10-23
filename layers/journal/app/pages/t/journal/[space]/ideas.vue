<script setup lang="ts">
// A static segment, so it outranks the sibling `[...slug].vue`. Reads only this
// Space's own sessions via useSpace, like index.vue.

definePageMeta({ name: 'journal-ideas' })
const PAGE_TITLE = 'Ideas & learnings'

const route = useRoute()
const { space, collections } = useSpace('journal')

const { data } = await useAsyncData(route.path, () =>
  queryCollection(collections.sessions).order('endedAt', 'DESC').all(),
)
const notes = computed(() => sessionNotes(data.value ?? []))

// Newest 20 of each list by default; `v-show`, not a slice, so every note stays in the HTML
// (same reasoning as the session feed on index.vue).
const NOTES_VISIBLE = 20
const showAllIdeas = ref(false)
const showAllLearnings = ref(false)
// The button leaves the DOM once clicked; hand focus to the first note it revealed.
async function revealNotes(list: 'ideas' | 'learnings') {
  if (list === 'ideas') showAllIdeas.value = true
  else showAllLearnings.value = true
  await nextTick()
  document.querySelectorAll(`#${list}-h + .notes li`)[NOTES_VISIBLE]?.querySelector<HTMLElement>('a')?.focus()
}

// Keyed by list and index: several notes can share one session.
const copiedKey = ref<string | null>(null)
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null
const copyPrompt = async (prompt: string, key: string) => {
  try {
    await navigator.clipboard.writeText(prompt)
    copiedKey.value = key
    if (copiedResetTimer) clearTimeout(copiedResetTimer)
    copiedResetTimer = setTimeout(() => (copiedKey.value = null), 1600)
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
  <main class="jd jd-doc">
    <JournalBreadcrumb :space="space" :trail="['ideas']" />

    <article class="jd-prose">
      <h1>{{ PAGE_TITLE }}</h1>
      <p>
        What agents noted along the way in this Space's sessions, newest first:
        <strong>ideas</strong> for future work — not built yet, just noted — and
        <strong>learnings</strong> they worked out during the work. These are the
        agents' own working notes, unedited.
      </p>

      <nav v-if="notes.ideas.length || notes.learnings.length" class="jump" aria-label="Jump to a section">
        Jump to: <a href="#ideas-h">{{ countOf(notes.ideas.length, 'idea') }}</a> ·
        <a href="#learnings-h">{{ countOf(notes.learnings.length, 'learning') }}</a>
      </nav>

      <h2 id="ideas-h">Ideas <span class="n">{{ notes.ideas.length }}</span></h2>
      <ol v-if="notes.ideas.length" class="notes">
        <li v-for="(item, i) in notes.ideas" v-show="showAllIdeas || i < NOTES_VISIBLE" :key="i">
          <button
            type="button"
            class="note-copy"
            :class="{ copied: copiedKey === `idea-${i}` }"
            :aria-label="`Copy a grill-with-docs prompt to refine this idea (from session ${item.session})`"
            :title="copiedKey === `idea-${i}` ? 'Copied grill prompt' : 'Copy grill prompt for this idea'"
            @click="copyPrompt(ideaGrillPrompt(item), `idea-${i}`)"
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
          <NuxtLink class="src" :to="`/t/journal/${space}#${item.anchor}`" :aria-label="`Source session, ${item.date}`">{{ item.date }} →</NuxtLink>
        </li>
      </ol>
      <button v-if="notes.ideas.length > NOTES_VISIBLE && !showAllIdeas" type="button" class="show-all" @click="revealNotes('ideas')">
        Show all {{ notes.ideas.length }} ideas
      </button>
      <p v-else-if="!notes.ideas.length">No ideas logged in this Space yet.</p>

      <h2 id="learnings-h">Learnings <span class="n">{{ notes.learnings.length }}</span></h2>
      <ul v-if="notes.learnings.length" class="notes">
        <li v-for="(item, i) in notes.learnings" v-show="showAllLearnings || i < NOTES_VISIBLE" :key="i">
          <button
            type="button"
            class="note-copy"
            :class="{ copied: copiedKey === `learning-${i}` }"
            :aria-label="`Copy a prompt to place this learning in the docs (from session ${item.session})`"
            :title="copiedKey === `learning-${i}` ? 'Copied docs prompt' : 'Copy prompt: where should this learning live?'"
            @click="copyPrompt(learningDocsPrompt(item), `learning-${i}`)"
          >
            <!-- An open book: "put this learning in the docs". -->
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
            >
              <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
              <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
            </svg>
          </button>
          <span>{{ item.note }}</span>
          <NuxtLink class="src" :to="`/t/journal/${space}#${item.anchor}`" :aria-label="`Source session, ${item.date}`">{{ item.date }} →</NuxtLink>
        </li>
      </ul>
      <button v-if="notes.learnings.length > NOTES_VISIBLE && !showAllLearnings" type="button" class="show-all" @click="revealNotes('learnings')">
        Show all {{ notes.learnings.length }} learnings
      </button>
      <p v-else-if="!notes.learnings.length">No learnings logged in this Space yet.</p>
    </article>

    <SiteFooter />
  </main>
</template>

<style scoped>
.jd-prose { max-width: 80ch; }
.jump { font-family: var(--jd-mono); font-size: 0.8rem; color: var(--jd-muted); }
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
.show-all {
  font: inherit;
  font-size: 0.85rem;
  padding: 0.4rem 0.9rem;
  color: var(--jd-accent);
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  cursor: pointer;
}
.show-all:hover { border-color: var(--jd-accent); }
.notes li:first-child { border-top: 0; }
.notes li > span { overflow-wrap: anywhere; }
.jd-prose .src {
  font-family: var(--jd-mono);
  font-size: 0.7rem;
  color: var(--jd-faint);
  text-decoration: none;
  white-space: nowrap;
}
.jd-prose .src:hover { color: var(--jd-accent); text-decoration: underline; }
.note-copy {
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
.note-copy svg { width: 1.05rem; height: 1.05rem; display: block; }
.note-copy:hover, .note-copy.copied { color: var(--jd-accent); }
.note-copy.copied { transform: scale(1.12); cursor: default; }
.note-copy:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 2px; border-radius: 4px; }
</style>
