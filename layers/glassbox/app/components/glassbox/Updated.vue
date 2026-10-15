<script setup lang="ts">
defineProps<{ date: string; placement: 'header' | 'end' }>()
</script>

<template>
  <p class="updated" :class="placement">Last updated <time :datetime="date">{{ formatGlassboxDate(date) }}</time></p>
</template>

<style scoped>
.updated { margin: 0; font: 12px var(--gb-mono); color: var(--gb-muted); }
.end { margin-top: 40px; }
@media (min-width: 1024px) {
  .end { display: none; }
}
@media (max-width: 1023.98px) {
  .header { display: none; }
}
</style>
