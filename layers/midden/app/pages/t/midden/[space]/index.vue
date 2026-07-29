<script setup lang="ts">
// A Midden Space index. The Midden has two Spaces with two different landings
// (CONTEXT.md: "The Stores"), so this route branches on the `space` param rather
// than rendering one component unconditionally as it did when `trench` was the
// only Space:
//   /t/midden/trench  → the dig-report landing, also mirrored at `/t/midden`
//   /t/midden/stores  → the register of finds held off display
// Each landing resolves its own Space, so neither needs route context passed in.
// An unknown space falls through to the trench landing — the Tenant's front door.
const route = useRoute()
const space = computed(() => String(route.params.space ?? ''))
</script>

<template>
  <MiddenStoresLanding v-if="space === 'stores'" />
  <MiddenTrenchLanding v-else />
</template>
