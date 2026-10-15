<script setup lang="ts">
import type { GlassboxSurroundLink } from '../../utils/page-nav'

defineProps<{ base: string; prev: GlassboxSurroundLink | null; next: GlassboxSurroundLink | null }>()
</script>

<template>
  <nav class="surround" aria-label="Previous and next Lesson">
    <NuxtLink v-if="prev" class="card" rel="prev" :to="`${base}${prev.path}`">
      <span>{{ prev.label }}</span>
      <strong>{{ prev.title }}</strong>
    </NuxtLink>
    <NuxtLink v-if="next" class="card next" rel="next" :to="`${base}${next.path}`">
      <span>{{ next.label }}</span>
      <strong>{{ next.title }}</strong>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.surround { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 56px; }
.card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 16px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
  backdrop-filter: blur(16px);
  color: var(--gb-ink);
  text-decoration: none;
}
.card:hover { border-color: var(--gb-accent); }
.card span { font-size: 13px; color: var(--gb-muted); }
.card strong { font-size: 17px; font-weight: 600; line-height: 1.3; }
.next { grid-column: 2; text-align: right; }
@media (max-width: 640px) {
  .surround { grid-template-columns: 1fr; }
  .next { grid-column: auto; }
}
</style>
