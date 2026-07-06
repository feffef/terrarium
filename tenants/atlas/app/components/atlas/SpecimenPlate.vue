<script setup lang="ts">
// The engraved plate (#67/#74): the Atlas's signature element. Supplies the
// frame, viewBox, caption, and signature tint; the authored inner SVG markup
// (line + hatch, one tinted feature) is dropped in. v-html is safe here — the
// illustration is agent-authored, repo-committed content, never user input.
defineProps<{
  illustration?: string
  number?: string
  binomial: string
  conjectural?: boolean
}>()
</script>

<template>
  <figure class="atlas-plate" :class="{ 'is-conjectural': conjectural }">
    <div class="plate-figure">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <svg v-if="illustration" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="`Engraved plate of ${binomial}`" v-html="illustration" />
      <p v-else class="plate-wanting">Plate wanting — the draughtsman was, we are told, indisposed.</p>
    </div>
    <figcaption class="plate-caption">
      <template v-if="number">Plate {{ number }} · </template><span class="binomial">{{ binomial }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.plate-wanting {
  font-style: italic;
  color: var(--atlas-faint);
  text-align: center;
  max-width: 22ch;
  margin: 0;
  font-size: 0.95rem;
}
</style>
