<script setup lang="ts">
const { name } = defineProps<{ name: string }>()
const url = computed(() => skillUrl(name, useAppConfig().journal.repoSkills))
</script>

<template>
  <a v-if="url" :href="url">{{ name }}</a>
  <span v-else>{{ name }}</span>
</template>

<style scoped>
a { color: inherit; text-decoration: underline dotted; text-underline-offset: 2px; }
a:hover { color: var(--jd-accent); }
</style>
