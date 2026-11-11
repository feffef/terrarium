<script setup lang="ts">
// A button, not a hover title, so it opens by tap and keyboard (issue #1992).
import { glassboxTermId } from '../../../page-refs.ts'

const props = defineProps<{ id?: string }>()
const slots = useSlots()
const terms = inject(glassboxTermsKey, undefined)
const open = ref(false)
const definitionId = useId()
const entry = computed(() => terms?.value[glassboxTermId(glassboxSlotText(slots), props.id)])
</script>

<template>
  <span v-if="entry" class="term"><button
    type="button"
    :aria-expanded="open"
    :aria-controls="definitionId"
    @click="open = !open"
  ><slot /></button><span v-show="open" :id="definitionId" class="definition" role="note">{{ entry.definition }}<span v-if="entry.lesson" class="lesson"><span>{{ glassboxLessonLabels.lesson }}</span><NuxtLink :to="entry.lesson">{{ entry.lessonTitle ?? 'Read the Lesson' }}</NuxtLink></span><File v-else-if="entry.source" class="source">{{ entry.source }}</File></span></span>
  <slot v-else />
</template>

<style scoped>
button {
  all: unset;
  cursor: pointer;
  text-decoration: underline 1px dotted var(--gb-accent);
  text-underline-offset: 4px;
}
button::after {
  content: '?';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  inline-size: 1.3em;
  block-size: 1.3em;
  margin-inline-start: 0.35em;
  border: 1px solid var(--gb-accent);
  border-radius: 50%;
  color: var(--gb-accent);
  font: 600 0.55em var(--gb-sans, sans-serif);
  vertical-align: 0.2em;
}
button:focus-visible {
  outline: 2px solid var(--gb-accent);
  outline-offset: 2px;
  border-radius: 2px;
}
button[aria-expanded='true'] { color: var(--gb-accent); }
.definition {
  display: block;
  margin: 0.3em 0 0.5em;
  padding: 0.3em 0.6em;
  border-radius: 6px;
  background: var(--gb-tint);
  color: var(--gb-muted);
  font-size: 0.92em;
}
.source { margin-inline-start: 0.4em; }
/* The look of a Lesson chip (Article.vue's .gb-lessons), as spans: a list can't sit inside a paragraph. */
.lesson {
  display: inline-block;
  margin-inline-start: 0.4em;
  padding: 0 8px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 8px;
  background: var(--gb-bg);
  font-size: 0.95em;
}
.lesson span { color: var(--gb-muted); }
.lesson span::after { content: ' · '; }
.lesson a { color: var(--gb-ink); text-decoration: none; }
</style>
