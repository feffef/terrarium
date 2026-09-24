<script setup lang="ts">
// A Midden Space index, branching on the Space: `stores` gets the register of
// finds held off display (CONTEXT.md: "The Stores"), `trench` the dig-report
// landing. useSpace 404s an unknown Space, as the Atlas wings do.
const { space } = useSpace('midden')
</script>

<template>
  <MiddenStoresLanding v-if="space === 'stores'" />
  <MiddenTrenchLanding v-else />
</template>
