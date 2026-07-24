<script setup lang="ts">
// The Midden's front door (`/t/midden`). Post-MVP simplification (owner-directed,
// this branch): the front door and the trench index are ONE landing now, mirrored
// at both routes — this page and `[space]/index.vue` both render the same
// `MiddenTrenchLanding` component (not a redirect; ADR-0006 keeps `/t/midden` a
// real Tenant-root layer route, like the Atlas front door). All the landing's
// data-loading and markup live in that one component.
</script>

<template>
  <MiddenTrenchLanding />
</template>
