<script setup lang="ts">
const { space, trail = [] } = defineProps<{ space: string; trail?: string[] }>()
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <NuxtLink to="/">terrarium</NuxtLink>
    <span class="sep">/</span>
    <NuxtLink to="/t/journal/current">journal</NuxtLink>
    <span class="sep">/</span>
    <span v-if="!trail.length" class="here">{{ space }}</span>
    <NuxtLink v-else :to="`/t/journal/${space}`">{{ space }}</NuxtLink>
    <template v-for="(c, i) in trail" :key="i">
      <span class="sep">/</span>
      <span :class="{ here: i === trail.length - 1 }">{{ c }}</span>
    </template>
  </nav>
</template>
