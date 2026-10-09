<script setup lang="ts">
// Authored titles and notes mark inline code with backticks; show them as code.
const props = defineProps<{ text: string }>()
const parts = computed(() => props.text.split(/`([^`]+)`/))
</script>

<template>
  <template v-for="(part, i) in parts" :key="i"><code v-if="i % 2" class="midden-ticks">{{ part }}</code><template v-else>{{ part }}</template></template>
</template>

<style scoped>
.midden-ticks {
  font-family: var(--midden-mono);
  font-size: 0.88em;
  overflow-wrap: anywhere;
}
</style>
