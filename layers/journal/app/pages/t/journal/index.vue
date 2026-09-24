<script setup lang="ts">
// Tenant-root route (ADR-0016): journal has no front door of its own, so its root
// sends visitors to its main Space.
await navigateTo('/t/journal/current')
</script>

<template>
  <div />
</template>
