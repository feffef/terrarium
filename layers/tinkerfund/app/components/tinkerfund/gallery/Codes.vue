<script setup lang="ts">
defineProps<{ names: readonly string[] }>()
</script>

<template>
  <p class="codes"><code v-for="name in names" :key="name">{{ name }}</code></p>
</template>

<style scoped>
.codes { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0; color: var(--tf-muted); }
code { font: 500 13px/1.4 var(--tf-mono); overflow-wrap: anywhere; }
</style>
