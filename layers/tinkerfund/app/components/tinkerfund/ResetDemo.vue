<script setup lang="ts">
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
  <button type="button" class="tf-link reset" @click="reset">Reset demo</button>
</template>

<style scoped>
.reset { padding: 2px 0; }
</style>
