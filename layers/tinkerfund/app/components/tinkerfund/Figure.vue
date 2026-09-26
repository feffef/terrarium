<script setup lang="ts">
// A content figure on the grid-paper FIG. frame (issues #1362, #1363). The
// markup is our own baked, schema-checked SVG, so v-html is safe.
defineProps<{ svg: string; label: string; caption: string; small?: boolean }>()
</script>

<template>
  <figure class="figure" :class="{ small }">
    <div class="frame">
      <span class="tf-label cap">{{ label }}</span>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <svg viewBox="0 0 400 300" role="img" :aria-label="caption" v-html="svg" />
    </div>
    <figcaption v-if="!small">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.figure { display: grid; gap: 8px; margin: 0; }
.frame {
  position: relative;
  padding: 28px 14px 10px;
  border: var(--tf-hairline);
  border-radius: var(--tf-radius-panel);
  background: var(--tf-paper), var(--tf-surface);
}
.cap { position: absolute; left: 12px; top: 10px; }
svg { display: block; width: 100%; height: auto; }
figcaption { color: var(--tf-muted); font-size: 14px; }
.small .frame { padding: 4px; border-radius: var(--tf-radius); }
.small .cap { position: static; display: block; font-size: 10px; }
</style>
