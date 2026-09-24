<script setup lang="ts">
// Tenant-root route (ADR-0016): commons has no front door of its own, so its root
// sends visitors to its main Space.
await navigateTo('/t/commons/search')
</script>

<template>
  <div />
</template>
