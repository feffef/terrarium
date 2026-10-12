<script setup lang="ts">
// Shown only once the visitor has changed something; the theme is a preference, not demo state.
const { actions } = useTinkerfundActions()
// The demo bar's divider travels with the button, so a hidden button leaves no stray dot.
defineProps<{ divider?: boolean }>()

function reset() {
  try {
    resetTinkerfundDemo(sessionStorage)
  } catch {
    // Storage blocked: there is no demo state to remove.
  }
  // Reloading re-renders every page from its baked baseline.
  window.location.reload()
}
</script>

<template>
  <template v-if="actions.length">
    <span v-if="divider" aria-hidden="true">·</span>
    <button type="button" class="tf-link reset" @click="reset">Reset demo</button>
  </template>
</template>

<style scoped>
.reset { padding: 2px 0; }
</style>
