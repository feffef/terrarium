<script setup lang="ts">
// A specimen's color signature (#68), stated as named swatches + its spoken gloss
// ("lantern gold on soot"). Shown on the museum label; the same hues quietly tint
// the rest of the entry via the inline --sig-* vars the page sets.
import type { SignatureColor } from '../../utils/atlas'

defineProps<{ colors: SignatureColor[]; gloss?: string }>()
</script>

<template>
  <span class="atlas-sig">
    <span class="sw" aria-hidden="true">
      <i v-for="c in colors" :key="c.hex" :style="{ background: c.hex }" :title="c.name" />
    </span>
    <span v-if="gloss" class="gloss">{{ gloss }}</span>
  </span>
</template>

<style scoped>
.atlas-sig { display: inline-flex; align-items: center; gap: 0.55ch; }
.atlas-sig .sw { display: inline-flex; gap: 3px; }
.atlas-sig .sw i {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  display: block;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}
.atlas-sig .gloss { font-style: italic; color: var(--atlas-muted); }
</style>
