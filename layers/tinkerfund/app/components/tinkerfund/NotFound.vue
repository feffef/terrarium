<script setup lang="ts">
const { space } = useSpace('tinkerfund')
setResponseStatus(404)
</script>

<template>
  <section class="missing tf-panel">
    <p class="tf-label">Error 404 · No such page</p>
    <h1>This page isn’t in the catalog</h1>
    <p>It may have moved, or it was never built. The shop itself is right where you left it.</p>
    <p class="actions">
      <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space)">Back to the shop</NuxtLink>
      <NuxtLink class="tf-btn" :to="tinkerfundPath(space, '/discover')">Discover Campaigns</NuxtLink>
    </p>
  </section>
</template>

<style scoped>
.missing { display: grid; gap: 12px; max-width: 640px; padding: 28px; background: var(--tf-paper), var(--tf-surface); }
.missing h1 { margin: 0; font: 800 clamp(30px, 4vw, 42px)/1.05 var(--tf-font); font-stretch: 78%; }
.missing p { margin: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
</style>
