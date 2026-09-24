<script setup lang="ts">
// Tenant-root route (ADR-0016): marquee has no front door of its own, so its root
// sends visitors to its main Space.
await navigateTo('/t/marquee/reel')
</script>

<template>
  <div />
</template>
