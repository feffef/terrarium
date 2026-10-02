<script setup lang="ts">
const props = defineProps<{ text: string; parts?: MiddenGlossPart[] }>()
const shown = computed(() => props.parts ?? middenGlossParts(props.text, new Set()))
</script>

<template>
  <template v-for="(part, i) in shown" :key="i">
    <template v-if="typeof part === 'string'">{{ part }}</template>
    <MiddenGloss v-else :term="part.key">{{ part.text }}</MiddenGloss>
  </template>
</template>
