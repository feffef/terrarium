<script setup lang="ts">
// The condition glyph (#523; redesign handoff — ConditionGlyph.dc.html): one
// grade's mark rendered as inline SVG. A thin renderer over the single-homed
// geometry in utils/condition.ts (#527). Decay is encoded by fill + opacity +
// stroke-width ONLY — no blur filter (the redesign dropped the feathered edge).
//
// SVG-only by design: the visible grade LABEL is rendered by the caller (the
// stamp on a find, the `.sc` label in a ladder), never inside this component —
// so the glyph is free to be a bare hover/scan mark. Accessibility is kept via
// role="img" + aria-label + <title> here, PLUS the always-present visible label
// at every call site (never glyph-only). Colour defaults to the terracotta
// accent and inherits `currentColor`, so a caller can recolour by setting
// `color` on an ancestor.
import { conditionMeta, glyphFor, type Grade } from '../../utils/condition'

const props = withDefaults(defineProps<{ grade: Grade; size?: number }>(), { size: 22 })

const meta = computed(() => conditionMeta(props.grade))
const spec = computed(() => glyphFor(props.grade))
</script>

<template>
  <svg
    class="midden-glyph"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="spec.filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="spec.filled ? 0 : 1.7"
    stroke-linejoin="round"
    stroke-linecap="round"
    :opacity="spec.opacity"
    role="img"
    :aria-label="`condition: ${meta.label}`"
  >
    <title>{{ meta.label }}</title>
    <path :d="spec.d" />
  </svg>
</template>
