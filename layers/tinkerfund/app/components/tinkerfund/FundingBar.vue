<script setup lang="ts">
// Decorative: every use sits beside the same percent in text.
const props = withDefaults(defineProps<{ percent: number; segments?: number }>(), { segments: 20 })
const lit = computed(() => Math.round((Math.min(props.percent, 100) / 100) * props.segments))
</script>

<template>
  <span class="bar" :class="{ over: percent >= 100 }" :style="{ '--n': segments }" aria-hidden="true">
    <i v-for="i in segments" :key="i" :class="{ on: i <= lit }" :style="{ '--i': i }" />
  </span>
</template>

<style scoped>
.bar { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 3px; height: 10px; }
i { border-radius: 2px; background: var(--tf-line); }
i.on { background: var(--tf-accent); animation: tf-seg calc(var(--tf-dur) * 3) var(--tf-ease) both; animation-delay: calc(var(--tf-dur) * var(--i) / 4); }
.over i.on { background: var(--tf-good); }
@keyframes tf-seg { from { opacity: 0.15; } }
</style>
