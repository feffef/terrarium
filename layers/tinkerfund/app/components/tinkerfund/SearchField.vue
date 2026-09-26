<script setup lang="ts">
defineProps<{ action: string }>()
</script>

<template>
  <form class="search" role="search" :action="action" method="get">
    <label>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <span class="tf-sr">Search Campaigns</span>
      <input name="q" type="search" placeholder="Search Campaigns" autocomplete="off">
    </label>
  </form>
</template>

<style scoped>
.search label {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 10px;
  border: 1px solid var(--tf-muted);
  border-radius: var(--tf-radius);
  background: var(--tf-bg);
  color: var(--tf-muted);
}
svg { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
input { width: 100%; border: 0; background: none; color: var(--tf-ink); }
input::placeholder { color: var(--tf-muted); opacity: 1; }
input:focus-visible { outline: none; }
label:focus-within { outline: 2px solid var(--tf-link); outline-offset: 2px; }
</style>
