<script setup lang="ts">
defineProps<{ date: string; placement: 'header' | 'end'; source?: string }>()
</script>

<template>
  <p class="updated" :class="placement">Last updated <time :datetime="date">{{ formatGlassboxDate(date) }}</time><template v-if="source"> · <a :href="source">Source ↗</a></template></p>
</template>

<style scoped>
.updated { margin: 0; font: 12px var(--gb-mono); color: var(--gb-muted); }
.updated a { color: inherit; text-decoration: underline 1px dotted; text-underline-offset: 3px; }
.end { margin-top: 40px; }
@media (min-width: 1024px) {
  .end { display: none; }
}
@media (max-width: 1023.98px) {
  .header { display: none; }
}
</style>
