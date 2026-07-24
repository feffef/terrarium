<script setup lang="ts">
// The Space index (`/t/midden/trench`): renders the ONE shared landing
// (TrenchLanding) — the same page `/t/midden` shows. Mirrored, not redirected
// (owner-directed post-MVP flattening, layers/midden/CONTEXT.md).
//
// `useSpace` is still called for its isolation-critical side effect: an
// unknown Space (`/t/midden/anything-else`) 404s through the SAME shared,
// unit-tested `resolveSpaceRoute` instead of silently mirroring the landing.
useSpace('midden')
</script>

<template>
  <MiddenTrenchLanding />
</template>
