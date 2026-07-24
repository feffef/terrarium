<script setup lang="ts">
// The trench index (`/t/midden/trench`). Post-MVP simplification (owner-directed,
// this branch): the trench index and the front door are ONE landing now — this
// page and the Tenant-root `index.vue` both render the same `MiddenTrenchLanding`
// component (mirror, not a redirect). All the landing's data-loading and markup
// live in that one component; it resolves the trench Space itself, so this page
// needs no route context.
</script>

<template>
  <MiddenTrenchLanding />
</template>
