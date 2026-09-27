<script setup lang="ts">
defineProps<{ svg: string; caption?: string }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- schema-checked SVG (app/utils/svg.ts, issue #1363) -->
  <svg viewBox="0 0 400 300" :role="caption ? 'img' : undefined" :aria-label="caption" :aria-hidden="caption ? undefined : 'true'" v-html="svg" />
</template>
