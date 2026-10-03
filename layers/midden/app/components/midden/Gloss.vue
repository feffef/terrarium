<script setup lang="ts">
// A button, not a hover title, so the gloss works by tap and keyboard (issue #1463).

const props = defineProps<{ term: MiddenGlossKey }>()
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
