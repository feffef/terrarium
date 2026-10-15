<script setup lang="ts">
defineProps<{ date: string }>()
</script>

<!-- Design 1b: in the header from 1024px (`in-header`), at the page's end below (`at-end`). -->
<template>
  <p class="updated">Last updated <time :datetime="date">{{ formatGlassboxDate(date) }}</time></p>
</template>

<style scoped>
.updated { margin: 0; font: 12px var(--gb-mono); color: var(--gb-muted); }
.at-end { margin-top: 40px; }
@media (min-width: 1024px) {
  .at-end { display: none; }
}
@media (max-width: 1023.98px) {
  .in-header { display: none; }
}
</style>
