<script setup lang="ts">
// One glossed term (issue #1463). In `components/content/` so the `midden-gloss`
// tag that middenGlossBody() writes into a Site body resolves to it. A button,
// not a hover title, so it works by tap and keyboard.
const props = defineProps<{ term: string }>()
const open = ref(false)
const gloss = computed(() => middenGlossFor(props.term))
</script>

<template>
  <span class="midden-gloss"><button
    type="button"
    class="midden-gloss__term"
    :aria-expanded="open"
    @click="open = !open"
  ><slot /></button><span v-show="open" role="note" class="midden-gloss__def"> ({{ gloss }})</span></span>
</template>

<style scoped>
.midden-gloss__term {
  all: unset;
  cursor: help;
  border-bottom: 1px dotted var(--midden-accent);
}
.midden-gloss__term:focus-visible {
  outline: 2px solid var(--midden-accent);
  outline-offset: 2px;
}
.midden-gloss__term[aria-expanded='true'] { color: var(--midden-accent); }
.midden-gloss__def {
  font-family: var(--midden-serif);
  font-style: italic;
  font-size: 0.95em;
  color: var(--midden-muted);
}
</style>
