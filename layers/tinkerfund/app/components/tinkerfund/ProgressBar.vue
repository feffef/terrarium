<script setup lang="ts">
const props = defineProps<{ percent: number }>()
const SEGMENTS = 20
const filled = computed(() => Math.round((Math.min(props.percent, 100) / 100) * SEGMENTS))
</script>

<template>
  <div
    class="bar"
    :class="{ over: percent >= 100 }"
    role="meter"
    aria-label="Funding"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.min(percent, 100)"
    :aria-valuetext="`${percent}% funded`"
  >
    <i v-for="i in SEGMENTS" :key="i" :class="{ on: i <= filled }" :style="{ '--i': i }" />
  </div>
</template>

<style scoped>
.bar { display: grid; grid-template-columns: repeat(20, 1fr); gap: 3px; height: 12px; }
i { border-radius: 2px; background: var(--tf-grid); }
i.on { background: var(--tf-accent); animation: tf-sweep calc(var(--tf-dur) * 3) var(--tf-ease) both; animation-delay: calc(var(--tf-dur) * var(--i) / 4); }
.over i.on { background: var(--tf-good); }
@keyframes tf-sweep { from { opacity: 0.15; } }
</style>
