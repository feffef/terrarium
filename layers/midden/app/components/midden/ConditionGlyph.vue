<script setup lang="ts">
// The condition glyph (#523): one grade's mark rendered as inline SVG, with its
// label ALWAYS beside it as visible text — never glyph-only. Shape and colour are
// scanning accelerators only; the label carries the meaning (accessibility). The
// glyph itself also mirrors that text into aria-label/title. All geometry and
// copy come from utils/condition.ts (single-homed, #527) — this is a thin renderer.
import { conditionMeta, glyphFor, type Grade } from '../../utils/condition'

const props = withDefaults(defineProps<{ grade: Grade; size?: number }>(), { size: 16 })

const meta = computed(() => conditionMeta(props.grade))
const spec = computed(() => glyphFor(props.grade))
</script>

<template>
  <span class="midden-condition">
    <svg
      class="glyph"
      :class="{ 'is-outline': !spec.filled, 'is-soft': spec.soft }"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      role="img"
      :aria-label="`condition: ${meta.label}`"
    >
      <title>{{ meta.label }}</title>
      <path class="body" :d="spec.d" :opacity="spec.opacity" />
    </svg>
    <span class="label">{{ meta.label }}</span>
  </span>
</template>
