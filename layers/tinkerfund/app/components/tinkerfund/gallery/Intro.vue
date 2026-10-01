<script setup lang="ts">
defineProps<{ title: string; lead?: string }>()

const { space } = useTinkerfundSpace()
const { now } = await useTinkerfundClock()
const pinned = computed(() => new Date(now.value).toISOString())
</script>

<template>
  <header class="intro">
    <p class="tf-label">Tinkerfund · {{ space }} · now pinned at <time :datetime="pinned">{{ pinned.slice(0, 16).replace('T', ' ') }} UTC</time></p>
    <h1 class="tf-h1">{{ title }}</h1>
    <slot />
    <p v-if="lead" class="lead">{{ lead }}</p>
  </header>
</template>

<style scoped>
.intro { display: grid; gap: 10px; }
.intro > * { margin: 0; }
.lead { max-width: 68ch; color: var(--tf-muted); }
</style>
