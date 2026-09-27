<script setup lang="ts">
defineProps<{ to: string }>()
</script>

<template>
  <NuxtLink :to="to" class="wordmark" aria-label="Tinkerfund home">
    <svg viewBox="0 0 26 26" aria-hidden="true">
      <rect x="1" y="1" width="24" height="24" rx="6" fill="var(--tf-ink)" />
      <path d="M13 13V6.5A6.5 6.5 0 0 1 19.5 13z" fill="var(--tf-accent)" />
      <circle cx="13" cy="13" r="6.5" fill="none" stroke="var(--tf-surface)" stroke-width="2" />
      <path d="M13 3v4M13 19v4M3 13h4M19 13h4" stroke="var(--tf-surface)" stroke-width="2" />
    </svg>
    <b>Tinkerfund</b>
  </NuxtLink>
</template>

<style scoped>
.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--tf-ink);
  text-decoration: none;
}
svg { width: 26px; height: 26px; flex: none; }
b { font: 800 24px/1 var(--tf-font); font-stretch: 82%; letter-spacing: -0.01em; }
</style>
